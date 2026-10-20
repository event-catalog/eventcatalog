import type { Node, Edge } from "@xyflow/react";
import { isSwimlaneNode } from "./swimlanes";

/**
 * Mermaid Export Utility
 * Converts React Flow nodes and edges to Mermaid flowchart syntax. Used by the
 * visualiser's Mermaid view and by EventCatalog (the `.mermaid` routes, AI Chat
 * and the MCP server), so every level of a diagram exports the same way.
 */

export interface MermaidExportOptions {
  /** Include class definitions for styling */
  includeStyles?: boolean;
  /** Direction of the flowchart: LR (left-right), TB (top-bottom), etc. */
  direction?: "LR" | "TB" | "RL" | "BT";
}

/**
 * Mapping of node types to their Mermaid shape syntax
 * Format: [prefix, suffix]
 */
const NODE_SHAPE_MAP: Record<string, [string, string]> = {
  agents: ["[[", "]]"],
  agent: ["[[", "]]"],
  agentTool: ["[", "]"],
  "agent-tool": ["[", "]"],
  services: ["[[", "]]"], // stadium shape
  service: ["[[", "]]"],
  events: [">", "]"], // flag/asymmetric shape (message-like)
  event: [">", "]"],
  commands: [">", "]"], // flag/asymmetric shape (message-like)
  command: [">", "]"],
  queries: ["{{", "}}"], // hexagon
  query: ["{{", "}}"],
  // Parallelogram: what messages pass through, not a cylinder, which reads as
  // a database (and is what data stores are drawn as)
  channels: ["[/", "/]"],
  channel: ["[/", "/]"],
  domains: ["[", "]"], // rectangle
  domain: ["[", "]"],
  "context-domain": ["[", "]"], // another domain, shown as a single card
  flows: ["([", "])"], // stadium (rounded)
  flow: ["([", "])"],
  flowExpanded: ["([", "])"],
  systems: ["[[", "]]"], // a system shown as a single node
  system: ["[[", "]]"],
  step: ["[", "]"], // rectangle
  user: ["((", "))"], // circle
  actor: ["((", "))"], // circle
  "context-actor": ["((", "))"], // circle
  externalSystem: ["[[", "]]"], // stadium
  "external-system": ["[[", "]]"],
  data: ["[(", ")]"], // cylinder (database)
  container: ["[(", ")]"],
  "data-product": ["[[", "]]"], // stadium
  "data-products": ["[[", "]]"],
  entities: ["[", "]"], // rectangle
  entity: ["[", "]"],
  custom: ["[", "]"], // rectangle
  view: ["[", "]"], // rectangle
  note: ["[", "]"], // rectangle
  field: ["[(", ")]"], // cylinder
  fields: ["[(", ")]"], // cylinder
  messageGroup: ["[[", "]]"],
  messageGroupExpanded: ["[[", "]]"],
};

/**
 * Mermaid class definitions for styling different node types
 */
const NODE_STYLE_CLASSES: Record<string, string> = {
  agents: "fill:#0ea5e9,stroke:#0369a1,color:#fff",
  agent: "fill:#0ea5e9,stroke:#0369a1,color:#fff",
  agentTool: "fill:#8b5cf6,stroke:#6d28d9,color:#fff",
  "agent-tool": "fill:#8b5cf6,stroke:#6d28d9,color:#fff",
  services: "fill:#ec4899,stroke:#be185d,color:#fff",
  service: "fill:#ec4899,stroke:#be185d,color:#fff",
  events: "fill:#f97316,stroke:#c2410c,color:#fff",
  event: "fill:#f97316,stroke:#c2410c,color:#fff",
  commands: "fill:#3b82f6,stroke:#1d4ed8,color:#fff",
  command: "fill:#3b82f6,stroke:#1d4ed8,color:#fff",
  queries: "fill:#22c55e,stroke:#15803d,color:#fff",
  query: "fill:#22c55e,stroke:#15803d,color:#fff",
  channels: "fill:#6b7280,stroke:#374151,color:#fff",
  channel: "fill:#6b7280,stroke:#374151,color:#fff",
  domains: "fill:#eab308,stroke:#a16207,color:#000",
  domain: "fill:#eab308,stroke:#a16207,color:#000",
  "context-domain": "fill:#eab308,stroke:#a16207,color:#000",
  flows: "fill:#14b8a6,stroke:#0f766e,color:#fff",
  flow: "fill:#14b8a6,stroke:#0f766e,color:#fff",
  flowExpanded: "fill:#14b8a6,stroke:#0f766e,color:#fff",
  systems: "fill:#8b5cf6,stroke:#6d28d9,color:#fff",
  system: "fill:#8b5cf6,stroke:#6d28d9,color:#fff",
  step: "fill:#374151,stroke:#1f2937,color:#fff",
  user: "fill:#8b5cf6,stroke:#6d28d9,color:#fff",
  actor: "fill:#eab308,stroke:#a16207,color:#000",
  "context-actor": "fill:#eab308,stroke:#a16207,color:#000", // yellow, as actors are on the diagram
  externalSystem: "fill:#ec4899,stroke:#be185d,color:#fff",
  "external-system": "fill:#ec4899,stroke:#be185d,color:#fff",
  data: "fill:#3b82f6,stroke:#1d4ed8,color:#fff",
  container: "fill:#3b82f6,stroke:#1d4ed8,color:#fff",
  "data-product": "fill:#6366f1,stroke:#4338ca,color:#fff",
  "data-products": "fill:#6366f1,stroke:#4338ca,color:#fff",
  entities: "fill:#6b7280,stroke:#374151,color:#fff",
  entity: "fill:#6b7280,stroke:#374151,color:#fff",
  custom: "fill:#9ca3af,stroke:#6b7280,color:#000",
  view: "fill:#9ca3af,stroke:#6b7280,color:#000",
  note: "fill:#fef3c7,stroke:#d97706,color:#000",
  field: "fill:#06b6d4,stroke:#0891b2,color:#fff",
  fields: "fill:#06b6d4,stroke:#0891b2,color:#fff",
  messageGroup: "fill:#7c3aed,stroke:#5b21b6,color:#fff",
  messageGroupExpanded: "fill:#7c3aed,stroke:#5b21b6,color:#fff",
};

/** Node types that are boundaries around other nodes, rendered as subgraphs */
const GROUP_NODE_TYPES = new Set(["system-group", "domain-group", "group"]);

/**
 * Classes for the boundaries (subgraphs): the domain viewed, its subdomains,
 * other domains, systems and the lanes a flow's steps are grouped into
 */
const GROUP_STYLE_CLASSES = {
  domainGroup:
    "fill:#eab30814,stroke:#ca8a04,stroke-width:2px,stroke-dasharray:6 4,color:#a16207",
  subdomainGroup:
    "fill:#eab3080d,stroke:#ca8a04,stroke-dasharray:4 4,color:#a16207",
  otherDomainGroup:
    "fill:#9ca3af14,stroke:#9ca3af,stroke-dasharray:4 4,color:#6b7280",
  systemGroup: "fill:#8b5cf614,stroke:#8b5cf6,stroke-width:2px,color:#7c3aed",
  laneGroup: "fill:#9ca3af0d,stroke:#9ca3af,stroke-dasharray:4 4,color:#6b7280",
} as const;

type GroupClass = keyof typeof GROUP_STYLE_CLASSES;

/** The resource the diagram is about */
const FOCUSED_STYLE = "stroke-width:4px";

/** Edges to or from another domain, highlighted as the visualiser does */
const CROSS_DOMAIN_LINK_STYLE = "stroke:#4f46e5,stroke-width:3px";

/** Words Mermaid reads as keywords, so they can't be node ids */
const RESERVED_IDS = new Set([
  "end",
  "subgraph",
  "graph",
  "flowchart",
  "style",
  "class",
  "classdef",
  "click",
  "linkstyle",
  "call",
  "href",
]);

/**
 * Sanitize a string to be a valid Mermaid node ID
 * Mermaid IDs should be alphanumeric with underscores
 */
export function sanitizeMermaidId(id: string): string {
  // Replace any non-alphanumeric characters (except underscores) with underscores
  // Also handle dots and hyphens which are common in version strings
  const sanitized = id.replace(/[^a-zA-Z0-9_]/g, "_");
  return RESERVED_IDS.has(sanitized.toLowerCase())
    ? `node_${sanitized}`
    : sanitized;
}

/**
 * Collapses whitespace in each line of a label (e.g. "reads from \n (postgres)"
 * from the graph builders), dropping empty lines
 */
function normaliseLines(label: string): string[] {
  return label
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * Escape special characters in Mermaid labels
 */
function escapeMermaidLabel(label: string): string {
  // `#` first, as the escapes themselves start with it
  return label.replace(/#/g, "#35;").replace(/"/g, "#quot;");
}

/**
 * Get the Mermaid shape syntax for a node type
 */
export function getMermaidNodeShape(type: string): [string, string] {
  return NODE_SHAPE_MAP[type] || ["[", "]"];
}

/**
 * Helper to format label with version
 */
function formatLabelWithVersion(name: string, version?: string): string {
  if (version) {
    return `${name} (${version})`;
  }
  return name;
}

/** Name and version of a resource, whether flat or nested in `.data` (a collection entry) */
function resourceLabel(resource: any, fallback: string): string {
  const name =
    resource?.name ||
    resource?.data?.name ||
    resource?.id ||
    resource?.data?.id;
  const version = resource?.version || resource?.data?.version;
  return formatLabelWithVersion(name || fallback, version);
}

/**
 * Extract the display label from a node based on its type and data
 * Includes version information when available
 */
export function getNodeLabel(node: Node): string {
  const { type } = node;
  const data = node.data as any;

  if (!data) return node.id;

  // Handle different node types and their data structures
  if (type === "agents" || type === "agent") {
    return resourceLabel(data.agent, node.id);
  }

  if (type === "agentTool" || type === "agent-tool") {
    const agentTool = data.agentTool;
    return agentTool?.name || agentTool?.id || node.id;
  }

  if (type === "services" || type === "service") {
    return resourceLabel(data.service, node.id);
  }

  if (
    type === "events" ||
    type === "event" ||
    type === "commands" ||
    type === "command" ||
    type === "queries" ||
    type === "query"
  ) {
    return resourceLabel(data.message, node.id);
  }

  if (type === "channels" || type === "channel") {
    return resourceLabel(data.channel, node.id);
  }

  // A domain: as a node, a card (e.g. another domain) or a boundary around its systems
  if (
    type === "domains" ||
    type === "domain" ||
    type === "context-domain" ||
    type === "domain-group" ||
    type === "group"
  ) {
    return resourceLabel(data.domain, node.id);
  }

  // A system: as a node, or a boundary around what's in it
  if (type === "systems" || type === "system" || type === "system-group") {
    return resourceLabel(data.system, node.id);
  }

  if (type === "flows" || type === "flow") {
    return resourceLabel(data.flow, node.id);
  }

  if (type === "flowExpanded") {
    return formatLabelWithVersion(data.flowName || node.id, data.version);
  }

  if (type === "step") {
    const step = data.step;
    return step?.title || step?.name || step?.id || node.id;
  }

  if (type === "custom") {
    return data.custom?.title || data.step?.title || data.label || node.id;
  }

  if (type === "externalSystem" || type === "external-system") {
    const system = data.externalSystem || data;
    return system?.name || system?.id || node.id;
  }

  if (type === "data" || type === "container") {
    const dataNode = data.data;
    return dataNode?.name || dataNode?.id || node.id;
  }

  if (type === "data-product" || type === "data-products") {
    return resourceLabel(data.dataProduct, node.id);
  }

  if (type === "entities" || type === "entity") {
    const entity = data.entity;
    return entity?.name || entity?.id || node.id;
  }

  if (type === "view") {
    return data.view?.name || data.view?.id || node.id;
  }

  if (type === "note") {
    return data.text || data.label || "Note";
  }

  if (type === "field" || type === "fields") {
    const name = data.name || node.id;
    return data.type ? `${name} (${data.type})` : name;
  }

  if (type === "messageGroup" || type === "messageGroupExpanded") {
    const groupName = data.groupName || node.id;
    const count = data.messageCount || 0;
    return `${groupName} (${count} messages)`;
  }

  // Fallback: try common data patterns (e.g. users, actors, swimlanes)
  return data.name || data.label || data.title || data.id || node.id;
}

/**
 * Extract label from an edge
 */
function getEdgeLabel(edge: Edge): string | undefined {
  if (edge.label && typeof edge.label === "string") {
    return edge.label;
  }
  if (edge.data?.label && typeof edge.data.label === "string") {
    return edge.data.label;
  }
  return undefined;
}

/** Mermaid ids for the nodes, kept unique when different ids sanitize the same way */
function getMermaidIds(nodes: Node[]): Map<string, string> {
  const mermaidIds = new Map<string, string>();
  const usedIds = new Set<string>();
  nodes.forEach((node) => {
    const base = sanitizeMermaidId(node.id);
    let id = base;
    for (let n = 2; usedIds.has(id); n++) id = `${base}_${n}`;
    usedIds.add(id);
    mermaidIds.set(node.id, id);
  });
  return mermaidIds;
}

const isEntityNode = (node: Node) =>
  node.type === "entities" || node.type === "entity";

/** An entity's property, as in its frontmatter */
type EntityProperty = {
  name: string;
  type: string;
  required?: boolean;
  references?: string;
  relationType?: string;
  items?: { type: string };
};

/** Relationships named only for their cardinality: labelled with the property instead */
const CARDINALITY_RELATIONS = new Set([
  "hasOne",
  "hasMany",
  "belongsTo",
  "references",
]);

/** External entities (from other domains) and aggregate roots, styled as on the diagram */
const ENTITY_STYLE_CLASSES = {
  externalEntity: "fill:#9ca3af1a,stroke:#9ca3af,stroke-dasharray:4 4",
  aggregateRoot: "stroke-width:3px",
} as const;

/**
 * An attribute's type or name, as Mermaid allows them: letters, digits,
 * hyphens, underscores, brackets and dots, starting with a letter
 */
function sanitizeErToken(value: string, fallback: string): string {
  const token = value.trim().replace(/[^A-Za-z0-9_\-[\]().]/g, "_");
  return /^[A-Za-z_]/.test(token) ? token : `${fallback}_${token}`;
}

/**
 * Crow's foot notation for a relationship, from the entity holding the
 * property: it has many (an array, or `hasMany`), it has one, or (for
 * `belongsTo`, `references` and other relations) many of it point at one
 */
function getErCardinality(property: EntityProperty): string {
  const required = !!property.required;
  if (property.relationType === "hasMany" || property.type === "array") {
    return required ? "||--|{" : "||--o{";
  }
  if (property.relationType === "hasOne") {
    return required ? "||--||" : "||--o|";
  }
  return required ? "}o--||" : "}o--o|";
}

/**
 * An entity map as a Mermaid entity relationship diagram: each entity with its
 * properties (the identifier as PK, references as FK), and a relationship for
 * each edge drawn between them, with its cardinality
 */
export function convertEntitiesToMermaid(
  nodes: Node[],
  edges: Edge[],
  { includeStyles = true }: Pick<MermaidExportOptions, "includeStyles"> = {},
): string {
  const mermaidIds = getMermaidIds(nodes);
  const lines = ["erDiagram"];
  const classes = new Map<keyof typeof ENTITY_STYLE_CLASSES, string[]>();
  const addClass = (name: keyof typeof ENTITY_STYLE_CLASSES, id: string) =>
    classes.set(name, [...(classes.get(name) ?? []), id]);

  nodes.forEach((node) => {
    const data = node.data as any;
    const entity = data?.entity?.data ?? {};
    const id = mermaidIds.get(node.id)!;
    const name = entity.name || data?.label || node.id;
    // Entities from other domains say which domain they're in
    const label =
      data?.externalToDomain && data?.domainName
        ? `${name} (${data.domainName})`
        : name;
    const references = new Set<string>(data?.referencePropertyNames ?? []);
    const properties: EntityProperty[] = entity.properties ?? [];

    const attributes = properties.map((property) => {
      const type =
        property.type === "array" && property.items?.type
          ? `${property.items.type}[]`
          : property.type || "unknown";
      const keys = [
        property.name === entity.identifier && "PK",
        (property.references || references.has(property.name)) && "FK",
      ].filter(Boolean);
      return `        ${sanitizeErToken(type, "t")} ${sanitizeErToken(property.name, "p")}${keys.length ? ` ${keys.join(", ")}` : ""}`;
    });

    const definition = `    ${id}["${escapeMermaidLabel(label)}"]`;
    lines.push(
      ...(attributes.length
        ? [`${definition} {`, ...attributes, "    }"]
        : [definition]),
    );
    if (data?.externalToDomain) addClass("externalEntity", id);
    if (entity.aggregateRoot) addClass("aggregateRoot", id);
  });

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const relationships = edges
    .filter(
      (edge) =>
        !edge.hidden &&
        mermaidIds.has(edge.source) &&
        mermaidIds.has(edge.target),
    )
    .map((edge) => {
      // The property the relationship is drawn from (its handle is `{name}-source`)
      const propertyName = edge.sourceHandle?.replace(/-source$/, "");
      const properties: EntityProperty[] =
        (nodesById.get(edge.source)?.data as any)?.entity?.data?.properties ??
        [];
      const property = properties.find((p) => p.name === propertyName);
      const relation = property?.relationType?.trim();
      const label =
        relation && !CARDINALITY_RELATIONS.has(relation)
          ? relation
          : propertyName || getEdgeLabel(edge) || "references";
      const cardinality = property ? getErCardinality(property) : "}o--o|";
      return `    ${mermaidIds.get(edge.source)} ${cardinality} ${mermaidIds.get(edge.target)} : "${escapeMermaidLabel(label)}"`;
    });

  if (relationships.length > 0) lines.push("", ...relationships);

  if (includeStyles && classes.size > 0) {
    lines.push("");
    classes.forEach((ids, name) => {
      lines.push(`    classDef ${name} ${ENTITY_STYLE_CLASSES[name]}`);
      lines.push(`    class ${ids.join(",")} ${name}`);
    });
  }

  return lines.join("\n");
}

/** The class of a boundary: what kind of domain it is, a system, or a flow's lane */
function getGroupClass(node: Node): GroupClass {
  const data = node.data as any;
  if (isSwimlaneNode(node)) return "laneGroup";
  if (node.type === "system-group") return "systemGroup";
  if (data?.otherDomain) return "otherDomainGroup";
  if (data?.subdomain) return "subdomainGroup";
  return "domainGroup";
}

const isCrossDomain = (edge: Edge) =>
  !!(edge.data as { crossDomain?: boolean } | undefined)?.crossDomain;

/**
 * Convert React Flow nodes and edges to Mermaid flowchart syntax. Domains,
 * systems and a flow's lanes are subgraphs around what's in them (nested, as
 * on the diagram), so every level of a domain or system diagram keeps its
 * boundaries. Edges between domains are highlighted.
 */
export function convertToMermaid(
  graphNodes: Node[],
  graphEdges: Edge[],
  options: MermaidExportOptions = {},
): string {
  const { includeStyles = true, direction = "LR" } = options;
  const nodes = graphNodes.filter((node) => !node.hidden);

  // An entity map is a data model, so it's an entity relationship diagram
  if (nodes.length > 0 && nodes.every(isEntityNode)) {
    return convertEntitiesToMermaid(nodes, graphEdges, { includeStyles });
  }

  const mermaidIds = getMermaidIds(nodes);

  const lines: string[] = [];

  // Add flowchart header
  lines.push(`flowchart ${direction}`);

  // Nodes inside a group (a domain, system or lane) are nested in a subgraph
  // for that group, so containment is kept
  const childrenOf = new Map<string, Node[]>();
  const topLevelNodes: Node[] = [];
  nodes.forEach((node) => {
    if (node.parentId && mermaidIds.has(node.parentId)) {
      childrenOf.set(node.parentId, [
        ...(childrenOf.get(node.parentId) ?? []),
        node,
      ]);
    } else {
      topLevelNodes.push(node);
    }
  });
  const isGroup = (node: Node) =>
    childrenOf.has(node.id) ||
    GROUP_NODE_TYPES.has(node.type ?? "") ||
    isSwimlaneNode(node);

  // Collect used node types and boundary classes for class definitions
  const usedTypes = new Set<string>();
  const groupsByClass = new Map<GroupClass, string[]>();
  const focusedIds: string[] = [];
  nodes.forEach((node) => {
    const id = mermaidIds.get(node.id)!;
    if (isGroup(node)) {
      const groupClass = getGroupClass(node);
      groupsByClass.set(groupClass, [
        ...(groupsByClass.get(groupClass) ?? []),
        id,
      ]);
      return;
    }
    if (node.type && NODE_STYLE_CLASSES[node.type]) usedTypes.add(node.type);
    if ((node.data as any)?.isFocused) focusedIds.push(id);
  });

  // Add class definitions if styles are enabled
  if (includeStyles) {
    lines.push("");
    lines.push("    %% Style definitions");
    usedTypes.forEach((type) => {
      lines.push(
        `    classDef ${sanitizeMermaidId(type)} ${NODE_STYLE_CLASSES[type]}`,
      );
    });
    groupsByClass.forEach((_, groupClass) => {
      lines.push(
        `    classDef ${groupClass} ${GROUP_STYLE_CLASSES[groupClass]}`,
      );
    });
    if (focusedIds.length > 0) {
      lines.push(`    classDef focused ${FOCUSED_STYLE}`);
    }
  }

  // Add node definitions
  lines.push("");
  lines.push("    %% Nodes");

  const addNode = (node: Node, depth: number) => {
    const indent = "    ".repeat(depth);
    const id = mermaidIds.get(node.id)!;
    const label = escapeMermaidLabel(
      normaliseLines(getNodeLabel(node)).join("<br/>"),
    );

    if (isGroup(node)) {
      lines.push(`${indent}subgraph ${id}["${label}"]`);
      childrenOf.get(node.id)?.forEach((child) => addNode(child, depth + 1));
      lines.push(`${indent}end`);
      return;
    }

    const [prefix, suffix] = getMermaidNodeShape(node.type || "custom");
    let nodeLine = `${indent}${id}${prefix}"${label}"${suffix}`;

    // Add class reference if styles are enabled
    if (includeStyles && node.type && usedTypes.has(node.type)) {
      nodeLine += `:::${sanitizeMermaidId(node.type)}`;
    }

    lines.push(nodeLine);
  };

  topLevelNodes.forEach((node) => addNode(node, 1));

  // Add edge definitions, leaving out edges to nodes that aren't shown
  lines.push("");
  lines.push("    %% Edges");

  const crossDomainLinks: number[] = [];
  graphEdges
    .filter(
      (edge) =>
        !edge.hidden &&
        mermaidIds.has(edge.source) &&
        mermaidIds.has(edge.target),
    )
    .forEach((edge, index) => {
      const sourceId = mermaidIds.get(edge.source)!;
      const targetId = mermaidIds.get(edge.target)!;
      const label = normaliseLines(getEdgeLabel(edge) ?? "").join(" ");

      lines.push(
        label
          ? `    ${sourceId} -->|"${escapeMermaidLabel(label)}"| ${targetId}`
          : `    ${sourceId} --> ${targetId}`,
      );
      if (isCrossDomain(edge)) crossDomainLinks.push(index);
    });

  // Boundaries, the resource viewed and edges between domains
  if (includeStyles) {
    const styleLines: string[] = [];
    groupsByClass.forEach((ids, groupClass) => {
      styleLines.push(`    class ${ids.join(",")} ${groupClass}`);
    });
    if (focusedIds.length > 0) {
      styleLines.push(`    class ${focusedIds.join(",")} focused`);
    }
    if (crossDomainLinks.length > 0) {
      styleLines.push(
        `    linkStyle ${crossDomainLinks.join(",")} ${CROSS_DOMAIN_LINK_STYLE}`,
      );
    }
    if (styleLines.length > 0) {
      lines.push("");
      lines.push("    %% Boundaries and highlights");
      lines.push(...styleLines);
    }
  }

  return lines.join("\n");
}
