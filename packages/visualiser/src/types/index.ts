import type { Node, Connection, MarkerType } from "@xyflow/react";

/**
 * EventCatalog resource mode
 */
export type EventCatalogResource = {
  mode: "simple" | "full";
  collection?: string;
  filePath?: string;
  id?: string;
};

/**
 * Message types (Events, Commands, Queries)
 */
export type Message = {
  name: string;
  version: string;
  summary: string;
  owners?: string[];
  producers?: string[];
  consumers?: string[];
};

/**
 * Service type
 */
export type Service = {
  name: string;
  version: string;
  summary: string;
  owners?: string[];
  sends?: string[];
  receives?: string[];
};

/**
 * Channel type
 */
export type Channel = {
  name: string;
  version: string;
  summary: string;
  owners?: string[];
  parameters?: Record<string, string>;
  protocols?: string[];
  address?: string;
};

/**
 * External System type
 */
export type ExternalSystem = {
  name: string;
  version: string;
  summary: string;
};

/**
 * Data type
 */
export type Data = {
  name: string;
  version: string;
  summary: string;
  owners?: string[];
  type?: string;
  schemas?: string[];
};

/**
 * View type
 */
export type View = {
  name: string;
  version: string;
  summary: string;
  owners?: string[];
  screenshot?: string;
};

/**
 * Generic node data structure - framework agnostic
 */
export interface BaseNodeData {
  id: string;
  version?: string;
  name?: string;
  summary?: string;
  markdown?: string;
  badges?: Array<{
    content: string;
    textColor?: string;
    backgroundColor?: string;
  }>;
  group?: {
    id: string;
    name: string;
    type: string;
  };
  [key: string]: any;
}

/**
 * Node types supported by the visualizer
 */
export type NodeType =
  | "service"
  | "services"
  | "event"
  | "events"
  | "command"
  | "commands"
  | "query"
  | "queries"
  | "domain"
  | "domains"
  | "flow"
  | "flows"
  | "channel"
  | "channels"
  | "entity"
  | "entities"
  | "step"
  | "user"
  | "custom"
  | "externalSystem"
  | "external-system"
  | "data"
  | "view"
  | "actor"
  | "data-product"
  | "data-products"
  | "note";

/**
 * Edge types supported by the visualizer
 */
export type EdgeType = "default" | "animated" | "multiline" | "flow-edge";

/**
 * Callback types for framework integration
 */
export interface VisualizerCallbacks {
  /** Called when a node is clicked */
  onNodeClick?: (node: Node<BaseNodeData>) => void;
  /** Called to build a URL for a node (for linking) */
  onBuildNodeUrl?: (node: Node<BaseNodeData>) => string;
  /** Called when navigation should occur */
  onNavigate?: (url: string) => void;
}

/**
 * Configuration for node registration
 */
export interface NodeConfiguration {
  type: string;
  icon: React.ComponentType;
  color: string;
  targetCanConnectTo?: string[];
  sourceCanConnectTo?: string[];
  validateConnection?: (connection: Connection) => boolean;
  getEdgeOptions?: (connection: Connection) => {
    label: string;
    markerEnd: { type: MarkerType; color: string };
  };
  defaultData?: any;
  editor?: {
    title: string;
    subtitle: string;
    schema: any;
  };
}

/**
 * Registered node type
 */
export type RegisteredNode = {
  type: string;
  category: string;
  component: React.ComponentType<any>;
  configuration: NodeConfiguration;
};

/**
 * Node category
 */
export type NodeCategory = {
  type: string;
  label: string;
  icon: React.ComponentType;
};

/**
 * Context menu item for node right-click menus
 */
export type ContextMenuItem = {
  label: string;
  href: string;
  download?: string;
  external?: boolean;
  separator?: boolean;
};

/**
 * Visualizer mode
 */
export type VisualizerMode = "full" | "simple";

/**
 * Link to other visualizer views
 */
export interface VisualizerLink {
  label: string;
  url: string;
}
