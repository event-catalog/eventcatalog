import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { getAgents } from '@utils/collections/agents';
import { getAdrAliasNodeKey, getAdrNodeKey, getAdrs, type Adr } from '@utils/collections/adrs';
import { ADR_STATUS_VALUES, formatAdrStatus } from '@utils/collections/adr-constants';
import { getContainers } from '@utils/collections/containers';
import { getDomains } from '@utils/collections/domains';
import { getSystems } from '@utils/collections/systems';
import { getServices } from '@utils/collections/services';
import { getMessages, pluralizeMessageType } from '@utils/collections/messages';
import { getTriggeredByOfMessage, getTriggersOfMessage } from '@utils/collections/message-triggers';
import { getOwner } from '@utils/collections/owners';
import { getFlows } from '@utils/collections/flows';
import { getUsers } from '@utils/collections/users';
import { getTeams } from '@utils/collections/teams';
import { getDiagrams } from '@utils/collections/diagrams';
import { getDataProducts } from '@utils/collections/data-products';
import { getEntities } from '@utils/collections/entities';
import { getResourceDocCategories, getResourceDocs } from '@utils/collections/resource-docs';
import { buildUrl } from '@utils/url-builder';
import type { NavigationData, NavNode, ChildRef } from './builders/shared';
import { buildAgentNode } from './builders/agent';
import { buildDomainNode } from './builders/domain';
import { buildSystemNode } from './builders/system';
import { buildServiceNode } from './builders/service';
import { buildMessageNode } from './builders/message';
import { buildContainerNode } from './builders/container';
import { buildFlowNode } from './builders/flow';
import { buildDataProductNode } from './builders/data-product';
import { buildAdrNode } from './builders/adr';
import { buildEntityNode } from './builders/entity';
import config from '@config';
import { getDesigns } from '@utils/collections/designs';
import { getChannels } from '@utils/collections/channels';
import { createVersionedMap, findInMap } from '@utils/collections/util';
import { iconFieldsForResource } from '@utils/icon';
import {
  buildQuickReferenceSection,
  buildResourceDocsSection,
  shouldRenderSideBarSection,
  withArchitectureDecisionsSection,
} from './builders/shared';
import { isChangelogEnabled } from '@utils/feature';

export type { NavigationData, NavNode, ChildRef };

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';
let memoryCache: NavigationData | null = null;

type MessageEntry = CollectionEntry<'events' | 'commands' | 'queries'>;
type AgentEntry = CollectionEntry<'agents'>;
type ServiceEntry = CollectionEntry<'services'>;
type ContainerEntry = CollectionEntry<'containers'>;
type DataProductEntry = CollectionEntry<'data-products'>;

const byResourceName = <T extends { data: { name?: string; id: string } }>(a: T, b: T) => {
  const name = (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  if (name !== 0) return name;
  return a.data.id.localeCompare(b.data.id);
};

const sortByResourceName = <T extends { data: { name?: string; id: string } }>(items: T[]) => [...items].sort(byResourceName);

const groupAdrsByStatus = (adrs: Adr[]): NavNode[] =>
  ADR_STATUS_VALUES.reduce<NavNode[]>((groups, status) => {
    const adrsForStatus = adrs.filter((adr) => adr.data.status === status);
    if (adrsForStatus.length === 0) return groups;

    groups.push({
      type: 'group',
      title: `${formatAdrStatus(status)} (${adrsForStatus.length})`,
      collapseKey: `adrs:status:${status}`,
      subtle: true,
      pages: [...adrsForStatus].sort(byResourceName).map(getAdrNodeKey),
    });

    return groups;
  }, []);

const getMessageNodeKey = (message: MessageEntry) =>
  `${pluralizeMessageType(message)}:${message.data.id}:${message.data.version}`;

const uniqueRefs = (refs: string[]) => [...new Set(refs)];

const buildFlowReferencesByMessage = ({
  flows,
  events,
  commands,
  queries,
}: {
  flows: CollectionEntry<'flows'>[];
  events: CollectionEntry<'events'>[];
  commands: CollectionEntry<'commands'>[];
  queries: CollectionEntry<'queries'>[];
}) => {
  const eventMap = createVersionedMap(events);
  const commandMap = createVersionedMap(commands);
  const queryMap = createVersionedMap(queries);
  const flowRefsByMessage = new Map<string, string[]>();

  const addFlowRef = (message: MessageEntry, flow: CollectionEntry<'flows'>) => {
    const messageKey = getMessageNodeKey(message);
    const flowKey = `flow:${flow.data.id}:${flow.data.version}`;
    flowRefsByMessage.set(messageKey, uniqueRefs([...(flowRefsByMessage.get(messageKey) || []), flowKey]));
  };

  const resolveMessagePointer = (pointer: { id: string; version?: string }): MessageEntry | undefined => {
    return (
      findInMap(eventMap, pointer.id, pointer.version) ||
      findInMap(commandMap, pointer.id, pointer.version) ||
      findInMap(queryMap, pointer.id, pointer.version)
    );
  };

  for (const flow of flows) {
    for (const step of flow.data.steps || []) {
      if (!step.message) continue;

      const hydratedMessage = Array.isArray(step.message) ? step.message[0] : undefined;
      if (hydratedMessage?.collection && hydratedMessage?.data) {
        addFlowRef(hydratedMessage as MessageEntry, flow);
        continue;
      }

      if (Array.isArray(step.message)) continue;

      const message = resolveMessagePointer(step.message);
      if (message) addFlowRef(message, flow);
    }
  }

  return flowRefsByMessage;
};

const buildFlowReferencesByService = ({
  flows,
  services,
}: {
  flows: CollectionEntry<'flows'>[];
  services: CollectionEntry<'services'>[];
}) => {
  const serviceMap = createVersionedMap(services);
  const flowRefsByService = new Map<string, string[]>();

  const addFlowRef = (service: ServiceEntry, flow: CollectionEntry<'flows'>) => {
    const serviceKey = `service:${service.data.id}:${service.data.version}`;
    const flowKey = `flow:${flow.data.id}:${flow.data.version}`;
    flowRefsByService.set(serviceKey, uniqueRefs([...(flowRefsByService.get(serviceKey) || []), flowKey]));
  };

  for (const flow of flows) {
    for (const step of flow.data.steps || []) {
      if (!step.service) continue;

      const service = findInMap(serviceMap, step.service.id, step.service.version);
      if (service) addFlowRef(service, flow);
    }
  }

  return flowRefsByService;
};

const buildFlowReferencesByAgent = ({
  flows,
  agents,
}: {
  flows: CollectionEntry<'flows'>[];
  agents: CollectionEntry<'agents'>[];
}) => {
  const agentMap = createVersionedMap(agents);
  const flowRefsByAgent = new Map<string, string[]>();

  const addFlowRef = (agent: AgentEntry, flow: CollectionEntry<'flows'>) => {
    const agentKey = `agent:${agent.data.id}:${agent.data.version}`;
    const flowKey = `flow:${flow.data.id}:${flow.data.version}`;
    flowRefsByAgent.set(agentKey, uniqueRefs([...(flowRefsByAgent.get(agentKey) || []), flowKey]));
  };

  for (const flow of flows) {
    for (const step of flow.data.steps || []) {
      if (!(step as any).agent) continue;

      const hydratedAgent = Array.isArray((step as any).agent) ? (step as any).agent[0] : undefined;
      if (hydratedAgent?.collection && hydratedAgent?.data) {
        addFlowRef(hydratedAgent as AgentEntry, flow);
        continue;
      }

      if (Array.isArray((step as any).agent)) continue;

      const agent = findInMap(agentMap, (step as any).agent.id, (step as any).agent.version);
      if (agent) addFlowRef(agent, flow);
    }
  }

  return flowRefsByAgent;
};

const buildFlowReferencesByContainer = ({
  flows,
  containers,
}: {
  flows: CollectionEntry<'flows'>[];
  containers: CollectionEntry<'containers'>[];
}) => {
  const containerMap = createVersionedMap(containers);
  const flowRefsByContainer = new Map<string, string[]>();

  const addFlowRef = (container: ContainerEntry, flow: CollectionEntry<'flows'>) => {
    const containerKey = `container:${container.data.id}:${container.data.version}`;
    const flowKey = `flow:${flow.data.id}:${flow.data.version}`;
    flowRefsByContainer.set(containerKey, uniqueRefs([...(flowRefsByContainer.get(containerKey) || []), flowKey]));
  };

  for (const flow of flows) {
    for (const step of flow.data.steps || []) {
      if (!step.container) continue;

      const hydratedContainer = Array.isArray(step.container) ? step.container[0] : undefined;
      if (hydratedContainer?.collection && hydratedContainer?.data) {
        addFlowRef(hydratedContainer as ContainerEntry, flow);
        continue;
      }

      if (Array.isArray(step.container)) continue;

      const container = findInMap(containerMap, step.container.id, step.container.version);
      if (container) addFlowRef(container as ContainerEntry, flow);
    }
  }

  return flowRefsByContainer;
};

const buildFlowReferencesByDataProduct = ({
  flows,
  dataProducts,
}: {
  flows: CollectionEntry<'flows'>[];
  dataProducts: CollectionEntry<'data-products'>[];
}) => {
  const dataProductMap = createVersionedMap(dataProducts);
  const flowRefsByDataProduct = new Map<string, string[]>();

  const addFlowRef = (dataProduct: DataProductEntry, flow: CollectionEntry<'flows'>) => {
    const dataProductKey = `data-product:${dataProduct.data.id}:${dataProduct.data.version}`;
    const flowKey = `flow:${flow.data.id}:${flow.data.version}`;
    flowRefsByDataProduct.set(dataProductKey, uniqueRefs([...(flowRefsByDataProduct.get(dataProductKey) || []), flowKey]));
  };

  for (const flow of flows) {
    for (const step of flow.data.steps || []) {
      if (!step.dataProduct) continue;

      const hydratedDataProduct = Array.isArray(step.dataProduct) ? step.dataProduct[0] : undefined;
      if (hydratedDataProduct?.collection && hydratedDataProduct?.data) {
        addFlowRef(hydratedDataProduct as DataProductEntry, flow);
        continue;
      }

      if (Array.isArray(step.dataProduct)) continue;

      const dataProduct = findInMap(dataProductMap, step.dataProduct.id, step.dataProduct.version);
      if (dataProduct) addFlowRef(dataProduct as DataProductEntry, flow);
    }
  }

  return flowRefsByDataProduct;
};

/**
 * Get the navigation data for the sidebar
 */
export const getNestedSideBarData = async (): Promise<NavigationData> => {
  if (memoryCache && CACHE_ENABLED) {
    return memoryCache;
  }

  const [
    domains,
    systems,
    agents,
    services,
    { events, commands, queries },
    containers,
    flows,
    users,
    teams,
    designs,
    channels,
    diagrams,
    dataProducts,
    entities,
    adrs,
    schemas,
    ubiquitousLanguages,
    resourceDocs,
    resourceDocCategories,
  ] = await Promise.all([
    getDomains({ getAllVersions: false, includeServicesInSubdomains: false }),
    getSystems({ getAllVersions: false }),
    getAgents({ getAllVersions: false }),
    getServices({ getAllVersions: false }),
    getMessages({ getAllVersions: false }),
    getContainers({ getAllVersions: false }),
    getFlows({ getAllVersions: false }),
    getUsers(),
    getTeams(),
    getDesigns(),
    getChannels({ getAllVersions: false }),
    getDiagrams({ getAllVersions: false }),
    getDataProducts({ getAllVersions: false }),
    getEntities({ getAllVersions: false }),
    getAdrs({ getAllVersions: false }),
    getCollection('schemas'),
    getCollection('ubiquitousLanguages'),
    getResourceDocs(),
    getResourceDocCategories(),
  ]);

  // Calculate derived lists to avoid extra fetches
  const allSubDomainIds = new Set(domains.flatMap((d) => (d.data.domains || []).map((sd: any) => sd.data.id)));
  const rootDomains = domains.filter((d) => !allSubDomainIds.has(d.data.id));

  const messages = [...events, ...commands, ...queries];

  const context = {
    agents,
    services,
    domains,
    systems,
    events,
    commands,
    queries,
    flows,
    containers,
    channels,
    diagrams,
    schemas,
    ubiquitousLanguages,
    dataProducts,
    entities,
    adrs,
    users,
    teams,
    resourceDocs,
    resourceDocCategories,
  };

  // Process all domains with their owners first (async)
  const domainsWithOwners = await Promise.all(
    domains.map(async (domain) => {
      const ownersInDomain = domain.data.owners || [];
      const owners = await Promise.all(ownersInDomain.map((owner) => getOwner(owner)));
      const filteredOwners = owners.filter((o) => o !== undefined) as Array<NonNullable<(typeof owners)[0]>>;

      return {
        domain,
        owners: filteredOwners,
      };
    })
  );

  const agentsWithOwners = await Promise.all(
    agents.map(async (agent) => {
      const ownersInAgent = agent.data.owners || [];
      const owners = await Promise.all(ownersInAgent.map((owner) => getOwner(owner)));
      const filteredOwners = owners.filter((o) => o !== undefined) as Array<NonNullable<(typeof owners)[0]>>;
      return { agent, owners: filteredOwners };
    })
  );

  // Services with owners
  const servicesWithOwners = await Promise.all(
    services.map(async (service) => {
      const ownersInService = service.data.owners || [];
      const owners = await Promise.all(ownersInService.map((owner) => getOwner(owner)));
      const filteredOwners = owners.filter((o) => o !== undefined) as Array<NonNullable<(typeof owners)[0]>>;
      return { service, owners: filteredOwners };
    })
  );

  // Messages with owners
  const messagesWithOwners = await Promise.all(
    messages.map(async (message) => {
      const ownersInMessage = message.data.owners || [];
      const owners = await Promise.all(ownersInMessage.map((owner) => getOwner(owner)));
      const filteredOwners = owners.filter((o) => o !== undefined) as Array<NonNullable<(typeof owners)[0]>>;
      return { message, owners: filteredOwners };
    })
  );

  const containerWithOwners = await Promise.all(
    containers.map(async (container) => {
      const ownersInContainer = container.data.owners || [];
      const owners = await Promise.all(ownersInContainer.map((owner) => getOwner(owner)));
      const filteredOwners = owners.filter((o) => o !== undefined) as Array<NonNullable<(typeof owners)[0]>>;
      return { container, owners: filteredOwners };
    })
  );

  const systemWithOwners = await Promise.all(
    systems.map(async (system) => {
      const ownersInSystem = system.data.owners || [];
      const owners = await Promise.all(ownersInSystem.map((owner) => getOwner(owner)));
      const filteredOwners = owners.filter((o) => o !== undefined) as Array<NonNullable<(typeof owners)[0]>>;
      return { system, owners: filteredOwners };
    })
  );

  const adrsWithOwners = await Promise.all(
    adrs.map(async (adr) => {
      const owners = await Promise.all((adr.data.owners || []).map((owner) => getOwner(owner)));
      const decisionMakers = await Promise.all((adr.data.decisionMakers || []).map((owner) => getOwner(owner)));
      return {
        adr,
        owners: owners.filter((o) => o !== undefined),
        decisionMakers: decisionMakers.filter((o) => o !== undefined),
      };
    })
  );

  const entitiesWithOwners = await Promise.all(
    entities.map(async (entity) => {
      const owners = await Promise.all((entity.data.owners || []).map((owner) => getOwner(owner)));
      const filteredOwners = owners.filter((o) => o !== undefined) as Array<NonNullable<(typeof owners)[0]>>;
      return { entity, owners: filteredOwners };
    })
  );

  const flowNodes = flows.reduce(
    (acc, flow) => {
      acc[`flow:${flow.data.id}:${flow.data.version}`] = withArchitectureDecisionsSection(
        buildFlowNode(flow, context),
        flow,
        adrs
      );
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const domainNodes = domainsWithOwners.reduce(
    (acc, { domain, owners }) => {
      const versionedKey = `domain:${domain.data.id}:${domain.data.version}`;
      acc[versionedKey] = withArchitectureDecisionsSection(buildDomainNode(domain, owners, context), domain, adrs);
      if (domain.data.latestVersion === domain.data.version) {
        // Store reference to versioned key instead of duplicating the full node
        acc[`domain:${domain.data.id}`] = versionedKey;
      }
      return acc;
    },
    {} as Record<string, NavNode | string>
  );

  const [rawAgents, rawServices, rawDomains] = await Promise.all([
    getCollection('agents'),
    getCollection('services'),
    getCollection('domains'),
  ]);
  const messageReceivers = [...rawServices, ...rawAgents, ...rawDomains];

  // Compute channels for each service from raw sends[].to / receives[].from pointers
  const channelMap = createVersionedMap(channels);
  const serviceChannelsMap = new Map<string, CollectionEntry<'channels'>[]>();

  for (const service of services) {
    const rawService = rawServices.find((s) => s.data.id === service.data.id && s.data.version === service.data.version);
    if (!rawService) continue;

    const pointers: Array<{ id: string; version?: string }> = [];
    for (const send of rawService.data.sends ?? []) {
      for (const ch of send.to ?? []) {
        pointers.push({ id: ch.id, version: ch.version });
      }
    }
    for (const receive of rawService.data.receives ?? []) {
      for (const ch of receive.from ?? []) {
        pointers.push({ id: ch.id, version: ch.version });
      }
    }

    const seen = new Set<string>();
    const resolved: CollectionEntry<'channels'>[] = [];
    for (const pointer of pointers) {
      const key = `${pointer.id}-${pointer.version ?? 'latest'}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const match = findInMap(channelMap, pointer.id, pointer.version);
      if (match) resolved.push(match as CollectionEntry<'channels'>);
    }

    if (resolved.length > 0) {
      serviceChannelsMap.set(`${service.data.id}:${service.data.version}`, resolved);
    }
  }

  const agentChannelsMap = new Map<string, CollectionEntry<'channels'>[]>();

  for (const agent of agents) {
    const rawAgent = rawAgents.find((a) => a.data.id === agent.data.id && a.data.version === agent.data.version);
    if (!rawAgent) continue;

    const pointers: Array<{ id: string; version?: string }> = [];
    for (const send of rawAgent.data.sends ?? []) {
      for (const ch of send.to ?? []) {
        pointers.push({ id: ch.id, version: ch.version });
      }
    }
    for (const receive of rawAgent.data.receives ?? []) {
      for (const ch of receive.from ?? []) {
        pointers.push({ id: ch.id, version: ch.version });
      }
    }

    const seen = new Set<string>();
    const resolved: CollectionEntry<'channels'>[] = [];
    for (const pointer of pointers) {
      const key = `${pointer.id}-${pointer.version ?? 'latest'}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const match = findInMap(channelMap, pointer.id, pointer.version);
      if (match) resolved.push(match as CollectionEntry<'channels'>);
    }

    if (resolved.length > 0) {
      agentChannelsMap.set(`${agent.data.id}:${agent.data.version}`, resolved);
    }
  }

  const flowRefsByAgent = buildFlowReferencesByAgent({ flows, agents });
  const flowRefsByService = buildFlowReferencesByService({ flows, services });

  const agentNodes = agentsWithOwners.reduce(
    (acc, { agent, owners }) => {
      const versionedKey = `agent:${agent.data.id}:${agent.data.version}`;
      const agentChannels = agentChannelsMap.get(`${agent.data.id}:${agent.data.version}`) || [];
      acc[versionedKey] = withArchitectureDecisionsSection(
        buildAgentNode(agent, owners, context, agentChannels, flowRefsByAgent.get(versionedKey) || []),
        agent,
        adrs
      );
      if (agent.data.latestVersion === agent.data.version) {
        acc[`agent:${agent.data.id}`] = versionedKey;
      }
      return acc;
    },
    {} as Record<string, NavNode | string>
  );

  const serviceNodes = servicesWithOwners.reduce(
    (acc, { service, owners }) => {
      const versionedKey = `service:${service.data.id}:${service.data.version}`;
      const serviceChannels = serviceChannelsMap.get(`${service.data.id}:${service.data.version}`) || [];
      acc[versionedKey] = withArchitectureDecisionsSection(
        buildServiceNode(service, owners, context, serviceChannels, flowRefsByService.get(versionedKey) || []),
        service,
        adrs
      );
      if (service.data.latestVersion === service.data.version) {
        // Store reference to versioned key instead of duplicating the full node
        acc[`service:${service.data.id}`] = versionedKey;
      }
      return acc;
    },
    {} as Record<string, NavNode | string>
  );

  // Build a set of message IDs that have field usage declared by any resource that can receive messages.
  // We use raw collections because the hydrated resources replace
  // sends/receives pointers with resolved message entries, which strips the fields property.
  const messagesWithFieldUsage = new Set<string>();
  for (const agent of rawAgents) {
    for (const pointer of agent.data.sends || []) {
      if (pointer.fields?.length) messagesWithFieldUsage.add(pointer.id);
    }
    for (const pointer of agent.data.receives || []) {
      if (pointer.fields?.length) messagesWithFieldUsage.add(pointer.id);
    }
  }
  for (const service of rawServices) {
    for (const pointer of service.data.sends || []) {
      if (pointer.fields?.length) messagesWithFieldUsage.add(pointer.id);
    }
    for (const pointer of service.data.receives || []) {
      if (pointer.fields?.length) messagesWithFieldUsage.add(pointer.id);
    }
  }
  for (const domain of rawDomains) {
    for (const pointer of domain.data.sends || []) {
      if (pointer.fields?.length) messagesWithFieldUsage.add(pointer.id);
    }
    for (const pointer of domain.data.receives || []) {
      if (pointer.fields?.length) messagesWithFieldUsage.add(pointer.id);
    }
  }

  const flowRefsByMessage = buildFlowReferencesByMessage({ flows, events, commands, queries });

  const messageNodes = messagesWithOwners.reduce(
    (acc, { message, owners }) => {
      const type = pluralizeMessageType(message as any);
      const versionedKey = `${type}:${message.data.id}:${message.data.version}`;
      const hasFieldUsage = messagesWithFieldUsage.has(message.data.id);
      const triggers = getTriggersOfMessage(messageReceivers, message, messages);
      const triggeredBy = getTriggeredByOfMessage(messageReceivers, message, messages);
      acc[versionedKey] = withArchitectureDecisionsSection(
        buildMessageNode(message, owners, context, hasFieldUsage, flowRefsByMessage.get(versionedKey) || [], {
          triggers,
          triggeredBy,
        }),
        message,
        adrs
      );
      if (message.data.latestVersion === message.data.version) {
        // Store reference to versioned key instead of duplicating the full node
        acc[`${type}:${message.data.id}`] = versionedKey;
      }
      return acc;
    },
    {} as Record<string, NavNode | string>
  );

  const flowRefsByContainer = buildFlowReferencesByContainer({ flows, containers });

  const containerNodes = containerWithOwners.reduce(
    (acc, { container, owners }) => {
      const versionedKey = `container:${container.data.id}:${container.data.version}`;
      acc[versionedKey] = withArchitectureDecisionsSection(
        buildContainerNode(container, owners, context, flowRefsByContainer.get(versionedKey) || []),
        container,
        adrs
      );
      if (container.data.latestVersion === container.data.version) {
        // Store reference to versioned key instead of duplicating the full node
        acc[`container:${container.data.id}`] = versionedKey;
      }
      return acc;
    },
    {} as Record<string, NavNode | string>
  );

  const systemNodes = systemWithOwners.reduce(
    (acc, { system, owners }) => {
      const versionedKey = `system:${system.data.id}:${system.data.version}`;
      acc[versionedKey] = withArchitectureDecisionsSection(buildSystemNode(system, owners, context), system, adrs);
      if (system.data.latestVersion === system.data.version) {
        // Store reference to versioned key instead of duplicating the full node
        acc[`system:${system.data.id}`] = versionedKey;
      }
      return acc;
    },
    {} as Record<string, NavNode | string>
  );

  // Get owners for data products
  const dataProductWithOwners = await Promise.all(
    dataProducts.map(async (dataProduct) => {
      const owners = await Promise.all((dataProduct.data.owners || []).map((owner) => getOwner(owner)));
      return { dataProduct, owners: owners.filter((o) => o !== undefined) };
    })
  );

  const dataProductContext = {
    events,
    commands,
    queries,
    services,
    containers,
    channels,
    resourceDocs,
    resourceDocCategories,
  };

  const flowRefsByDataProduct = buildFlowReferencesByDataProduct({ flows, dataProducts });

  const dataProductNodes = dataProductWithOwners.reduce(
    (acc, { dataProduct, owners }) => {
      const versionedKey = `data-product:${dataProduct.data.id}:${dataProduct.data.version}`;
      acc[versionedKey] = withArchitectureDecisionsSection(
        buildDataProductNode(dataProduct, owners, dataProductContext, flowRefsByDataProduct.get(versionedKey) || []),
        dataProduct,
        adrs
      );
      if (dataProduct.data.latestVersion === dataProduct.data.version) {
        acc[`data-product:${dataProduct.data.id}`] = versionedKey;
      }
      return acc;
    },
    {} as Record<string, NavNode | string>
  );

  const adrNodes = adrsWithOwners.reduce(
    (acc, { adr, owners, decisionMakers }) => {
      const versionedKey = getAdrNodeKey(adr);
      acc[versionedKey] = buildAdrNode(adr, owners, decisionMakers, context);
      if (adr.data.latestVersion === adr.data.version) {
        acc[getAdrAliasNodeKey(adr)] = versionedKey;
      }
      return acc;
    },
    {} as Record<string, NavNode | string>
  );

  const entityNodes = entitiesWithOwners.reduce(
    (acc, { entity, owners }) => {
      const versionedKey = `entity:${entity.data.id}:${entity.data.version}`;
      acc[versionedKey] = withArchitectureDecisionsSection(buildEntityNode(entity, owners, context), entity, adrs);
      if (entity.data.latestVersion === entity.data.version) {
        acc[`entity:${entity.data.id}`] = versionedKey;
      }
      return acc;
    },
    {} as Record<string, NavNode | string>
  );

  const designNodes = designs.reduce(
    (acc, design) => {
      acc[`design:${design.data.id}`] = {
        type: 'item',
        title: design.data.name,
        badge: 'Design',
        href: buildUrl(`/visualiser/designs/${design.data.id}`),
      };
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const diagramNodes = diagrams.reduce(
    (acc, diagram) => {
      const versionedKey = `diagram:${diagram.data.id}:${diagram.data.version}`;
      acc[versionedKey] = withArchitectureDecisionsSection(
        {
          type: 'item',
          title: diagram.data.name,
          badge: 'Diagram',
          href: buildUrl(`/diagrams/${diagram.data.id}/${diagram.data.version}`),
        },
        diagram,
        adrs
      );
      if (diagram.data.latestVersion === diagram.data.version) {
        acc[`diagram:${diagram.data.id}`] = versionedKey;
      }
      return acc;
    },
    {} as Record<string, NavNode | string>
  );

  const userNodes = users.reduce(
    (acc, user) => {
      acc[`user:${user.data.id}`] = withArchitectureDecisionsSection(
        {
          type: 'item',
          title: user.data.name,
          href: buildUrl(`/docs/users/${user.data.id}`),
        },
        user,
        adrs
      );
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const channelNodes = channels.reduce(
    (acc, channel) => {
      const versionedKey = `channel:${channel.data.id}:${channel.data.version}`;
      const docsSection = buildResourceDocsSection(
        'channels',
        channel.data.id,
        channel.data.version,
        resourceDocs,
        resourceDocCategories
      );
      acc[versionedKey] = withArchitectureDecisionsSection(
        {
          type: 'item',
          title: channel.data.name,
          badge: 'Channel',
          summary: channel.data.summary,
          ...iconFieldsForResource(channel.data, 'ArrowRightLeft'),
          pages: [
            buildQuickReferenceSection(
              [
                {
                  title: 'Overview',
                  href: buildUrl(`/docs/${channel.collection}/${channel.data.id}/${channel.data.version}`),
                },
                isChangelogEnabled() &&
                  shouldRenderSideBarSection(channel, 'changelog') && {
                    title: 'Changelog',
                    href: buildUrl(`/docs/${channel.collection}/${channel.data.id}/${channel.data.version}/changelog`),
                  },
              ].filter(Boolean) as { title: string; href: string }[]
            ),
            docsSection,
          ].filter(Boolean) as ChildRef[],
        },
        channel,
        adrs
      );

      if (channel.data.latestVersion === channel.data.version) {
        // Store reference to versioned key instead of duplicating the full node
        acc[`channel:${channel.data.id}`] = versionedKey;
      }
      return acc;
    },
    {} as Record<string, NavNode | string>
  );

  const teamNodes = teams.reduce(
    (acc, team) => {
      acc[`team:${team.data.id}`] = withArchitectureDecisionsSection(
        {
          type: 'item',
          title: team.data.name,
          href: buildUrl(`/docs/teams/${team.data.id}`),
        },
        team,
        adrs
      );
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const visualiserEnabled = config?.visualiser?.enabled !== false;
  const rootDomainsNodes: Record<string, NavNode> = {};

  if (rootDomains.length > 0) {
    rootDomainsNodes['list:top-level-domains'] = {
      type: 'group',
      title: 'Domains',
      icon: 'Boxes',
      pages: sortByResourceName(rootDomains).map((domain) => `domain:${domain.data.id}:${domain.data.version}`),
    };
  }

  const topLevelDiagramsNode =
    visualiserEnabled && systems.length > 0
      ? {
          type: 'group' as const,
          title: 'Top level diagrams',
          icon: 'Workflow',
          pages: [
            {
              type: 'item' as const,
              title: 'System Context Map',
              href: buildUrl('/visualiser/system-context-map'),
            },
          ],
        }
      : undefined;

  const createLeaf = (items: any[], node: NavNode) => (items.length > 0 ? node : undefined);

  const domainsList = createLeaf(domains, {
    type: 'item',
    title: 'Domains',
    icon: 'Boxes',
    pages: sortByResourceName(domains).map((domain) => `domain:${domain.data.id}:${domain.data.version}`),
  });

  // Split systems by scope (defaults to internal). When there are systems of both
  // scopes we show two sub-sections (Internal / External), each ordered by name;
  // otherwise we keep a flat list so a single-scope catalog isn't over-nested.
  const internalSystems = systems.filter((system) => (system.data.scope ?? 'internal') !== 'external');
  const externalSystems = systems.filter((system) => system.data.scope === 'external');

  const systemPageKeys = (items: typeof systems) =>
    sortByResourceName(items).map((system) => `system:${system.data.id}:${system.data.version}`);

  const internalSystemsList = createLeaf(internalSystems, {
    type: 'group',
    title: 'Internal',
    icon: 'Group',
    pages: systemPageKeys(internalSystems),
  });

  const externalSystemsScopedList = createLeaf(externalSystems, {
    type: 'group',
    title: 'External',
    icon: 'Group',
    pages: systemPageKeys(externalSystems),
  });

  const hasBothSystemScopes = internalSystems.length > 0 && externalSystems.length > 0;

  const systemsList = createLeaf(systems, {
    type: 'item',
    title: 'Systems',
    icon: 'Group',
    pages: hasBothSystemScopes ? ['list:systems-internal', 'list:systems-external'] : systemPageKeys(systems),
  });

  const agentsList = createLeaf(agents, {
    type: 'item',
    title: 'Agents',
    icon: 'Bot',
    pages: sortByResourceName(agents).map((agent) => `agent:${agent.data.id}:${agent.data.version}`),
  });

  const adrsList = createLeaf(adrs, {
    type: 'item',
    title: 'Decision Records',
    icon: 'ClipboardList',
    pages: groupAdrsByStatus(adrs),
  });

  const internalServices = services.filter((service) => !service.data.externalSystem);
  const externalServices = services.filter((service) => service.data.externalSystem);

  const servicesList = createLeaf(internalServices, {
    type: 'item',
    title: 'Services',
    icon: 'Server',
    pages: sortByResourceName(internalServices).map((service) => `service:${service.data.id}:${service.data.version}`),
  });

  const externalSystemsList = createLeaf(externalServices, {
    type: 'item',
    title: 'External Systems',
    icon: 'Globe',
    pages: sortByResourceName(externalServices).map((service) => `service:${service.data.id}:${service.data.version}`),
  });

  const eventsList = createLeaf(events, {
    type: 'group',
    title: 'Events',
    icon: 'Zap',
    pages: sortByResourceName(events).map((event) => `event:${event.data.id}:${event.data.version}`),
  });

  const commandsList = createLeaf(commands, {
    type: 'group',
    title: 'Commands',
    icon: 'Terminal',
    pages: sortByResourceName(commands).map((command) => `command:${command.data.id}:${command.data.version}`),
  });

  const queriesList = createLeaf(queries, {
    type: 'group',
    title: 'Queries',
    icon: 'Search',
    pages: sortByResourceName(queries).map((query) => `query:${query.data.id}:${query.data.version}`),
  });

  const flowsList = createLeaf(flows, {
    type: 'item',
    title: 'Flows',
    icon: 'Waypoints',
    pages: sortByResourceName(flows).map((flow) => `flow:${flow.data.id}:${flow.data.version}`),
  });

  const containersList = createLeaf(containers, {
    type: 'item',
    title: 'Data Stores',
    icon: 'Database',
    pages: sortByResourceName(containers).map((container) => `container:${container.data.id}:${container.data.version}`),
  });

  const dataProductsList = createLeaf(dataProducts, {
    type: 'item',
    title: 'Data Products',
    icon: 'Package',
    pages: sortByResourceName(dataProducts).map(
      (dataProduct) => `data-product:${dataProduct.data.id}:${dataProduct.data.version}`
    ),
  });

  const entitiesList = createLeaf(entities, {
    type: 'item',
    title: 'Entities',
    icon: 'Box',
    pages: sortByResourceName(entities).map((entity) => `entity:${entity.data.id}:${entity.data.version}`),
  });

  const designsList = createLeaf(designs, {
    type: 'item',
    title: 'Designs',
    icon: 'SquareMousePointer',
    pages: sortByResourceName(designs).map((design) => `design:${design.data.id}`),
  });

  const teamsList = createLeaf(teams, {
    type: 'group',
    title: 'Teams',
    icon: 'Users',
    pages: sortByResourceName(teams).map((team) => `team:${team.data.id}`),
  });

  const usersList = createLeaf(users, {
    type: 'group',
    title: 'Users',
    icon: 'User',
    pages: sortByResourceName(users).map((user) => `user:${user.data.id}`),
  });

  const channelList = createLeaf(channels, {
    type: 'item',
    title: 'Channels',
    icon: 'ArrowRightLeft',
    pages: sortByResourceName(channels).map((channel) => `channel:${channel.data.id}:${channel.data.version}`),
  });

  const messagesChildren = ['list:events', 'list:commands', 'list:queries'].filter(
    (key, index) => [eventsList, commandsList, queriesList][index] !== undefined
  );

  let messagesList;
  if (messagesChildren.length > 0) {
    messagesList = {
      type: 'item',
      title: 'Messages',
      icon: 'Mail',
      pages: messagesChildren,
    };
  }

  const peopleChildren = ['list:teams', 'list:users'].filter((key, index) => [teamsList, usersList][index] !== undefined);

  let peopleList;
  if (peopleChildren.length > 0) {
    peopleList = {
      type: 'item',
      title: 'Teams & Users',
      icon: 'Users',
      pages: peopleChildren,
    };
  }

  const allChildrenKeys = [
    'list:domains',
    'list:systems',
    'list:services',
    'list:agents',
    'list:adrs',
    'list:external-systems',
    'list:messages',
    'list:channels',
    'list:flows',
    'list:containers',
    'list:data-products',
    'list:entities',
    'list:designs',
    'list:people',
  ];
  const allChildrenNodes = [
    domainsList,
    systemsList,
    servicesList,
    agentsList,
    adrsList,
    externalSystemsList,
    messagesList,
    channelList,
    flowsList,
    containersList,
    dataProductsList,
    entitiesList,
    designsList,
    peopleList,
  ];

  // The Browse list leads with the resources people reach for most — Domains,
  // Systems, Services then Messages — and falls back to A-Z for everything else.
  const browseOrderPriority = ['list:domains', 'list:systems', 'list:services', 'list:messages'];
  const browseRank = (key: string) => {
    const index = browseOrderPriority.indexOf(key);
    return index === -1 ? browseOrderPriority.length : index;
  };

  const validAllChildren = allChildrenKeys
    .map((key, idx) => ({ key, node: allChildrenNodes[idx] }))
    .filter((item): item is { key: string; node: NavNode } => item.node !== undefined)
    .sort((a, b) => {
      const rankDifference = browseRank(a.key) - browseRank(b.key);
      if (rankDifference !== 0) return rankDifference;
      return a.node.title.localeCompare(b.node.title);
    })
    .map((item) => item.key);

  let allList;
  if (validAllChildren.length > 0) {
    allList = {
      type: 'group',
      title: 'Browse',
      icon: 'Telescope',
      pages: validAllChildren,
    };
  }

  const allNodes: Record<string, NavNode> = {
    ...(domainsList ? { 'list:domains': domainsList } : {}),
    ...(systemsList ? { 'list:systems': systemsList } : {}),
    ...(internalSystemsList ? { 'list:systems-internal': internalSystemsList } : {}),
    ...(externalSystemsScopedList ? { 'list:systems-external': externalSystemsScopedList } : {}),
    ...(servicesList ? { 'list:services': servicesList } : {}),
    ...(agentsList ? { 'list:agents': agentsList } : {}),
    ...(adrsList ? { 'list:adrs': adrsList } : {}),
    ...(externalSystemsList ? { 'list:external-systems': externalSystemsList } : {}),
    ...(eventsList ? { 'list:events': eventsList } : {}),
    ...(commandsList ? { 'list:commands': commandsList } : {}),
    ...(queriesList ? { 'list:queries': queriesList } : {}),
    ...(messagesList ? { 'list:messages': messagesList as NavNode } : {}),
    ...(flowsList ? { 'list:flows': flowsList } : {}),
    ...(containersList ? { 'list:containers': containersList } : {}),
    ...(dataProductsList ? { 'list:data-products': dataProductsList } : {}),
    ...(entitiesList ? { 'list:entities': entitiesList } : {}),
    ...(designsList ? { 'list:designs': designsList } : {}),
    ...(teamsList ? { 'list:teams': teamsList } : {}),
    ...(usersList ? { 'list:users': usersList } : {}),
    ...(channelList ? { 'list:channels': channelList as NavNode } : {}),
    ...(peopleList ? { 'list:people': peopleList as NavNode } : {}),
    ...(allList ? { 'list:all': allList as NavNode } : {}),
  };

  // System-level views (only show if visualiser is enabled and there are systems)
  const systemNode: Record<string, NavNode> = {};

  if (visualiserEnabled && systems.length > 0) {
    systemNode['list:system'] = {
      type: 'group',
      title: 'System',
      icon: 'Globe',
      pages: [
        {
          type: 'item',
          title: 'System Context Map',
          href: buildUrl('/visualiser/system-context-map'),
        },
      ],
    };
  }

  const allGeneratedNodes = {
    ...rootDomainsNodes,
    ...(topLevelDiagramsNode ? { 'list:top-level-diagrams': topLevelDiagramsNode } : {}),
    ...domainNodes,
    ...systemNodes,
    ...agentNodes,
    ...adrNodes,
    ...serviceNodes,
    ...messageNodes,
    ...channelNodes,
    ...containerNodes,
    ...dataProductNodes,
    ...entityNodes,
    ...flowNodes,
    ...userNodes,
    ...teamNodes,
    ...diagramNodes,
    ...designNodes,
    ...systemNode,
    ...allNodes,
  };

  // only filter if child is string
  const defaultPages = ['list:top-level-domains', 'list:all'];
  if (topLevelDiagramsNode) {
    defaultPages.splice(1, 0, 'list:top-level-diagrams');
  }
  const rootNavigationConfig = config?.navigation?.pages || defaultPages;

  const navigationConfig = {
    roots: rootNavigationConfig,
    nodes: allGeneratedNodes,
  };

  memoryCache = navigationConfig;

  return navigationConfig;
};
