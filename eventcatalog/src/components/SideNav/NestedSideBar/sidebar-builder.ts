import { getContainers } from '@utils/collections/containers';
import { getDomains } from '@utils/collections/domains';
import { getServices } from '@utils/collections/services';
import { getMessages } from '@utils/collections/messages';
import { getOwner } from '@utils/collections/owners';
import { getFlows } from '@utils/collections/flows';
import { getUsers } from '@utils/collections/users';
import { getTeams } from '@utils/collections/teams';
import { buildUrl } from '@utils/url-builder';
import type { NavigationData, NavNode, ChildRef } from './builders/shared';
import { buildDomainNode } from './builders/domain';
import { buildServiceNode } from './builders/service';
import { buildMessageNode } from './builders/message';
import { buildContainerNode } from './builders/container';
import { buildFlowNode } from './builders/flow';
import config from '@config';

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

  const [domains, services, { events, commands, queries }, containers, flows, users, teams] =
    await Promise.all([
      getDomains({ getAllVersions: false, includeServicesInSubdomains: false }),
      getServices({ getAllVersions: false }),
      getMessages({ getAllVersions: false }),
      getContainers({ getAllVersions: false }),
      getFlows({ getAllVersions: false }),
      getUsers(),
      getTeams(),
    ]);

  // Calculate derived lists to avoid extra fetches
  const allSubDomainIds = new Set(domains.flatMap((d) => (d.data.domains || []).map((sd: any) => sd.data.id)));
  const rootDomains = domains.filter((d) => !allSubDomainIds.has(d.data.id));

  const allServiceIdsInDomains = new Set(domains.flatMap((d) => (d.data.services || []).map((s: any) => s.data.id)));
  const servicesNotInAnyDomain = services.filter((s) => !allServiceIdsInDomains.has(s.data.id));

  const flowsInDomains = new Set(domains.flatMap((d) => (d.data.flows || []).map((f: any) => f.id)));
  const flowsInServices = new Set(services.flatMap((s) => (s.data.flows || []).map((f: any) => f.id)));
  const flowsNotInAnyResource = flows.filter(
    (f) => !flowsInDomains.has(f.data.id) && !flowsInServices.has(f.data.id)
  );

  const messages = [...events, ...commands, ...queries];

  const context = {
    services,
    domains,
    events,
    commands,
    queries,
    flows,
    containers,
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
      acc[`item:flow:${flow.data.id}:${flow.data.version}`] = buildFlowNode(flow);
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const domainNodes = domainsWithOwners.reduce(
    (acc, { domain, owners }) => {
      acc[`item:domain:${domain.data.id}:${domain.data.version}`] = buildDomainNode(domain, owners, context);
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const serviceNodes = servicesWithOwners.reduce(
    (acc, { service, owners }) => {
      acc[`item:service:${service.data.id}:${service.data.version}`] = buildServiceNode(service, owners, context);
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const messageNodes = messagesWithOwners.reduce(
    (acc, { message, owners }) => {
      acc[`item:message:${message.data.id}:${message.data.version}`] = buildMessageNode(message, owners);
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const containerNodes = containerWithOwners.reduce(
    (acc, { container, owners }) => {
      acc[`item:container:${container.data.id}:${container.data.version}`] = buildContainerNode(container, owners);
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const userNodes = users.reduce(
    (acc, user) => {
      acc[`item:user:${user.data.id}`] = {
        type: 'item',
        title: user.data.name,
        href: buildUrl(`/docs/users/${user.data.id}`),
      };
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const teamNodes = teams.reduce(
    (acc, team) => {
      acc[`item:team:${team.data.id}`] = {
        type: 'item',
        title: team.data.name,
        href: buildUrl(`/docs/teams/${team.data.id}`),
      };
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const rootDomainsNodes: Record<string, NavNode> = {
    'section:root-domains': {
      type: 'section',
      title: 'Domains',
      icon: 'Boxes',
      children: rootDomains.map((domain) => `item:domain:${domain.data.id}:${domain.data.version}`),
    },
    'section:root-services': {
      type: 'section',
      title: 'Services',
      icon: 'Server',
      children: servicesNotInAnyDomain.map((service) => `item:service:${service.data.id}:${service.data.version}`),
    },
  };

  const rootFlowsNodes: Record<string, NavNode> = {
    'section:root-flows': {
      type: 'section',
      title: 'Flows',
      icon: 'Waypoints',
      children: flowsNotInAnyResource.map((flow) => `item:flow:${flow.data.id}:${flow.data.version}`),
    },
  };

  const browseNodes: Record<string, NavNode> = {
    'section:browse': {
      type: 'section',
      title: 'Browse',
      icon: 'Telescope',
      children: [
        'item:browse:domains',
        'item:browse:services',
        'item:browse:messages',
        'item:browse:flows',
        'item:browse:containers',
        'item:browse:people',
      ],
    },
    'item:browse:domains': {
      type: 'item',
      title: 'Domains',
      icon: 'Boxes',
      children: domains.map((domain) => `item:domain:${domain.data.id}:${domain.data.version}`),
    },
    'item:browse:services': {
      type: 'item',
      title: 'Services',
      icon: 'Server',
      children: services.map((service) => `item:service:${service.data.id}:${service.data.version}`),
    },
    'item:browse:messages': {
      type: 'item',
      title: 'Messages',
      icon: 'Mail',
      children: ['section:browse:events', 'section:browse:commands', 'section:browse:queries'],
    },
    'section:browse:events': {
      type: 'section',
      title: 'Events',
      icon: 'Zap',
      children: events.map((event) => `item:message:${event.data.id}:${event.data.version}`),
    },
    'section:browse:commands': {
      type: 'section',
      title: 'Commands',
      icon: 'Terminal',
      children: commands.map((command) => `item:message:${command.data.id}:${command.data.version}`),
    },
    'section:browse:queries': {
      type: 'section',
      title: 'Queries',
      icon: 'Search',
      children: queries.map((query) => `item:message:${query.data.id}:${query.data.version}`),
    },
    'item:browse:flows': {
      type: 'item',
      title: 'Flows',
      icon: 'Waypoints',
      children: flows.map((flow) => `item:flow:${flow.data.id}:${flow.data.version}`),
    },
    'item:browse:containers': {
      type: 'item',
      title: 'Data Stores',
      icon: 'Database',
      children: containers.map((container) => `item:container:${container.data.id}:${container.data.version}`),
    },
    'item:browse:people': {
      type: 'item',
      title: 'Teams & Users',
      icon: 'Users',
      children: ['section:browse:teams', 'section:browse:users'],
    },
    'section:browse:teams': {
      type: 'section',
      title: 'Teams',
      icon: 'Users',
      children: teams.map((team) => `item:team:${team.data.id}`),
    },
    'section:browse:users': {
      type: 'section',
      title: 'Users',
      icon: 'User',
      children: users.map((user) => `item:user:${user.data.id}`),
    },
  };

  const defaultRootNavigationConfig = [
    'section:root-domains',
    'section:root-services',
    'section:root-flows',
    'section:browse',
  ]

  const rootNavigationConfig = config?.docs?.sidebar?.navigation || defaultRootNavigationConfig;

  const navigationConfig = {
    roots: rootNavigationConfig,
    nodes: {
      ...rootDomainsNodes,
      ...domainNodes,
      ...serviceNodes,
      ...messageNodes,
      ...containerNodes,
      ...rootFlowsNodes,
      ...flowNodes,
      ...userNodes,
      ...teamNodes,
      ...browseNodes,
    },
  };

  memoryCache = navigationConfig;

  return navigationConfig;
};
