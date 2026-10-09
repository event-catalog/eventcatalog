import type { Edge, Node, XYPosition } from '@xyflow/react';
import type * as Y from 'yjs';
import { z } from 'zod';
import { buildNode, getCanvasMaps, getCanvasStatus, readCanvas, updateNodeData, type CanvasContent } from './canvas-doc';
import type { CatalogRelation, CatalogResource } from './catalog-resources';
import {
  buildContainer,
  canBeContainer,
  catalogNodeData,
  containerTypeFor,
  getCatalogLink,
  getRelatedEdges,
  indexRelations,
} from './catalog';
import { containerFor, getAbsolutePosition, sizeOf } from './grouping';
import { placeNodes, type Link } from './placement';
import {
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
  updateResource,
} from './node-types';

/**
 * What agents can do on a canvas, shared by the MCP tools (on the server) and the WebMCP tools (in the
 * browser), so both describe and change a canvas the same way.
 */

// ---- Inputs ----

export const nodeSpecsSchema = z
  .array(
    z.object({
      ref: z.string().optional().describe('Your name for this node, to use in edges'),
      resource: z
        .object({ collection: z.enum(CATALOG_COLLECTIONS), id: z.string() })
        .optional()
        .describe('A catalog resource to add (latest version)'),
      type: z.enum(COMPONENT_TYPES).optional().describe('For a new component: what it is'),
      name: z.string().optional().describe('For a new component: its name'),
      summary: z.string().optional().describe('For a new component: what it does. For a note or text: its text'),
      version: z.string().optional().describe('For a new component: its version, e.g. 1.0.0 (defaults to 0.0.1)'),
      container: z
        .boolean()
        .optional()
        .describe(
          'For a domain or system from the catalog: add it as a container that other nodes sit inside, rather than a card'
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
 * label goes. It follows its nodes when they're moved.
 */
const routeSchema = z.object({ points: z.array(pointSchema).min(2).max(200), label: pointSchema.optional() });
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
export type PlannedNode = { ref?: string; node: Node; name: string; resource?: CatalogResource; canvasPosition: XYPosition };

/**
 * Builds the nodes to add (catalog resources, as cards or containers, or new components), and places them:
 * where asked, or next to what they connect to (the edges asked for, and related catalog resources)
 */
export const planNodes = (existing: Node[], specs: NodeSpecs, catalog: CatalogIndex, edges: EdgeSpecs = []) => {
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
      const asContainer = spec.container && canBeContainer(resource);
      const node = asContainer
        ? sized(buildContainer(resource, centerOf(spec)), spec)
        : buildNode(resource.node.type, catalogNodeData(resource), centerOf(spec));
      built = { node, name: resource.name, resource };
    } else {
      const definition = getNodeDefinition(spec.type);
      if (!definition) {
        errors.push(`Give each node a resource, or a type (one of ${COMPONENT_TYPES.join(', ')})`);
        continue;
      }
      const data = isWrittenOnCanvas(definition.type)
        ? { ...definition.createData(), text: spec.summary ?? spec.name ?? '' }
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
  }

  // What the new nodes connect to: the edges asked for, and related catalog resources (as they'll be connected)
  const links = new Map<string, Link>();
  const link = (source: string, target: string) => links.set(`${source}>${target}`, { source, target });
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

  return { planned, errors };
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

export type NodeUpdate = { nodeId: string; name?: string; summary?: string; version?: string };

/** Renames, re-describes or re-versions a node. Catalog resources keep their catalog name, summary and version. */
export const updateCanvasNode = (doc: Y.Doc, { nodeId, name, summary, version }: NodeUpdate) =>
  doc.transact(() => {
    const node = getCanvasMaps(doc).nodes.get(nodeId);
    if (!node) return { error: `No node "${nodeId}" on the canvas` };
    if (!getCatalogLink(node)) {
      updateNodeData(doc, nodeId, (data) =>
        isWrittenOnCanvas(node.type)
          ? { ...data, text: summary ?? name ?? data.text }
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
export type ConnectionGroupId = 'receives' | 'sends' | 'dataStores' | 'senders' | 'receivers';
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
