/**
 * Edge components for EventCatalog Visualizer
 */

// Import for edgeTypes object
import AnimatedMessageEdge from "./AnimatedMessageEdge";
import FlowEdge from "./FlowEdge";
import MultilineEdgeLabel from "./MultilineEdgeLabel";
import {
  LabelledDefaultEdge,
  LabelledSmoothStepEdge,
  LabelledStepEdge,
} from "./LabelledEdge";

// Re-export
export {
  AnimatedMessageEdge,
  FlowEdge,
  MultilineEdgeLabel,
  LabelledDefaultEdge,
  LabelledSmoothStepEdge,
  LabelledStepEdge,
};

// Re-export for convenience
export const edgeTypes = {
  animated: AnimatedMessageEdge,
  "flow-edge": FlowEdge,
  multiline: MultilineEdgeLabel,
  default: LabelledDefaultEdge,
  smoothstep: LabelledSmoothStepEdge,
  step: LabelledStepEdge,
};
