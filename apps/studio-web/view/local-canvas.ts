/**
 * The canvas being worked on in the browser, kept in this browser (as Excalidraw keeps its scene): opening the site
 * again brings it back. Nothing goes to a server, and the address bar isn't rewritten as it changes; links are made
 * when it's shared. In chats, the diagram is the agent's tool result, and what people change on it is kept by the
 * result's stamp (below; the host's frame may not have storage, then it's as the agent drew it).
 */
import * as Y from 'yjs';
import { type ArchitecturePayload, type Model } from '@eventcatalog/visualiser/model';

const KEY = 'eventcatalog-studio-canvas';

/** A canvas with nothing on it yet (it welcomes them: open a file, connect an agent) */
export const BLANK_PAYLOAD: ArchitecturePayload = { model: { title: 'Untitled diagram', resources: [], relations: [] } };
const VERSION = 1;

/**
 * A live room's copy also keeps the room's document itself (a Yjs update, base64): opened again, the canvas starts
 * from it, so what the others send merges into the same notes and nodes. Started again from the model instead, what
 * has no lasting id (notes and text) comes back as new things beside the room's, and the copy's older values compete
 * with the room's newer ones.
 */
type Saved = { version: number; savedAt: number; model: Model; level?: ArchitecturePayload['level']; doc?: string };

/** A canvas kept here: in a room, with the room's document as it was */
export type LocalPayload = ArchitecturePayload & { doc?: Uint8Array };

// The browser's own where it has them (Chrome 140, Safari 18.2, Firefox 133): a live room's canvas is saved after
// every change, and these were ~230 times faster on a 46 KB document (0.004 ms against 0.9 ms; 0.03 against 1.7 to read)
type Base64Bytes = Uint8Array & { toBase64?: () => string };
const fromBase64Native = (Uint8Array as { fromBase64?: (text: string) => Uint8Array }).fromBase64;
const toBase64 = (bytes: Base64Bytes) => {
  if (bytes.toBase64) return bytes.toBase64();
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
};
const fromBase64 = (text: string) =>
  fromBase64Native ? fromBase64Native(text) : Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

/** Where a canvas is kept: this browser's own, or its copy of a live room's (by the room's id) */
const keyFor = (room?: string) => (room ? `${KEY}:room:${room}` : KEY);

/** The canvas kept in this browser (or its copy of a room's), if there's one */
export function loadLocalCanvas(room?: string): LocalPayload | undefined {
  try {
    const raw = localStorage.getItem(keyFor(room));
    if (!raw) return undefined;
    const saved = JSON.parse(raw) as Saved;
    if (saved.version !== VERSION || !Array.isArray(saved.model?.resources)) return undefined;
    return { model: saved.model, ...(saved.level && { level: saved.level }), ...(room && saved.doc && { doc: fromBase64(saved.doc) }) };
  } catch {
    return undefined;
  }
}

/** Whether a model has anything on it (resources or notes) */
export const hasContent = (model?: Model) => !!model && (model.resources.length > 0 || (model.notes?.length ?? 0) > 0);

/**
 * Keeps the canvas in this browser. False when it couldn't be (storage blocked, e.g. a private window, or full):
 * the canvas works on, it just won't be there next time.
 */
export function saveLocalCanvas(model: Model, level?: ArchitecturePayload['level'], room?: string, doc?: Y.Doc): boolean {
  try {
    const saved: Saved = { version: VERSION, savedAt: Date.now(), model, ...(level && { level }), ...(room && doc && { doc: toBase64(Y.encodeStateAsUpdate(doc)) }) };
    localStorage.setItem(keyFor(room), JSON.stringify(saved));
    return true;
  } catch {
    return false;
  }
}

// ---- Diagrams in chats ----
// Hosts show a diagram again whenever its conversation is opened again, from the tool result: as the agent drew it.
// The diagram as it is now (with what people and the agent changed on it since) is kept here under its diagramId, and
// so is that it's been shown, so it opens as it was left, without the agent's build playing again.

const CHAT_KEY = `${KEY}:chat`;
const CHAT_INDEX_KEY = `${KEY}:chats`;
// The most recent diagrams kept (a few MB at most: storage is ~5 MB an origin)
const MAX_CHAT_VIEWS = 20;

type ChatView = { version: number; savedAt: number; model?: Model };

const readIndex = (): string[] => {
  try {
    const ids = JSON.parse(localStorage.getItem(CHAT_INDEX_KEY) ?? '[]');
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

function readChatView(id: string): ChatView | undefined {
  try {
    const raw = localStorage.getItem(`${CHAT_KEY}:${id}`);
    const saved = raw ? (JSON.parse(raw) as ChatView) : undefined;
    return saved?.version === VERSION ? saved : undefined;
  } catch {
    return undefined;
  }
}

/** Keeps a diagram from a chat (the most recent last), forgetting the oldest beyond the most kept */
function keepChatView(id: string, view: ChatView) {
  const ids = [...readIndex().filter((kept) => kept !== id), id];
  const forget = ids.splice(0, Math.max(0, ids.length - MAX_CHAT_VIEWS));
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      for (const old of forget) localStorage.removeItem(`${CHAT_KEY}:${old}`);
      localStorage.setItem(`${CHAT_KEY}:${id}`, JSON.stringify(view));
      localStorage.setItem(CHAT_INDEX_KEY, JSON.stringify(ids));
      return true;
    } catch {
      // Full: the older half goes, then once more
      forget.push(...ids.splice(0, Math.floor((ids.length - 1) / 2)));
    }
  }
  return false;
}

/** A diagram from a chat, if it's been shown here before: with the model as it was left, if it was changed */
export function loadChatView(id: string): { model?: Model } | undefined {
  const saved = readChatView(id);
  if (!saved) return undefined;
  return Array.isArray(saved.model?.resources) ? { model: saved.model } : {};
}

/** Notes that a diagram from a chat has been shown (keeping its model, if it was changed) */
export function markChatViewShown(id: string) {
  if (!readChatView(id)) keepChatView(id, { version: VERSION, savedAt: Date.now() });
}

/** Keeps a diagram from a chat as it is now. False when it couldn't be */
export const saveChatView = (id: string, model: Model) => keepChatView(id, { version: VERSION, savedAt: Date.now(), model });
