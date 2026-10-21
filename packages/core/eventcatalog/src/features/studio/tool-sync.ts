import * as Y from 'yjs';
import { applyAwarenessUpdate, encodeAwarenessUpdate, type Awareness } from 'y-protocols/awareness';
import type { Status } from './hooks/use-studio-flow';

/**
 * Syncing a canvas through MCP tool calls, for when a view can't open the collaboration WebSocket
 * (e.g. an MCP App inside a chat whose sandbox blocks it). Each call sends the server what it doesn't have
 * yet (by its state vector) and our presence, and gets back what we don't have and everyone's presence.
 * Slower than the WebSocket (it polls), but works wherever the chat can call the MCP server's tools. It polls less
 * while nothing changes, and rarely while the view is out of sight (chats keep every view they showed running).
 */

export type SyncRequest = {
  canvasId: string;
  clientId: number;
  /** What we have, so the server sends only what we're missing */
  stateVector: string;
  /** What we have that the server doesn't (as of its last state vector) */
  update: string;
  /** Our presence (name, pointer, selection...) */
  awareness: string;
};
export type SyncResponse = { update: string; stateVector: string; awareness?: string };
export type ToolSync = (request: SyncRequest) => Promise<SyncResponse>;

// Binary Yjs updates travel as base64 in tool arguments and results (atob/btoa exist in browsers and Node)
export const toBase64 = (bytes: Uint8Array) => {
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
};
export const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

/** Applied with this origin, so undo (which tracks local changes) leaves other people's changes alone */
const REMOTE = Symbol('tool-sync');

/** Waiting longest between syncs while nothing changes on either side */
const IDLE_INTERVAL_MS = 5000;
/** Between syncs while the view is out of sight (slowed, not stopped: a host that wrongly reports it hidden still syncs) */
const OUT_OF_SIGHT_INTERVAL_MS = 15_000;

export function startToolSync(
  doc: Y.Doc,
  awareness: Awareness,
  {
    canvasId,
    sync,
    onStatus,
    intervalMs = 1000,
  }: { canvasId: string; sync: ToolSync; onStatus: (status: Status) => void; intervalMs?: number }
) {
  let serverVector: Uint8Array | undefined;
  let lastServerVector: string | undefined;
  let lastAwareness: string | undefined;
  let stopped = false;
  let syncing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dueAt = 0;
  // Slower while nothing changes (a chat keeps every view it showed running, each polling), back to quick on a change
  let delay = intervalMs;
  // Hosts keep a chat's earlier views running: one scrolled out of sight, or in a hidden tab, syncs rarely
  let inView = true;
  const isShown = () => inView && document.visibilityState !== 'hidden';

  const schedule = (ms: number) => {
    clearTimeout(timer);
    dueAt = Date.now() + ms;
    timer = setTimeout(tick, ms);
  };

  const tick = async () => {
    timer = undefined;
    if (stopped || syncing) return;
    syncing = true;
    try {
      const update = Y.encodeStateAsUpdate(doc, serverVector);
      const response = await sync({
        canvasId,
        clientId: doc.clientID,
        stateVector: toBase64(Y.encodeStateVector(doc)),
        update: toBase64(update),
        awareness: toBase64(encodeAwarenessUpdate(awareness, [doc.clientID])),
      });
      if (stopped) return;
      Y.applyUpdate(doc, fromBase64(response.update), REMOTE);
      serverVector = fromBase64(response.stateVector);
      if (response.awareness) applyAwarenessUpdate(awareness, fromBase64(response.awareness), REMOTE);
      // Anything new either way (the canvas, or anyone's presence) keeps it quick
      const changed = response.stateVector !== lastServerVector || response.awareness !== lastAwareness;
      lastServerVector = response.stateVector;
      lastAwareness = response.awareness;
      delay = changed ? intervalMs : Math.min(delay * 1.5, IDLE_INTERVAL_MS);
      onStatus('connected');
    } catch {
      if (!stopped) onStatus('disconnected');
    } finally {
      syncing = false;
    }
    // Out of sight: rarely, and straight away again once it's shown (see show)
    if (!stopped) schedule(isShown() ? delay : Math.max(delay, OUT_OF_SIGHT_INTERVAL_MS));
  };

  // Our own changes and presence go out within the quick interval, however long it's been waiting
  const wake = (_update: unknown, origin: unknown) => {
    if (origin === REMOTE || stopped) return;
    delay = intervalMs;
    if (timer && dueAt > Date.now() + intervalMs) schedule(intervalMs);
  };
  doc.on('update', wake);
  awareness.on('update', wake);

  const show = () => {
    if (stopped || !isShown() || syncing || dueAt <= Date.now() + intervalMs) return;
    clearTimeout(timer);
    delay = intervalMs;
    void tick();
  };
  document.addEventListener('visibilitychange', show);
  // Seen from inside the chat's frame: whether the view is on the screen at all
  const observer =
    typeof IntersectionObserver === 'undefined'
      ? undefined
      : new IntersectionObserver(([entry]) => {
          inView = entry?.isIntersecting ?? true;
          show();
        });
  observer?.observe(document.documentElement);

  void tick();

  return () => {
    stopped = true;
    clearTimeout(timer);
    doc.off('update', wake);
    awareness.off('update', wake);
    document.removeEventListener('visibilitychange', show);
    observer?.disconnect();
  };
}
