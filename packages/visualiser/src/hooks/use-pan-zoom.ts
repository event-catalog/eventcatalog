import { useCallback, useEffect, useRef } from "react";

export type PanZoomView = { x: number; y: number; scale: number };
type View = PanZoomView;

const MIN_SCALE = 0.05;
const MAX_SCALE = 4;
/**
 * Space left around the content when it's fitted: more above and below, for
 * the title and toolbar over it
 */
const FIT_PADDING = { x: 40, y: 80 };
/** How long the buttons (and double-click) take to zoom, as the diagram's do */
const ANIMATION_MS = 200;
/** How long after the last pan or zoom the content is drawn sharp again */
const SETTLE_MS = 150;

const clampScale = (scale: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Zoom factor for a wheel event, as React Flow works it out, so zooming feels
 * the same as on the diagram: proportional to how far the wheel or trackpad
 * moved (a pinch is a wheel event with ctrlKey), not a fixed step per event
 */
export const wheelZoomFactor = (event: WheelEvent) => {
  const factor = event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002;
  return Math.pow(2, -event.deltaY * factor * (event.ctrlKey ? 10 : 1));
};

interface PanZoomOptions {
  /**
   * Zoom with the wheel. Otherwise the wheel scrolls the page, and zooms only
   * with Ctrl or Cmd held (or a trackpad pinch), as on the diagram.
   */
  zoomOnScroll?: boolean;
  /** Called with the zoom as a percentage whenever it changes */
  onZoomChange?: (percent: number) => void;
  /** Called in the same frame as the view is drawn (e.g. to move a background with it) */
  onViewChange?: (view: PanZoomView) => void;
}

/**
 * Pans and zooms content (e.g. a rendered SVG) inside a viewport with a CSS
 * transform, applied at most once a frame. While moving, the content is a
 * composited layer (`will-change`), so the browser moves it without drawing it
 * again; once it settles, it's drawn sharp at its new size.
 *
 * Drag to pan, wheel or pinch to zoom around the pointer, double-click to zoom in.
 */
export const usePanZoom = ({
  zoomOnScroll = true,
  onZoomChange,
  onViewChange,
}: PanZoomOptions = {}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ x: 0, y: 0, scale: 1 });
  const size = useRef({ width: 0, height: 0 });
  const frame = useRef<number | null>(null);
  const animation = useRef<number | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPercent = useRef<number | null>(null);
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;

  const draw = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;
    const { x, y, scale } = view.current;
    content.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    onViewChangeRef.current?.(view.current);
    const percent = Math.round(scale * 100);
    if (percent !== lastPercent.current) {
      lastPercent.current = percent;
      onZoomChangeRef.current?.(percent);
    }
  }, []);

  // Draws the view on the next frame (once, however many events come in before it)
  const apply = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      draw();
    });
  }, [draw]);

  // Keeps the content a layer while it moves, and draws it sharp once it stops
  const moving = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;
    content.style.willChange = "transform";
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      content.style.willChange = "";
    }, SETTLE_MS);
  }, []);

  const stopAnimation = useCallback(() => {
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
  }, []);

  const setView = useCallback(
    (next: View, animate = false) => {
      stopAnimation();
      moving();
      if (!animate) {
        view.current = next;
        apply();
        return;
      }
      const from = { ...view.current };
      const start = performance.now();
      const step = (now: number) => {
        const t = easeOutCubic(Math.min(1, (now - start) / ANIMATION_MS));
        view.current = {
          x: from.x + (next.x - from.x) * t,
          y: from.y + (next.y - from.y) * t,
          scale: from.scale + (next.scale - from.scale) * t,
        };
        apply();
        moving();
        animation.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      animation.current = requestAnimationFrame(step);
    },
    [apply, moving, stopAnimation],
  );

  /** The view zoomed by a factor around a point in the viewport (keeping it where it is) */
  const zoomedAt = useCallback(
    (factor: number, px: number, py: number, from = view.current): View => {
      const scale = clampScale(from.scale * factor);
      const ratio = scale / from.scale;
      return {
        x: px - (px - from.x) * ratio,
        y: py - (py - from.y) * ratio,
        scale,
      };
    },
    [],
  );

  const viewportCenter = () => {
    const rect = viewportRef.current?.getBoundingClientRect();
    return rect ? { x: rect.width / 2, y: rect.height / 2 } : { x: 0, y: 0 };
  };

  const zoomBy = useCallback(
    (factor: number) => {
      const center = viewportCenter();
      // From where an animation in progress is going, so clicks add up
      setView(zoomedAt(factor, center.x, center.y), true);
    },
    [setView, zoomedAt],
  );
  const zoomIn = useCallback(() => zoomBy(1.2), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1 / 1.2), [zoomBy]);

  /** Fits the content in the viewport, no larger than its own size */
  const fitView = useCallback(
    (animate = true) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      const { width, height } = size.current;
      if (!rect || !width || !height) return;
      const scale = clampScale(
        Math.min(
          (rect.width - FIT_PADDING.x * 2) / width,
          (rect.height - FIT_PADDING.y * 2) / height,
          1,
        ),
      );
      setView(
        {
          x: (rect.width - width * scale) / 2,
          y: (rect.height - height * scale) / 2,
          scale,
        },
        animate,
      );
    },
    [setView],
  );

  /**
   * Sets the size of the content (e.g. a new diagram) and fits it straight
   * away, so it's never drawn where the last one was
   */
  const setContentSize = useCallback(
    (width: number, height: number) => {
      size.current = { width, height };
      fitView(false);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      draw();
    },
    [fitView, draw],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDistance = 0;
    const local = (event: { clientX: number; clientY: number }) => {
      const rect = viewport.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const handleWheel = (event: WheelEvent) => {
      if (!zoomOnScroll && !event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const point = local(event);
      setView(zoomedAt(wheelZoomFactor(event), point.x, point.y));
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      stopAnimation();
      viewport.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, local(event));
      viewport.style.cursor = "grabbing";
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const point = local(event);
      pointers.set(event.pointerId, point);
      if (pointers.size === 1) {
        const { x, y, scale } = view.current;
        setView({
          x: x + point.x - previous.x,
          y: y + point.y - previous.y,
          scale,
        });
        return;
      }
      // Two fingers: zoom around the point between them
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance > 0) {
        setView(
          zoomedAt(distance / pinchDistance, (a.x + b.x) / 2, (a.y + b.y) / 2),
        );
      }
      pinchDistance = distance;
    };

    const handlePointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      pinchDistance = 0;
      if (pointers.size === 0) viewport.style.cursor = "";
    };

    const handleDoubleClick = (event: MouseEvent) => {
      const point = local(event);
      setView(zoomedAt(2, point.x, point.y), true);
    };

    // Not passive, so zooming doesn't scroll the page too
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    viewport.addEventListener("pointerdown", handlePointerDown);
    viewport.addEventListener("pointermove", handlePointerMove);
    viewport.addEventListener("pointerup", handlePointerUp);
    viewport.addEventListener("pointercancel", handlePointerUp);
    viewport.addEventListener("dblclick", handleDoubleClick);
    return () => {
      viewport.removeEventListener("wheel", handleWheel);
      viewport.removeEventListener("pointerdown", handlePointerDown);
      viewport.removeEventListener("pointermove", handlePointerMove);
      viewport.removeEventListener("pointerup", handlePointerUp);
      viewport.removeEventListener("pointercancel", handlePointerUp);
      viewport.removeEventListener("dblclick", handleDoubleClick);
    };
  }, [zoomOnScroll, setView, zoomedAt, stopAnimation]);

  // Fits again when the viewport changes size (e.g. going full screen), as the diagram does
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;
    let last = { width: viewport.clientWidth, height: viewport.clientHeight };
    const observer = new ResizeObserver(() => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      if (width === last.width && height === last.height) return;
      last = { width, height };
      fitView(false);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [fitView]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      if (animation.current !== null) cancelAnimationFrame(animation.current);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  return {
    viewportRef,
    contentRef,
    setContentSize,
    fitView,
    zoomIn,
    zoomOut,
  };
};
