import { getContainers } from '@utils/collections/containers';
import { getDomains } from '@utils/collections/domains';
import { getServices } from '@utils/collections/services';
import { getMessages, pluralizeMessageType } from '@utils/collections/messages';
import { getOwner } from '@utils/collections/owners';
import { getFlows } from '@utils/collections/flows';
import { getUsers } from '@utils/collections/users';
import { getTeams } from '@utils/collections/teams';
import { getDiagrams } from '@utils/collections/diagrams';
import { getDataProducts } from '@utils/collections/data-products';
import { buildUrl } from '@utils/url-builder';
import type { NavigationData, NavNode, ChildRef } from './builders/shared';
import { buildDomainNode } from './builders/domain';
import { buildServiceNode } from './builders/service';
import { buildMessageNode } from './builders/message';
import { buildContainerNode } from './builders/container';
import { buildFlowNode } from './builders/flow';
import { buildDataProductNode } from './builders/data-product';
import config from '@config';
import { getDesigns } from '@utils/collections/designs';
import { getChannels } from '@utils/collections/channels';

export type { NavigationData, NavNode, ChildRef };

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';
let memoryCache: NavigationData | null = null;

/**
 * Get the navigation data for the sidebar
 */
export const getNestedSideBarData = async (): Promise<NavigationData> => {
  if (memoryCache && CACHE_ENABLED) {
    return memoryCache;
  }

  const [
    domains,
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
  ] = await Promise.all([
    getDomains({ getAllVersions: false, includeServicesInSubdomains: false }),
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
  ]);

  // Calculate derived lists to avoid extra fetches
  const allSubDomainIds = new Set(domains.flatMap((d) => (d.data.domains || []).map((sd: any) => sd.data.id)));
  const rootDomains = domains.filter((d) => !allSubDomainIds.has(d.data.id));

  const messages = [...events, ...commands, ...queries];

  const context = {
    services,
    domains,
    events,
    commands,
    queries,
    flows,
    containers,
    diagrams,
    dataProducts,
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

  const flowNodes = flows.reduce(
    (acc, flow) => {
      acc[`flow:${flow.data.id}:${flow.data.version}`] = buildFlowNode(flow);
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const domainNodes = domainsWithOwners.reduce(
    (acc, { domain, owners }) => {
      const versionedKey = `domain:${domain.data.id}:${domain.data.version}`;
      acc[versionedKey] = buildDomainNode(domain, owners, context);
      if (domain.data.latestVersion === domain.data.version) {
        // Store reference to versioned key instead of duplicating the full node
        acc[`domain:${domain.data.id}`] = versionedKey;
      }
      return acc;
    },
    {} as Record<string, NavNode | string>
  );

  const serviceNodes = servicesWithOwners.reduce(
    (acc, { service, owners }) => {
      const versionedKey = `service:${service.data.id}:${service.data.version}`;
      acc[versionedKey] = buildServiceNode(service, owners, context);
      if (service.data.latestVersion === service.data.version) {
        // Store reference to versioned key instead of duplicating the full node
        acc[`service:${service.data.id}`] = versionedKey;
      }
      return acc;
    },
    {} as Record<string, NavNode | string>
  );

  const messageNodes = messagesWithOwners.reduce(
    (acc, { message, owners }) => {
      const type = pluralizeMessageType(message as any);
      const versionedKey = `${type}:${message.data.id}:${message.data.version}`;
      acc[versionedKey] = buildMessageNode(message, owners, context);
      if (message.data.latestVersion === message.data.version) {
        // Store reference to versioned key instead of duplicating the full node
        acc[`${type}:${message.data.id}`] = versionedKey;
      }
      return acc;
    },
    {} as Record<string, NavNode | string>
  );

  const containerNodes = containerWithOwners.reduce(
    (acc, { container, owners }) => {
      const versionedKey = `container:${container.data.id}:${container.data.version}`;
      acc[versionedKey] = buildContainerNode(container, owners, context);
      if (container.data.latestVersion === container.data.version) {
        // Store reference to versioned key instead of duplicating the full node
        acc[`container:${container.data.id}`] = versionedKey;
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
  };

  const dataProductNodes = dataProductWithOwners.reduce(
    (acc, { dataProduct, owners }) => {
      const versionedKey = `data-product:${dataProduct.data.id}:${dataProduct.data.version}`;
      acc[versionedKey] = buildDataProductNode(dataProduct, owners, dataProductContext);
      if (dataProduct.data.latestVersion === dataProduct.data.version) {
        acc[`data-product:${dataProduct.data.id}`] = versionedKey;
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

  const userNodes = users.reduce(
    (acc, user) => {
      acc[`user:${user.data.id}`] = {
        type: 'item',
        title: user.data.name,
        href: buildUrl(`/docs/users/${user.data.id}`),
      };
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const channelNodes = channels.reduce(
    (acc, channel) => {
      const versionedKey = `channel:${channel.data.id}:${channel.data.version}`;
      acc[versionedKey] = {
        type: 'item',
        title: channel.data.name,
        badge: 'Channel',
        summary: channel.data.summary,
        href: buildUrl(`/docs/${channel.collection}/${channel.data.id}/${channel.data.version}`),
      };

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
      acc[`team:${team.data.id}`] = {
        type: 'item',
        title: team.data.name,
        href: buildUrl(`/docs/teams/${team.data.id}`),
      };
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const rootDomainsNodes: Record<string, NavNode> = {};

  if (rootDomains.length > 0) {
    rootDomainsNodes['list:top-level-domains'] = {
      type: 'group',
      title: 'Domains',
      icon: 'Boxes',
      pages: rootDomains.map((domain) => `domain:${domain.data.id}:${domain.data.version}`),
    };
  }

  const createLeaf = (items: any[], node: NavNode) => (items.length > 0 ? node : undefined);

  const domainsList = createLeaf(domains, {
    type: 'item',
    title: 'Domains',
    icon: 'Boxes',
    pages: domains.map((domain) => `domain:${domain.data.id}:${domain.data.version}`),
  });

  const servicesList = createLeaf(services, {
    type: 'item',
    title: 'Services',
    icon: 'Server',
    pages: services.map((service) => `service:${service.data.id}:${service.data.version}`),
  });

  const eventsList = createLeaf(events, {
    type: 'group',
    title: 'Events',
    icon: 'Zap',
    pages: events.map((event) => `event:${event.data.id}:${event.data.version}`),
  });

  const commandsList = createLeaf(commands, {
    type: 'group',
    title: 'Commands',
    icon: 'Terminal',
    pages: commands.map((command) => `command:${command.data.id}:${command.data.version}`),
  });

  const queriesList = createLeaf(queries, {
    type: 'group',
    title: 'Queries',
    icon: 'Search',
    pages: queries.map((query) => `query:${query.data.id}:${query.data.version}`),
  });

  const flowsList = createLeaf(flows, {
    type: 'item',
    title: 'Flows',
    icon: 'Waypoints',
    pages: flows.map((flow) => `flow:${flow.data.id}:${flow.data.version}`),
  });

  const containersList = createLeaf(containers, {
    type: 'item',
    title: 'Data Stores',
    icon: 'Database',
    pages: containers.map((container) => `container:${container.data.id}:${container.data.version}`),
  });

  const dataProductsList = createLeaf(dataProducts, {
    type: 'item',
    title: 'Data Products',
    icon: 'Package',
    pages: dataProducts.map((dataProduct) => `data-product:${dataProduct.data.id}:${dataProduct.data.version}`),
  });

  const designsList = createLeaf(designs, {
    type: 'item',
    title: 'Designs',
    icon: 'SquareMousePointer',
    pages: designs.map((design) => `design:${design.data.id}`),
  });

  const teamsList = createLeaf(teams, {
    type: 'group',
    title: 'Teams',
    icon: 'Users',
    pages: teams.map((team) => `team:${team.data.id}`),
  });

  const usersList = createLeaf(users, {
    type: 'group',
    title: 'Users',
    icon: 'User',
    pages: users.map((user) => `user:${user.data.id}`),
  });

  const channelList = createLeaf(channels, {
    type: 'item',
    title: 'Channels',
    icon: 'ArrowRightLeft',
    pages: channels.map((channel) => `channel:${channel.data.id}:${channel.data.version}`),
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
    'list:services',
    'list:messages',
    'list:channels',
    'list:flows',
    'list:containers',
    'list:data-products',
    'list:designs',
    'list:people',
  ];
  const allChildrenNodes = [
    domainsList,
    servicesList,
    messagesList,
    channelList,
    flowsList,
    containersList,
    dataProductsList,
    designsList,
    peopleList,
  ];

  const validAllChildren = allChildrenKeys.filter((_, idx) => allChildrenNodes[idx] !== undefined);

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
    ...(servicesList ? { 'list:services': servicesList } : {}),
    ...(eventsList ? { 'list:events': eventsList } : {}),
    ...(commandsList ? { 'list:commands': commandsList } : {}),
    ...(queriesList ? { 'list:queries': queriesList } : {}),
    ...(messagesList ? { 'list:messages': messagesList as NavNode } : {}),
    ...(flowsList ? { 'list:flows': flowsList } : {}),
    ...(containersList ? { 'list:containers': containersList } : {}),
    ...(dataProductsList ? { 'list:data-products': dataProductsList } : {}),
    ...(designsList ? { 'list:designs': designsList } : {}),
    ...(teamsList ? { 'list:teams': teamsList } : {}),
    ...(usersList ? { 'list:users': usersList } : {}),
    ...(channelList ? { 'list:channels': channelList as NavNode } : {}),
    ...(peopleList ? { 'list:people': peopleList as NavNode } : {}),
    ...(allList ? { 'list:all': allList as NavNode } : {}),
  };

  // System-level views (only show if visualiser is enabled and there are domains)
  const systemNode: Record<string, NavNode> = {};
  const visualiserEnabled = config?.visualiser?.enabled !== false;

  if (visualiserEnabled && domains.length > 0) {
    systemNode['list:system'] = {
      type: 'group',
      title: 'System',
      icon: 'Globe',
      pages: [
        {
          type: 'item',
          title: 'Domain Map',
          href: buildUrl('/visualiser/domain-integrations'),
        },
      ],
    };
  }

  const allGeneratedNodes = {
    ...rootDomainsNodes,
    ...domainNodes,
    ...serviceNodes,
    ...messageNodes,
    ...channelNodes,
    ...containerNodes,
    ...dataProductNodes,
    ...flowNodes,
    ...userNodes,
    ...teamNodes,
    ...designNodes,
    ...systemNode,
    ...allNodes,
  };

  // only filter if child is string
  const defaultPages = ['list:top-level-domains', 'list:all'];
  // Add system section if it exists
  if (systemNode['list:system']) {
    defaultPages.push('list:system');
  }
  const rootNavigationConfig = config?.navigation?.pages || defaultPages;

  const navigationConfig = {
    roots: rootNavigationConfig,
    nodes: allGeneratedNodes,
  };

  memoryCache = navigationConfig;

  return navigationConfig;
};
