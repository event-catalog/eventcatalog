import { getContainers } from '@utils/collections/containers';
import { getDomains, getRootDomains, getUbiquitousLanguageWithSubdomains } from '@utils/collections/domains';
import { getServices, getServicesNotInAnyDomain, getSpecificationsForService } from '@utils/collections/services';
import { getMessages } from '@utils/collections/messages';
import { getOwner } from '@utils/collections/owners';
import { buildUrl, buildUrlWithParams } from '@utils/url-builder';
import { getSchemaFormatFromURL } from '@utils/collections/schemas';
import { getFlows } from '@utils/collections/flows';
import type { ResourceGroup } from '@eventcatalog/sdk';
import type { CollectionEntry } from 'astro:content';
import { getLatestVersionInCollectionById } from '@utils/collections/util';

/**
 * A child reference can be:
 * - A string key (resolved from nodes map)
 * - An inline node definition
 */
export type ChildRef = string | NavNode;

/**
 * A navigation node (can be section or item)
 */
export type NavNode = {
  type: 'section' | 'item';
  title: string;
  icon?: string; // Lucide icon name
  href?: string; // URL (for leaf items)
  children?: ChildRef[]; // Can mix keys and inline nodes
  visible?: boolean; // If false, hide this node (default: true)
  badge?: string; // Category badge shown in header (e.g., "Domain", "Service", "Message")
};

/**
 * The flat navigation data structure
 */
export type NavigationData = {
  roots: ChildRef[]; // What to show at top level
  nodes: Record<string, NavNode>; // Flat map of all nodes by key
};

const uniqueBy = <T>(array: T[], key: keyof T): T[] => {
  const seen = new Set();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

const buildResourceGroupSections = (
  resourceGroups: ResourceGroup[],
  context: {
    services: CollectionEntry<'services'>[];
    domains: CollectionEntry<'domains'>[];
    events: CollectionEntry<'events'>[];
    commands: CollectionEntry<'commands'>[];
    queries: CollectionEntry<'queries'>[];
    flows: CollectionEntry<'flows'>[];
    containers: CollectionEntry<'containers'>[];
  }
) => {
  return resourceGroups.map((resourceGroup) => buildResourceGroupSection(resourceGroup, context));
};

const buildResourceGroupSection = (
  resourceGroup: ResourceGroup,
  context: {
    services: CollectionEntry<'services'>[];
    domains: CollectionEntry<'domains'>[];
    events: CollectionEntry<'events'>[];
    commands: CollectionEntry<'commands'>[];
    queries: CollectionEntry<'queries'>[];
    flows: CollectionEntry<'flows'>[];
    containers: CollectionEntry<'containers'>[];
  }
) => {
  // Only render resource groups that have a type
  const resourcesWithTypes = resourceGroup.items.filter((item) => item.type !== undefined);

  if (resourcesWithTypes.length === 0) {
    return null;
  }

  // If no version is provided, we need to get the latest version
  const resourcesWithVersions = resourcesWithTypes.map((item) => {
    let collection: any[] = [];

    if (item.type === 'service') collection = context.services;
    else if (item.type === 'domain') collection = context.domains;
    else if (item.type === 'event') collection = context.events;
    else if (item.type === 'command') collection = context.commands;
    else if (item.type === 'query') collection = context.queries;
    else if (item.type === 'flow') collection = context.flows;
    else if (item.type === 'container') collection = context.containers;

    if (item.version === undefined || item.version === 'latest') {
      return { ...item, version: getLatestVersionInCollectionById(collection, item.id as string) };
    }
    return item;
  });

  return {
    type: 'section',
    title: resourceGroup.title,
    icon: 'Box',
    children: resourcesWithVersions.map((item) => {
      const type = ['event', 'command', 'query'].includes(item.type as string) ? 'message' : item.type;
      return `item:${type}:${item.id}:${item.version}`;
    }),
  };
};

/**
 * Get the navigation data for the sidebar
 */
export const getNestedSideBarData = async (): Promise<NavigationData> => {
  const [domains, services, { events, commands, queries }, containers, flows, rootDomains, servicesNotInAnyDomain] =
    await Promise.all([
      getDomains({ getAllVersions: false, includeServicesInSubdomains: false }),
      getServices({ getAllVersions: false }),
      getMessages({ getAllVersions: false }),
      getContainers({ getAllVersions: false }),
      getFlows({ getAllVersions: false }),
      getRootDomains(),
      getServicesNotInAnyDomain(),
    ]);

  const messages = [...events, ...commands, ...queries];

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
      acc[`item:flow:${flow.data.id}:${flow.data.version}`] = {
        type: 'item',
        title: flow.data.name,
        icon: 'Waypoint',
        badge: 'Flow',
        children: [
          {
            type: 'section',
            title: 'Quick Reference',
            icon: 'BookOpen',
            children: [{ type: 'item', title: 'Overview', href: buildUrl(`/docs/flows/${flow.data.id}/${flow.data.version}`) }],
          },
          {
            type: 'section',
            title: 'Architecture & Design',
            icon: 'Workflow',
            children: [
              {
                type: 'item',
                title: 'Flow Diagram',
                href: buildUrl(`/visualiser/flows/${flow.data.id}/${flow.data.version}`),
              },
            ].filter(Boolean) as ChildRef[],
          },
        ],
      };
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const domainNodes = domainsWithOwners.reduce(
    (acc, { domain, owners }) => {
      const servicesInDomain = domain.data.services || [];
      const hasServices = servicesInDomain.length > 0;

      const subDomains = domain.data.domains || [];
      const hasSubDomains = subDomains.length > 0;

      const entitiesInDomain = domain.data.entities || [];
      const hasEntities = entitiesInDomain.length > 0;

      const hasOwners = owners.length > 0;

      const domainFlows = domain.data.flows || [];
      const hasFlows = domainFlows.length > 0;

      const resourceGroups = domain.data.resourceGroups || [];
      const hasResourceGroups = resourceGroups.length > 0;

      acc[`item:domain:${domain.data.id}:${domain.data.version}`] = {
        type: 'item',
        title: domain.data.name,
        badge: 'Domain',
        children: [
          {
            type: 'section',
            title: 'Quick Reference',
            icon: 'BookOpen',
            children: [
              { type: 'item', title: 'Overview', href: buildUrl(`/docs/domains/${domain.data.id}/${domain.data.version}`) },
              { type: 'item', title: 'Ubiquitous Language', href: buildUrl(`/docs/domains/${domain.data.id}/language`) },
            ],
          },
          {
            type: 'section',
            title: 'Architecture & Design',
            icon: 'Workflow',
            children: [
              {
                type: 'item',
                title: 'Architecture Diagram',
                href: buildUrl(`/architecture/domains/${domain.data.id}/${domain.data.version}`),
              },
              hasEntities && {
                type: 'item',
                title: 'Entity Map',
                href: buildUrl(`/visualiser/domains/${domain.data.id}/${domain.data.version}/entity-map`),
              },
              {
                type: 'item',
                title: 'Interaction Map',
                href: buildUrl(`/visualiser/domains/${domain.data.id}/${domain.data.version}`),
              },
            ].filter(Boolean) as ChildRef[],
          },
          hasFlows && {
            type: 'section',
            title: 'Flows',
            icon: 'Waypoints',
            children: domainFlows.map((flow) => `item:flow:${(flow as any).data.id}:${(flow as any).data.version}`),
            visible: hasFlows,
          },
          hasEntities && {
            type: 'section',
            title: 'Entities',
            icon: 'Box',
            children: entitiesInDomain.map((entity) => ({
              type: 'item',
              title: (entity as any).data?.name || (entity as any).data.id,
              href: buildUrl(`/docs/entities/${(entity as any).data.id}/${(entity as any).data.version}`),
            })),
            visible: hasEntities,
          },
          hasSubDomains && {
            type: 'section',
            title: 'Subdomains',
            icon: 'Boxes',
            children: subDomains.map((domain) => `item:domain:${(domain as any).data.id}:${(domain as any).data.version}`),
            visible: hasSubDomains,
          },
          ...(hasResourceGroups
            ? buildResourceGroupSections(resourceGroups, {
                services,
                domains,
                events,
                commands,
                queries,
                flows,
                containers,
              })
            : []),
          hasServices && {
            type: 'section',
            title: 'Domain Services',
            icon: 'Server',
            children: servicesInDomain.map(
              (service) => `item:service:${(service as any).data.id}:${(service as any).data.version}`
            ),
            visible: hasServices,
          },
          hasOwners && {
            type: 'section',
            title: 'Owners',
            icon: 'Users',
            children: owners.map((owner) => ({
              type: 'item',
              title: owner?.data.name ?? '',
              href: buildUrl(`/docs/${owner?.collection}/${owner?.data.id}`),
            })),
            visible: hasOwners,
          },
        ].filter(Boolean) as ChildRef[],
      };
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const serviceNodes = servicesWithOwners.reduce(
    (acc, { service, owners }) => {
      const sendsMessages = service.data.sends || [];
      const receivesMessages = service.data.receives || [];
      const serviceEntities = service.data.entities || [];

      const specifications = getSpecificationsForService(service);
      const hasSpecifications = specifications.length > 0;
      const openAPISpecifications = specifications.filter((specification) => specification.type === 'openapi');
      const asyncAPISpecifications = specifications.filter((specification) => specification.type === 'asyncapi');
      const graphQLSpecifications = specifications.filter((specification) => specification.type === 'graphql');

      const dataStoresInService = uniqueBy([...(service.data.writesTo || []), ...(service.data.readsFrom || [])], 'id');

      const hasDataStores = dataStoresInService.length > 0;

      const hasOwners = owners.length > 0;

      acc[`item:service:${service.data.id}:${service.data.version}`] = {
        type: 'item',
        title: service.data.name,
        badge: 'Service',
        children: [
          {
            type: 'section',
            title: 'Quick Reference',
            icon: 'BookOpen',
            children: [
              { type: 'item', title: 'Overview', href: buildUrl(`/docs/services/${service.data.id}/${service.data.version}`) },
            ],
          },
          {
            type: 'section',
            title: 'Architecture & Design',
            icon: 'Workflow',
            children: [
              {
                type: 'item',
                title: 'Architecture Diagram',
                href: buildUrl(`/architecture/services/${service.data.id}/${service.data.version}`),
              },
              {
                type: 'item',
                title: 'Interaction Map',
                href: buildUrl(`/visualiser/services/${service.data.id}/${service.data.version}`),
              },
              {
                type: 'item',
                title: 'Data Map',
                href: buildUrl(`/visualiser/services/${service.data.id}/${service.data.version}/data`),
              },
            ],
          },
          hasSpecifications && {
            type: 'section',
            title: 'API & Contracts',
            icon: 'FileCode',
            children: [
              ...openAPISpecifications.map((specification) => ({
                type: 'item',
                title: `${specification.name} (OpenAPI)`,
                href: buildUrl(
                  `/docs/services/${service.data.id}/${service.data.version}/spec/${specification.filenameWithoutExtension}`
                ),
              })),
              ...asyncAPISpecifications.map((specification) => ({
                type: 'item',
                title: `${specification.name} (AsyncAPI)`,
                href: buildUrl(
                  `/docs/services/${service.data.id}/${service.data.version}/asyncapi/${specification.filenameWithoutExtension}`
                ),
              })),
              ...graphQLSpecifications.map((specification) => ({
                type: 'item',
                title: `${specification.name} (GraphQL)`,
                href: buildUrl(
                  `/docs/services/${service.data.id}/${service.data.version}/graphql/${specification.filenameWithoutExtension}`
                ),
              })),
            ],
          },
          hasDataStores && {
            type: 'section',
            title: 'State and Persistence',
            icon: 'Database',
            children: dataStoresInService.map(
              (dataStore) => `item:container:${(dataStore as any).data.id}:${(dataStore as any).data.version}`
            ),
          },
          serviceEntities.length > 0 && {
            type: 'section',
            title: 'Entities',
            icon: 'Box',
            children: serviceEntities.map((entity) => `item:entity:${(entity as any).data.id}:${(entity as any).data.version}`),
            visible: serviceEntities.length > 0,
          },
          sendsMessages.length > 0 && {
            type: 'section',
            title: 'Outbound Messages',
            icon: 'Mail',
            children: sendsMessages.map((message) => `item:message:${(message as any).data.id}:${(message as any).data.version}`),
            visible: sendsMessages.length > 0,
          },
          receivesMessages.length > 0 && {
            type: 'section',
            title: 'Inbound Messages',
            icon: 'Mail',
            children: receivesMessages.map(
              (receive) => `item:message:${(receive as any).data.id}:${(receive as any).data.version}`
            ),
            visible: receivesMessages.length > 0,
          },
          hasOwners && {
            type: 'section',
            title: 'Owners',
            icon: 'Users',
            children: owners.map((owner) => ({
              type: 'item',
              title: owner?.data.name ?? '',
              href: buildUrl(`/docs/${owner?.collection}/${owner?.data.id}`),
            })),
            visible: hasOwners,
          },
        ].filter(Boolean) as ChildRef[],
      };
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const messageNodes = messagesWithOwners.reduce(
    (acc, { message, owners }) => {
      const producers = message.data.producers || [];
      const consumers = message.data.consumers || [];
      const collection = message.collection;

      const hasOwners = owners.length > 0;
      const hasProducers = producers.length > 0;
      const hasConsumers = consumers.length > 0;

      // Determine badge based on collection type
      const badgeMap: Record<string, string> = {
        events: 'Event',
        commands: 'Command',
        queries: 'Query',
      };
      const badge = badgeMap[collection] || 'Message';

      const hasSchema = message.data.schemaPath !== undefined;

      acc[`item:message:${message.data.id}:${message.data.version}`] = {
        type: 'item',
        title: message.data.name,
        badge,
        children: [
          {
            type: 'section',
            title: 'Quick Reference',
            icon: 'BookOpen',
            children: [
              {
                type: 'item',
                title: 'Overview',
                href: buildUrl(`/docs/${collection}/${message.data.id}/${message.data.version}`),
              },
            ],
          },
          {
            type: 'section',
            title: 'Architecture & Design',
            icon: 'Workflow',
            children: [
              {
                type: 'item',
                title: 'Interaction Map',
                href: buildUrl(`/visualiser/${collection}/${message.data.id}/${message.data.version}`),
              },
            ],
          },
          hasSchema && {
            type: 'section',
            title: `API & Contracts`,
            icon: 'FileJson',
            children: [
              {
                type: 'item',
                title: `Schema (${getSchemaFormatFromURL(message.data.schemaPath!).toUpperCase()})`,
                href: buildUrl(`/schemas/${collection}/${message.data.id}/${message.data.version}`),
              },
            ],
          },
          hasProducers && {
            type: 'section',
            title: 'Producers',
            icon: 'Server',
            children: producers.map((producer) => `item:service:${(producer as any).data.id}:${(producer as any).data.version}`),
            visible: producers.length > 0,
          },
          hasConsumers && {
            type: 'section',
            title: 'Consumers',
            icon: 'Server',
            children: consumers.map((consumer) => `item:service:${(consumer as any).data.id}:${(consumer as any).data.version}`),
            visible: consumers.length > 0,
          },
          hasOwners && {
            type: 'section',
            title: 'Owners',
            icon: 'Users',
            children: owners.map((owner) => ({
              type: 'item',
              title: owner?.data.name ?? '',
              href: buildUrl(`/docs/${owner?.collection}/${owner?.data.id}`),
            })),
            visible: hasOwners,
          },
        ].filter(Boolean) as ChildRef[],
      };
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const containerNodes = containerWithOwners.reduce(
    (acc, { container, owners }) => {
      const servicesWritingToContainer = container.data.servicesThatWriteToContainer || [];
      const servicesReadingFromContainer = container.data.servicesThatReadFromContainer || [];
      const hasServicesWritingToContainer = servicesWritingToContainer.length > 0;
      const hasServicesReadingFromContainer = servicesReadingFromContainer.length > 0;

      const hasOwners = owners.length > 0;

      acc[`item:container:${container.data.id}:${container.data.version}`] = {
        type: 'item',
        title: container.data.name,
        badge: 'Container',
        children: [
          {
            type: 'section',
            title: 'Quick Reference',
            icon: 'BookOpen',
            children: [
              {
                type: 'item',
                title: 'Overview',
                href: buildUrl(`/docs/containers/${container.data.id}/${container.data.version}`),
              },
            ],
          },
          {
            type: 'section',
            title: 'Architecture & Design',
            icon: 'Workflow',
            children: [
              {
                type: 'item',
                title: 'Interaction Map',
                href: buildUrl(`/visualiser/containers/${container.data.id}/${container.data.version}`),
              },
            ],
          },
          hasServicesWritingToContainer && {
            type: 'section',
            title: 'Services (Writes)',
            icon: 'Server',
            children: servicesWritingToContainer.map(
              (service) => `item:service:${(service as any).data.id}:${(service as any).data.version}`
            ),
            visible: hasServicesWritingToContainer,
          },
          hasServicesReadingFromContainer && {
            type: 'section',
            title: 'Services (Reads)',
            icon: 'Server',
            children: servicesReadingFromContainer.map(
              (service) => `item:service:${(service as any).data.id}:${(service as any).data.version}`
            ),
            visible: hasServicesReadingFromContainer,
          },
          hasOwners && {
            type: 'section',
            title: 'Owners',
            icon: 'Users',
            children: owners.map((owner) => ({
              type: 'item',
              title: owner?.data.name ?? '',
              href: buildUrl(`/docs/${owner?.collection}/${owner?.data.id}`),
            })),
            visible: hasOwners,
          },
        ].filter(Boolean) as ChildRef[],
      };
      return acc;
    },
    {} as Record<string, NavNode>
  );

  const rootDomainsNodes: Record<string, NavNode> = {
    'section:domains': {
      type: 'section',
      title: 'Domains',
      icon: 'Boxes',
      children: rootDomains.map((domain) => `item:domain:${domain.data.id}:${domain.data.version}`),
    },
    'section:services': {
      type: 'section',
      title: 'Services',
      icon: 'Server',
      children: servicesNotInAnyDomain.map((service) => `item:service:${service.data.id}:${service.data.version}`),
    },
  };

  return {
    roots: [
      'section:domains',
      'section:services',
      // 'section:services',
      // Can also have inline items at root
      // { type: 'item', title: 'Settings', icon: 'Settings', href: '/settings' },
    ],
    nodes: {
      ...rootDomainsNodes,
      ...domainNodes,
      ...serviceNodes,
      ...messageNodes,
      ...containerNodes,
      ...flowNodes,
    },
  };
};
