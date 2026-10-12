import { useEffect, useState } from "react";
import type { XYPosition } from "@xyflow/react";
import type { Moving, PresenceSource } from "./presence";
import { createSmoother } from "./smooth";

/**
 * Comment pins and hotspot markers being dragged in a live room: what I drag goes out with my presence (`send`, and
 * `null` once it's dropped: the drop goes in the document), and what the others drag comes from theirs (`source`).
 * On the level shown, as their places are.
 */
export type LiveMoves = {
  send: (moving: Moving[] | null) => void;
  source: PresenceSource;
  level: 1 | 2 | 3;
};

/** Sends where something of this kind is now, as it's dragged (or `null`, dropped) */
export const sendMove = (
  live: LiveMoves | undefined,
  kind: NonNullable<Moving["kind"]>,
  id: string,
  at: XYPosition | null,
) =>
  live?.send(
    at && [
      {
        id,
        kind,
        x: at.x,
        y: at.y,
        ...(live.level !== 3 && { level: live.level }),
      },
    ],
  );

const NONE: ReadonlyMap<string, XYPosition> = new Map();

/**
 * Where the others are dragging things of this kind on the level shown (by id), read from their presence. Changes
 * (re-rendering only the layer using it) only while someone drags one.
 */
export function useRemoteMoves(
  live: LiveMoves | undefined,
  kind: NonNullable<Moving["kind"]>,
) {
  const [moves, setMoves] = useState(NONE);
  const source = live?.source;
  const level = live?.level;
  useEffect(() => {
    if (!source) return;
    let shown = "";
    // (gliding, a step a frame, rather than jumping as each position arrives)
    const glide = createSmoother((at) => setMoves(at.size ? at : NONE));
    const show = (peers: ReturnType<PresenceSource["current"]>) => {
      const found = new Map<string, XYPosition>();
      peers.forEach((peer) =>
        peer.moving?.forEach(
          (move) =>
            move.kind === kind &&
            (move.level ?? 3) === level &&
            found.set(move.id, { x: move.x, y: move.y }),
        ),
      );
      const key = [...found]
        .map(([id, { x, y }]) => `${id}:${x}:${y}`)
        .join("|");
      if (key === shown) return;
      shown = key;
      glide.set(found);
    };
    show(source.current());
    const unsubscribe = source.subscribe(show);
    return () => {
      unsubscribe();
      glide.stop();
      setMoves(NONE);
    };
  }, [source, level, kind]);
  return moves;
}
