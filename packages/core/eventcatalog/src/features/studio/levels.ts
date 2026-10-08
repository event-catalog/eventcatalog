import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { getMessagesLabel } from '@eventcatalog/visualiser/layout';
import { MESSAGE_COLLECTIONS } from './edges';
import { GROUP_TYPES, isGroupType, isWrittenOnCanvas } from './node-types';

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
const isDomain = (node: Node) => node.type === 'context-domain' || node.type === GROUP_TYPES.domain;

const isMessage = (node: Node) => !!MESSAGE_COLLECTIONS[node.type ?? ''];
const isCarrier = (node: Node) => isMessage(node) || node.type === 'channel';
const isContainer = (node: Node) => CONTAINER_TYPES.has(node.type ?? '');
const messageName = (node: Node) => String((node.data as { message?: { name?: string } }).message?.name ?? node.id);

// Edges as the visualiser's levels draw them: what's folded together is joined by a plain line, and what was joined
// through hidden messages or channels by a dashed, muted one ("bridged"), each with the visualiser's arrow
const EDGE_STROKE = 'var(--ec-edge-stroke, #6b7280)';
const MUTED = 'rgb(var(--ec-page-text-muted))';
const FOLDED_EDGE = {
  type: 'smoothstep',
  style: { strokeWidth: 1, stroke: EDGE_STROKE },
  markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
} satisfies Partial<Edge>;
const BRIDGED_EDGE = {
  type: 'smoothstep',
  style: { strokeWidth: 1.5, stroke: MUTED, strokeDasharray: '5 5' },
  markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: MUTED },
} satisfies Partial<Edge>;

/** What a node becomes at a level: kept (as itself or another node), carried through (messages, channels) or dropped */
type Representative = { kind: 'node'; id: string } | { kind: 'carrier' } | { kind: 'drop' };

/**
 * Collapse a graph: each node is kept, replaced by another node (e.g. a service by its system), carried through
 * (messages and channels: the nodes either side get connected directly, "bridged") or dropped. Edges between two
 * nodes that are kept as they are stay as they were (`keepDirect`, for L2); the rest are merged per pair and kind
 * (folded or bridged), labelled with the messages they carry.
 */
const collapseGraph = (
  nodes: Node[],
  edges: Edge[],
  representativeOf: (node: Node) => Representative,
  { keepDirect = false }: { keepDirect?: boolean } = {}
) => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  // Whether one node is inside another (e.g. a system in its domain): they're not connected, one holds the other
  const isInside = (id: string, containerId: string) => {
    for (let node = byId.get(id); node?.parentId; node = byId.get(node.parentId)) if (node.parentId === containerId) return true;
    return false;
  };
  const representatives = new Map(nodes.map((node) => [node.id, representativeOf(node)]));
  const outgoing = new Map<string, Edge[]>();
  edges.forEach((edge) => outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge]));

  type Merged = { source: string; target: string; bridged: boolean; messages: Map<string, string>; labels: string[] };
  const merged = new Map<string, Merged>();
  const kept: Edge[] = [];
  const addMessage = (messages: Map<string, string>, node: Node) => {
    if (isMessage(node)) messages.set(messageName(node), MESSAGE_COLLECTIONS[node.type!]);
  };

  edges.forEach((edge) => {
    const from = representatives.get(edge.source);
    if (from?.kind !== 'node') return;
    const to = representatives.get(edge.target);
    if (keepDirect && from.id === edge.source && to?.kind === 'node' && to.id === edge.target) return kept.push(edge);
    // Follow the edge through carried nodes to the node(s) it reaches, collecting the messages on the way
    const stack = [{ id: edge.target, messages: new Map<string, string>(), labels: [String(edge.label ?? '')], bridged: false }];
    const visited = new Set<string>();
    addMessage(stack[0].messages, byId.get(edge.source)!);
    while (stack.length) {
      const current = stack.pop()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      const node = byId.get(current.id);
      const reached = representatives.get(current.id);
      if (!node || !reached || reached.kind === 'drop') continue;
      const messages = new Map(current.messages);
      addMessage(messages, node);
      if (reached.kind === 'carrier') {
        (outgoing.get(current.id) ?? []).forEach((next) =>
          stack.push({ id: next.target, messages, labels: [] as string[], bridged: true })
        );
        continue;
      }
      // Edges inside what was collapsed disappear, and so do edges to what a node is in (e.g. a service loose in a
      // domain, folded into it, and a system in the same domain)
      if (from.id === reached.id || isInside(from.id, reached.id) || isInside(reached.id, from.id)) continue;
      const key = `${current.bridged ? 'bridged' : 'level'}-${from.id}-${reached.id}`;
      const entry: Merged = merged.get(key) ?? {
        source: from.id,
        target: reached.id,
        bridged: current.bridged,
        messages: new Map(),
        labels: [],
      };
      messages.forEach((collection, name) => entry.messages.set(name, collection));
      entry.labels.push(...current.labels.filter(Boolean));
      merged.set(key, entry);
    }
  });

  const keptIds = new Set([...representatives.values()].flatMap((rep) => (rep.kind === 'node' ? [rep.id] : [])));
  // Actors' connections are relationships, labelled as they were (like the visualiser's context relationships)
  const isActor = (id: string) => byId.get(id)?.type === 'actor';
  return {
    nodes: nodes.filter((node) => keptIds.has(node.id)),
    edges: [
      ...kept,
      ...[...merged.entries()].map(([id, { source, target, bridged, messages, labels }]): Edge => {
        const label =
          getMessagesLabel(messages) ??
          (!bridged && (isActor(source) || isActor(target)) && labels.length ? [...new Set(labels)].join(', ') : undefined);
        return { id, source, target, ...(bridged ? BRIDGED_EDGE : FOLDED_EDGE), ...(label && { label }) };
      }),
    ],
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
 * Containers are sized by the layout: to fit what's in them, or (empty) the size the visualiser lays empty groups
 * out at. Same ids, so switching levels grows and shrinks them.
 */
const sizedByLayout = ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => ({
  edges,
  nodes: nodes.map((node) =>
    isGroupType(node.type) ? { ...node, width: undefined, height: undefined, measured: undefined } : node
  ),
});

/** L2: messages and channels hidden, the nodes either side connected directly */
const level2 = (nodes: Node[], edges: Edge[]) =>
  collapseGraph(nodes, edges, (node) => (isCarrier(node) ? { kind: 'carrier' } : { kind: 'node', id: node.id }), {
    keepDirect: true,
  });

/** Whether a node is inside a container, at any depth */
const isWithin = (node: Node, containerId: string, byId: Map<string, Node>) => {
  for (let parent = node.parentId; parent; parent = byId.get(parent)?.parentId) if (parent === containerId) return true;
  return false;
};

/**
 * L1 as EventCatalog's diagrams draw it: systems as cards with what's in them counted, and domains with no system in
 * them (or in their subdomains) as domain cards
 */
const asSystemsLevel = (
  { nodes, edges }: { nodes: Node[]; edges: Edge[] },
  { all, allEdges, containers }: { all: Node[]; allEdges: Edge[]; containers: ReturnType<typeof getContainers> }
) => {
  const byId = new Map(all.map((node) => [node.id, node]));
  const count = (id: string, matches: (node: Node) => boolean) =>
    all.filter((node) => matches(node) && containers.get(node.id)?.system === id).length;
  // The messages a system's services send and receive
  const messagesOf = (id: string) => {
    const services = new Set(all.filter((node) => containers.get(node.id)?.system === id).map((node) => node.id));
    const messages = new Set<string>();
    for (const edge of allEdges) {
      const [inside, other] = services.has(edge.source) ? [edge.source, edge.target] : [edge.target, edge.source];
      if (services.has(inside) && byId.get(other) && isMessage(byId.get(other)!)) messages.add(other);
    }
    return messages.size;
  };
  return {
    edges,
    nodes: nodes.map((node): Node => {
      const { id, parentId, position, data } = node;
      if (node.type === GROUP_TYPES.system)
        return {
          id,
          type: 'system',
          position,
          ...(parentId && { parentId }),
          data: {
            mode: 'full',
            ...data,
            servicesCount: count(id, (child) => child.type === 'service' || child.type === 'agent'),
            containersCount: count(id, (child) => child.type === 'data'),
            messagesCount: messagesOf(id),
          },
        };
      if (node.type === GROUP_TYPES.domain && !all.some((other) => isSystem(other) && isWithin(other, id, byId)))
        return {
          id,
          type: 'context-domain',
          position,
          ...(parentId && { parentId }),
          data: {
            mode: 'full',
            ...data,
            subdomain: !!parentId,
            systemsCount: 0,
            servicesCount: all.filter((other) => other.type === 'service' && isWithin(other, id, byId)).length,
          },
        };
      return node;
    }),
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
    // (the visualiser has them outside its domains; catalog domains on a canvas hold their messages)
    if (isCarrier(node)) return { kind: 'carrier' };
    if (container?.domain) return { kind: 'node', id: container.domain };
    if (node.type === 'data' || isWrittenOnCanvas(node.type)) return { kind: 'drop' };
    return { kind: 'node', id: node.id };
  });
  return asSystemsLevel(collapsed, { all: nodes, allEdges: edges, containers });
};

/**
 * The graph for a level (not laid out: positions come from the layout). Notes aren't in it: the ones added on the
 * level are shown where they were put, over its layout.
 */
export const getLevelGraph = (nodes: Node[], edges: Edge[], level: Level) => {
  if (level === 3) return { nodes, edges };
  const withoutNotes = nodes.filter((node) => node.type !== 'note');
  return sizedByLayout(level === 1 ? level1(withoutNotes, edges) : level2(withoutNotes, edges));
};

/** Why a level can't be shown for this canvas, if it can't */
export const getLevelUnavailableReason = (nodes: Node[], level: Level): string | undefined => {
  // Like the visualiser: L1 needs systems, or domains to relate (one domain on its own has nothing to show)
  if (level === 1 && !nodes.some(isSystem) && nodes.filter(isDomain).length < 2)
    return 'Not available: add a system, or more than one domain, to see how they relate';
  return undefined;
};
