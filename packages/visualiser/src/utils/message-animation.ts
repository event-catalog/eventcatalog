import type { Edge } from "@xyflow/react";

/**
 * Sets whether each edge simulates messages flowing along it. Only message
 * edges can animate; the rest keep their type.
 */
export const applyMessageAnimation = (
  edges: Edge[],
  animateMessages: boolean,
): Edge[] =>
  edges.map((edge) => {
    // Decided once per edge: toggling animation off changes the type to
    // "smoothstep", which would otherwise stop it animating again.
    const canAnimate =
      (edge.data?.canAnimate as boolean | undefined) ??
      !(
        edge.type === "flow-edge" ||
        edge.type === "multiline" ||
        edge.type === "default" ||
        edge.type === "step" ||
        edge.type === "smoothstep" ||
        edge.data?.animated === false
      );

    return {
      ...edge,
      animated: canAnimate ? animateMessages : false,
      type: !canAnimate
        ? edge.type || "default"
        : animateMessages
          ? "animated"
          : "smoothstep",
      data: {
        ...edge.data,
        canAnimate,
        animateMessages: canAnimate ? animateMessages : false,
        animated: canAnimate ? animateMessages : false,
      },
    };
  });

/** Graphs with more nodes than this don't simulate messages unless asked to, to keep the canvas responsive */
export const LARGE_GRAPH_NODE_THRESHOLD = 30;
/** Where the person's choice (the "Simulate messages" toggle) is kept */
export const ANIMATE_MESSAGES_STORAGE_KEY = "EventCatalog:animateMessages";

/**
 * Whether a graph simulates messages, in order: never for graphs that aren't message flows (`disabled`), as the
 * `animated` prop or the `?animate=` URL parameter say, else as the person last chose, except that large graphs
 * only do when asked (a choice made on a small graph would otherwise make every large one slow: each animated
 * edge repaints on every frame).
 */
export const shouldAnimateMessages = ({
  disabled,
  animated,
  nodeCount,
}: {
  disabled?: boolean;
  animated?: boolean;
  nodeCount: number;
}): boolean => {
  if (disabled) return false;
  if (animated !== undefined) return animated;
  const param = new URLSearchParams(window.location.search).get("animate");
  if (param === "true" || param === "false") return param === "true";
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(ANIMATE_MESSAGES_STORAGE_KEY);
  } catch {
    // Storage blocked: decided by the graph's size
  }
  return stored !== "false" && nodeCount <= LARGE_GRAPH_NODE_THRESHOLD;
};
