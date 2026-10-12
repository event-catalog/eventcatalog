/**
 * Smooths what the others in a live room are moving. Their positions arrive about 30 times a second (and unevenly,
 * as the network goes), while the screen draws 60 to 120 times a second: shown as they arrive, what they drag steps
 * along and stutters. Here each one glides to where it was last said to be, a step every frame, easing in about
 * EASE_MS (a little behind them, smoothly). Frames only run while something's still gliding.
 */
type XY = { x: number; y: number };

const EASE_MS = 45;
// Close enough to stop (in canvas pixels)
const SETTLED_PX = 0.5;

export type Smoother = {
  /** Where each thing (by id) is now, as the others say; anything left out stops being shown straight away */
  set: (targets: ReadonlyMap<string, XY>) => void;
  stop: () => void;
};

export function createSmoother(
  apply: (shown: ReadonlyMap<string, XY>) => void,
): Smoother {
  let targets: ReadonlyMap<string, XY> = new Map();
  const shown = new Map<string, XY>();
  let frame = 0;
  let last = 0;

  const step = (now: number) => {
    frame = 0;
    // (the first frame after a pause steps as one frame would)
    const elapsed = last ? Math.min(now - last, 100) : 16;
    last = now;
    const ease = 1 - Math.exp(-elapsed / EASE_MS);
    let gliding = false;
    for (const [id, to] of targets) {
      const from = shown.get(id);
      if (!from) {
        // New: where it's said to be (it starts where they picked it up, next to where it is here)
        shown.set(id, to);
        continue;
      }
      const x = from.x + (to.x - from.x) * ease;
      const y = from.y + (to.y - from.y) * ease;
      if (Math.abs(to.x - x) < SETTLED_PX && Math.abs(to.y - y) < SETTLED_PX)
        shown.set(id, to);
      else {
        shown.set(id, {
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
        });
        gliding = true;
      }
    }
    apply(new Map(shown));
    if (gliding) frame = requestAnimationFrame(step);
    else last = 0;
  };

  return {
    set(next) {
      targets = next;
      // What they've let go of goes straight away (its drop arrives in the document)
      let dropped = false;
      for (const id of shown.keys())
        if (!next.has(id)) (shown.delete(id), (dropped = true));
      if (dropped && !next.size) {
        cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
        return apply(new Map());
      }
      if (!frame) frame = requestAnimationFrame(step);
    },
    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      shown.clear();
      targets = new Map();
    },
  };
}
