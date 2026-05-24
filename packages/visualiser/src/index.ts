/**
 * @eventcatalog/visualizer
 *
 * Framework-agnostic visualizer components for EventCatalog
 */

// Types
export type {
  BaseNodeData,
  NodeType,
  EdgeType,
  VisualizerCallbacks,
  NodeConfiguration,
  VisualizerMode,
  VisualizerLink,
  EventCatalogResource,
  Message,
  Agent,
  AgentTool,
  Channel,
  ExternalSystem,
  Data,
  View,
  RegisteredNode,
  NodeCategory,
  ContextMenuItem,
  GraphNode,
  GraphEdge,
  GraphEdgeType,
  DslGraph,
} from "./types";
// Re-export Service type under a non-colliding name so the `Service` React
// component value export from ./nodes survives the barrel merge.
export type { Service as ServiceType } from "./types";

// Components
export * from "./components";

// Nodes
export * from "./nodes";

// Edges
export * from "./edges";

// Utils
export * from "./utils";
