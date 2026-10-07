import type { Awareness } from 'y-protocols/awareness';

/** About 30 times a second, like Excalidraw and tldraw: smooth for others, without a message on every mousemove */
export const PRESENCE_INTERVAL_MS = 33;

export type PresenceSender = {
  /** Share these fields of our presence: straight away if nothing was sent lately, otherwise with the next send */
  send: (fields: Record<string, unknown>) => void;
  /** Send anything waiting now (e.g. a node dropped, so the drop isn't behind the drag) */
  flush: () => void;
  destroy: () => void;
};

/**
 * Our presence (pointer, nodes being dragged, selection, view), sent to everyone at most every interval. Awareness
 * sends the whole state on every change, so fields changed together (the pointer and the node it drags) go in one
 * message, and the latest value always goes out (the pointer stops where it really stopped).
 */
export function createPresenceSender(awareness: Awareness, intervalMs = PRESENCE_INTERVAL_MS): PresenceSender {
  let pending: Record<string, unknown> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastSent = -Infinity;

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!pending) return;
    const fields = pending;
    pending = undefined;
    lastSent = performance.now();
    awareness.setLocalState({ ...awareness.getLocalState(), ...fields });
  };

  return {
    send: (fields) => {
      pending = { ...pending, ...fields };
      if (timer) return;
      timer = setTimeout(flush, Math.max(0, intervalMs - (performance.now() - lastSent)));
    },
    flush,
    destroy: () => {
      clearTimeout(timer);
      pending = undefined;
    },
  };
}
