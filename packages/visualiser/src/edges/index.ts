/**
 * Edge components for EventCatalog Visualizer
 */

// Import for edgeTypes object
import AnimatedMessageEdge from "./AnimatedMessageEdge";
import FlowEdge from "./FlowEdge";
import MultilineEdgeLabel from "./MultilineEdgeLabel";

// Re-export
export { AnimatedMessageEdge, FlowEdge, MultilineEdgeLabel };

// Re-export for convenience
export const edgeTypes = {
  animated: AnimatedMessageEdge,
  "flow-edge": FlowEdge,
  multiline: MultilineEdgeLabel,
};
