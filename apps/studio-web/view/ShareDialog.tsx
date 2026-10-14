/**
 * "Share with your team": a link to the diagram on this server. The diagram is in the link itself (its fragment,
 * which browsers never send to the server), so nothing is stored and anyone with the link sees it.
 * The link is long, so it's shown shortened; copying it copies all of it.
 * Tailwind with EventCatalog's theme variables, on Headless UI's Dialog.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { Bot, Check, Copy, ExternalLink, Link2, Lock, Play, Plug, Square, Users, X } from 'lucide-react';
import { type Model } from '@eventcatalog/visualiser/model';
import { viewLink } from '../src/lib/encode';
import { copyToClipboard } from './ported/clipboard';
import { track } from './analytics';

/** Working on it together, live (in the browser): a room to start, or the one they're in */
export type LiveSharing = {
  /** The room's link, when they're in one */
  roomUrl?: string;
  /** Everyone in the room, them included */
  people: number;
  /** Who's in the room: them first */
  everyone?: { id: string; name: string; color: string; you?: boolean }[];
  onStart: () => void;
  onLeave: () => void;
  /** Stops the session for everyone (only for whoever started it) */
  onStop?: () => void;
  /** How to connect an AI agent to pair with here */
  onConnectAgent?: () => void;
};

type ShareDialogProps = {
  model: Model;
  live?: LiveSharing;
  /** This server, e.g. https://mcp.eventcatalog.dev */
  baseUrl: string;
  focus?: string;
  title?: string;
  onClose: () => void;
  openLink: (url: string) => Promise<boolean>;
};

// How much of the diagram's part of the link is shown
const SHOWN_CHARACTERS = 10;

/** e.g. mcp.eventcatalog.dev/view#m=N4IgLglmA2… */
function shortened(url: string) {
  const { host, pathname, hash } = new URL(url);
  const fragment = hash.slice(1);
  return `${host}${pathname}#${fragment.slice(0, SHOWN_CHARACTERS)}${fragment.length > SHOWN_CHARACTERS ? '…' : ''}`;
}

const button = 'inline-flex h-9 flex-none items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors [&_svg]:h-4 [&_svg]:w-4';
const primary = `${button} bg-[rgb(var(--ec-primary-bg))] text-[rgb(var(--ec-primary-text))] hover:bg-[rgb(var(--ec-primary-bg)/0.85)]!`;
const secondary = `${button} border border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))]!`;

/** A link, shortened, with a button to copy all of it */
function LinkField({ url, label, kind }: { url: string; label: string; kind: 'diagram' | 'invite' }) {
  const [copied, setCopied] = useState<boolean | null>(null);
  const copy = async () => {
    const ok = await copyToClipboard(url);
    setCopied(ok);
    track(kind === 'invite' ? 'live_invite_copied' : 'share_link_copied', { ok });
  };
  return (
    <>
      <div className="flex w-full items-center gap-2">
        <div
          title={url}
          className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover))] px-3 text-sm text-[rgb(var(--ec-page-text-muted))]"
        >
          <Link2 aria-hidden className="h-4 w-4 flex-none" />
          <span className="truncate font-mono text-xs">{shortened(url)}</span>
        </div>
        <button type="button" onClick={copy} className={primary}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? 'Copied' : label}
        </button>
      </div>
      {copied === false && <p className="mt-2 text-xs text-red-600">Couldn't copy it here: select the link and copy it.</p>}
    </>
  );
}

/** One of the ways to share, as a card: what it is, what it gives them, and what to do */
function Choice({ icon, title, description, points, children }: { icon: ReactNode; title: string; description: string; points: string[]; children: ReactNode }) {
  return (
    <section className="flex flex-col rounded-xl border border-[rgb(var(--ec-page-border))] p-5 text-left transition-colors hover:border-[color-mix(in_srgb,rgb(var(--ec-accent))_45%,rgb(var(--ec-page-border)))]">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,rgb(var(--ec-accent))_12%,transparent)] text-[rgb(var(--ec-accent))] [&_svg]:h-[18px] [&_svg]:w-[18px]">
        {icon}
      </span>
      <h3 className="mt-4 text-sm font-semibold text-[rgb(var(--ec-page-text))]">{title}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-[rgb(var(--ec-page-text-muted))]">{description}</p>
      <ul className="mt-4 space-y-2">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2 text-xs leading-snug text-[rgb(var(--ec-page-text-muted))]">
            <Check aria-hidden className="mt-px h-3.5 w-3.5 flex-none text-emerald-500" />
            {point}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">{children}</div>
    </section>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** A live session they're in: who's here, inviting people, how they're seen, and leaving (or stopping) it */
function SessionPanel({ live, roomUrl }: { live: LiveSharing; roomUrl: string }) {
  const label = 'text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--ec-page-text-muted))]';
  const everyone = live.everyone ?? [];
  return (
    <>
      <div className="space-y-5 px-6 pb-5 pt-4">
        {/* Who's here */}
        <section>
          <div className="flex items-center justify-between">
            <h3 className={label}>In this session</h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-[rgb(var(--ec-page-text-muted))]">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> {live.people} {live.people === 1 ? 'person' : 'people'} here
            </span>
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {everyone.map((person) => (
              <li key={person.id} className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--ec-page-border))] py-1 pl-1 pr-3 text-sm">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ background: person.color }}
                >
                  {initials(person.name)}
                </span>
                {person.name}
                {person.you && <span className="text-xs text-[rgb(var(--ec-page-text-muted))]">(you)</span>}
              </li>
            ))}
          </ul>
        </section>

        {/* Inviting people */}
        <section>
          <h3 className={label}>Invite people</h3>
          <p className="mt-1 text-sm text-[rgb(var(--ec-page-text-muted))]">Anyone with this link joins and edits this canvas with you.</p>
          <div className="mt-2">
            <LinkField url={roomUrl} label="Copy invite" kind="invite" />
          </div>
        </section>

      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[rgb(var(--ec-page-border))] px-6 py-3">
        <button type="button" onClick={live.onLeave} className={secondary}>
          Leave
        </button>
        {live.onStop && (
          <button type="button" onClick={live.onStop} className={`${button} bg-red-600 text-white hover:bg-red-700!`}>
            <Square aria-hidden /> Stop session
          </button>
        )}
      </div>
      <p className="flex items-center justify-center gap-1.5 px-5 pb-4 text-[11px] text-[rgb(var(--ec-page-text-muted))]">
        <Lock aria-hidden className="h-3 w-3" /> End-to-end encrypted: not even our server can see your canvas.
      </p>
    </>
  );
}

/**
 * In the browser: two ways to share, side by side (as Excalidraw offers them). Live collaboration (a room people edit
 * together, or the one they're in) or a shareable link (a copy of the diagram as it is now)
 */
function ShareChoices({ live, url }: { live: LiveSharing; url?: string }) {
  const [linkShown, setLinkShown] = useState(false);
  // In a session: just the session (who's here, the invite, their name and colour, leaving or stopping it)
  if (live.roomUrl) return <SessionPanel live={live} roomUrl={live.roomUrl} />;
  const wide = 'w-full justify-center';
  return (
    <div className="grid gap-4 px-6 pb-6 pt-5 md:grid-cols-3!">
      <Choice
        icon={<Link2 aria-hidden />}
        title="Share a link"
        description="A copy of this diagram, as it is now, in a link."
        points={['Teammates open it in their browser', 'Paste it to your AI agent to build on', 'Kept in the link, not on our servers']}
      >
        {!url ? (
          <p className="text-xs text-[rgb(var(--ec-page-text-muted))]">Too big for a link: save it to a file (from the menu) and share that.</p>
        ) : linkShown ? (
          <LinkField url={url} label="Copy" kind="diagram" />
        ) : (
          <button
            type="button"
            onClick={() => {
              setLinkShown(true);
              track('share_link_created');
            }}
            className={`${secondary} ${wide}`}
          >
            <Link2 aria-hidden /> Create link
          </button>
        )}
      </Choice>

      <Choice
        icon={<Users aria-hidden />}
        title="Live collaboration"
        description="Work on this canvas together, in real time."
        points={["See each other's cursors and edits", 'Comment and talk it through', 'End-to-end encrypted']}
      >
        <button type="button" onClick={live.onStart} className={`${primary} ${wide}`}>
          <Play aria-hidden /> Start session
        </button>
      </Choice>

      {live.onConnectAgent && (
        <Choice
          icon={<Bot aria-hidden />}
          title="Pair with your AI agent"
          description="Sketch ideas with your agent, or have it explain how something works."
          points={['Draws and edits diagrams with you', 'Claude, ChatGPT, Cursor and more']}
        >
          <button type="button" onClick={live.onConnectAgent} className={`${secondary} ${wide}`}>
            <Plug aria-hidden /> Connect agent
          </button>
        </Choice>
      )}
    </div>
  );
}

export function ShareDialog({ model, live, baseUrl, focus, title = 'Share with your team', onClose, openLink }: ShareDialogProps) {
  // In the browser, a link to share; in a chat, one to open the diagram in the browser
  const from = live ? 'share' : 'chat';
  const url = useMemo(() => viewLink(baseUrl, model, { focus, from }), [baseUrl, model, focus, from]);
  const [status, setStatus] = useState<'idle' | 'copied' | 'copy-failed' | 'open-failed'>('idle');
  useEffect(() => {
    if (!url) track('share_link_too_big');
  }, [url]);

  const copy = async () => {
    if (!url) return;
    const ok = await copyToClipboard(url);
    setStatus(ok ? 'copied' : 'copy-failed');
    track('share_link_copied', { ok });
  };

  return (
    <Dialog open onClose={onClose} className="relative z-[80]">
      <DialogBackdrop transition className="fixed inset-0 bg-black/40 transition-opacity duration-150 data-closed:opacity-0" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className={`w-full ${live ? (live.roomUrl ? 'max-w-lg' : 'max-w-4xl') : 'max-w-md'} rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] shadow-2xl transition duration-150 data-closed:scale-[0.98] data-closed:opacity-0`}
        >
          {live ? (
            <>
              <div className="flex items-start justify-between px-6 pt-5">
                <div>
                  <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
                  {!live.roomUrl && <p className="mt-1 text-sm text-[rgb(var(--ec-page-text-muted))]">Choose how to work on this canvas with others.</p>}
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="-mr-1 rounded-md p-1.5 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))]! hover:text-[rgb(var(--ec-page-text))]!"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </div>
              <ShareChoices live={live} url={url} />
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 px-5 pt-5">
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
                  <p className="mt-1.5 text-sm font-light leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
                    {url
                      ? "Share it with your team, or paste it to your AI agent to build on: anyone with this link sees this diagram, with its levels. It's stored in the link itself, not on our servers."
                      : 'This diagram is too big to share as a link: save it to a file (from the menu) and share that instead.'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="-mr-1 -mt-1 rounded-md p-1.5 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))]! hover:text-[rgb(var(--ec-page-text))]!"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </div>

              {url && (
                <>
                  <div className="flex items-center gap-2 px-5 pt-4">
                    <div
                      title={url}
                      className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover))] px-3 text-sm text-[rgb(var(--ec-page-text-muted))]"
                    >
                      <Link2 aria-hidden className="h-4 w-4 flex-none" />
                      <span className="truncate font-mono text-xs">{shortened(url)}</span>
                    </div>
                    <button type="button" onClick={copy} className={primary}>
                      {status === 'copied' ? <Check aria-hidden /> : <Copy aria-hidden />}
                      {status === 'copied' ? 'Copied' : 'Copy link'}
                    </button>
                  </div>
                  {status === 'copy-failed' && (
                    <p className="px-5 pt-2 text-xs text-red-600">Couldn't copy here: open it in your browser and copy it from there.</p>
                  )}
                  {status === 'open-failed' && <p className="px-5 pt-2 text-xs text-red-600">This app can't open links: copy it instead.</p>}
                </>
              )}

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-[rgb(var(--ec-page-border))] px-5 py-3">
                {url && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await openLink(url);
                      setStatus(ok ? 'idle' : 'open-failed');
                      track('opened_in_browser', { ok, from: 'share' });
                    }}
                    className={`${secondary} mr-auto`}
                  >
                    <ExternalLink aria-hidden />
                    Open in browser
                  </button>
                )}
                <button type="button" onClick={onClose} className={secondary}>
                  Done
                </button>
              </div>
            </>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
