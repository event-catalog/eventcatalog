import { memo, useEffect } from "react";
import {
  useStore,
  useUpdateNodeInternals,
  type ReactFlowState,
} from "@xyflow/react";

const selectDomNode = (state: ReactFlowState) => state.domNode;

/**
 * Measures a node's handles again once it has finished animating in or resizing. React Flow measures them when the
 * node appears, part way through its pop in (`studio-node-in`, which scales it), and doesn't again while its size
 * stays the same: edges would join a node short of its sides (far short of a container's). Same for a container
 * growing to fit what's in it (its size eases in, `is-container-resize`). One listener for the whole canvas, and one
 * update a frame for everything that finished in it (a container's width and height transitions end separately).
 * Render it inside `<ReactFlow>`.
 */
export const RemeasureHandles = memo(function RemeasureHandles() {
  const domNode = useStore(selectDomNode);
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    if (!domNode) return;
    const pending = new Set<string>();
    let frame = 0;
    const flush = () => {
      frame = 0;
      updateNodeInternals([...pending]);
      pending.clear();
    };
    const remeasure = (event: AnimationEvent | TransitionEvent) => {
      const element = event.target as HTMLElement;
      if (!element.classList?.contains("react-flow__node")) return;
      const resized =
        event.type === "transitionend"
          ? ["width", "height"].includes(
              (event as TransitionEvent).propertyName,
            )
          : (event as AnimationEvent).animationName === "studio-node-in";
      const id = element.dataset.id;
      if (!resized || !id) return;
      pending.add(id);
      frame ||= requestAnimationFrame(flush);
    };
    domNode.addEventListener("animationend", remeasure);
    domNode.addEventListener("transitionend", remeasure);
    return () => {
      cancelAnimationFrame(frame);
      domNode.removeEventListener("animationend", remeasure);
      domNode.removeEventListener("transitionend", remeasure);
    };
  }, [domNode, updateNodeInternals]);
  return null;
});
