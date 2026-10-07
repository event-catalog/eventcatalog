import type { Edge, Node } from '@xyflow/react';
import { getMessagesLabel } from '@eventcatalog/visualiser/layout';
import { EDGE_MARKER, MESSAGE_COLLECTIONS } from './edges';
import { GROUP_TYPES, isGroupType } from './node-types';

/**
 * Levels of detail, the same as EventCatalog's diagrams:
 * - L1: domains, systems and how they relate (services folded into the system or domain that contains them)
 * - L2: services and data stores, with messages and channels hidden (the nodes either side connected directly)
 * - L3: everything, including messages and channels (the canvas people edit)
 *
 * What a domain or system contains is what sits inside it (as a container), or what it's connected to with
 * "contains" (as a card, which catalog domains and systems get when their services are on the canvas).
 */
export type Level = 1 | 2 | 3;

export const LEVELS: { level: Level; description: string }[] = [
  { level: 1, description: 'Domains, systems and their relationships' },
  { level: 2, description: 'Services and data stores' },
  { level: 3, description: 'Everything, including messages and channels' },
];

// Domains and systems: as cards (what they contain is connected with "contains") or containers (it's inside)
const CONTAINER_TYPES = new Set(['system', 'context-domain', GROUP_TYPES.system, GROUP_TYPES.domain]);
const isSystem = (node: Node) => node.type === 'system' || node.type === GROUP_TYPES.system;
const COLLAPSED_GROUP_SIZE = { width: 280, height: 110 };

const isMessage = (node: Node) => !!MESSAGE_COLLECTIONS[node.type ?? ''];
const isCarrier = (node: Node) => isMessage(node) || node.type === 'channel';
const isContainer = (node: Node) => CONTAINER_TYPES.has(node.type ?? '');
const messageName = (node: Node) => String((node.data as { message?: { name?: string } }).message?.name ?? node.id);

/** What a node becomes at a level: kept (as itself or another node), carried through (messages, channels) or dropped */
type Representative = { kind: 'node'; id: string } | { kind: 'carrier' } | { kind: 'drop' };

/**
 * Collapse a graph: each node is kept, replaced by another node (e.g. a service by its system),
 * carried through (messages and channels: the nodes either side get connected directly) or dropped.
 * Edges between the same two nodes are merged, labelled with the messages they carry.
 */
const collapseGraph = (nodes: Node[], edges: Edge[], representativeOf: (node: Node) => Representative) => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  // Whether one node is inside another (e.g. a system in its domain): they're not connected, one holds the other
  const isInside = (id: string, containerId: string) => {
    for (let node = byId.get(id); node?.parentId; node = byId.get(node.parentId)) if (node.parentId === containerId) return true;
    return false;
  };
  const representatives = new Map(nodes.map((node) => [node.id, representativeOf(node)]));
  const outgoing = new Map<string, Edge[]>();
  edges.forEach((edge) => outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]));

  type Merged = { source: string; target: string; messages: Map<string, string>; labels: string[] };
  const merged = new Map<string, Merged>();
  const addMessage = (messages: Map<string, string>, node: Node) => {
    if (isMessage(node)) messages.set(messageName(node), MESSAGE_COLLECTIONS[node.type!]);
  };

  edges.forEach((edge) => {
    const from = representatives.get(edge.source);
    if (from?.kind !== 'node') return;
    // Follow the edge through carried nodes to the node(s) it reaches, collecting the messages on the way
    const stack = [{ id: edge.target, messages: new Map<string, string>(), labels: [String(edge.label ?? '')] }];
    const visited = new Set<string>();
    addMessage(stack[0].messages, byId.get(edge.source)!);
    while (stack.length) {
      const current = stack.pop()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      const node = byId.get(current.id);
      const to = representatives.get(current.id);
      if (!node || !to || to.kind === 'drop') continue;
      const messages = new Map(current.messages);
      addMessage(messages, node);
      if (to.kind === 'carrier') {
        (outgoing.get(current.id) ?? []).forEach((next) => stack.push({ id: next.target, messages, labels: [] as string[] }));
        continue;
      }
      // Edges inside what was collapsed disappear, and so do edges to what a node is in (e.g. a system and the
      // messages left loose in its domain, which fold into the domain)
      if (from.id === to.id || isInside(from.id, to.id) || isInside(to.id, from.id)) continue;
      const key = `${from.id}->${to.id}`;
      const entry: Merged = merged.get(key) ?? { source: from.id, target: to.id, messages: new Map(), labels: [] };
      messages.forEach((collection, name) => entry.messages.set(name, collection));
      entry.labels.push(...current.labels.filter(Boolean));
      merged.set(key, entry);
    }
  });

  const keptIds = new Set([...representatives.values()].flatMap((rep) => (rep.kind === 'node' ? [rep.id] : [])));
  return {
    nodes: nodes.filter((node) => keptIds.has(node.id)),
    edges: [...merged.values()].map(({ source, target, messages, labels }): Edge => {
      const collections = new Set(messages.values());
      const collection = collections.size === 1 ? [...collections][0] : undefined;
      return {
        id: `level-${source}-${target}`,
        source,
        target,
        type: collection ? 'animated' : 'smoothstep',
        label: getMessagesLabel(messages) ?? [...new Set(labels)].join(', '),
        markerEnd: EDGE_MARKER,
        data: collection ? { message: { collection } } : {},
      };
    }),
  };
};

/**
 * The system and domain each node is in: the containers it sits inside, or the domain and system cards
 * connected to it with "contains"
 */
const getContainers = (nodes: Node[], edges: Edge[]) => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const containers = new Map<string, { system?: string; domain?: string }>();
  const add = (nodeId: string, container: Node) => {
    const entry = containers.get(nodeId) ?? {};
    if (isSystem(container)) entry.system ??= container.id;
    else entry.domain ??= container.id;
    containers.set(nodeId, entry);
  };
  for (const node of nodes) {
    for (
      let parent = node.parentId ? byId.get(node.parentId) : undefined;
      parent;
      parent = parent.parentId ? byId.get(parent.parentId) : undefined
    ) {
      if (isContainer(parent)) add(node.id, parent);
    }
  }
  for (const edge of edges) {
    const container = byId.get(edge.source);
    if (container && isContainer(container) && edge.label === 'contains') add(edge.target, container);
  }
  return containers;
};

/**
 * Containers left with nothing inside them at a level become compact boxes (same id, so switching levels
 * grows and shrinks them); containers with something inside are sized to fit by the layout
 */
const compactEmptyGroups = ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
  const parents = new Set(nodes.map((node) => node.parentId).filter(Boolean));
  return {
    edges,
    nodes: nodes.map((node) => {
      if (!isGroupType(node.type)) return node;
      if (parents.has(node.id)) return { ...node, width: undefined, height: undefined, measured: undefined };
      return { ...node, ...COLLAPSED_GROUP_SIZE, measured: undefined };
    }),
  };
};

/** L2: messages and channels hidden, the nodes either side connected directly */
const level2 = (nodes: Node[], edges: Edge[]) =>
  collapseGraph(nodes, edges, (node) => (isCarrier(node) ? { kind: 'carrier' } : { kind: 'node', id: node.id }));

/**
 * L1 as EventCatalog's diagrams draw it: systems as cards (with how many services they hold), connected by plain
 * edges labelled with the messages between them
 */
const asSystemsLevel = (
  { nodes, edges }: { nodes: Node[]; edges: Edge[] },
  { all, containers }: { all: Node[]; containers: ReturnType<typeof getContainers> }
) => {
  const servicesIn = new Map<string, number>();
  for (const node of all) {
    const system = node.type === 'service' ? containers.get(node.id)?.system : undefined;
    if (system) servicesIn.set(system, (servicesIn.get(system) ?? 0) + 1);
  }
  return {
    nodes: nodes.map((node): Node => {
      if (node.type !== GROUP_TYPES.system) return node;
      const { id, parentId, position, data } = node;
      return {
        id,
        type: 'system',
        position,
        ...(parentId && { parentId }),
        data: { mode: 'full', ...data, servicesCount: servicesIn.get(id) ?? 0 },
      };
    }),
    edges: edges.map(({ type: _, data: __, ...edge }): Edge => ({ ...edge, type: 'default' })),
  };
};

/** L1: services folded into their system (or domain); actors, external systems and loose services stay */
const level1 = (nodes: Node[], edges: Edge[]) => {
  const containers = getContainers(nodes, edges);
  const collapsed = collapseGraph(nodes, edges, (node) => {
    const container = containers.get(node.id);
    // Systems stay (inside their domain's container, if they're in one); everything else folds into its system or domain
    if (isContainer(node) && (isSystem(node) || !container?.system)) return { kind: 'node', id: node.id };
    if (container?.system) return { kind: 'node', id: container.system };
    // Messages and channels connect the systems either side, even when they sit in a domain rather than a system
    if (isCarrier(node)) return { kind: 'carrier' };
    if (container?.domain) return { kind: 'node', id: container.domain };
    if (node.type === 'data' || node.type === 'note') return { kind: 'drop' };
    return { kind: 'node', id: node.id };
  });
  return asSystemsLevel(collapsed, { all: nodes, containers });
};

/** The graph for a level (not laid out: positions come from the layout) */
export const getLevelGraph = (nodes: Node[], edges: Edge[], level: Level) => {
  if (level === 1) return compactEmptyGroups(level1(nodes, edges));
  if (level === 2) return compactEmptyGroups(level2(nodes, edges));
  return { nodes, edges };
};

/** Why a level can't be shown for this canvas, if it can't */
export const getLevelUnavailableReason = (nodes: Node[], level: Level): string | undefined => {
  if (level === 1 && !nodes.some(isContainer))
    return 'Not available: add a domain or system from the catalog to see how they relate';
  if (level === 2 && !nodes.some(isCarrier)) return 'Not available: there are no messages or channels to hide';
  return undefined;
};
