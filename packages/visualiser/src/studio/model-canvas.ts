/**
 * The model (what agents send, links carry and files keep) as Studio's canvas (React Flow nodes and edges, as
 * Studio's canvas-doc keeps them), and back. Each resource is a node with the resource's id, so what's arranged,
 * linked and saved lines up with the agent's ids. Relations are edges (what each edge stands for is kept on it);
 * notes are sticky note and text nodes, on their level; where things are goes in the model's layout.
 */
import type { Edge, Node, XYPosition } from "@xyflow/react";
import type {
  Hotspot as ModelHotspot,
  Layout,
  Model,
  Note,
  Relation,
  Resource,
  ResourceType,
} from "../model";
import { MESSAGE_TYPES } from "../model";
import {
  shortId,
  type Hotspot,
  type LevelPlace,
  type Thread,
} from "./canvas-doc";
import { createEdge } from "./edges";
import { ENTITY_SOURCE_HANDLE } from "./entity-handles";
import { getAbsolutePosition, sortByHierarchy } from "./grouping";
import { getLayoutPositions } from "./layout";
import {
  GROUP_TYPES,
  getNodeDefinition,
  getResource,
  isGroupType,
  isWrittenOnCanvas,
} from "./node-types";
import { placeNodes, type Link } from "./placement";
import { ENTITY_TARGET_HANDLE_ID } from "../index";

/** Canvas node types for each type of resource (Studio's, which are the visualiser's) */
const NODE_TYPE: Record<ResourceType, string> = {
  domain: GROUP_TYPES.domain,
  system: GROUP_TYPES.system,
  service: "service",
  event: "event",
  command: "command",
  query: "query",
  channel: "channel",
  container: "data",
  actor: "actor",
  "external-system": "externalSystem",
  agent: "agent",
  view: "view",
  entity: "entity",
  team: "team",
};
const RESOURCE_TYPE: Record<string, ResourceType> = {
  ...Object.fromEntries(
    Object.entries(NODE_TYPE).map(([resource, node]) => [
      node,
      resource as ResourceType,
    ]),
  ),
  // Catalog domains and systems as cards (Studio's catalog adds them; kept if a canvas has them)
  system: "system",
  "context-domain": "domain",
};
export const resourceTypeOf = (nodeType?: string) =>
  RESOURCE_TYPE[nodeType ?? ""];

const LEVEL_NUMBER = { overview: 1, services: 2, messages: 3 } as const;
const LEVEL_NAME = { 1: "overview", 2: "services", 3: "messages" } as const;

/** The edge's relations, and the ends they were drawn between (an edge moved to other ends stands for something else) */
type EdgeRelations = { relations: Relation[]; ends: string };
const endsOf = (edge: Pick<Edge, "source" | "target">) =>
  `${edge.source}->${edge.target}`;

export type ModelCanvasContent = {
  nodes: Node[];
  edges: Edge[];
  levelLayouts: Record<1 | 2, Map<string, LevelPlace>>;
  /** Comment threads people left on it */
  threads?: Thread[];
  /** What's flagged on it (by people, or the agent) */
  hotspots?: Hotspot[];
  /** A live room's document as this browser kept it: the canvas starts from that instead (see local-canvas.ts) */
  doc?: Uint8Array;
};

// Who flagged a hotspot the agent sent without saying
const AGENT_AUTHOR = { name: "Agent", color: "#7c3aed", agent: true };

/** The model's hotspots as the canvas has them: on their resource's node, or at their place */
const toCanvasHotspots = (hotspots: ModelHotspot[]): Hotspot[] =>
  hotspots.map((hotspot) => ({
    id: hotspot.id ?? shortId(),
    severity: hotspot.severity ?? "warning",
    title: hotspot.title,
    ...(hotspot.description && { description: hotspot.description }),
    ...(hotspot.resource && { nodeId: hotspot.resource }),
    position: hotspot.position ?? { x: 0, y: 0 },
    ...(!hotspot.resource && hotspot.level && { level: hotspot.level }),
    author: hotspot.author ?? AGENT_AUTHOR,
    createdAt: hotspot.createdAt ?? Date.now(),
  }));

/** A resource's node data, as Studio's components for its type create it (and the resource itself, to keep what the canvas doesn't show) */
export function resourceNodeData(resource: Resource): Record<string, unknown> {
  const type = NODE_TYPE[resource.type];
  const fields = {
    name: resource.name,
    version: resource.version ?? "0.0.1",
    summary: resource.summary ?? "",
    owners: resource.owners ?? [],
  };
  const defaults = getNodeDefinition(type)?.createData() ?? {};
  const shared = { resource };
  switch (resource.type) {
    case "domain":
      return resource.card
        ? {
            ...shared,
            mode: "full",
            navigable: false,
            domain: { id: resource.id, ...fields },
          }
        : {
            ...shared,
            domain: {
              id: resource.id,
              name: resource.name,
              version: fields.version,
            },
          };
    case "system":
      return resource.card
        ? {
            ...shared,
            mode: "full",
            navigable: false,
            system: { id: resource.id, ...fields },
          }
        : {
            ...shared,
            system: {
              id: resource.id,
              name: resource.name,
              version: fields.version,
            },
          };
    case "actor":
      return {
        ...defaults,
        ...shared,
        name: resource.name,
        summary: resource.summary ?? "",
      };
    case "channel":
      return {
        ...defaults,
        ...shared,
        channel: {
          ...fields,
          protocols: resource.technology ? [resource.technology] : [],
        },
      };
    case "container":
      return {
        ...defaults,
        ...shared,
        data: {
          ...fields,
          container_type: resource.containerType ?? "database",
          technology: resource.technology,
        },
      };
    case "entity":
      return {
        ...defaults,
        ...shared,
        entity: { ...fields, properties: resource.properties ?? [] },
      };
    default: {
      const key = getNodeDefinition(type)?.resourceKey ?? type;
      return {
        ...defaults,
        ...shared,
        [key]: {
          ...((defaults as Record<string, Record<string, unknown>>)[key] ?? {}),
          ...fields,
        },
      };
    }
  }
}

/** The edges the model's relations are drawn as, between the nodes of the resources they join */
function edgesFor(model: Model, byId: Map<string, Resource>): Edge[] {
  const drawn = new Map<string, Edge & { data: EdgeRelations }>();
  const channelsOf = new Map<string, string[]>();
  model.relations
    .filter((r) => r.kind === "routes-through")
    .forEach((r) =>
      channelsOf.set(r.from, [...(channelsOf.get(r.from) ?? []), r.to]),
    );
  const draw = (source: string, target: string, relation: Relation) => {
    const [from, to] = [byId.get(source), byId.get(target)];
    if (!from || !to || source === target) return;
    const key = `${source}->${target}`;
    const fields =
      from.type === "entity" || to.type === "entity"
        ? `:${relation.fromField ?? ""}:${relation.toField ?? ""}`
        : "";
    const existing = drawn.get(key + fields);
    if (existing) return void existing.data.relations.push(relation);
    // An entity's connections are to and from its properties' rows (or its header, for the whole entity)
    const sourceHandle =
      from.type === "entity"
        ? relation.fromField
          ? `${relation.fromField}-source`
          : ENTITY_SOURCE_HANDLE
        : null;
    const targetHandle =
      to.type === "entity"
        ? relation.toField
          ? `${relation.toField}-target`
          : ENTITY_TARGET_HANDLE_ID
        : null;
    const edge = createEdge(
      { source, target, sourceHandle, targetHandle },
      NODE_TYPE[from.type],
      NODE_TYPE[to.type],
    );
    drawn.set(key + fields, {
      ...edge,
      id: key + fields,
      // What someone wrote on it (any connection), else EventCatalog's wording
      ...(relation.label && { label: relation.label }),
      data: {
        ...edge.data,
        relations: [relation],
        ends: key,
        ...(relation.label && { customLabel: relation.label }),
      },
    });
  };
  for (const relation of model.relations) {
    switch (relation.kind) {
      case "receives": {
        // Through the message's channels, when it has any
        const channels = channelsOf.get(relation.to);
        if (channels?.length)
          channels.forEach((channel) => draw(channel, relation.from, relation));
        else draw(relation.to, relation.from, relation);
        break;
      }
      // A data store is read by a service: drawn from the store
      case "reads":
        draw(relation.to, relation.from, relation);
        break;
      default:
        draw(relation.from, relation.to, relation);
    }
  }
  // Guessed by the agent: amber and dotted, as the diagram draws them
  return [...drawn.values()].map((edge) =>
    edge.data.relations.every((r) => r.inferred)
      ? {
          ...edge,
          label: edge.label ? `${edge.label} \n(inferred)` : "(inferred)",
          style: { stroke: "#d97706", strokeDasharray: "2 4" },
          markerEnd: {
            type: "arrowclosed",
            color: "#d97706",
            width: 18,
            height: 18,
          },
        }
      : edge,
  );
}

const placeOf = (place: { x: number; y: number }) => ({
  x: place.x,
  y: place.y,
});

/**
 * The model on a canvas: where the model's layout puts things, what's new placed next to what it connects to,
 * and laid out with the visualiser's layout when nothing has a place yet
 */
/** A resource's canvas node type: domains and systems as containers, or as cards when they're drawn as cards */
const nodeTypeOf = (resource: Resource) =>
  resource.card && resource.type === "domain"
    ? "context-domain"
    : resource.card && resource.type === "system"
      ? "system"
      : NODE_TYPE[resource.type];
const isCardType = (type?: string) =>
  type === "context-domain" || type === "system";

export async function modelToCanvas(
  model: Model,
  seed?: { nodes: Node[] },
): Promise<ModelCanvasContent> {
  const byId = new Map(model.resources.map((r) => [r.id, r]));
  const saved = model.layout?.messages ?? {};
  let nodes: Node[] = sortByHierarchy(
    model.resources.map((resource) => {
      const parent = resource.parent ? byId.get(resource.parent) : undefined;
      const place = saved[resource.id];
      const group =
        !resource.card &&
        (resource.type === "domain" || resource.type === "system");
      const size = group
        ? place?.width && place.height
          ? { width: place.width, height: place.height }
          : getNodeDefinition(NODE_TYPE[resource.type])?.defaultSize
        : undefined;
      return {
        id: resource.id,
        type: nodeTypeOf(resource),
        position: place ? placeOf(place) : { x: 0, y: 0 },
        data: resourceNodeData(resource),
        ...(size && { width: size.width, height: size.height }),
        ...(parent &&
          !parent.card &&
          (parent.type === "domain" || parent.type === "system") && {
            parentId: parent.id,
          }),
        // Containers sit behind what's in them and the connections between them
        ...(group && { zIndex: -1 }),
      } satisfies Node;
    }),
  );
  const edges = edgesFor(model, byId);

  const unplaced = nodes
    .filter((node) => !saved[node.id])
    .map((node) => node.id);
  const seeded =
    unplaced.length === nodes.length && seed
      ? placesFromSeed(seed.nodes, nodes)
      : undefined;
  if (seeded) {
    // Nothing has a place: where the diagram it was drawn as put things (so the agent's build ends where the canvas starts)
    nodes = nodes.map((node) =>
      seeded.has(node.id) ? { ...node, ...seeded.get(node.id)! } : node,
    );
  } else if (unplaced.length === nodes.length && nodes.length) {
    // Nothing has a place: laid out as the visualiser lays a diagram out
    const layout = await getLayoutPositions(nodes, edges);
    nodes = nodes.map((node) => {
      const laidOut = layout.nodes.get(node.id);
      return laidOut
        ? {
            ...node,
            position: laidOut.position,
            ...(laidOut.size && laidOut.size),
          }
        : node;
    });
  } else if (unplaced.length) {
    // Some new (e.g. the agent added them): next to what they connect to, nothing else moves
    const links: Link[] = edges.map(({ source, target }) => ({
      source,
      target,
    }));
    const places = placeNodes(nodes, unplaced, links);
    nodes = nodes.map((node) =>
      places.has(node.id) ? { ...node, position: places.get(node.id)! } : node,
    );
  }

  return {
    nodes: [...nodes, ...notesToNodes(model.notes ?? [], nodes)],
    edges,
    levelLayouts: {
      1: new Map(Object.entries(model.layout?.overview ?? {})),
      2: new Map(Object.entries(model.layout?.services ?? {})),
    },
    threads: (model.comments ?? []) as Thread[],
    hotspots: toCanvasHotspots(model.hotspots ?? []),
  };
}

/**
 * Where a diagram (the visualiser's graph of the model, with its own ids for domains and systems) puts each resource's
 * node, relative to the container it's in on the canvas, and containers' sizes. Undefined unless it has them all.
 */
function placesFromSeed(seedNodes: Node[], nodes: Node[]) {
  const seedLookup = new Map(seedNodes.map((node) => [node.id, node]));
  const seedOf = (node: Node) =>
    seedLookup.get(node.id) ?? seedLookup.get(`${node.type}-${node.id}`);
  const absolute = new Map<string, XYPosition>();
  for (const node of nodes) {
    const found = seedOf(node);
    if (!found) return undefined;
    absolute.set(node.id, getAbsolutePosition(found, seedLookup));
  }
  return new Map(
    nodes.map((node) => {
      const found = seedOf(node)!;
      const at = absolute.get(node.id)!;
      const parentAt = node.parentId ? absolute.get(node.parentId) : undefined;
      const width =
        typeof found.style?.width === "number"
          ? found.style.width
          : found.width;
      const height =
        typeof found.style?.height === "number"
          ? found.style.height
          : found.height;
      return [
        node.id,
        {
          position: parentAt
            ? { x: at.x - parentAt.x, y: at.y - parentAt.y }
            : at,
          ...(isGroupType(node.type) && width && height && { width, height }),
        },
      ] as const;
    }),
  );
}

/** Notes as sticky note (or text) nodes, on their level: put where they were, else beside what they're about */
function notesToNodes(notes: Note[], nodes: Node[]): Node[] {
  const lookup = new Map(nodes.map((node) => [node.id, node]));
  const bottom = nodes.length
    ? Math.max(
        ...nodes.map(
          (node) => getAbsolutePosition(node, lookup).y + (node.height ?? 120),
        ),
      )
    : 0;
  const beside = new Map<string, number>();
  return notes.map((note, index) => {
    const type = note.kind === "text" ? "text" : "note";
    const about = note.resource ? lookup.get(note.resource) : undefined;
    let position: XYPosition;
    if (note.x !== undefined && note.y !== undefined)
      position = { x: note.x, y: note.y };
    else if (about) {
      // To the right of it, stacked when it has several
      const stacked = beside.get(about.id) ?? 0;
      beside.set(about.id, stacked + 1);
      const at = getAbsolutePosition(about, lookup);
      position = {
        x: at.x + (about.width ?? 260) + 40,
        y: at.y + stacked * 200,
      };
    } else position = { x: index * 240, y: bottom + 120 };
    const level = note.level ? LEVEL_NUMBER[note.level] : undefined;
    return {
      id: `note-${index}`,
      type,
      position,
      // Text is as wide as what's written (its size is its font's)
      ...(type === "note" && { width: note.width ?? 200 }),
      data: {
        text: note.text,
        ...(type === "note" && { color: note.color ?? "yellow" }),
        // Studio keeps a note on L3 unless it says otherwise
        ...(level && level !== 3 && { level }),
        ...(note.resource && { resource: note.resource }),
        ...(note.author && { author: note.author }),
        ...(note.createdAt && { createdAt: note.createdAt }),
        ...(note.fontSize && { fontSize: note.fontSize }),
        ...(note.angle && { angle: note.angle }),
      },
    } satisfies Node;
  });
}

// ---- Back to the model ----

const PRODUCERS = new Set<ResourceType>([
  "service",
  "agent",
  "view",
  "actor",
  "external-system",
]);

/**
 * What a new connection between two nodes means, from their types: sends and receives between services (and the
 * like) and messages, routes through from a message to a channel, writes and reads with data stores, and
 * otherwise a "connects" described by the edge's label
 */
function relationsForEdge(
  edge: Edge,
  from: Resource,
  to: Resource,
  routedThrough: (channel: string) => string[],
): Relation[] {
  const label =
    typeof edge.label === "string" && edge.label.trim()
      ? edge.label.replace(/\s+/g, " ").trim()
      : undefined;
  if (PRODUCERS.has(from.type) && MESSAGE_TYPES.has(to.type))
    return [{ from: from.id, to: to.id, kind: "sends" }];
  if (MESSAGE_TYPES.has(from.type) && PRODUCERS.has(to.type))
    return [{ from: to.id, to: from.id, kind: "receives" }];
  if (MESSAGE_TYPES.has(from.type) && to.type === "channel")
    return [{ from: from.id, to: to.id, kind: "routes-through" }];
  if (from.type === "channel" && PRODUCERS.has(to.type)) {
    const messages = routedThrough(from.id);
    if (messages.length)
      return messages.map((message) => ({
        from: to.id,
        to: message,
        kind: "receives" as const,
      }));
  }
  if (
    (from.type === "service" || from.type === "agent") &&
    to.type === "container"
  )
    return [{ from: from.id, to: to.id, kind: "writes" }];
  if (
    from.type === "container" &&
    (to.type === "service" || to.type === "agent")
  )
    return [{ from: to.id, to: from.id, kind: "reads" }];
  return [
    { from: from.id, to: to.id, kind: "connects", ...(label && { label }) },
  ];
}

const round = (value: number) => Math.round(value);
const placeFor = (node: Node) => ({
  x: round(node.position.x),
  y: round(node.position.y),
  ...(isGroupType(node.type) &&
    node.width &&
    node.height && { width: round(node.width), height: round(node.height) }),
});
const placesOf = (
  places: ReadonlyMap<string, LevelPlace>,
  ids: Set<string>,
) => {
  const kept = [...places].filter(([id]) => ids.has(id));
  return kept.length
    ? Object.fromEntries(
        kept.map(([id, place]) => [
          id,
          {
            x: round(place.x),
            y: round(place.y),
            ...(place.width &&
              place.height && {
                width: round(place.width),
                height: round(place.height),
              }),
          },
        ]),
      )
    : undefined;
};

/** The canvas as the model: its resources, relations and notes (through what's still on it), and where things are */
export function canvasToModel(
  nodes: Node[],
  edges: Edge[],
  levelLayouts: Record<1 | 2, ReadonlyMap<string, LevelPlace>>,
  base: Model,
  threads: Thread[] = [],
  hotspots: Hotspot[] = [],
): Model {
  const lookup = new Map(nodes.map((node) => [node.id, node]));
  const resourceNodes = nodes.filter(
    (node) => !isWrittenOnCanvas(node.type) && resourceTypeOf(node.type),
  );
  const resources: Resource[] = resourceNodes.map((node) => {
    const type = resourceTypeOf(node.type)!;
    const kept = (node.data.resource as Resource | undefined) ?? undefined;
    const fields = getResource(node.type, node.data);
    const parent = node.parentId && lookup.get(node.parentId);
    const summary = String(fields.summary ?? "").trim();
    const version = String(fields.version ?? kept?.version ?? "").trim();
    const { parent: _, card: __, ...rest } = kept ?? ({} as Partial<Resource>);
    return {
      ...rest,
      id: node.id,
      type,
      name: String(fields.name ?? kept?.name ?? node.id).trim() || node.id,
      ...(summary ? { summary } : { summary: undefined }),
      ...(version && { version }),
      ...(type === "entity" &&
        Array.isArray(fields.properties) && {
          properties: fields.properties as Resource["properties"],
        }),
      // Its kind of data store, as it is on the canvas (a database is the default, so it isn't written)
      ...(type === "container" && {
        containerType:
          fields.container_type && fields.container_type !== "database"
            ? (fields.container_type as Resource["containerType"])
            : undefined,
      }),
      ...(isCardType(node.type) && { card: true }),
      ...(parent && resourceTypeOf(parent.type) && { parent: parent.id }),
    } as Resource;
  });
  const byId = new Map(resources.map((r) => [r.id, r]));

  // Messages through each channel, as the canvas has them now
  const routed = new Map<string, string[]>();
  edges.forEach((edge) => {
    const [from, to] = [byId.get(edge.source), byId.get(edge.target)];
    if (from && to && MESSAGE_TYPES.has(from.type) && to.type === "channel")
      routed.set(to.id, [...(routed.get(to.id) ?? []), from.id]);
  });
  const seen = new Set<string>();
  const relations: Relation[] = [];
  for (const edge of edges) {
    const [from, to] = [byId.get(edge.source), byId.get(edge.target)];
    if (!from || !to) continue;
    const kept = edge.data as Partial<EdgeRelations> | undefined;
    // What it was drawn for, while it joins the same ends; a connection made (or moved) here, from what it joins
    const drawnFor =
      kept?.relations && kept.ends === endsOf(edge)
        ? kept.relations.filter((r) => byId.has(r.from) && byId.has(r.to))
        : relationsForEdge(
            edge,
            from,
            to,
            (channel) => routed.get(channel) ?? [],
          );
    // Which of an entity's properties it's joined at, as it's drawn now
    const fieldOf = (handle: string | null | undefined, suffix: string) =>
      handle && handle.endsWith(suffix) && handle !== ENTITY_SOURCE_HANDLE
        ? handle.slice(0, -suffix.length)
        : undefined;
    const atFields = (relation: Relation): Relation => {
      if (
        relation.kind !== "connects" ||
        relation.from !== edge.source ||
        (from.type !== "entity" && to.type !== "entity")
      )
        return relation;
      const { fromField: _f, toField: _t, ...rest } = relation;
      const fromField =
        from.type === "entity"
          ? fieldOf(edge.sourceHandle, "-source")
          : undefined;
      const toField =
        to.type === "entity"
          ? fieldOf(edge.targetHandle, "-target")
          : undefined;
      return {
        ...rest,
        ...(fromField && { fromField }),
        ...(toField && { toField }),
      };
    };
    // What's written on it is on what it was drawn for (a connects is described by it; the others say it instead)
    const written = (edge.data as { customLabel?: string } | undefined)
      ?.customLabel;
    const withLabel = (relation: Relation): Relation => {
      if (written) return { ...relation, label: written };
      if (relation.kind === "connects") return relation;
      const { label: _, ...rest } = relation;
      return rest;
    };
    for (const relation of drawnFor.map(atFields).map(withLabel)) {
      const key = `${relation.from}|${relation.kind}|${relation.to}|${relation.fromField ?? ""}|${relation.toField ?? ""}`;
      if (!seen.has(key)) (relations.push(relation), seen.add(key));
    }
  }

  const notes: Note[] = nodes
    .filter((node) => isWrittenOnCanvas(node.type))
    .map((node) => {
      const at = getAbsolutePosition(node, lookup);
      const level = (node.data.level as 1 | 2 | undefined) ?? undefined;
      const resource =
        typeof node.data.resource === "string" && byId.has(node.data.resource)
          ? node.data.resource
          : undefined;
      return {
        text: String(node.data.text ?? "").slice(0, 1000),
        ...(node.type === "text" && { kind: "text" as const }),
        ...(node.type === "note" && node.data.color
          ? { color: node.data.color as Note["color"] }
          : {}),
        ...(resource && { resource }),
        ...(typeof node.data.author === "string" && {
          author: node.data.author,
        }),
        ...(typeof node.data.createdAt === "number" && {
          createdAt: node.data.createdAt,
        }),
        ...(typeof node.data.fontSize === "number" && {
          fontSize: node.data.fontSize,
        }),
        ...(typeof node.data.angle === "number" &&
          node.data.angle !== 0 && { angle: node.data.angle }),
        level: LEVEL_NAME[level ?? 3],
        x: round(at.x),
        y: round(at.y),
        ...(node.type === "note" &&
          node.width && {
            width: Math.min(800, Math.max(120, round(node.width))),
          }),
      };
    });

  // A team connected to something owns it (as EventCatalog's owners): its name is in that resource's owners, while
  // the connection's there (owners that aren't a team on the canvas, e.g. ones the agent found, are kept)
  const teams = resources.filter((r) => r.type === "team");
  if (teams.length) {
    const teamNames = new Set(teams.map((team) => team.name));
    const ownedBy = new Map<string, string[]>();
    for (const relation of relations) {
      const team = byId.get(relation.from);
      if (team?.type !== "team" || relation.kind !== "connects") continue;
      ownedBy.set(relation.to, [
        ...(ownedBy.get(relation.to) ?? []),
        team.name,
      ]);
    }
    for (const resource of resources) {
      if (resource.type === "team") continue;
      const owners = [
        ...new Set([
          ...(resource.owners ?? []).filter((owner) => !teamNames.has(owner)),
          ...(ownedBy.get(resource.id) ?? []),
        ]),
      ];
      if (owners.length) resource.owners = owners;
      else delete resource.owners;
    }
  }

  const ids = new Set(resources.map((r) => r.id));
  const layout: Layout = {
    messages: Object.fromEntries(
      resourceNodes.map((node) => [node.id, placeFor(node)]),
    ),
    overview: placesOf(levelLayouts[1], ids),
    services: placesOf(levelLayouts[2], ids),
  };
  return {
    title: base.title,
    resources,
    relations,
    ...(notes.length && { notes }),
    ...(threads.length && { comments: threads }),
    // On a resource still on the canvas, else where they are
    ...(hotspots.length && {
      hotspots: hotspots.map(({ nodeId, position, level, ...hotspot }) =>
        nodeId && ids.has(nodeId)
          ? { ...hotspot, resource: nodeId }
          : { ...hotspot, position, ...(level && { level }) },
      ),
    }),
    layout,
  };
}
