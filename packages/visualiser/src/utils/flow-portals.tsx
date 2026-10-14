import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useStore, type ReactFlowState } from "@xyflow/react";

/**
 * React Flow's `EdgeLabelRenderer` and `ViewportPortal`, without their cost: each finds its layer with
 * `domNode.querySelector` in a store selector, which runs for every one of them on every store update (every frame of
 * a drag, pan, zoom or someone else's move). That's one query per edge label, and the viewport portal's layer comes
 * after every node in the DOM, so each of its queries walks all the nodes. Here the layer is found once per canvas and
 * kept (found again only if it's gone).
 */
const layerSelector = (className: string) => {
  const found = new WeakMap<HTMLElement, Element | null>();
  return (state: ReactFlowState) => {
    const root = state.domNode;
    if (!root) return null;
    let layer = found.get(root);
    if (!layer?.isConnected) {
      layer = root.querySelector(className);
      found.set(root, layer);
    }
    return layer;
  };
};

const selectEdgeLabelLayer = layerSelector(".react-flow__edgelabel-renderer");
const selectViewportLayer = layerSelector(".react-flow__viewport-portal");

/** Instead of React Flow's `EdgeLabelRenderer`: HTML drawn over the edges, in the canvas's coordinates */
export function EdgeLabelPortal({ children }: { children: ReactNode }) {
  const layer = useStore(selectEdgeLabelLayer);
  return layer ? createPortal(children, layer) : null;
}

/** Instead of React Flow's `ViewportPortal`: drawn above the nodes, in the canvas's coordinates */
export function CanvasPortal({ children }: { children: ReactNode }) {
  const layer = useStore(selectViewportLayer);
  return layer ? createPortal(children, layer) : null;
}
