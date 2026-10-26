import type { Edge, Node, XYPosition } from '@xyflow/react';
import type * as Y from 'yjs';
import { z } from 'zod';
import {
  buildNode,
  getCanvasMaps,
  getCanvasStatus,
  readCanvas,
  updateNodeData,
  type CanvasContent,
  containerFor,
  getAbsolutePosition,
  sizeOf,
  placeNodes,
  type Link,
  canGoInContainer,
  CATALOG_COLLECTIONS,
  COMPONENT_TYPES,
  getNodeDefinition,
  getNodeLabel,
  getNodeName,
  getNoteLevel,
  getResource,
  isGroupType,
  isOnLevel,
  isVersioned,
  isWrittenOnCanvas,
  readHotspots,
  sortByHierarchy,
  TEXT_FONT_SIZE,
  type LayoutResult,
  updateResource,
} from '@eventcatalog/visualiser/studio';
import type { CatalogRelation, CatalogResource } from './catalog-resources';
import {
  buildContainer,
  buildContainerWithContents,
  canBeContainer,
  catalogNodeData,
  containerTypeFor,
  getCatalogLink,
  getRelatedEdges,
  indexRelations,
} from './catalog';

/**
 * What agents can do on a canvas, shared by the MCP tools (on the server) and the WebMCP tools (in the
 * browser), so both describe and change a canvas the same way.
 */

// ---- Inputs ----

/** What agents can add as new components: what people add from the palette, and sticky notes and text (from the bar) */
export const AGENT_COMPONENT_TYPES = [...COMPONENT_TYPES, 'note', 'text'] as const;

/** What a catalog service or message can bring with it: a service's messages and data stores, a message's services */
export const CONNECTION_GROUP_IDS = ['receives', 'sends', 'dataStores', 'senders', 'receivers'] as const;

export const nodeSpecsSchema = z
  .array(
    z.object({
      ref: z.string().optional().describe('Your name for this node, to use in edges'),
      resource: z
        .object({ collection: z.enum(CATALOG_COLLECTIONS), id: z.string() })
        .optional()
        .describe('A catalog resource to add (latest version)'),
      type: z
        .enum(AGENT_COMPONENT_TYPES)
        .optional()
        .describe('For a new component: what it is (note: a sticky note; text: words written on the canvas)'),
      name: z.string().optional().describe('For a new component: its name'),
      summary: z
        .string()
        .optional()
        .describe('For a new component: what it does. For a note or text: its text (keep notes to a few words)'),
      version: z.string().optional().describe('For a new component: its version, e.g. 1.0.0 (defaults to 0.0.1)'),
      fontSize: z
        .number()
        .min(8)
        .max(200)
        .optional()
        .describe(`For text: how big it's written, in pixels (${TEXT_FONT_SIZE} by default; e.g. 48 for a heading)`),
      container: z
        .boolean()
        .optional()
        .describe(
          'For a domain or system from the catalog: add it as a container that other nodes sit inside, rather than a card'
        ),
      contents: z
        .boolean()
        .optional()
        .describe(
          'For a domain or system from the catalog: add it as a container with everything it holds in the catalog (its systems, services, and their messages and data stores), connected and laid out, in one go. Use it to add an existing domain or system rather than adding what is in it one by one'
        ),
      connections: z
        .array(z.enum(CONNECTION_GROUP_IDS))
        .optional()
        .describe(
          'For a service or message from the catalog: bring what it connects to in the catalog too, placed around it and connected. For a service: receives (messages it receives), sends (messages it sends), dataStores. For a message: senders, receivers (the services that send and receive it)'
        ),
      inside: z
        .string()
        .optional()
        .describe('A ref (or node id) of a container (a domain or system added as one) to put this node inside'),
      x: z.number().optional(),
      y: z.number().optional(),
      width: z
        .number()
        .positive()
        .optional()
        .describe('For a container: its width to start with (it grows to fit what is put in it)'),
      height: z
        .number()
        .positive()
        .optional()
        .describe('For a container: its height to start with (it grows to fit what is put in it)'),
    })
  )
  .min(1);

export const edgeSpecsSchema = z.array(
  z.object({
    from: z.string().describe('A ref from nodes, or the id of a node already on the canvas'),
    to: z.string().describe('A ref from nodes, or the id of a node already on the canvas'),
    label: z.string().optional().describe('Defaults to EventCatalog wording, e.g. "publishes event"'),
  })
);

const pointSchema = z.object({ x: z.number(), y: z.number() });

/**
 * Edges for a new canvas (through the Studio API): as add_to_canvas takes them, and how each is drawn, if known
 * (e.g. copied from a diagram): the points it goes through (canvas coordinates, at right angles) and where its
 * label goes, and how tall its nodes were laid out (for its ends to land on them as they render). It follows its
 * nodes when they're moved.
 */
const routeSchema = z.object({
  points: z.array(pointSchema).min(2).max(200),
  label: pointSchema.optional(),
  sourceHeight: z.number().positive().optional(),
  targetHeight: z.number().positive().optional(),
});
export const newCanvasEdgesSchema = z.array(edgeSpecsSchema.element.extend({ route: routeSchema.optional() }));
export type NewCanvasEdges = z.output<typeof newCanvasEdgesSchema>;

const MAX_LEVEL_NODES = 1000;
const levelSchema = z.object({
  nodes: z
    .array(
      z.object({
        ref: z.string().describe("The ref of the node it is on the canvas (or its own id, if it's only on this level)"),
        type: z.string(),
        data: z.record(z.string(), z.unknown()),
        parent: z.string().optional().describe('The ref of the node it is shown in on this level'),
        x: z.number().describe('Its top-left corner (relative to its parent)'),
        y: z.number(),
        width: z.number().positive().optional().describe('For a container: its size'),
        height: z.number().positive().optional(),
      })
    )
    .max(MAX_LEVEL_NODES),
  edges: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        label: z.string().optional(),
        type: z.string().optional(),
        style: z.record(z.string(), z.unknown()).optional(),
        markerEnd: z.unknown().optional(),
        data: z.record(z.string(), z.unknown()).optional().describe("The edge's data, e.g. its route"),
      })
    )
    .max(MAX_LEVEL_NODES * 2),
});

/**
 * L1 and L2 of the diagram a canvas is opened from, laid out as the diagram showed them (by refs of the nodes given
 * for the canvas): shown as they are until the canvas's structure changes
 */
const unavailableReason = z.string().max(300).optional();
export const diagramLevelsSchema = z.object({
  1: levelSchema.optional(),
  2: levelSchema.optional(),
  unavailable: z
    .object({ 1: unavailableReason, 2: unavailableReason })
    .optional()
    .describe("Levels the diagram doesn't have, and why"),
});
export type DiagramLevelsSpec = z.output<typeof diagramLevelsSchema>;

/** A diagram's level, with refs swapped for the ids of the nodes made for them */
const toDiagramLevel = (level: z.output<typeof levelSchema>, idOf: (ref: string) => string) => {
  const shown = new Set(level.nodes.map((node) => node.ref));
  return {
    nodes: level.nodes.map(
      ({ ref, type, data, parent, x, y, width, height }): Node => ({
        id: idOf(ref),
        type,
        data,
        position: { x, y },
        ...(parent && shown.has(parent) && { parentId: idOf(parent) }),
        ...(width && height && { style: { width, height } }),
      })
    ),
    edges: level.edges
      .filter((edge) => shown.has(edge.from) && shown.has(edge.to))
      .map(({ from, to, ...edge }, index) => ({ ...edge, id: `diagram-${index}`, source: idOf(from), target: idOf(to) }) as Edge),
  };
};

export const ADD_TO_CANVAS_DESCRIPTION = [
  'Adds nodes (and connections between them) to the canvas, live for everyone on it.',
  'A node is either a catalog resource (resource: { collection, id }), shown with its real name and summary and automatically connected to the related resources already on the canvas (e.g. a service to the events it publishes), or a new component (type, name, summary) for things that are not in the catalog yet, like a proposed service.',
  'Give each node a ref to connect new nodes to each other in edges.',
  'Domains and systems can be containers (container: true for catalog ones, or type domain-group / system-group for new ones): put services, messages and data stores inside one with inside (its ref or node id), e.g. a domain container with its system containers inside, and their services inside those.',
  'To add a domain or system that is in the catalog with what it holds, give it contents: true: its systems, services, messages and data stores come with it, connected and laid out, in one go (as people add one from the catalog), so don\'t add them one by one. To bring what a catalog service or message connects to, give it connections (e.g. ["sends", "receives"] for a service, ["senders", "receivers"] for a message).',
  'Leave out x/y and each node is placed like an architect would: next to what it connects to (in edges, or as a related catalog resource), following the flow left to right (producers on the left of their messages, consumers on the right), lined up with it, and stacked when several connect to the same node. Nothing already on the canvas moves, and nodes connected to nothing go below what is there.',
  "Give x/y (a node's centre, like the positions from reading the canvas) only to put a node somewhere specific. Nodes are about 240 wide and 110 tall: leave about 200 between connected nodes for the labels on their connections.",
].join(' ');

// ---- Catalog ----

export type CatalogIndex = { resourcesByKey: Map<string, CatalogResource>; relationsByKey: Map<string, CatalogRelation[]> };

export const indexCatalog = (resources: CatalogResource[], relations: CatalogRelation[]): CatalogIndex => ({
  resourcesByKey: new Map(resources.map((resource) => [resource.key, resource])),
  relationsByKey: indexRelations(relations),
});

// ---- Reading ----

type NodeLookup = Map<string, Node>;
const lookupOf = (node: Node, lookup?: NodeLookup) => lookup ?? new Map([[node.id, node]]);

/** Something on the canvas, as an agent sees it */
export const describeNode = (node: Node, lookup?: NodeLookup) => {
  const resource = getResource(node.type, node.data);
  const link = getCatalogLink(node);
  const version = link?.version ?? (typeof resource.version === 'string' ? resource.version : undefined);
  return {
    id: node.id,
    type: getNodeLabel(node.type),
    ...(!isWrittenOnCanvas(node.type) && { name: resource.name }),
    ...(resource.summary ? { summary: resource.summary } : {}),
    ...(isWrittenOnCanvas(node.type) ? { text: node.data.text } : {}),
    // Notes added on L1 or L2 are only shown there (people see the rest at L3)
    ...(getNoteLevel(node) !== undefined && getNoteLevel(node) !== 3 && { onLevel: `L${getNoteLevel(node)}` }),
    ...(link && { catalogResource: link.key.replace(':', '/') }),
    ...(version && { version }),
    /** The node's centre on the canvas, like the x/y agents give */
    position: (({ x, y }) => ({ x: Math.round(x), y: Math.round(y) }))(nodeCenter(node, lookup)),
    size: sizeOf(node),
    ...(isGroupType(node.type) && { container: true }),
    ...(node.parentId && { inside: node.parentId }),
  };
};

/** A node's centre on the canvas (nodes in containers are positioned relative to them) */
export const nodeCenter = (node: Node, lookup?: NodeLookup) => {
  const { width, height } = sizeOf(node);
  const position = getAbsolutePosition(node, lookupOf(node, lookup));
  return { x: position.x + width / 2, y: position.y + height / 2 };
};

/** Where a node's position goes for it to be centred on a canvas point (agents give centres) */
export const topLeftFor = (node: Node, center: XYPosition, lookup?: NodeLookup) => {
  const { width, height } = sizeOf(node);
  const parent = node.parentId ? lookup?.get(node.parentId) : undefined;
  const parentPosition = parent ? getAbsolutePosition(parent, lookupOf(parent, lookup)) : { x: 0, y: 0 };
  return { x: center.x - width / 2 - parentPosition.x, y: center.y - height / 2 - parentPosition.y };
};

/** Everything on a canvas, as an agent sees it */
export const describeCanvas = (doc: Y.Doc) => {
  const canvas = readCanvas(doc);
  const lookup = new Map(canvas.nodes.map((node) => [node.id, node]));
  const names = new Map(canvas.nodes.map((node) => [node.id, getNodeName(node.type, node.data, node.id)]));
  const lastChange = canvas.meta.statusHistory?.at(-1);
  return {
    title: canvas.meta.title,
    status: getCanvasStatus(canvas.meta),
    ...(lastChange && {
      statusChanged: {
        by: lastChange.by.name,
        at: new Date(lastChange.at).toISOString(),
        ...(lastChange.note && { note: lastChange.note }),
      },
    }),
    nodes: canvas.nodes.map((node) => describeNode(node, lookup)),
    connections: canvas.edges.map((edge) => ({
      id: edge.id,
      from: edge.source,
      to: edge.target,
      description: `${names.get(edge.source)} ${String(edge.label || '→').replace(/\s+/g, ' ')} ${names.get(edge.target)}`,
    })),
    hotspots: readHotspots(doc).map((hotspot) => ({
      hotspotId: hotspot.id,
      severity: hotspot.severity,
      title: hotspot.title,
      ...(hotspot.description && { description: hotspot.description }),
      ...(hotspot.nodeId ? { onNode: hotspot.nodeId } : { position: hotspot.position }),
    })),
    comments: canvas.threads.map((thread) => ({
      threadId: thread.id,
      ...(thread.nodeId ? { onNode: thread.nodeId } : { position: thread.position }),
      resolved: thread.resolved,
      messages: thread.messages.map((message) => ({ from: message.author.name, text: message.text })),
    })),
  };
};

// ---- Changing ----

export type NodeSpecs = z.output<typeof nodeSpecsSchema>;
export type EdgeSpecs = z.output<typeof edgeSpecsSchema>;
/**
 * A node to add: built and placed, with the catalog resource it stands for (to connect it to related ones).
 * Its node's position is relative to its container, as the canvas is now; `canvasPosition` is where it goes on
 * the canvas, which stays the same when containers grow to fit what's added (and move what's in them).
 */
export type PlannedNode = {
  ref?: string;
  node: Node;
  name: string;
  resource?: CatalogResource;
  canvasPosition: XYPosition;
  /** In a domain or system added with its contents (the container's node id): added with it, in one go */
  partOf?: string;
};

/** Domains and systems added with their contents, built and laid out (the container first), by the spec they're for */
export type CatalogBlocks = Map<NodeSpecs[number], Node[]>;

/**
 * Builds the nodes to add (catalog resources, as cards or containers, or new components), and places them:
 * where asked, or next to what they connect to (the edges asked for, and related catalog resources)
 */
export const planNodes = (
  existing: Node[],
  specs: NodeSpecs,
  catalog: CatalogIndex,
  edges: EdgeSpecs = [],
  blocks: CatalogBlocks = new Map()
) => {
  const lookup: NodeLookup = new Map(existing.map((node) => [node.id, node]));
  const refs = new Map<string, Node>();
  const planned: PlannedNode[] = [];
  const toPlace: string[] = [];
  const errors: string[] = [];
  const hasPosition = (spec: { x?: number; y?: number }) => spec.x !== undefined && spec.y !== undefined;
  const centerOf = (spec: { x?: number; y?: number }) => (hasPosition(spec) ? { x: spec.x!, y: spec.y! } : { x: 0, y: 0 });
  // A container at the size asked for, still centred where asked
  const sized = (node: Node, spec: { x?: number; y?: number; width?: number; height?: number }): Node => {
    if (!isGroupType(node.type) || !spec.width || !spec.height) return node;
    const center = centerOf(spec);
    const { width, height } = spec;
    return { ...node, width, height, position: { x: center.x - width / 2, y: center.y - height / 2 } };
  };

  // A domain or system laid out with its contents, centred where asked
  const centred = (node: Node, center: XYPosition): Node => {
    const { width, height } = sizeOf(node);
    return { ...node, position: { x: center.x - width / 2, y: center.y - height / 2 } };
  };

  // Inside a container, at the canvas point asked for (relative to the container)
  const putInside = (node: Node, parent: Node, spec: { x?: number; y?: number }): Node => {
    if (!hasPosition(spec)) return { ...node, parentId: parent.id };
    const { width, height } = sizeOf(node);
    const parentPosition = getAbsolutePosition(parent, lookup);
    return {
      ...node,
      parentId: parent.id,
      position: { x: spec.x! - width / 2 - parentPosition.x, y: spec.y! - height / 2 - parentPosition.y },
    };
  };

  for (const spec of specs) {
    let built: { node: Node; name: string; resource?: CatalogResource } | undefined;
    if (spec.resource) {
      const resource = catalog.resourcesByKey.get(`${spec.resource.collection}:${spec.resource.id}`);
      if (!resource) {
        errors.push(`No ${spec.resource.collection} resource "${spec.resource.id}" in the catalog`);
        continue;
      }
      const asContainer = (spec.container || spec.contents) && canBeContainer(resource);
      const block = blocks.get(spec);
      const node = block
        ? centred(block[0], centerOf(spec))
        : asContainer
          ? sized(buildContainer(resource, centerOf(spec)), spec)
          : buildNode(resource.node.type, catalogNodeData(resource), centerOf(spec));
      built = { node, name: resource.name, resource };
    } else {
      const definition = getNodeDefinition(spec.type);
      if (!definition) {
        errors.push(`Give each node a resource, or a type (one of ${AGENT_COMPONENT_TYPES.join(', ')})`);
        continue;
      }
      const data = isWrittenOnCanvas(definition.type)
        ? {
            ...definition.createData(),
            text: spec.summary ?? spec.name ?? '',
            ...(spec.fontSize && definition.type === 'text' && { fontSize: spec.fontSize }),
          }
        : updateResource(definition.type, definition.createData(), {
            ...(spec.name && { name: spec.name }),
            ...(spec.summary && { summary: spec.summary }),
            ...(spec.version && isVersioned(definition.type) && { version: spec.version }),
          });
      const node = sized(buildNode(definition.type, data, centerOf(spec)), spec);
      built = { node, name: String(getResource(node.type, node.data).name ?? definition.label) };
    }

    if (spec.inside && !canGoInContainer(built.node.type)) {
      errors.push(`Notes aren't put in containers: "${spec.ref ?? built.name}" was put on the canvas instead`);
    } else if (spec.inside) {
      const parent = refs.get(spec.inside) ?? lookup.get(spec.inside);
      if (parent && isGroupType(parent.type)) built.node = putInside(built.node, parent, spec);
      else errors.push(`"${spec.inside}" is not a container on the canvas (a domain or system added as a container)`);
    }
    if (!hasPosition(spec)) toPlace.push(built.node.id);
    lookup.set(built.node.id, built.node);
    if (spec.ref) refs.set(spec.ref, built.node);
    planned.push({ ref: spec.ref, ...built, canvasPosition: getAbsolutePosition(built.node, lookup) });

    // What a domain or system holds, as it was laid out in it
    for (const node of (spec.resource && blocks.get(spec)?.slice(1)) || []) {
      const key = getCatalogLink(node)?.key;
      const resource = key ? catalog.resourcesByKey.get(key) : undefined;
      lookup.set(node.id, node);
      planned.push({
        node,
        name: resource?.name ?? getNodeName(node.type, node.data, node.id),
        resource,
        canvasPosition: getAbsolutePosition(node, lookup),
        partOf: built.node.id,
      });
    }
  }

  // What the new nodes connect to: the edges asked for, and related catalog resources (as they'll be connected)
  const links = new Map<string, Link>();
  // What's in a domain or system added with its contents is placed with it: its links are the container's
  const inBlocks = new Set(planned.flatMap((entry) => (entry.partOf ? [entry.node.id] : [])));
  const placedWith = (id: string) => {
    let node = lookup.get(id);
    while (node?.parentId && inBlocks.has(node.id)) node = lookup.get(node.parentId);
    return node?.id ?? id;
  };
  const link = (from: string, to: string) => {
    const [source, target] = [placedWith(from), placedWith(to)];
    if (source !== target) links.set(`${source}>${target}`, { source, target });
  };
  const nodeIdOf = (refOrId: string) => refs.get(refOrId)?.id ?? refOrId;
  edges.forEach((edge) => link(nodeIdOf(edge.from), nodeIdOf(edge.to)));
  const nodesByKey = new Map<string, Node[]>();
  for (const node of lookup.values()) {
    const key = getCatalogLink(node)?.key;
    if (key) nodesByKey.set(key, [...(nodesByKey.get(key) ?? []), node]);
  }
  for (const { node, resource } of planned) {
    for (const relation of resource ? (catalog.relationsByKey.get(resource.key) ?? []) : []) {
      const outgoing = relation.source === resource?.key;
      for (const other of nodesByKey.get(outgoing ? relation.target : relation.source) ?? []) {
        // Containers hold what they contain, rather than connect to it
        if (relation.label === 'contains' && (isGroupType(node.type) || isGroupType(other.type))) continue;
        if (outgoing) link(node.id, other.id);
        else link(other.id, node.id);
      }
    }
  }

  // Placed around what's on the canvas people edit (notes on L1 and L2 aren't there)
  const onCanvas = [...lookup.values()].filter((node) => isOnLevel(node, 3));
  const positions = placeNodes(onCanvas, toPlace, [...links.values()]);
  const canvasPositions = new Map(planned.map((entry) => [entry.node.id, positions.get(entry.node.id) ?? entry.canvasPosition]));
  for (const entry of planned) {
    const canvasPosition = positions.get(entry.node.id);
    if (!canvasPosition) continue;
    const { parentId } = entry.node;
    const parent = parentId ? lookup.get(parentId) : undefined;
    const origin = parentId
      ? (canvasPositions.get(parentId) ?? (parent ? getAbsolutePosition(parent, lookup) : { x: 0, y: 0 }))
      : { x: 0, y: 0 };
    entry.canvasPosition = canvasPosition;
    entry.node = { ...entry.node, position: { x: canvasPosition.x - origin.x, y: canvasPosition.y - origin.y } };
  }
  // What's in a domain or system added with its contents goes where it went
  for (const entry of planned) {
    const parentPosition = entry.partOf && entry.node.parentId ? canvasPositions.get(entry.node.parentId) : undefined;
    if (!parentPosition) continue;
    entry.canvasPosition = { x: parentPosition.x + entry.node.position.x, y: parentPosition.y + entry.node.position.y };
    canvasPositions.set(entry.node.id, entry.canvasPosition);
  }

  // Notes and text go where they're asked, or the nearest clear spot to it: never on top of anything
  const existingLookup = new Map(existing.map((node) => [node.id, node]));
  const sizeOnCanvas = (node: Node) => (isWrittenOnCanvas(node.type) ? writtenSize(node) : sizeOf(node));
  const taken: Rect[] = [
    ...existing
      .filter((node) => isOnLevel(node, 3))
      .map((node) => ({ ...getAbsolutePosition(node, existingLookup), ...sizeOnCanvas(node) })),
    ...planned
      .filter((entry) => !isWrittenOnCanvas(entry.node.type) && isOnLevel(entry.node, 3))
      .map((entry) => ({ ...entry.canvasPosition, ...sizeOf(entry.node) })),
  ];
  for (const entry of planned) {
    if (!isWrittenOnCanvas(entry.node.type) || entry.node.parentId || !isOnLevel(entry.node, 3)) continue;
    const size = writtenSize(entry.node);
    const spot = clearSpot(entry.canvasPosition, size, taken, entry.node.type === 'note' ? RIGHT_FIRST : UP_FIRST);
    entry.canvasPosition = spot;
    entry.node = { ...entry.node, position: spot };
    taken.push({ ...spot, ...size });
  }

  return { planned, errors };
};

const keyOf = (resource: { collection: string; id: string }) => `${resource.collection}:${resource.id}`;

/**
 * What specs bring from the catalog, as people get it there: the connections asked for (as more specs, after the
 * one they're for) and the contents of domains and systems (built and laid out, for planNodes). Nothing already on
 * the canvas, or brought by an earlier spec, is brought again.
 */
export const expandCatalogSpecs = async (existing: Node[], specs: NodeSpecs, catalog: CatalogIndex) => {
  const expanded: NodeSpecs = [];
  const blocks: CatalogBlocks = new Map();
  const errors: string[] = [];
  const brought = [...existing];
  const keys = new Set(
    [...existing.map((node) => getCatalogLink(node)?.key), ...specs.map((spec) => spec.resource && keyOf(spec.resource))].filter(
      (key): key is string => !!key
    )
  );

  for (const spec of specs) {
    expanded.push(spec);
    const resource = spec.resource && catalog.resourcesByKey.get(keyOf(spec.resource));
    if (!resource) continue;

    if (spec.contents && !canBeContainer(resource))
      errors.push(`Only domains and systems have contents: "${resource.name}" was added on its own`);
    else if (spec.contents) {
      // Nothing else in this call (its specs, or what their connections bring) is brought again
      const block = sortByHierarchy((await buildContainerWithContents(resource, { x: 0, y: 0 }, catalog, brought, keys)).nodes);
      blocks.set(spec, block);
      brought.push(...block);
      for (const node of block) {
        const key = getCatalogLink(node)?.key;
        if (key) keys.add(key);
      }
    }

    if (!spec.connections?.length) continue;
    const wanted = new Set<string>(spec.connections);
    const groups = getCatalogConnections(resource, catalog, keys).filter((group) => wanted.has(group.id));
    for (const other of groups.flatMap((group) => group.resources)) {
      keys.add(other.key);
      expanded.push({
        resource: { collection: other.collection as (typeof CATALOG_COLLECTIONS)[number], id: other.id },
        // A service's data stores go in its container with it
        ...(spec.inside && other.collection === 'containers' && { inside: spec.inside }),
      });
    }
  }
  return { specs: expanded, blocks, errors };
};

/** Edges given by refs (or ids of nodes already on the canvas), as node ids */
const refIds = (planned: PlannedNode[]) =>
  new Map(planned.flatMap((entry) => (entry.ref ? [[entry.ref, entry.node.id] as const] : [])));

export const resolveEdgeRefs = <Spec extends EdgeSpecs[number]>(edges: Spec[], planned: PlannedNode[]) => {
  const refs = refIds(planned);
  return edges.map((edge) => ({ ...edge, from: refs.get(edge.from) ?? edge.from, to: refs.get(edge.to) ?? edge.to }));
};

/**
 * A new canvas's content from nodes and edges given as add_to_canvas takes them. Only the connections asked for
 * are made: related catalog resources aren't connected as well, so the canvas shows just what was asked for (e.g.
 * a diagram's connections, which may go through channels). Says what's wrong if anything can't be followed.
 */
export const planCanvas = (
  specs: NodeSpecs,
  edges: NewCanvasEdges,
  catalog: CatalogIndex,
  levels?: DiagramLevelsSpec
): { content: CanvasContent; errors: string[] } => {
  const { planned, errors } = planNodes([], specs, catalog, edges);
  const ids = new Set(planned.map((entry) => entry.node.id));
  const connections = resolveEdgeRefs(edges, planned);
  for (const end of connections.flatMap((connection) => [connection.from, connection.to])) {
    if (!ids.has(end)) errors.push(`Edges connect nodes by their ref: no node has the ref "${end}"`);
  }
  const refs = refIds(planned);
  const idOf = (ref: string) => refs.get(ref) ?? ref;
  const diagramLevels = levels && {
    ...(levels[1] && { 1: toDiagramLevel(levels[1], idOf) }),
    ...(levels[2] && { 2: toDiagramLevel(levels[2], idOf) }),
    ...(levels.unavailable && { unavailable: levels.unavailable }),
  };
  return {
    content: { nodes: planned.map((entry) => entry.node), connections, ...(diagramLevels && { levels: diagramLevels }) },
    errors: [...new Set(errors)],
  };
};

/** How far a sticky note or text can be from a node to be about it (to move with it when the canvas is laid out) */
const NOTE_REACH = 400;
/** Notes and text that would land on something are moved this far at a time, up to this many times, to clear it */
const NUDGE = 40;
const MAX_NUDGES = 80;
/** The least room left between a note or text and what's around it */
const NOTE_CLEARANCE = 24;

type Rect = { x: number; y: number; width: number; height: number };
const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width + NOTE_CLEARANCE &&
  b.x < a.x + a.width + NOTE_CLEARANCE &&
  a.y < b.y + b.height + NOTE_CLEARANCE &&
  b.y < a.y + a.height + NOTE_CLEARANCE;
const boundsOf = (rects: Rect[]): Rect | undefined => {
  if (!rects.length) return undefined;
  const x = Math.min(...rects.map((rect) => rect.x));
  const y = Math.min(...rects.map((rect) => rect.y));
  return {
    x,
    y,
    width: Math.max(...rects.map((rect) => rect.x + rect.width)) - x,
    height: Math.max(...rects.map((rect) => rect.y + rect.height)) - y,
  };
};

/** How big a note or text is drawn: text is as big as what's written (the canvas only knows once it's drawn) */
const writtenSize = (node: Node) => {
  // A sticky note grows taller with what's written on it (about 20 characters a line)
  if (node.type === 'note') {
    const { width, height } = sizeOf(node);
    const lines = Math.ceil(String(node.data.text ?? '').length / 20);
    return { width, height: Math.max(height, lines * 22 + 60) };
  }
  if (node.type !== 'text') return sizeOf(node);
  const fontSize = typeof node.data.fontSize === 'number' ? node.data.fontSize : TEXT_FONT_SIZE;
  const lines = String(node.data.text ?? '').split('\n');
  return {
    width: Math.max(1, ...lines.map((line) => line.length)) * fontSize * 0.6,
    height: lines.length * fontSize * 1.4,
  };
};

const UP_FIRST = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;
const RIGHT_FIRST = [
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, 0],
] as const;

/**
 * The nearest place to `at` where something this big is clear of everything taken, trying each way in turn: text
 * upwards first (titles stay above), notes to the right first (beside what they're about)
 */
const clearSpot = (
  at: XYPosition,
  size: { width: number; height: number },
  taken: Rect[],
  ways: readonly (readonly [number, number])[] = UP_FIRST
): XYPosition => {
  const isClear = (spot: XYPosition) => !taken.some((rect) => overlaps({ ...spot, ...size }, rect));
  if (isClear(at)) return at;
  for (let step = 1; step <= MAX_NUDGES; step++) {
    const distance = step * NUDGE;
    for (const [dx, dy] of ways) {
      const spot = { x: at.x + dx * distance, y: at.y + dy * distance };
      if (isClear(spot)) return spot;
    }
  }
  return at;
};

/**
 * A layout with sticky notes and text placed too, as they were around the diagram: each beside a node moves with it
 * (the nearest one, within NOTE_REACH of its middle), the rest (e.g. a title) keep their place around the whole
 * diagram. None lands on anything: one that would is moved to the nearest clear spot.
 */
export const withNotesPlaced = (nodes: Node[], layout: LayoutResult): LayoutResult => {
  const before = new Map(nodes.map((node) => [node.id, node]));
  const after = new Map(
    nodes.map((node) => {
      const placed = layout.nodes.get(node.id);
      return [node.id, placed ? { ...node, position: placed.position, ...(placed.size ?? {}) } : node];
    })
  );
  const rectIn = (lookup: Map<string, Node>) => (node: Node) => ({
    ...getAbsolutePosition(lookup.get(node.id)!, lookup),
    ...sizeOf(lookup.get(node.id)!),
  });
  const drawn = nodes.filter((node) => !isWrittenOnCanvas(node.type) && isOnLevel(node, 3));
  /** How far a point is from a node (0 inside it), with what's in containers nearer than the containers */
  const distanceTo = (point: XYPosition, node: Node) => {
    const rect = rectIn(before)(node);
    const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
    const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
    return Math.hypot(dx, dy) + (isGroupType(node.type) ? 1 : 0);
  };
  const boundsBefore = boundsOf(drawn.map(rectIn(before)));
  const boundsAfter = boundsOf(drawn.map(rectIn(after)));
  const aroundDiagram =
    boundsBefore && boundsAfter ? { x: boundsAfter.x - boundsBefore.x, y: boundsAfter.y - boundsBefore.y } : { x: 0, y: 0 };

  const taken: Rect[] = drawn.map(rectIn(after));
  const placed = new Map(layout.nodes);
  for (const note of nodes.filter((node) => isWrittenOnCanvas(node.type) && isOnLevel(node, 3) && !node.parentId)) {
    const size = writtenSize(note);
    const middle = { x: note.position.x + size.width / 2, y: note.position.y + size.height / 2 };
    const nearest = drawn
      .map((node) => ({ node, distance: distanceTo(middle, node) }))
      .filter(({ distance }) => distance <= NOTE_REACH)
      .sort((a, b) => a.distance - b.distance)[0]?.node;
    const shift = nearest
      ? (() => {
          const from = getAbsolutePosition(nearest, before);
          const to = getAbsolutePosition(after.get(nearest.id)!, after);
          return { x: to.x - from.x, y: to.y - from.y };
        })()
      : aroundDiagram;
    const position = clearSpot(
      { x: note.position.x + shift.x, y: note.position.y + shift.y },
      size,
      taken,
      note.type === 'note' ? RIGHT_FIRST : UP_FIRST
    );
    taken.push({ ...position, ...size });
    placed.set(note.id, { position });
  }
  return { ...layout, nodes: placed };
};

export type NodeUpdate = { nodeId: string; name?: string; summary?: string; version?: string; fontSize?: number };

/** Renames, re-describes or re-versions a node. Catalog resources keep their catalog name, summary and version. */
export const updateCanvasNode = (doc: Y.Doc, { nodeId, name, summary, version, fontSize }: NodeUpdate) =>
  doc.transact(() => {
    const node = getCanvasMaps(doc).nodes.get(nodeId);
    if (!node) return { error: `No node "${nodeId}" on the canvas` };
    if (!getCatalogLink(node)) {
      updateNodeData(doc, nodeId, (data) =>
        isWrittenOnCanvas(node.type)
          ? {
              ...data,
              text: summary ?? name ?? data.text,
              ...(fontSize && node.type === 'text' && { fontSize }),
            }
          : updateResource(node.type, data, {
              ...(name !== undefined && { name }),
              ...(summary !== undefined && { summary }),
              ...(version !== undefined && isVersioned(node.type) && { version }),
            })
      );
    }
    return { updated: nodeId };
  });

// ---- A catalog resource with its connections ----

const MESSAGE_COLLECTIONS = new Set(['events', 'commands', 'queries']);

/** What a group of connections is: what a service sends, receives and stores, or which services send or receive a message */
export type ConnectionGroupId = (typeof CONNECTION_GROUP_IDS)[number];
export type ConnectionGroup = { id: ConnectionGroupId; label: string; resources: CatalogResource[] };

const GROUP_LABELS: Record<ConnectionGroupId, string> = {
  receives: 'Messages it receives',
  sends: 'Messages it sends',
  dataStores: 'Data stores it reads or writes',
  senders: 'Services that send it',
  receivers: 'Services that receive it',
};

/** Which group a related resource is in, for a service or a message (or none: not brought with it) */
const groupOf = (resource: CatalogResource, other: CatalogResource, outgoing: boolean): ConnectionGroupId | undefined => {
  if (resource.collection === 'services') {
    if (other.collection === 'containers') return 'dataStores';
    if (MESSAGE_COLLECTIONS.has(other.collection)) return outgoing ? 'sends' : 'receives';
  }
  if (MESSAGE_COLLECTIONS.has(resource.collection) && other.collection === 'services') return outgoing ? 'receivers' : 'senders';
  return undefined;
};

/**
 * What a catalog service or message connects to that isn't on the canvas yet, in groups (only the groups with
 * something in them): a service's messages and data stores, or the services that send and receive a message
 */
export const getCatalogConnections = (
  resource: CatalogResource,
  catalog: CatalogIndex,
  keysOnCanvas: ReadonlySet<string>
): ConnectionGroup[] => {
  const groups = new Map<ConnectionGroupId, CatalogResource[]>();
  const seen = new Set<string>();
  for (const relation of catalog.relationsByKey.get(resource.key) ?? []) {
    const outgoing = relation.source === resource.key;
    const other = catalog.resourcesByKey.get(outgoing ? relation.target : relation.source);
    if (!other || seen.has(other.key) || keysOnCanvas.has(other.key)) continue;
    const group = groupOf(resource, other, outgoing);
    if (!group) continue;
    groups.set(group, [...(groups.get(group) ?? []), other]);
    seen.add(other.key);
  }
  // In reading order: what comes in, then what goes out
  return (['receives', 'senders', 'sends', 'receivers', 'dataStores'] as const).flatMap((id) => {
    const resources = groups.get(id);
    return resources ? [{ id, label: GROUP_LABELS[id], resources }] : [];
  });
};

/**
 * A catalog resource centred on a canvas point (inside the container asked for, else the one there, if any), with
 * the resources it connects to placed around it like an architect would (what comes in before it, what goes out
 * after it), and the connections between them and to what's already on the canvas. A service's data stores go in its container
 * with it. Positions are relative to the containers they're in, as the canvas is now.
 */
export const planWithConnections = (
  existing: Node[],
  resource: CatalogResource,
  center: XYPosition,
  include: CatalogResource[],
  catalog: CatalogIndex,
  inside?: string
): { nodes: Node[]; edges: Edge[] } => {
  const container = containerFor(center, existing, inside);
  const specOf = (entry: CatalogResource) => ({
    resource: { collection: entry.collection as (typeof CATALOG_COLLECTIONS)[number], id: entry.id },
  });
  const { planned } = planNodes(
    existing,
    [
      { ...specOf(resource), x: center.x, y: center.y, ...(container && { inside: container.id }) },
      ...include.map((entry) => ({
        ...specOf(entry),
        ...(container && entry.collection === 'containers' && { inside: container.id }),
      })),
    ],
    catalog
  );
  const placed = [...existing];
  const edges: Edge[] = [];
  for (const { node, resource: entry } of planned) {
    if (entry) edges.push(...getRelatedEdges(entry, node.id, placed, catalog.relationsByKey, node.type));
    placed.push(node);
  }
  return { nodes: planned.map((entry) => entry.node), edges };
};
