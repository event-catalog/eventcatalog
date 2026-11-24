/** Labels, colours and documentation links for the kinds of node a diagram draws (used by the flow walkthrough) */
import type { Node } from "@xyflow/react";

export const NODE_COLOR_CLASSES: Record<string, string> = {
  events: "bg-[#ef5f00]",
  agent: "bg-[#0797b9]",
  agents: "bg-[#0797b9]",
  agentTool: "bg-[#654dc4]",
  "agent-tool": "bg-[#654dc4]",
  services: "bg-[#cf3897]",
  flows: "bg-[#0d9b8a]",
  commands: "bg-[#0588f0]",
  queries: "bg-[#2b9a66]",
  channels: "bg-[#838383]",
  systems: "bg-[#8347b9]",
  externalSystem: "bg-[#cf3897]",
  actor: "bg-[#ffc53d]",
  step: "bg-[#646464]",
  data: "bg-[#0588f0]",
  "data-products": "bg-[#3358d4]",
  domains: "bg-[#ffba18]",
  entities: "bg-[#8347b9]",
  field: "bg-[#0797b9]",
  messageGroup: "bg-[#654dc4]",
  messageGroupExpanded: "bg-[#654dc4]",
};

export const NODE_TYPE_LABELS: Record<string, string> = {
  events: "Event",
  agent: "Agent",
  agents: "Agent",
  agentTool: "Agent Tool",
  "agent-tool": "Agent Tool",
  services: "Service",
  flows: "Flow",
  commands: "Command",
  queries: "Query",
  channels: "Channel",
  systems: "System",
  externalSystem: "External System",
  actor: "Actor",
  step: "Step",
  data: "Data",
  "data-products": "Data Product",
  domains: "Domain",
  entities: "Entity",
  field: "Field",
  messageGroup: "Message Group",
  messageGroupExpanded: "Message Group",
};

// Mapping from entity key to doc path
const DOC_PATH_MAP: Record<string, string> = {
  service: "services",
  agent: "agents",
  flow: "flows",
  channel: "channels",
  system: "systems",
  domain: "domains",
  entity: "entities",
  dataProduct: "data-products",
};

/**
 * Get the documentation URL for a node
 */
export function getNodeDocUrl(
  node: Pick<Node, "type" | "data">,
): string | null {
  const nodeType = node.type || "unknown";
  const data = node.data as any;

  // Handle message type separately due to type mapping
  if (data.message) {
    const id = data.message.data?.id || data.message.id || "";
    const version = data.message.data?.version || data.message.version || "";
    const collectionType =
      nodeType === "events"
        ? "events"
        : nodeType === "commands"
          ? "commands"
          : "queries";
    return id && version ? `/docs/${collectionType}/${id}/${version}` : null;
  }

  // Handle data/container nodes with nested data.data structure
  if (data.data && nodeType === "data") {
    const id = data.data.id || "";
    const version = data.data.version || "";
    return id && version ? `/docs/containers/${id}/${version}` : null;
  }

  // Handle standard entity types
  for (const [key, path] of Object.entries(DOC_PATH_MAP)) {
    if (data[key]) {
      const id = data[key].data?.id || data[key].id || "";
      const version = data[key].data?.version || data[key].version || "";
      return id && version ? `/docs/${path}/${id}/${version}` : null;
    }
  }

  return null;
}

// Where nodes keep the resource they show (e.g. data.service), as EventCatalog's node graphs build them
const RESOURCE_KEYS = [
  "agent",
  "service",
  "message",
  "flow",
  "channel",
  "domain",
  "system",
  "entity",
  "dataProduct",
  "agentTool",
  "data",
] as const;

export interface NodeInfo {
  name: string;
  version?: string;
  summary?: string;
}

/** The name, version and summary of what a node shows (the resource in its data, or the data itself) */
export function getNodeInfo(node: Pick<Node, "id" | "data">): NodeInfo {
  const data = node.data as Record<string, any>;
  const key = RESOURCE_KEYS.find(
    (candidate) => data[candidate] && typeof data[candidate] === "object",
  );
  const entity = key ? data[key] : undefined;
  // Some nodes hold the catalog entry (its fields in `data`), others its fields
  const fields = entity?.data ?? entity ?? {};
  const name =
    fields.name || entity?.name || fields.id || data.label || data.name;
  const version = fields.version || entity?.version || data.version;
  const summary = fields.summary || entity?.summary || data.summary;
  return {
    name: String(name || node.id),
    ...(version && { version: String(version) }),
    ...(summary && { summary: String(summary) }),
  };
}
