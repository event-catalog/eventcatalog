import * as Y from 'yjs';
import { applyAwarenessUpdate, encodeAwarenessUpdate, type Awareness } from 'y-protocols/awareness';
import type { Status } from './hooks/use-studio-flow';

/**
 * Syncing a canvas through MCP tool calls, for when a view can't open the collaboration WebSocket
 * (e.g. an MCP App inside a chat whose sandbox blocks it). Each call sends the server what it doesn't have
 * yet (by its state vector) and our presence, and gets back what we don't have and everyone's presence.
 * Slower than the WebSocket (it polls), but works wherever the chat can call the MCP server's tools.
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
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = async () => {
    try {
      const response = await sync({
        canvasId,
        clientId: doc.clientID,
        stateVector: toBase64(Y.encodeStateVector(doc)),
        update: toBase64(Y.encodeStateAsUpdate(doc, serverVector)),
        awareness: toBase64(encodeAwarenessUpdate(awareness, [doc.clientID])),
      });
      if (stopped) return;
      Y.applyUpdate(doc, fromBase64(response.update), REMOTE);
      serverVector = fromBase64(response.stateVector);
      if (response.awareness) applyAwarenessUpdate(awareness, fromBase64(response.awareness), REMOTE);
      onStatus('connected');
    } catch {
      if (!stopped) onStatus('disconnected');
    }
    if (!stopped) timer = setTimeout(tick, intervalMs);
  };
  void tick();

  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
