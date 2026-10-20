import type { Node } from "@xyflow/react";

/**
 * How the minimap draws each kind of node, so it looks like the diagram: each resource in its colour (the
 * `--ec-minimap-<kind>` variables in styles-core.css and styles.css, for light and dark), and containers (domains,
 * systems, groups) outlined in theirs, with what's in them drawn inside.
 *
 * The minimap re-renders while the diagram pans and nodes are dragged, so this is a static lookup by node type.
 */

export type MiniMapKind =
  | "event"
  | "command"
  | "query"
  | "service"
  | "channel"
  | "data"
  | "agent"
  | "view"
  | "message-group"
  | "system"
  | "external"
  | "domain"
  | "actor"
  | "flow"
  | "entity"
  | "note"
  | "other";

// Node types as the visualiser's diagrams (singular and plural) and Studio's canvases name them
const KIND_BY_TYPE: Record<string, MiniMapKind> = {
  event: "event",
  events: "event",
  command: "command",
  commands: "command",
  query: "query",
  queries: "query",
  service: "service",
  services: "service",
  channel: "channel",
  channels: "channel",
  data: "data",
  container: "data",
  "data-product": "data",
  "data-products": "data",
  agent: "agent",
  agents: "agent",
  view: "view",
  agentTool: "message-group",
  "agent-tool": "message-group",
  messageGroup: "message-group",
  messageGroupExpanded: "message-group",
  system: "system",
  systems: "system",
  "system-group": "system",
  externalSystem: "external",
  "external-system": "external",
  domain: "domain",
  domains: "domain",
  "context-domain": "domain",
  "domain-group": "domain",
  actor: "actor",
  "context-actor": "actor",
  user: "actor",
  flow: "flow",
  flows: "flow",
  flowExpanded: "flow",
  entity: "entity",
  entities: "entity",
  field: "entity",
  note: "note",
};

// Nodes that hold others: outlined, so what's in them shows through
const CONTAINER_TYPES = new Set([
  "domain-group",
  "system-group",
  "group",
  "swimlane",
  "messageGroupExpanded",
  "flowExpanded",
]);

export const getMiniMapKind = (type?: string): MiniMapKind =>
  (type && KIND_BY_TYPE[type]) || "other";

// A system outside the organisation (a third party, e.g. Stripe): its card keeps it on `system.scope`, Studio on `scope`
const isExternal = (data: Node["data"] | undefined) =>
  data?.scope === "external" ||
  (data?.system as { scope?: string } | undefined)?.scope === "external";

/** The minimap's class names for a node: its kind, whether it's a container, and whether it's an external system */
export const getMiniMapNodeClassName = (
  node: Pick<Node, "type" | "data">,
): string => {
  const { type } = node;
  let className = `ec-minimap-node ec-minimap-${getMiniMapKind(type)}`;
  if (type && CONTAINER_TYPES.has(type)) className += " ec-minimap-container";
  if (isExternal(node.data)) className += " ec-minimap-external";
  return className;
};

/** Where the person's choice to show the minimap is kept, so it stays on across levels and diagrams */
export const SHOW_MINIMAP_STORAGE_KEY = "EventCatalog:showMinimap";

/** Whether the person last chose to show the minimap (hidden until they do, or when storage is blocked) */
export const getStoredShowMinimap = (): boolean => {
  try {
    return localStorage.getItem(SHOW_MINIMAP_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

export const storeShowMinimap = (show: boolean) => {
  try {
    localStorage.setItem(SHOW_MINIMAP_STORAGE_KEY, String(show));
  } catch {
    // Storage blocked: the minimap is shown or hidden until the diagram is left
  }
};
