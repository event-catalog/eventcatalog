export interface GraphNode {
  id: string;
  type:
    | "domain"
    | "service"
    | "event"
    | "command"
    | "query"
    | "channel"
    | "entity"
    | "container"
    | "data"
    | "data-product"
    | "flow"
    | "actor"
    | "external-system"
    | "user"
    | "team"
    | "diagram"
    | "step";
  label: string;
  parentId?: string;
  metadata: Record<string, unknown>;
}

export type GraphEdgeType =
  | "sends"
  | "receives"
  | "publishes"
  | "subscribes"
  | "writes-to"
  | "reads-from"
  | "reads-writes"
  | "contains"
  | "owns"
  | "member-of"
  | "routes-to"
  | "flow-step";

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  label?: string;
}

/**
 * Returns the display label for a "receives" edge based on the message type.
 * Commands and queries use "accepts"; events fall back to the edge type.
 */
export function getReceivesLabel(
  messageType: GraphNode["type"],
): string | undefined {
  switch (messageType) {
    case "command":
    case "query":
      return "accepts";
    default:
      return undefined;
  }
}

export interface DslGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  visualizers?: string[];
  activeVisualizer?: string;
  title?: string;
  empty?: boolean;
  options?: {
    legend?: boolean;
    search?: boolean;
    toolbar?: boolean;
    focusMode?: boolean;
    animated?: boolean;
    style?: string;
  };
}
