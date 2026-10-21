/**
 * The model in a URL fragment (`/view#m=...`): compressed, so the browser view can show it without the server
 * ever storing it. Browsers don't send the fragment to the server.
 */
import LZString from 'lz-string';
import { LEVELS, Model } from '@eventcatalog/visualiser/model';

export const MAX_FRAGMENT_LENGTH = 32 * 1024;

export const encodeModel = (model: Model) => LZString.compressToEncodedURIComponent(JSON.stringify(model));

export function decodeModel(encoded: string): Model | undefined {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return undefined;
    const parsed = Model.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Where a link was made, for the view's analytics (how people arrive): by an agent (the server), shared from the view,
 * or opened in the browser from a chat. A word in the fragment, never sent to the server
 */
export type LinkSource = 'agent' | 'share' | 'chat';
export type ViewLinkOptions = { focus?: string; level?: (typeof LEVELS)[number]; from?: LinkSource };
const LINK_SOURCES = new Set<string>(['agent', 'share', 'chat']);

/** The browser view's link for the model, or undefined when it's too big for a URL */
export function viewLink(baseUrl: string, model: Model, { focus, level, from }: ViewLinkOptions = {}) {
  const params = new URLSearchParams({ m: encodeModel(model) });
  if (focus) params.set('f', focus);
  if (level) params.set('l', level);
  if (from) params.set('s', from);
  const fragment = params.toString();
  if (fragment.length > MAX_FRAGMENT_LENGTH) return undefined;
  return `${baseUrl.replace(/\/$/, '')}/view#${fragment}`;
}

/** The model, focus and level from a view link's fragment (or a whole view link; older links' walkthroughs, `t`, are left out) */
export function parseViewFragment(hash: string) {
  const params = new URLSearchParams(hash.slice(hash.indexOf('#') + 1));
  const encoded = params.get('m');
  const from = params.get('s');
  return {
    model: encoded ? decodeModel(encoded) : undefined,
    focus: params.get('f') ?? undefined,
    // One of the levels, or none: it's a word anyone can put in a link, and it's shown and counted (analytics)
    level: LEVELS.find((level) => level === params.get('l')),
    from: from && LINK_SOURCES.has(from) ? (from as LinkSource) : undefined,
  };
}
