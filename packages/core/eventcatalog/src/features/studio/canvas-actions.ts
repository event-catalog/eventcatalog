import type { Node, XYPosition } from '@xyflow/react';
import type * as Y from 'yjs';
import { z } from 'zod';
import { buildNode, getCanvasMaps, readCanvas, updateNodeData } from './canvas-doc';
import type { CatalogRelation, CatalogResource } from './catalog-resources';
import { buildContainer, canBeContainer, catalogNodeData, containerTypeFor, getCatalogLink, indexRelations } from './catalog';
import { getAbsolutePosition, sizeOf } from './grouping';
import { placeNodes, type Link } from './placement';
import {
  COMPONENT_TYPES,
  getNodeDefinition,
  getNodeLabel,
  getNodeName,
  getResource,
  isGroupType,
  updateResource,
} from './node-types';

/**
 * What agents can do on a canvas, shared by the MCP tools (on the server) and the WebMCP tools (in the
 * browser), so both describe and change a canvas the same way.
 */

export const CATALOG_COLLECTIONS = [
  'domains',
  'systems',
  'services',
  'events',
  'commands',
  'queries',
  'channels',
  'containers',
] as const;

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
      summary: z.string().optional().describe('For a new component: what it does. For a note: its text'),
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
  return {
    id: node.id,
    type: getNodeLabel(node.type),
    ...(node.type !== 'note' && { name: resource.name }),
    ...(resource.summary ? { summary: resource.summary } : {}),
    ...(node.type === 'note' ? { text: node.data.text } : {}),
    ...(link ? { catalogResource: link.key.replace(':', '/'), version: link.version } : {}),
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
  return {
    title: canvas.meta.title,
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
        ? buildContainer(resource, centerOf(spec))
        : buildNode(resource.node.type, catalogNodeData(resource), centerOf(spec));
      built = { node, name: resource.name, resource };
    } else {
      const definition = getNodeDefinition(spec.type);
      if (!definition) {
        errors.push(`Give each node a resource, or a type (one of ${COMPONENT_TYPES.join(', ')})`);
        continue;
      }
      const data =
        definition.type === 'note'
          ? { ...definition.createData(), text: spec.summary ?? spec.name ?? '' }
          : updateResource(definition.type, definition.createData(), {
              ...(spec.name && { name: spec.name }),
              ...(spec.summary && { summary: spec.summary }),
            });
      const node = buildNode(definition.type, data, centerOf(spec));
      built = { node, name: String(getResource(node.type, node.data).name ?? definition.label) };
    }

    if (spec.inside) {
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

  const positions = placeNodes([...lookup.values()], toPlace, [...links.values()]);
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
export const resolveEdgeRefs = (edges: EdgeSpecs, planned: PlannedNode[]) => {
  const refs = new Map(planned.flatMap((entry) => (entry.ref ? [[entry.ref, entry.node.id] as const] : [])));
  return edges.map((edge) => ({ ...edge, from: refs.get(edge.from) ?? edge.from, to: refs.get(edge.to) ?? edge.to }));
};

/** Renames or re-describes a node. Catalog resources keep their catalog name and summary. */
export const updateCanvasNode = (doc: Y.Doc, { nodeId, name, summary }: { nodeId: string; name?: string; summary?: string }) =>
  doc.transact(() => {
    const node = getCanvasMaps(doc).nodes.get(nodeId);
    if (!node) return { error: `No node "${nodeId}" on the canvas` };
    if (!getCatalogLink(node)) {
      updateNodeData(doc, nodeId, (data) =>
        node.type === 'note'
          ? { ...data, text: summary ?? name ?? data.text }
          : updateResource(node.type, data, { ...(name !== undefined && { name }), ...(summary !== undefined && { summary }) })
      );
    }
    return { updated: nodeId };
  });
