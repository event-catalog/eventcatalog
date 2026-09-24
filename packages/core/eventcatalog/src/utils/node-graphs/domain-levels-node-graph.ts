import { getDomains } from '@utils/collections/domains';
import { getNodesAndEdges as getSystemNodesAndEdges } from './systems-node-graph';
import { getNodesAndEdges as getServiceNodesAndEdges } from './services-node-graph';
import { getNodesAndEdgesForDomainSystems as getDomainContextNodesAndEdges } from './system-context-node-graph';
import { createEdge, generateIdForNode } from '@utils/node-graphs/utils/utils';
import { layoutLevels } from '@utils/node-graphs/layout-node-graph';
import { getMessagesLabel, hideMessageNodes, isCarrier } from '@eventcatalog/visualiser/layout';

interface NodesAndEdgesProps {
  id: string;
  version: string;
  mode?: 'simple' | 'full';
  channelRenderMode?: 'single' | 'flat';
}

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';

type Graph = { nodes: any[]; edges: any[] };
type Tree = { domain: any; groupId: string; parentId?: string }[];
type Owners = Map<string, { domain: any; system?: any }>;

const MESSAGE_TYPES = new Set(['events', 'commands', 'queries']);
const SERVICE_TYPES = new Set(['services', 'agents']);

const systemGroupId = (system: any) => `system-group-${system.data.id}-${system.data.version}`;
const CONTEXT_EDGE_PREFIX = 'context-';
const domainGroupId = (domain: any) => `domain-group-${domain.data.id}-${domain.data.version}`;
const domainNodeId = (domain: any) => `domain-${domain.data.id}-${domain.data.version}`;

/** A system shown as a single node (not expanded into what's inside it) */
const createSystemNode = (system: any, parentId?: string) => ({
  id: generateIdForNode(system),
  type: 'systems',
  parentId,
  position: { x: 0, y: 0 },
  data: {
    mode: 'full',
    system: {
      id: system.data.id,
      version: system.data.version,
      name: system.data.name,
      summary: system.data.summary,
      scope: system.data.scope,
    },
    servicesCount: (system.data.services || []).length,
    containersCount: (system.data.containers || []).length,
  },
});

/** A domain shown as a single card, with counts of what's in it */
const createDomainCard = (domain: any, { parentId, subdomain = false }: { parentId?: string; subdomain?: boolean } = {}) => {
  const systems = (domain.data.systems || []) as any[];
  return {
    id: domainNodeId(domain),
    type: 'context-domain',
    ...(parentId ? { parentId } : {}),
    position: { x: 0, y: 0 },
    data: {
      mode: 'full',
      domain: {
        id: domain.data.id,
        version: domain.data.version,
        name: domain.data.name,
        summary: domain.data.summary,
      },
      subdomain,
      systemsCount: systems.length,
      servicesCount:
        systems.reduce((count, system) => count + (system.data.services || []).length, 0) + (domain.data.services || []).length,
      entitiesCount: (domain.data.entities || []).length,
    },
  };
};

/**
 * Level 1: the domain with its subdomains and systems, its context (related
 * systems and actors) and the other domains its systems send messages to or
 * receive them from. Everything inside a system collapses into the system, and
 * anything else in a (sub)domain (e.g. a service not in a system) into the
 * domain, so edges connect domains, systems and actors. A subdomain without
 * systems is shown as a card.
 */
export const collapseSystems = (
  graph: Graph,
  systems: any[],
  contextNodes: Map<string, any>,
  subdomains: Map<string, any>
): Graph => {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const systemsByGroupId = new Map<string, any>(systems.map((system: any) => [systemGroupId(system), system]));
  const ancestors = (nodeId: string) => {
    const ids: string[] = [];
    for (let node = nodesById.get(nodeId); node?.parentId; node = nodesById.get(node.parentId)) ids.push(node.parentId);
    return ids;
  };

  // Subdomains without systems (in them or their subdomains) become cards,
  // along with everything in them
  const withSystems = new Set([...systemsByGroupId.keys()].flatMap((groupId) => ancestors(groupId)));
  const cards = new Map<string, any>();
  subdomains.forEach((subdomain, groupId) => {
    if (withSystems.has(groupId) || ancestors(groupId).some((id) => subdomains.has(id) && !withSystems.has(id))) return;
    cards.set(groupId, createDomainCard(subdomain, { parentId: nodesById.get(groupId)?.parentId, subdomain: true }));
  });

  // The node something is shown as: its system, the card of the subdomain it's
  // in, the (sub)domain it's in, or itself
  const representative = (nodeId: string): string => {
    for (let node = nodesById.get(nodeId); node; node = node.parentId ? nodesById.get(node.parentId) : undefined) {
      const system: any = systemsByGroupId.get(node.id);
      if (system) return generateIdForNode(system);
      const card = cards.get(node.id);
      if (card) return card.id;
      if (node.type === 'domain-group' || node.type === 'context-domain') return node.id;
    }
    return nodeId;
  };

  const systemNodes = [...systemsByGroupId].map(([groupId, system]) => {
    const parentId = nodesById.get(groupId)?.parentId;
    // Prefer the node from the context diagram, it has the system's details
    const contextNode = contextNodes.get(generateIdForNode(system));
    return contextNode ? { ...contextNode, parentId } : createSystemNode(system, parentId);
  });
  const otherNodes = graph.nodes.filter(
    (node) => representative(node.id) === node.id && !systemsByGroupId.has(node.id) && node.type !== 'data'
  );
  const shownNodes = new Map([...otherNodes, ...systemNodes, ...cards.values()].map((node) => [node.id, node]));
  // Whether one shown node is inside another (e.g. a system in its domain)
  const isInside = (nodeId: string, groupId: string) => {
    for (let node = shownNodes.get(nodeId); node?.parentId; node = shownNodes.get(node.parentId)) {
      if (node.parentId === groupId) return true;
    }
    return false;
  };

  // Edges between systems / actors / domains: context relationships as they
  // are, edges to nodes kept as their first label, the rest labelled with the
  // messages they carry
  const connections = new Map<
    string,
    { source: string; target: string; messages: Map<string, string>; relationship?: any; label?: string; crossDomain?: boolean }
  >();
  graph.edges.forEach((edge) => {
    const source = representative(edge.source);
    const target = representative(edge.target);
    if (
      source === target ||
      !shownNodes.has(source) ||
      !shownNodes.has(target) ||
      isInside(source, target) ||
      isInside(target, source)
    )
      return;
    const key = `${source}->${target}`;
    const connection = connections.get(key) ?? { source, target, messages: new Map<string, string>() };
    if (edge.id.startsWith(CONTEXT_EDGE_PREFIX)) connection.relationship = edge;
    if (edge.data?.crossDomain) connection.crossDomain = true;
    [edge.source, edge.target].forEach((nodeId) => {
      const node = nodesById.get(nodeId);
      if (MESSAGE_TYPES.has(node?.type)) connection.messages.set(node.data?.message?.name ?? nodeId, node.type);
    });
    connections.set(key, connection);
  });

  // A relationship already connects the pair (either way), so skip messages
  const related = new Set(
    [...connections.values()]
      .filter((c) => c.relationship)
      .flatMap((c) => [`${c.source}->${c.target}`, `${c.target}->${c.source}`])
  );

  return {
    nodes: [...shownNodes.values()],
    edges: [...connections.values()]
      .filter((c) => c.relationship || !related.has(`${c.source}->${c.target}`))
      .map(({ source, target, messages, relationship, label, crossDomain }) =>
        relationship
          ? { ...relationship, source, target }
          : createEdge({
              id: `${source}->${target}`,
              source,
              target,
              label: label ?? getMessagesLabel(messages),
              ...(crossDomain ? { data: { crossDomain } } : {}),
            })
      ),
  };
};

/**
 * The domain and its subdomains (and theirs), each drawn as a group inside the
 * group of the domain it's a subdomain of.
 */
export const buildDomainTree = (domain: any, findDomain: (id: string, version?: string) => any): Tree => {
  const tree: Tree = [];
  const addToTree = (d: any, parentId?: string) => {
    if (tree.some((entry) => entry.domain.data.id === d.data.id)) return;
    tree.push({ domain: d, groupId: domainGroupId(d), parentId });
    (d.data.domains || []).forEach((subdomain: any) => {
      const found = findDomain(subdomain.data.id, subdomain.data.version);
      if (found) addToTree(found, domainGroupId(d));
    });
  };
  addToTree(domain);
  return tree;
};

/** Which domain (and system) each service belongs to, and the domain each subdomain is in */
export const collectOwners = (domains: any[]) => {
  const owners: Owners = new Map();
  const parentDomainOf = new Map<string, any>();
  domains.forEach((d: any) => {
    (d.data.systems || []).forEach((system: any) =>
      (system.data.services || []).forEach((service: any) => owners.set(generateIdForNode(service), { domain: d, system }))
    );
    (d.data.domains || []).forEach((subdomain: any) => {
      if (!parentDomainOf.has(subdomain.data.id)) parentDomainOf.set(subdomain.data.id, d);
    });
  });
  // Services outside systems, unless a system already claims them
  domains.forEach((d: any) =>
    (d.data.services || []).forEach((service: any) => {
      const serviceId = generateIdForNode(service);
      if (!owners.has(serviceId)) owners.set(serviceId, { domain: d });
    })
  );
  return { owners, parentDomainOf };
};

/**
 * The domain's graph from the graphs of its (and its subdomains') systems and
 * services outside systems: each node placed in its (sub)domain or system, and
 * services in other domains replaced by those domains, as a card (or a box
 * around their subdomains' cards). Returns the nodes, the edges (pointed at the
 * replacements) and the nodes standing for other domains.
 */
export const buildDomainGraph = ({
  tree,
  owners,
  parentDomainOf,
  systems,
  systemGraphs,
  looseServices,
  serviceGraphs,
  mode,
}: {
  tree: Tree;
  owners: Owners;
  parentDomainOf: Map<string, any>;
  systems: { system: any; groupId: string }[];
  systemGraphs: Graph[];
  looseServices: { service: any; groupId: string }[];
  serviceGraphs: Graph[];
  mode: string;
}) => {
  const groupOfDomain = new Map(tree.map((entry) => [entry.domain.data.id, entry.groupId]));
  const groupOfSystem = new Map(systems.map(({ system, groupId }) => [systemGroupId(system), groupId]));
  const nodes = new Map<string, any>(
    tree.map(({ domain: d, groupId, parentId }) => [
      groupId,
      {
        id: groupId,
        type: 'domain-group',
        position: { x: 0, y: 0 },
        ...(parentId ? { parentId } : {}),
        draggable: false,
        selectable: false,
        data: {
          domain: { name: d.data.name, version: d.data.version },
          // The domain viewed may itself be a subdomain of another
          subdomain: !!parentId || parentDomainOf.has(d.data.id),
          isFocused: !parentId,
        },
      },
    ])
  );
  const edges: any[] = [];
  // Nodes replaced by another (services in other domains become the domain)
  const replacedBy = new Map<string, string>();

  // Other domains are shown as a single card, with counts of what's in them. A
  // subdomain of another domain is shown inside a box for that domain (and
  // that inside its domain's, if it's a subdomain too)
  const inParentDomain = (other: any) => {
    const parent = parentDomainOf.get(other.data.id);
    return parent && (groupOfDomain.get(parent.data.id) ?? addOtherDomainBox(parent));
  };
  // Cards replaced by a box, when a domain's subdomains are shown in it
  const cardBoxes = new Map<string, string>();
  const addOtherDomain = (other: any): string => {
    const boxId = domainGroupId(other);
    if (nodes.has(boxId)) return boxId;
    const nodeId = domainNodeId(other);
    if (!nodes.has(nodeId)) {
      const parentId = inParentDomain(other);
      const card = createDomainCard(other, { parentId, subdomain: !!parentId });
      nodes.set(nodeId, { ...card, data: { ...card.data, otherDomain: true } });
    }
    return nodeId;
  };
  const addOtherDomainBox = (other: any): string => {
    const boxId = domainGroupId(other);
    if (!nodes.has(boxId)) {
      const parentId = inParentDomain(other);
      nodes.set(boxId, {
        id: boxId,
        type: 'domain-group',
        position: { x: 0, y: 0 },
        ...(parentId ? { parentId } : {}),
        data: {
          domain: { name: other.data.name, version: other.data.version },
          subdomain: !!parentId,
          isFocused: false,
          otherDomain: true,
        },
      });
      // Shown as the box from now on, rather than a card as well
      const cardId = domainNodeId(other);
      if (nodes.has(cardId)) {
        nodes.delete(cardId);
        cardBoxes.set(cardId, boxId);
      }
    }
    return boxId;
  };

  // Adds a graph's nodes: a system's (its nodes are in its group), or a service's
  // outside any system, whose messages, channels and data stores go `inside`
  // the (sub)domain it's in
  const addNodes = (graphNodes: any[], inside?: string) =>
    graphNodes.forEach((node: any) => {
      if (node.type === 'system-group') {
        nodes.set(node.id, {
          ...node,
          parentId: groupOfSystem.get(node.id) ?? inside,
          data: { ...node.data, isFocused: false },
        });
        return;
      }

      const owner = SERVICE_TYPES.has(node.type) ? owners.get(node.id) : undefined;
      if (owner && !groupOfDomain.has(owner.domain.data.id)) {
        replacedBy.set(node.id, addOtherDomain(owner.domain));
        return;
      }
      if (owner && owner.system) {
        // Only placed by the system that owns it
        if (systemGroupId(owner.system) === node.parentId) nodes.set(node.id, node);
        return;
      }
      if (owner) {
        // A service in the domain (or a subdomain), but not in any of its
        // systems (not marked as the one being viewed, as it is in its own diagram)
        nodes.set(node.id, {
          ...node,
          parentId: groupOfDomain.get(owner.domain.data.id),
          extent: undefined,
          data: { ...node.data, isFocused: false },
        });
        return;
      }
      // Messages, channels, data stores: kept in the first graph they appear in
      if (nodes.has(node.id)) return;
      nodes.set(node.id, node.parentId || !inside || SERVICE_TYPES.has(node.type) ? node : { ...node, parentId: inside });
    });

  systems.forEach(({ system, groupId: domainGroup }, index) => {
    const graph = systemGraphs[index];
    const groupId = systemGroupId(system);
    // A system with nothing in it still shows as an (empty) system
    if (!graph.nodes.some((node: any) => node.id === groupId)) {
      nodes.set(groupId, {
        id: groupId,
        type: 'system-group',
        parentId: domainGroup,
        position: { x: 0, y: 0 },
        data: { system: { name: system.data.name, version: system.data.version } },
      });
    }
    addNodes(graph.nodes);
    edges.push(...graph.edges);
  });
  serviceGraphs.forEach((graph, index) => {
    addNodes(graph.nodes, looseServices[index].groupId);
    edges.push(...graph.edges);
  });

  // Services outside systems that weren't in any graph
  looseServices.forEach(({ service, groupId }) => {
    const serviceId = generateIdForNode(service);
    if (nodes.has(serviceId)) return;
    nodes.set(serviceId, {
      id: serviceId,
      type: service.collection,
      parentId: groupId,
      position: { x: 0, y: 0 },
      data: { mode, service: { ...service.data } },
    });
  });

  // Other domains shown as a box (around their subdomains) rather than a card
  replacedBy.forEach((nodeId, replaced) => {
    const boxId = cardBoxes.get(nodeId);
    if (boxId) replacedBy.set(replaced, boxId);
  });

  const graphEdges = connectEdges(edges, replacedBy, nodes);
  placeMessagesWithPublishers(nodes, graphEdges);
  return { nodes, edges: graphEdges, otherDomainIds: new Set(replacedBy.values()) };
};

/**
 * Messages are placed in the first graph they appear in, which can be a
 * system consuming them. Moves each message into the system (or domain) of the
 * services publishing it, when they're all in the same one.
 */
export const placeMessagesWithPublishers = (nodes: Map<string, any>, edges: any[]) => {
  const publisherGroups = new Map<string, Set<string | undefined>>();
  edges.forEach((edge) => {
    const publisher = nodes.get(edge.source);
    if (!MESSAGE_TYPES.has(nodes.get(edge.target)?.type) || !SERVICE_TYPES.has(publisher?.type)) return;
    const groups = publisherGroups.get(edge.target) || new Set();
    groups.add(publisher.parentId);
    publisherGroups.set(edge.target, groups);
  });
  publisherGroups.forEach((groups, messageId) => {
    const [parentId] = [...groups];
    const message = nodes.get(messageId);
    if (groups.size === 1 && parentId && message.parentId !== parentId) {
      nodes.set(messageId, { ...message, parentId, extent: undefined });
    }
  });
};

/**
 * Edges pointed at the nodes replacing their ends, dropping duplicates, ones to
 * nowhere and ones between a domain and a subdomain in it.
 */
export const connectEdges = (edges: any[], replacedBy: Map<string, string>, nodes: Map<string, any>) => {
  const isInside = (nodeId: string, groupId: string) => {
    for (let node = nodes.get(nodeId); node?.parentId; node = nodes.get(node.parentId)) {
      if (node.parentId === groupId) return true;
    }
    return false;
  };
  const seen = new Set<string>();
  return edges
    .map((edge) => ({
      ...edge,
      source: replacedBy.get(edge.source) ?? edge.source,
      target: replacedBy.get(edge.target) ?? edge.target,
    }))
    .filter((edge) => {
      const key = `${edge.source}->${edge.target}`;
      if (
        edge.source === edge.target ||
        !nodes.has(edge.source) ||
        !nodes.has(edge.target) ||
        isInside(edge.source, edge.target) ||
        isInside(edge.target, edge.source) ||
        seen.has(key)
      )
        return false;
      seen.add(key);
      return true;
    });
};

/**
 * The context diagrams of the domain and its subdomains: relationships between
 * their systems, and to related systems and actors outside them. Their systems
 * are shown expanded, so relationships connect to the expanded systems.
 */
export const addContext = (contexts: Graph[], systems: { system: any }[], nodes: Map<string, any>) => {
  const contextNodesById = new Map(contexts.flatMap((context) => context.nodes.map((node: any) => [node.id, node])));
  const contextEdgesById = new Map(contexts.flatMap((context) => context.edges.map((edge: any) => [edge.id, edge])));
  const domainSystemIds = new Set(systems.map(({ system }) => generateIdForNode(system)));
  const toSystemGroup = (nodeId: string) => (domainSystemIds.has(nodeId) ? `system-group-${nodeId}` : nodeId);
  return {
    contextNodesById,
    nodes: [...contextNodesById.values()].filter((node: any) => !domainSystemIds.has(node.id) && !nodes.has(node.id)),
    edges: [...contextEdgesById.values()].map((edge: any) => ({
      ...edge,
      id: `${CONTEXT_EDGE_PREFIX}${edge.id}`,
      source: toSystemGroup(edge.source),
      target: toSystemGroup(edge.target),
    })),
  };
};

/**
 * Marks cross-domain communication. Messages and channels only other domains
 * send to (e.g. a message this domain consumes, and the topic it comes
 * through) are another domain's: they sit outside this domain, between the
 * domain sending them and their consumers, rather than in the system that
 * consumes them. They, and this domain's messages and channels that reach
 * other domains, are on a cross-domain path (`data.crossDomain`), as are the
 * edges to and from them and other domains.
 */
export const markCrossDomain = (graph: Graph, otherDomainIds: Set<string>): Graph => {
  const sendersOf = new Map<string, string[]>();
  const receiversOf = new Map<string, string[]>();
  graph.edges.forEach((edge) => {
    const senders = sendersOf.get(edge.target) || [];
    senders.push(edge.source);
    sendersOf.set(edge.target, senders);
    const receivers = receiversOf.get(edge.source) || [];
    receivers.push(edge.target);
    receiversOf.set(edge.source, receivers);
  });
  const carriers = graph.nodes.filter(isCarrier);

  // Along chains (message -> channel -> channel), until nothing more is found
  const spread = (reached: Set<string>, isReached: (nodeId: string, reached: Set<string>) => boolean) => {
    for (let found = true; found; ) {
      found = false;
      carriers.forEach((node) => {
        if (!reached.has(node.id) && isReached(node.id, reached)) {
          reached.add(node.id);
          found = true;
        }
      });
    }
    return reached;
  };
  // Sent only by other domains (or their messages and channels)
  const external = spread(new Set(otherDomainIds), (nodeId, reached) => {
    const senders = sendersOf.get(nodeId) || [];
    return senders.length > 0 && senders.every((sender) => reached.has(sender));
  });
  // Reaching other domains (directly, or through messages and channels that do)
  const outgoing = spread(new Set(external), (nodeId, reached) =>
    (receiversOf.get(nodeId) || []).some((receiver) => reached.has(receiver))
  );

  const isExternalCarrier = (node: any) => external.has(node.id) && !otherDomainIds.has(node.id);
  const onCrossDomainPath = (nodeId: string) => outgoing.has(nodeId);
  return {
    nodes: graph.nodes.map((node) => {
      if (isExternalCarrier(node)) {
        return {
          ...node,
          parentId: undefined,
          extent: undefined,
          data: { ...node.data, otherDomain: true, crossDomain: true },
        };
      }
      return isCarrier(node) && onCrossDomainPath(node.id) ? { ...node, data: { ...node.data, crossDomain: true } } : node;
    }),
    edges: graph.edges.map((edge) =>
      onCrossDomainPath(edge.source) || onCrossDomainPath(edge.target)
        ? { ...edge, data: { ...edge.data, crossDomain: true } }
        : edge
    ),
  };
};

/**
 * Level 3: the domain with its subdomains (as domains inside it) and systems
 * expanded into their services, data stores, messages and channels. Services in
 * other domains are shown as those domains. Returns level 1 (`overview`, when
 * the domain has systems or subdomains) and level 2 (`hiddenMessages`) too,
 * built from the same graph.
 */
type DomainLevels = Graph & { overview?: Graph; hiddenMessages: Graph };

// Built once for each domain version and options: the Diagram page and every
// docs page embedding the domain share it
const levelsCache = new Map<string, Promise<DomainLevels>>();

export const getNodesAndEdges = (props: NodesAndEdgesProps): Promise<DomainLevels> => {
  if (!CACHE_ENABLED) return buildLevels(props);
  const { id, version, mode = 'full', channelRenderMode } = props;
  const key = [id, version, mode, channelRenderMode].join('/');
  if (!levelsCache.has(key)) levelsCache.set(key, buildLevels(props));
  return levelsCache.get(key)!;
};

const buildLevels = async ({ id, version, mode = 'full', channelRenderMode }: NodesAndEdgesProps): Promise<DomainLevels> => {
  // Each domain with only its own services (not its subdomains'): the version
  // shown (which may be an older one), and the latest of every domain for its
  // subdomains and the other domains around it
  const [allVersions, domains] = await Promise.all([
    getDomains({ getAllVersions: true, includeServicesInSubdomains: false }),
    getDomains({ getAllVersions: false, includeServicesInSubdomains: false }),
  ]);
  const domain = allVersions.find((d) => d.data.id === id && d.data.version === version);
  if (!domain) return { nodes: [], edges: [], hiddenMessages: { nodes: [], edges: [] } };
  // Subdomains' versions in frontmatter can be loose, so fall back to the latest
  const findDomain = (domainId: string, domainVersion?: string) =>
    domains.find((d) => d.data.id === domainId && d.data.version === domainVersion) ??
    domains.find((d) => d.data.id === domainId);

  const tree = buildDomainTree(domain, findDomain);
  // The tree's domains last, so the versions shown own their services
  const { owners, parentDomainOf } = collectOwners([...domains, ...tree.map((entry) => entry.domain)]);
  // A service the domain (or a subdomain) lists itself is shown as its own,
  // even when a system in another domain has it too
  const treeDomainIds = new Set(tree.map((entry) => entry.domain.data.id));
  tree.forEach(({ domain: d }) =>
    (d.data.services || []).forEach((service: any) => {
      const serviceId = generateIdForNode(service);
      if (!treeDomainIds.has(owners.get(serviceId)?.domain.data.id)) owners.set(serviceId, { domain: d });
    })
  );

  // Every system in the domain and its subdomains, and the group each is in,
  // and the services in them that aren't in any system
  const systems = tree.flatMap(({ domain: d, groupId }) =>
    ((d.data.systems || []) as any[]).map((system) => ({ system, groupId }))
  );
  const looseServices = tree.flatMap(({ domain: d, groupId }) =>
    ((d.data.services || []) as any[])
      .filter((service) => !owners.get(generateIdForNode(service))?.system)
      .map((service) => ({ service, groupId }))
  );
  const [systemGraphs, serviceGraphs, contexts] = await Promise.all([
    Promise.all(
      systems.map(({ system }) =>
        getSystemNodesAndEdges({
          id: system.data.id,
          version: system.data.version,
          mode,
          channelRenderMode,
          wrapInSystemGroup: true,
          layout: false,
        })
      )
    ),
    Promise.all(
      looseServices.map(({ service }) =>
        getServiceNodesAndEdges({
          id: service.data.id,
          version: service.data.version,
          mode,
          renderAllEdges: true,
          channelRenderMode,
          collection: service.collection === 'agents' ? 'agents' : 'services',
          layout: false,
        })
      )
    ),
    Promise.all(
      tree.map(({ domain: d }) => getDomainContextNodesAndEdges({ id: d.data.id, version: d.data.version, mode, layout: false }))
    ),
  ]);

  const { nodes, edges, otherDomainIds } = buildDomainGraph({
    tree,
    owners,
    parentDomainOf,
    systems,
    systemGraphs,
    looseServices,
    serviceGraphs,
    mode,
  });
  const context = addContext(contexts, systems, nodes);
  const graph = { nodes: [...nodes.values(), ...context.nodes], edges: [...edges, ...context.edges] };
  const detailedGraph = markCrossDomain(graph, otherDomainIds);

  // Level 1 (domains, systems and their relationships) collapses each system,
  // including the messages its services consume. Messages outside systems (sent
  // by services not in one) are hidden too, with the nodes either side connected
  // directly. A domain without systems or subdomains has no level 1.
  if (systems.length === 0 && tree.length === 1) return layoutLevels(detailedGraph);
  // Built from the graph before messages only other domains send were moved
  // out of the systems consuming them, so they collapse into those systems
  const collapsed = collapseSystems(
    { ...graph, edges: detailedGraph.edges },
    systems.map(({ system }) => system),
    context.contextNodesById,
    new Map(tree.filter((entry) => entry.parentId).map((entry) => [entry.groupId, entry.domain]))
  );
  const overview = hideMessageNodes(collapsed.nodes, collapsed.edges);

  return layoutLevels(detailedGraph, overview);
};
