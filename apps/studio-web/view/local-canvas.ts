/**
 * The canvas being worked on in the browser, kept in this browser (as Excalidraw keeps its scene): opening the site
 * again brings it back. Nothing goes to a server, and the address bar isn't rewritten as it changes; links are made
 * when it's shared. In chats, the diagram is the agent's tool result instead (the host's frame may not have storage).
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
