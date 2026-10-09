import { useCallback, useEffect, useRef } from 'react';
import { getViewportForBounds, useReactFlow, useStore, type Rect } from '@xyflow/react';
import { DIAGRAM_FIT_VIEW_OPTIONS } from '@eventcatalog/visualiser';
import type { Peer } from './presence-store';

/**
 * The camera follows agents as they work (like following someone in Figma): it keeps their pointer and what's
 * on the canvas in view, moving only when something they're doing goes out of view. Anyone panning, zooming or
 * dragging pauses it for a moment, so it never fights them.
 */

const FOLLOW_EVERY_MS = 500;
const MOVE_MS = 600;
const PAUSE_AFTER_USER_MS = 4000;
const POINTER_SIZE = 60;
const PADDING = 0.15;
const MAX_ZOOM = 1.1;

const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
};

/** Whether a rect is in view, inside a margin around the edges */
const inView = (rect: Rect, view: Rect, margin: number) =>
  rect.x >= view.x + margin &&
  rect.y >= view.y + margin &&
  rect.x + rect.width <= view.x + view.width - margin &&
  rect.y + rect.height <= view.y + view.height - margin;

export function useFollowCamera({
  enabled,
  fitsContent,
  agentsWorking,
  getAgents,
}: {
  enabled: boolean;
  /** Whether it fits the canvas's content when it arrives (the canvas people edit, not a level, fitted on its own) */
  fitsContent: boolean;
  /** Whether any agent is working on the canvas (has a pointer on it) */
  agentsWorking: boolean;
  /** The agents working, with where their pointers are now (read when the camera checks, not on every move) */
  getAgents: () => Peer[];
}) {
  const { getNodes, getNodesBounds, getViewport, setViewport, fitView } = useReactFlow();
  const hasNodes = useStore((state) => state.nodes.length > 0);
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const pausedUntil = useRef(0);
  const lastMove = useRef(0);
  const latest = useRef({ enabled, getAgents });
  latest.current = { enabled, getAgents };

  /** People moving the camera themselves take it over for a moment */
  const pause = useCallback(() => {
    pausedUntil.current = Date.now() + PAUSE_AFTER_USER_MS;
  }, []);

  // A canvas that opens empty and fills in (it syncs after it opens) fits once its content arrives, and so does an
  // empty canvas when something's added to it (rather than keeping however far out it was zoomed)
  const hasFitContent = useRef(false);
  useEffect(() => {
    if (!hasNodes) {
      hasFitContent.current = false;
      return;
    }
    if (hasFitContent.current || !width || !fitsContent) return;
    hasFitContent.current = true;
    // Fitted like the visualiser fits a diagram
    const frame = requestAnimationFrame(() => void fitView({ ...DIAGRAM_FIT_VIEW_OPTIONS, duration: 300 }));
    return () => cancelAnimationFrame(frame);
  }, [hasNodes, width, fitsContent]);

  const follow = useCallback(() => {
    const { enabled, getAgents } = latest.current;
    // Stopped (or a move is still going): leave the camera alone
    if (!enabled || performance.now() - lastMove.current < MOVE_MS) return;
    const agents = getAgents();
    const pointers = agents.flatMap((agent) => (agent.pointer ? [agent.pointer] : []));
    if (!pointers.length || !width || !height || Date.now() < pausedUntil.current) return;

    const { x, y, zoom } = getViewport();
    const view = { x: -x / zoom, y: -y / zoom, width: width / zoom, height: height / zoom };
    const margin = 40 / zoom;
    const pointerRects = pointers.map((pointer) => ({ x: pointer.x, y: pointer.y, width: POINTER_SIZE, height: POINTER_SIZE }));
    const touched = agents.flatMap((agent) => agent.selection);
    const touchedBounds = touched.length ? getNodesBounds(touched) : undefined;

    // Only move when what the agent is doing is out of view
    const needed = [...pointerRects, ...(touchedBounds ? [touchedBounds] : [])];
    if (needed.every((rect) => inView(rect, view, margin))) return;

    const nodes = getNodes();
    const everything = [...(nodes.length ? [getNodesBounds(nodes)] : []), ...needed].reduce(union);
    lastMove.current = performance.now();
    void setViewport(getViewportForBounds(everything, width, height, 0.1, MAX_ZOOM, PADDING), { duration: MOVE_MS });
  }, [width, height]);

  // While agents work, check every so often whether what they're doing is still in view
  useEffect(() => {
    if (!enabled || !agentsWorking) return;
    follow();
    const timer = setInterval(follow, FOLLOW_EVERY_MS);
    return () => clearInterval(timer);
  }, [enabled, agentsWorking, follow]);

  return { pause };
}
