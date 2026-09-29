/**
 * Utility functions for EventCatalog Visualizer
 * These are framework-agnostic utilities for working with node graphs
 */

// Mermaid export
export { convertToMermaid, type MermaidExportOptions } from "./export-mermaid";

// Node graph export
export { exportNodeGraphForStudio } from "./export-node-graph";

// Dagre and node generation utilities
export * from "./utils/utils";

// Layout utilities (DSL graph → ReactFlow nodes/edges)
export { layoutGraph, buildNodeData } from "./layout";

// Grouping a flow's steps (by domain, system or team)
export {
  isFlowGroupBy,
  type FlowGroupBy,
  type FlowGroupStyle,
} from "./swimlanes";
