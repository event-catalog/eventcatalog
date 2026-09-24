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
