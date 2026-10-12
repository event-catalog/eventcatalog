/**
 * What the others on a live canvas are doing that the canvas shows as they do it, whatever carries it between them
 * (Yjs awareness, or an encrypted relay): what they're dragging, and the note or text they're changing. What they end
 * up with arrives in the document.
 */

/**
 * A node someone's dragging, where it is now (relative to its container, as nodes are), and on which level (L1 and L2
 * are arranged on their own; none is the canvas itself, L3). A comment pin or hotspot marker has its `kind` (and its
 * thread's or hotspot's id), where it is on the canvas.
 */
export type Moving = {
  id: string;
  x: number;
  y: number;
  level?: 1 | 2;
  kind?: "comment" | "hotspot";
};

/** A note or text being changed: what's written as they type, a text's size as they scale it, its angle as they turn it */
export type Editing = {
  id: string;
  text?: string;
  fontSize?: number;
  angle?: number;
};

/** Someone on the canvas, as far as what they move and change goes */
export type LivePeer = {
  /** What they're dragging, while they drag (the drop itself arrives in the document) */
  moving?: Moving[] | null;
  editing?: Editing | null;
};

/**
 * Everyone's presence, for what draws it: read now, and told on every change, outside React (it changes many times a
 * second; in React state it would re-render the whole canvas on every move)
 */
export type PresenceSource<P extends LivePeer = LivePeer> = {
  current: () => ReadonlyMap<string, P>;
  subscribe: (listener: (peers: ReadonlyMap<string, P>) => void) => () => void;
};
