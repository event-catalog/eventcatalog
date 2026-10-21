/**
 * Product analytics: how Studio is used (where people come from, what they do on the canvas, whether they share it,
 * collaborate and take it to EventCatalog), to EventCatalog's PostHog project (the editor's). Never what's on their
 * canvas: events carry kinds, counts and buckets only. No names, ids, titles, text, code, file names or links: the
 * address's fragment holds the diagram (`#m=`) or a live room's key (`#room=`), so it's never sent.
 *
 * A small sender to PostHog's capture API rather than posthog-js: no autocapture, recordings or remote config to
 * switch off (and nothing loaded from elsewhere, which chat hosts' content security policies block), and a few KB
 * instead of ~150. Events are batched and sent every few seconds, and when the page is hidden.
 *
 * Off on localhost (unless `localStorage['eventcatalog-studio-analytics'] = 'debug'`, which logs them too), when the
 * browser asks not to be tracked (Global Privacy Control, Do Not Track), and when turned off in the menu.
 */

import { POSTHOG_HOST as HOST, POSTHOG_KEY as KEY } from '../src/lib/posthog';
import { durationBucket } from '../src/lib/stats';
import { parseStack, toException, type ExceptionEntry, type StackFrame } from '../src/lib/exceptions';

export { durationBucket, modelMix, modelStats, sizeBucket } from '../src/lib/stats';

const SETTING_KEY = 'eventcatalog-studio-analytics';
const INSTALL_ID_KEY = 'eventcatalog-studio-install-id';
const SESSION_KEY = 'eventcatalog-studio-session';
// A session ends after half an hour without anything happening (as PostHog's do)
const SESSION_IDLE_MS = 30 * 60 * 1000;
const FLUSH_MS = 5000;
const MAX_BATCH = 30;

declare const __STUDIO_BUILD__: string | undefined;
const BUILD = typeof __STUDIO_BUILD__ === 'string' ? __STUDIO_BUILD__ : 'dev';

type Value = string | number | boolean | undefined | null;
export type Properties = Record<string, Value>;

const read = (storage: () => Storage, key: string) => {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
};
const write = (storage: () => Storage, key: string, value: string | null) => {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {}
};
const local = () => window.localStorage;
const session = () => window.sessionStorage;

const isLocalHost = (host: string) => /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0)$/.test(host);
const browserOptedOut = () => {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; doNotTrack?: string | null };
  return nav.globalPrivacyControl === true || nav.doNotTrack === '1';
};

/** Whether usage analytics is on here: the menu's switch (off when the browser asks not to be tracked) */
export function analyticsAllowed() {
  const setting = read(local, SETTING_KEY);
  if (setting === 'off') return false;
  if (setting === 'on' || setting === 'debug') return true;
  return !browserOptedOut();
}

/** The menu's switch: kept in this browser */
export function setAnalyticsAllowed(allowed: boolean) {
  if (!allowed) track('analytics_turned_off');
  flush();
  write(local, SETTING_KEY, allowed ? 'on' : 'off');
  if (!allowed) queue.length = 0;
}

// UUIDv7 (time-ordered), as PostHog's session ids are
const uuidv7 = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let time = Date.now();
  for (let i = 5; i >= 0; i--) {
    bytes[i] = time % 256;
    time = Math.floor(time / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/** This browser, anonymously (a random id kept in it; a new one each time where storage is blocked) */
let installId: string | undefined;
const hadInstallId = typeof window !== 'undefined' && !!read(local, INSTALL_ID_KEY);
/** Whether this browser has been here before (it had an id when the page loaded) */
export const isReturningVisitor = () => hadInstallId;
const getInstallId = () => {
  if (installId) return installId;
  installId = read(local, INSTALL_ID_KEY) ?? uuidv7();
  write(local, INSTALL_ID_KEY, installId);
  return installId;
};

/** This visit: a new one after half an hour idle (PostHog's sessions: duration, bounce rate) */
let sessionState: { id: string; lastAt: number; started: number } | undefined;
const getSession = () => {
  const now = Date.now();
  if (!sessionState) {
    try {
      sessionState = JSON.parse(read(session, SESSION_KEY) ?? 'null') ?? undefined;
    } catch {}
  }
  if (!sessionState || now - sessionState.lastAt > SESSION_IDLE_MS) sessionState = { id: uuidv7(), lastAt: now, started: now };
  sessionState.lastAt = now;
  write(session, SESSION_KEY, JSON.stringify(sessionState));
  return sessionState.id;
};

/** The browser, its system and the kind of device (what posthog-js works out), from the user agent */
const device = () => {
  const agent = navigator.userAgent;
  const browser = /Edg\//.test(agent)
    ? 'Microsoft Edge'
    : /OPR\//.test(agent)
      ? 'Opera'
      : /Firefox\//.test(agent)
        ? 'Firefox'
        : /Chrome\//.test(agent)
          ? 'Chrome'
          : /Safari\//.test(agent)
            ? 'Safari'
            : 'Other';
  const os = /iPhone|iPad|iPod/.test(agent)
    ? 'iOS'
    : /Android/.test(agent)
      ? 'Android'
      : /Mac OS X/.test(agent)
        ? 'Mac OS X'
        : /Windows/.test(agent)
          ? 'Windows'
          : /Linux|CrOS/.test(agent)
            ? 'Linux'
            : 'Other';
  const deviceType = /iPad|Tablet/.test(agent) ? 'Tablet' : /Mobi|iPhone|Android/.test(agent) ? 'Mobile' : 'Desktop';
  return { $browser: browser, $os: os, $device_type: deviceType };
};

/** Where they came from: the site only (never the page, which could say something about them) */
const referrer = () => {
  try {
    const from = document.referrer && new URL(document.referrer);
    return from && from.host !== window.location.host ? { $referrer: from.origin, $referring_domain: from.host } : { $referrer: '$direct', $referring_domain: '$direct' };
  } catch {
    return {};
  }
};

/** Campaign tags on the address (?utm_source=...): the only part of the query kept */
const campaign = () => {
  const tags: Properties = {};
  try {
    new URLSearchParams(window.location.search).forEach((value, key) => {
      if (/^utm_(source|medium|campaign|content|term)$/.test(key)) tags[key] = value.slice(0, 100);
    });
  } catch {}
  return tags;
};

// ---- What's sent with every event ----

let surface = 'browser';
let environment: 'production' | 'development' = 'production';
let configured = false;
// Where the view's script is served on its own (for error tracking's source maps): this server, also in a chat
let scriptOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const inChat = () => surface !== 'browser';

/**
 * Where it's running: in the browser, or a chat (by its host's name), and the server it came from (localhost: not
 * production). Nothing is sent until this is known; what's tracked before waits for it.
 */
export function configureAnalytics({ host, serverOrigin }: { host?: string; serverOrigin?: string }) {
  surface = host ? host.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'chat' : 'browser';
  let server = window.location.hostname;
  try {
    if (serverOrigin) {
      server = new URL(serverOrigin).hostname;
      scriptOrigin = new URL(serverOrigin).origin;
    }
  } catch {}
  environment = isLocalHost(server) || isLocalHost(window.location.hostname) ? 'development' : 'production';
  configured = true;
  schedule();
}

const debugging = () => read(local, SETTING_KEY) === 'debug';
const sending = () => configured && analyticsAllowed() && (environment === 'production' || debugging());

// (where it's running is set when it's sent, in `whereFrom`: events tracked before `configureAnalytics` would have
// the defaults otherwise, e.g. a diagram opened on localhost counted as production)
const common = (): Properties => ({
  distinct_id: getInstallId(),
  $session_id: getSession(),
  $process_person_profile: false,
  $lib: 'studio-web',
  $lib_version: BUILD,
  product: 'studio_web',
  // The page without its query or fragment (the fragment is the diagram, or a room's key)
  $current_url: window.location.origin + window.location.pathname,
  $host: window.location.host,
  $pathname: window.location.pathname,
  $screen_width: window.screen?.width,
  $screen_height: window.screen?.height,
  $viewport_width: window.innerWidth,
  $viewport_height: window.innerHeight,
  $browser_language: navigator.language,
  ...device(),
});

type Queued = { event: string; properties: Record<string, unknown>; timestamp: string; uuid: string };
/**
 * Where it ran, known by the time it's sent: the environment and surface (and, in a chat, not the page's address: the
 * host's frame's), and for an error, the server its script's frames are served from
 */
const whereFrom = (queued: Queued): Queued => {
  const { $current_url, $host, $pathname, $exception_list, ...rest } = queued.properties;
  return {
    ...queued,
    properties: {
      ...rest,
      environment,
      surface,
      ...(!inChat() && { $current_url, $host, $pathname }),
      ...(Array.isArray($exception_list) && { $exception_list: ($exception_list as ExceptionEntry[]).map(servedFrom) }),
    },
  };
};
const queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

const schedule = () => {
  if (timer || !queue.length || !configured) return;
  timer = setTimeout(flush, FLUSH_MS);
};

/** Sends what's waiting (keepalive: it still goes when the page is closing) */
export function flush() {
  if (timer) clearTimeout(timer);
  timer = undefined;
  if (!queue.length || !configured) return;
  if (!sending()) {
    queue.length = 0;
    return;
  }
  const batch = queue.splice(0, MAX_BATCH).map(whereFrom);
  if (debugging()) batch.forEach(({ event, properties }) => console.debug('[Studio analytics]', event, properties));
  try {
    // text/plain: no preflight request (PostHog reads the JSON either way)
    void fetch(`${HOST}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ api_key: KEY, batch }),
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {});
  } catch {}
  if (queue.length) schedule();
}

const enqueue = (event: string, properties: Record<string, unknown>) => {
  const clean = Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined && value !== null && value !== ''));
  queue.push({ event, properties: { ...common(), ...clean }, timestamp: new Date().toISOString(), uuid: uuidv7() });
  bump(event);
  if (queue.length >= MAX_BATCH) flush();
  else schedule();
};

/** Something they did: only kinds, counts and buckets in `properties` (never what's on the canvas) */
export function track(event: string, properties: Properties = {}) {
  if (typeof window === 'undefined' || !analyticsAllowed()) return;
  try {
    enqueue(event, properties);
  } catch {}
}

/** The page seen (PostHog's web analytics: visitors, where they came from, devices), once per load in the browser */
export function trackPageView() {
  track('$pageview', { ...referrer(), ...campaign() });
}

// ---- The visit's summary: counts of what they did, sent once when they leave (one event, not one per drag) ----

const counts = new Map<string, number>();
const loadedAt = Date.now();
let peakPeople = 1;
let summarised = false;

/** Counted for the visit's summary (`canvas_session_summary`); tracked events are counted too */
export function bump(name: string, by = 1) {
  counts.set(name, (counts.get(name) ?? 0) + by);
}

/** Everyone in a live room, them included: the most at once goes in the summary */
export function notePeople(people: number) {
  peakPeople = Math.max(peakPeople, people);
}

const summarise = () => {
  if (summarised || !configured) return;
  summarised = true;
  const durationMs = Date.now() - loadedAt;
  const edits = ['resource_added', 'relation_added', 'note_added', 'text_added', 'comment_added', 'comment_replied', 'hotspot_added', 'node_edited', 'pasted', 'node_moved', 'deleted']
    .map((name) => counts.get(name) ?? 0)
    .reduce((sum, count) => sum + count, 0);
  track('canvas_session_summary', {
    duration_ms: durationMs,
    duration_bucket: durationBucket(durationMs),
    edits,
    edited: edits > 0,
    peak_people: peakPeople,
    ...Object.fromEntries([...counts].filter(([name]) => !name.startsWith('$') && name !== 'canvas_session_summary').map(([name, count]) => [`count_${name}`, count])),
  });
  flush();
};

// ---- Errors nobody caught, for PostHog's error tracking ($exception: grouped into issues, with their stacks) ----

declare const __STUDIO_SCRIPT__: string | undefined;
/** The view's script, served on its own with its source map (scripts/build-view.mjs), so issues show the source */
const SCRIPT_PATH = typeof __STUDIO_SCRIPT__ === 'string' ? `/${__STUDIO_SCRIPT__}` : undefined;

/**
 * Where the view's script starts in the page: it's inlined (as MCP App hosts need it), so its frames have the page's
 * lines. The script's first line notes where it is (`__studioViewStart`), whatever page it's in (ours, or a chat's frame)
 */
const scriptStart = () => parseStack((globalThis as { __studioViewStart?: Error }).__studioViewStart?.stack)[0];

/** A frame of ours: its line in the script served on its own. Others' (an extension's): without query or fragment */
const placeFrame =
  (start: ReturnType<typeof scriptStart>) =>
  (frame: ReturnType<typeof parseStack>[number]): StackFrame => {
    const own = !!start && !!SCRIPT_PATH && frame.filename === start.filename;
    return {
      platform: 'web:javascript',
      function: frame.function,
      filename: own ? SCRIPT_PATH! : frame.filename.replace(/[?#].*$/, ''),
      lineno: own ? frame.lineno - start!.lineno + 1 : frame.lineno,
      colno: frame.colno,
      in_app: own,
    };
  };
/** Our frames at the script's address on the server (known once it's configured: in a chat, not the frame's) */
const servedFrom = (exception: ExceptionEntry): ExceptionEntry =>
  exception.stacktrace
    ? {
        ...exception,
        stacktrace: {
          ...exception.stacktrace,
          frames: exception.stacktrace.frames.map((frame) => (frame.in_app && frame.filename === SCRIPT_PATH ? { ...frame, filename: scriptOrigin + SCRIPT_PATH } : frame)),
        },
      }
    : exception;

// At most a few a visit: an error on every frame would otherwise send one each time
let errorsTracked = 0;
/** The error's type, its message without what it quotes or links to, and its stack's frames (src/lib/exceptions.ts) */
const trackException = (error: unknown, mechanism: 'onerror' | 'onunhandledrejection', extra: Properties = {}) => {
  if (typeof window === 'undefined' || !analyticsAllowed() || ++errorsTracked > 5) return;
  try {
    enqueue('$exception', { $exception_list: [toException(error, { mechanism, frame: placeFrame(scriptStart()) })], $exception_level: 'error', ...extra });
  } catch {}
};
/** Where an error came from: Studio's own script, a browser extension, or elsewhere */
const errorSource = (event: ErrorEvent) => {
  const file = event.filename ?? '';
  return !file ? 'unknown' : file.startsWith(window.location.origin) ? 'studio' : /^[a-z-]+-extension:/.test(file) ? 'extension' : 'other';
};

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // The browser's notice that resize observers ran long (harmless), and a cross-origin "Script error." (its details
    // hidden from us): nothing to fix
    if (!event.error && /ResizeObserver|^Script error\.?$/.test(event.message ?? '')) return;
    trackException(event.error ?? event.message, 'onerror', { error_source: errorSource(event) });
  });
  window.addEventListener('unhandledrejection', (event) => trackException(event.reason, 'onunhandledrejection'));
  window.addEventListener('pagehide', summarise);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
}
