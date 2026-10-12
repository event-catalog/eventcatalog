import type { Awareness } from 'y-protocols/awareness';

/** About 30 times a second, like Excalidraw and tldraw: smooth for others, without a message on every mousemove */
export const PRESENCE_INTERVAL_MS = 33;
/**
 * Once a second when nobody else is on the canvas (people or agents), as tldraw does: nobody sees it, and the
 * collaboration server sends every one back. Someone arriving gets what's waiting straight away.
 */
export const ALONE_INTERVAL_MS = 1000;

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
export function createPresenceSender(
  awareness: Awareness,
  intervalMs = PRESENCE_INTERVAL_MS,
  aloneIntervalMs = ALONE_INTERVAL_MS
): PresenceSender {
  let pending: Record<string, unknown> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastSent = -Infinity;
  const alone = () => awareness.getStates().size <= 1;

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!pending) return;
    const fields = pending;
    pending = undefined;
    lastSent = performance.now();
    awareness.setLocalState({ ...awareness.getLocalState(), ...fields });
  };
  // Someone arrived: they get what's waiting now, not at the next (slower) send
  const onChange = ({ added }: { added: number[] }) => {
    if (pending && added.some((id) => id !== awareness.clientID)) flush();
  };
  awareness.on('change', onChange);

  return {
    send: (fields) => {
      pending = { ...pending, ...fields };
      if (timer) return;
      const interval = alone() ? aloneIntervalMs : intervalMs;
      timer = setTimeout(flush, Math.max(0, interval - (performance.now() - lastSent)));
    },
    flush,
    destroy: () => {
      clearTimeout(timer);
      pending = undefined;
      awareness.off('change', onChange);
    },
  };
}
