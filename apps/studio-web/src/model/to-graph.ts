/**
 * The model as the EventCatalog visualiser draws it, in levels like a domain's Diagram page:
 * - L3 (`nodes`/`edges`): domains and systems as boxes, with their services, messages, channels and data stores
 * - L2 (`hiddenMessages`): the same with messages and channels hidden, the services either side connected directly
 * - L1 (`overview`): domains, systems and how they relate (only with a system, or more than one domain)
 *
 * Node types and data match the visualiser's node components (the same shapes EventCatalog's node graphs build).
 * Adapted from event-catalog/eventcatalog@v5-beta:packages/core/eventcatalog/src/utils/node-graphs/domain-levels-node-graph.ts
 */
import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { getMessagesLabel, hideMessageNodes, layoutWithElk } from '@eventcatalog/visualiser/layout';
import { MESSAGE_TYPES, type Model, type Relation, type Resource, type ResourceType } from '@eventcatalog/visualiser/model';

export type Graph = { nodes: Node[]; edges: Edge[] };
export type ArchitectureGraph = Graph & { overview?: Graph; hiddenMessages: Graph };

const COLLECTIONS: Record<ResourceType, string> = {
  domain: 'domains',
  system: 'systems',
  service: 'services',
  event: 'events',
  command: 'commands',
  query: 'queries',
  channel: 'channels',
  container: 'data',
  actor: 'actors',
  'external-system': 'externalSystems',
  agent: 'agents',
  view: 'views',
  entity: 'entities',
  team: 'teams',
};

const domainGroupId = (id: string) => `domain-group-${id}`;
const systemGroupId = (id: string) => `system-group-${id}`;
const systemNodeId = (id: string) => `system-${id}`;
const domainCardId = (id: string) => `domain-${id}`;

/** The node id a resource is drawn as on L3 */
export const nodeIdFor = (resource: Pick<Resource, 'id' | 'type'>) =>
  resource.type === 'domain' ? domainGroupId(resource.id) : resource.type === 'system' ? systemGroupId(resource.id) : resource.id;

const EDGE_STROKE = 'var(--ec-edge-stroke, #6b7280)';

// Inferred relations (the agent guessed them) are amber and labelled, as the visualiser already dashes message edges
export const INFERRED_STROKE = '#d97706';

// As EventCatalog's createEdge (utils/node-graphs/utils/utils.ts)
const createEdge = (edge: Partial<Edge> & Pick<Edge, 'id' | 'source' | 'target'>, inferred = false): Edge => ({
  animated: false,
  markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, ...(inferred && { color: INFERRED_STROKE }) },
  ...edge,
  label: inferred && edge.label ? `${edge.label} \n(inferred)` : edge.label,
  style: { strokeWidth: 1, stroke: inferred ? INFERRED_STROKE : EDGE_STROKE, ...(inferred && { strokeDasharray: '2 4' }), ...edge.style },
});

// Labels as EventCatalog's node graphs use them
const SENDS_LABEL: Record<string, string> = { event: 'publishes \nevent', command: 'invokes', query: 'requests' };
const RECEIVES_LABEL: Record<string, string> = { event: 'subscribed by', command: 'accepts', query: 'accepts' };

const resourceData = (r: Resource) => ({
  id: r.id,
  name: r.name,
  version: r.version ?? '0.0.1',
  summary: r.summary ?? '',
  owners: r.owners ?? [],
});

function createNode(r: Resource, parentId: string | undefined, focus?: string): Node {
  const base = { id: nodeIdFor(r), position: { x: 0, y: 0 }, ...(parentId && { parentId }) };
  const isFocused = r.id === focus;
  const shared = { mode: 'full', isFocused, evidence: r.evidence };
  switch (r.type) {
    case 'domain':
      return {
        ...base,
        type: 'domain-group',
        draggable: false,
        selectable: false,
        data: { domain: { id: r.id, name: r.name, version: r.version ?? '0.0.1' }, subdomain: !!parentId, isFocused },
      };
    case 'system':
      return {
        ...base,
        type: 'system-group',
        draggable: false,
        selectable: false,
        data: { system: { id: r.id, name: r.name, version: r.version ?? '0.0.1' }, isFocused },
      };
    case 'service':
      return { ...base, type: 'services', data: { ...shared, service: resourceData(r) } };
    case 'event':
    case 'command':
    case 'query':
      return { ...base, type: COLLECTIONS[r.type], data: { ...shared, message: { ...resourceData(r), collection: COLLECTIONS[r.type] } } };
    case 'channel':
      return {
        ...base,
        type: 'channels',
        data: { ...shared, channel: { ...resourceData(r), ...(r.technology && { protocols: [r.technology] }) } },
      };
    case 'container':
      return {
        ...base,
        type: 'data',
        data: { ...shared, data: { ...resourceData(r), container_type: r.containerType ?? 'database', technology: r.technology } },
      };
    // Drawn as Studio draws them (actors as the visualiser's context actors, by name)
    case 'actor':
      return { ...base, type: 'context-actor', data: { ...shared, name: r.name, summary: r.summary ?? '' } };
    case 'external-system':
      return { ...base, type: 'externalSystem', data: { ...shared, externalSystem: resourceData(r) } };
    case 'agent':
      return { ...base, type: 'agent', data: { ...shared, agent: { ...resourceData(r), sends: [], receives: [] } } };
    case 'view':
      return { ...base, type: 'view', data: { ...shared, view: resourceData(r) } };
    // An entity as the visualiser draws EventCatalog's (its fields listed), and a team as the canvas draws one
    case 'entity':
      return { ...base, type: 'entity', data: { ...shared, entity: { data: { ...resourceData(r), properties: r.properties ?? [] } } } };
    case 'team':
      return { ...base, type: 'team', data: { ...shared, team: resourceData(r) } };
  }
}

/** Level 3: everything, with services in their systems and domains */
export function buildDetailedGraph(model: Model, focus?: string): Graph {
  const byId = new Map(model.resources.map((r) => [r.id, r]));
  const groupOf = (r: Resource) => {
    const parent = r.parent ? byId.get(r.parent) : undefined;
    return parent && (parent.type === 'domain' || parent.type === 'system') ? nodeIdFor(parent) : undefined;
  };

  // Messages, channels and data stores have no parent: they go in the group of the services that use them,
  // when they're all in the same one (like placeMessagesWithPublishers), else between the groups
  const usersOf = new Map<string, Set<string | undefined>>();
  const addUser = (id: string, group: string | undefined) => usersOf.set(id, (usersOf.get(id) ?? new Set()).add(group));
  for (const relation of model.relations) {
    const from = byId.get(relation.from);
    if (from?.type !== 'service') continue;
    // Messages go with their senders; data stores with their readers and writers
    if (relation.kind === 'sends' || relation.kind === 'reads' || relation.kind === 'writes') addUser(relation.to, groupOf(from));
  }
  // Channels go where all the messages through them go
  const placed = new Map<string, string | undefined>();
  usersOf.forEach((groups, id) => groups.size === 1 && placed.set(id, [...groups][0]));
  const channelGroups = new Map<string, Set<string | undefined>>();
  for (const relation of model.relations.filter((r) => r.kind === 'routes-through')) {
    channelGroups.set(relation.to, (channelGroups.get(relation.to) ?? new Set()).add(placed.get(relation.from)));
  }
  channelGroups.forEach((groups, id) => groups.size === 1 && placed.set(id, [...groups][0]));

  // React Flow needs parents before their children
  const depth = (r: Resource): number => (r.parent && byId.has(r.parent) ? 1 + depth(byId.get(r.parent)!) : 0);
  const nodes = [...model.resources]
    .sort((a, b) => depth(a) - depth(b) || Number(!!placed.get(a.id)) - Number(!!placed.get(b.id)))
    .map((r) => createNode(r, r.parent ? groupOf(r) : placed.get(r.id), focus));

  // Edges: service -> message (-> channel) -> service, service -> data store
  const channelsOf = new Map<string, Relation[]>();
  model.relations
    .filter((r) => r.kind === 'routes-through')
    .forEach((r) => channelsOf.set(r.from, [...(channelsOf.get(r.from) ?? []), r]));
  const edges = new Map<string, Edge>();
  const add = (edge: Edge) => !edges.has(edge.id) && edges.set(edge.id, edge);
  const meta = (relation: Relation) => ({ data: { inferred: !!relation.inferred, evidence: relation.evidence } });

  for (const relation of model.relations) {
    const from = byId.get(relation.from);
    const to = byId.get(relation.to);
    if (!from || !to) continue;
    const inferred = !!relation.inferred;
    switch (relation.kind) {
      case 'sends':
        add(createEdge({ id: `${from.id}->${to.id}`, source: from.id, target: to.id, label: relation.label ?? SENDS_LABEL[to.type], ...meta(relation) }, inferred));
        break;
      case 'routes-through':
        add(createEdge({ id: `${from.id}->${to.id}`, source: from.id, target: to.id, label: relation.label ?? 'routes through', ...meta(relation) }, inferred));
        break;
      case 'receives': {
        // Through the message's channels, when it has any
        const channels = channelsOf.get(to.id);
        const label = relation.label ?? RECEIVES_LABEL[to.type];
        if (channels?.length) {
          channels.forEach((channel) =>
            add(createEdge({ id: `${channel.to}->${from.id}`, source: channel.to, target: from.id, label, ...meta(relation) }, inferred || !!channel.inferred))
          );
        } else {
          add(createEdge({ id: `${to.id}->${from.id}`, source: to.id, target: from.id, label, ...meta(relation) }, inferred));
        }
        break;
      }
      case 'reads':
      case 'writes': {
        const id = `${from.id}->${to.id}`;
        const existing = edges.get(id);
        const verb = relation.kind === 'reads' ? 'reads from' : 'writes to';
        const tech = to.technology ? ` \n(${to.technology})` : '';
        if (existing) {
          edges.set(id, { ...existing, label: `reads from \nand writes to${tech}` });
        } else {
          add(createEdge({ id, source: from.id, target: to.id, label: relation.label ?? `${verb}${tech}`, type: 'multiline', ...meta(relation) }, inferred));
        }
        break;
      }
    }
  }

  return { nodes, edges: [...edges.values()] };
}

/**
 * Level 1: everything inside a system collapses into the system (drawn as a single system node), anything else
 * in a domain into the domain, and messages between them become labelled edges.
 * Adapted from collapseSystems in domain-levels-node-graph.ts.
 */
export function buildOverviewGraph(model: Model, detailed: Graph): Graph | undefined {
  const systems = model.resources.filter((r) => r.type === 'system');
  const domains = model.resources.filter((r) => r.type === 'domain');
  // Like the visualiser: L1 needs systems, or domains to relate
  if (systems.length === 0 && domains.length < 2) return undefined;

  const nodesById = new Map(detailed.nodes.map((node) => [node.id, node]));
  const byId = new Map(model.resources.map((r) => [r.id, r]));
  const systemsByGroup = new Map(systems.map((s) => [systemGroupId(s.id), s]));
  // Domains with a system somewhere inside stay as boxes; the rest become cards
  const ancestors = (nodeId: string) => {
    const ids: string[] = [];
    for (let node = nodesById.get(nodeId); node?.parentId; node = nodesById.get(node.parentId)) ids.push(node.parentId);
    return ids;
  };
  const withSystems = new Set([...systemsByGroup.keys()].flatMap(ancestors));
  const cardFor = new Map<string, Node>();
  for (const domain of domains) {
    const groupId = domainGroupId(domain.id);
    // A domain without systems inside a domain that is a card is folded into that card
    if (withSystems.has(groupId) || ancestors(groupId).some((id) => cardFor.has(id))) continue;
    const contains = (r: Resource) => r.parent && ancestors(nodeIdFor(r)).concat(nodeIdFor(r)).includes(groupId);
    cardFor.set(groupId, {
      id: domainCardId(domain.id),
      type: 'context-domain',
      position: { x: 0, y: 0 },
      ...(nodesById.get(groupId)?.parentId && { parentId: nodesById.get(groupId)!.parentId }),
      data: {
        mode: 'full',
        domain: { id: domain.id, name: domain.name, version: domain.version ?? '0.0.1', summary: domain.summary },
        subdomain: !!domain.parent,
        servicesCount: model.resources.filter((r) => r.type === 'service' && contains(r)).length,
      },
    });
  }

  // The node something is shown as: its system, its domain's card, its domain, or itself
  const representative = (nodeId: string): string => {
    for (let node = nodesById.get(nodeId); node; node = node.parentId ? nodesById.get(node.parentId) : undefined) {
      const system = systemsByGroup.get(node.id);
      if (system) return systemNodeId(system.id);
      const card = cardFor.get(node.id);
      if (card) return card.id;
      if (node.type === 'domain-group') return node.id;
    }
    return nodeId;
  };

  const systemNodes: Node[] = systems.map((system) => {
    const services = model.resources.filter((r) => r.type === 'service' && r.parent === system.id);
    return {
      id: systemNodeId(system.id),
      type: 'systems',
      position: { x: 0, y: 0 },
      ...(nodesById.get(systemGroupId(system.id))?.parentId && { parentId: nodesById.get(systemGroupId(system.id))!.parentId }),
      data: {
        mode: 'full',
        system: { id: system.id, name: system.name, version: system.version ?? '0.0.1', summary: system.summary },
        servicesCount: services.length,
        containersCount: 0,
      },
    };
  });
  const otherNodes = detailed.nodes.filter(
    (node) => representative(node.id) === node.id && !systemsByGroup.has(node.id) && node.type !== 'data'
  );
  const shown = new Map([...otherNodes, ...systemNodes, ...cardFor.values()].map((node) => [node.id, node]));
  const isInside = (nodeId: string, groupId: string) => {
    for (let node = shown.get(nodeId); node?.parentId; node = shown.get(node.parentId)) if (node.parentId === groupId) return true;
    return false;
  };

  const connections = new Map<string, { source: string; target: string; messages: Map<string, string>; inferred: boolean }>();
  for (const edge of detailed.edges) {
    const source = representative(edge.source);
    const target = representative(edge.target);
    if (source === target || !shown.has(source) || !shown.has(target) || isInside(source, target) || isInside(target, source)) continue;
    const key = `${source}->${target}`;
    const connection = connections.get(key) ?? { source, target, messages: new Map(), inferred: true };
    connection.inferred &&= !!(edge.data as { inferred?: boolean } | undefined)?.inferred;
    for (const nodeId of [edge.source, edge.target]) {
      const r = byId.get(nodeId);
      if (r && MESSAGE_TYPES.has(r.type)) connection.messages.set(r.name, COLLECTIONS[r.type]);
      // Edges out of a channel carry the messages routed through it
      if (r?.type === 'channel')
        model.relations
          .filter((rel) => rel.kind === 'routes-through' && rel.to === r.id)
          .forEach((rel) => {
            const message = byId.get(rel.from);
            if (message) connection.messages.set(message.name, COLLECTIONS[message.type]);
          });
    }
    connections.set(key, connection);
  }

  const collapsed = {
    nodes: [...shown.values()],
    edges: [...connections.values()].map(({ source, target, messages, inferred }) =>
      createEdge({ id: `${source}->${target}`, source, target, label: getMessagesLabel(messages) }, inferred)
    ),
  };
  // Messages and channels between domains and systems become edges between them
  return hideMessageNodes(collapsed.nodes, collapsed.edges);
}

const layout = async (graph: Graph): Promise<Graph> => (await layoutWithElk(graph as any)) as unknown as Graph;

/** All three levels, laid out (as layoutLevels in layout-node-graph.ts) */
export async function buildArchitectureGraph(model: Model, focus?: string): Promise<ArchitectureGraph> {
  const detailed = buildDetailedGraph(model, focus);
  const overview = buildOverviewGraph(model, detailed);
  const [laidOut, laidOutOverview, hiddenMessages] = await Promise.all([
    layout(detailed),
    overview && layout(overview),
    layout(hideMessageNodes(detailed.nodes, detailed.edges)),
  ]);
  return { ...laidOut, overview: laidOutOverview, hiddenMessages };
}
