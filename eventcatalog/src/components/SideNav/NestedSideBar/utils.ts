import { getContainers } from '@utils/collections/containers';
import { getDomains, getRootDomains, getUbiquitousLanguageWithSubdomains } from '@utils/collections/domains';
import { getServices, getServicesNotInAnyDomain, getSpecificationsForService } from '@utils/collections/services';
import { getMessages } from '@utils/messages';
import { getOwner } from '@utils/collections/owners';
import { buildUrl, buildUrlWithParams } from '@utils/url-builder';

/**
 * A child reference can be:
 * - A string key (resolved from nodes map)
 * - An inline node definition
 */
export type ChildRef = string | NavNode

/**
 * A navigation node (can be section or item)
 */
export type NavNode = {
    type: 'section' | 'item'
    title: string
    icon?: string           // Lucide icon name
    href?: string           // URL (for leaf items)
    children?: ChildRef[]   // Can mix keys and inline nodes
    visible?: boolean       // If false, hide this node (default: true)
    badge?: string          // Category badge shown in header (e.g., "Domain", "Service", "Message")
}

/**
 * The flat navigation data structure
 */
export type NavigationData = {
    roots: ChildRef[]                    // What to show at top level
    nodes: Record<string, NavNode>       // Flat map of all nodes by key
}

const uniqueBy = <T>(array: T[], key: keyof T): T[] => {
    return array.filter((item, index, self) =>
        index === self.findIndex((t) => t[key] === item[key])
    );
}

/**
 * Get the navigation data for the sidebar
 */
export const getNestedSideBarData = async (): Promise<NavigationData> => {

    const domains = await getDomains({ getAllVersions: false, includeServicesInSubdomains: false });
    const services = await getServices({ getAllVersions: false });
    const { events, commands, queries } = await getMessages({ getAllVersions: false });

    const containers = await getContainers({ getAllVersions: false });

    const messages = [...events, ...commands, ...queries];

    // Process all domains with their owners first (async)
    const domainsWithOwners = await Promise.all(
        domains.map(async (domain) => {
            const ownersInDomain = domain.data.owners || [];
            const owners = await Promise.all(
                ownersInDomain.map((owner) => getOwner(owner))
            );
            const filteredOwners = owners.filter((o) => o !== undefined) as Array<NonNullable<typeof owners[0]>>;
            
            // Log owners for now (as requested)
            if (filteredOwners.length > 0) {
                console.log(`Domain ${domain.data.name} owners:`, filteredOwners.map(o => o?.data.name || o?.data.id));
            }
            
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
            const filteredOwners = owners.filter((o) => o !== undefined) as Array<NonNullable<typeof owners[0]>>;
            return { service, owners: filteredOwners };
        })
    );

    // Messages with owners
    const messagesWithOwners = await Promise.all(
        messages.map(async (message) => {
            const ownersInMessage = message.data.owners || [];
            const owners = await Promise.all(ownersInMessage.map((owner) => getOwner(owner)));
            const filteredOwners = owners.filter((o) => o !== undefined) as Array<NonNullable<typeof owners[0]>>;
            return { message, owners: filteredOwners };
        })
    );

    const containerWithOwners = await Promise.all(
        containers.map(async (container) => {
            const ownersInContainer = container.data.owners || [];
            const owners = await Promise.all(ownersInContainer.map((owner) => getOwner(owner)));
            const filteredOwners = owners.filter((o) => o !== undefined) as Array<NonNullable<typeof owners[0]>>;
            return { container, owners: filteredOwners };
        })
    );

    const domainNodes = domainsWithOwners.reduce((acc, { domain, owners }) => {
        const servicesInDomain = domain.data.services || [];
        const hasServices = servicesInDomain.length > 0;

        const domains = domain.data.domains || [];
        const hasSubDomains = domains.length > 0;

        const entitiesInDomain = domain.data.entities || [];
        const hasEntities = entitiesInDomain.length > 0;

        const hasOwners = owners.length > 0;


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
                    ]
                },
                {
                    type: 'section',
                    title: 'Architecture & Design',
                    icon: 'Workflow',
                    children: [
                        {
                            type: 'item', title: 'Architecture Diagram', href: buildUrlWithParams('/architecture/docs/services', {
                                domainId: domain.data.id,
                                domainName: domain.data.name,
                            })
                        },
                        hasEntities && {
                            type: 'item', title: 'Entity Map', href: buildUrl(`/visualiser/domains/${domain.data.id}/${domain.data.version}/entity-map`)
                        },
                        { type: 'item', title: 'Interaction Map', href: buildUrl(`/visualiser/domains/${domain.data.id}/${domain.data.version}`) },
                    ].filter(Boolean) as ChildRef[]
                },
                hasEntities && {
                    type: 'section',
                    title: 'Entities',
                    icon: 'Box',
                    children: entitiesInDomain.map((entity) => ({ type: 'item', title: entity.data.name, href: buildUrl(`/docs/entities/${entity.data.id}/${entity.data.version}`) })),
                    visible: hasEntities,
                },
                hasSubDomains && {
                    type: 'section',
                    title: 'Subdomains',
                    icon: 'Boxes',
                    children: domains.map((domain) => `item:domain:${domain.data.id}:${domain.data.version}`),
                    visible: hasSubDomains,
                },
                hasServices && {
                    type: 'section',
                    title: 'Domain Services',
                    icon: 'Server',
                    children: servicesInDomain.map((service) => `item:service:${service.data.id}:${service.data.version}`),
                    visible: hasServices,
                },
                hasOwners && {
                    type: 'section',
                    title: 'Owners',
                    icon: 'Users',
                    children: owners.map((owner) => ({ type: 'item', title: owner?.data.name ?? '', href: buildUrl(`/docs/${owner?.collection}/${owner?.data.id}`) })),
                    visible: hasOwners,
                },

            ].filter(Boolean) as ChildRef[]
        };
        return acc;
    }, {} as Record<string, NavNode>);


    const serviceNodes = servicesWithOwners.reduce((acc, { service, owners }) => {
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
                    ]
                },
                {
                    type: 'section',
                    title: 'Architecture & Design',
                    icon: 'Workflow',
                    children: [
                        {
                            type: 'item', title: 'Architecture Diagram', href: buildUrlWithParams('/architecture/docs/messages', {
                                serviceName: service.data.name,
                                serviceId: service.data.id,
                            })
                        },
                        { type: 'item', title: 'Interaction Map', href: buildUrl(`/visualiser/services/${service.data.id}/${service.data.version}`) },
                        { type: 'item', title: 'Data Map', href: buildUrl(`/visualiser/services/${service.data.id}/${service.data.version}/data`) },
                    ]
                },
                hasSpecifications && {
                    type: 'section',
                    title: 'API & Contracts',
                    icon: 'FileCode',
                    children: [
                        ...openAPISpecifications.map((specification) => ({ type: 'item', title: `${specification.name} (OpenAPI)`, href: buildUrl(`/docs/services/${service.data.id}/${service.data.version}/spec/${specification.filenameWithoutExtension}`) })),
                        ...asyncAPISpecifications.map((specification) => ({ type: 'item', title: `${specification.name} (AsyncAPI)`, href: buildUrl(`/docs/services/${service.data.id}/${service.data.version}/asyncapi/${specification.filenameWithoutExtension}`) })),
                        ...graphQLSpecifications.map((specification) => ({ type: 'item', title: `${specification.name} (GraphQL)`, href: buildUrl(`/docs/services/${service.data.id}/${service.data.version}/graphql/${specification.filenameWithoutExtension}`) })),
                    ]
                },
                hasDataStores && {
                    type: 'section',
                    title: 'State and Persistence',
                    icon: 'Database',
                    children: dataStoresInService.map((dataStore) => `item:container:${dataStore.data.id}:${dataStore.data.version}`),
                },
                serviceEntities.length > 0 && {
                    type: 'section',
                    title: 'Entities',
                    icon: 'Box',
                    children: serviceEntities.map((entity) => `item:entity:${entity.data.id}:${entity.data.version}`),
                    visible: serviceEntities.length > 0,
                },
                sendsMessages.length > 0 && {
                    type: 'section',
                    title: 'Outbound Messages',
                    icon: 'Mail',
                    children: sendsMessages.map((message) => `item:message:${message.data.id}:${message.data.version}`),
                    visible: sendsMessages.length > 0,
                },
                receivesMessages.length > 0 && {
                    type: 'section',
                    title: 'Inbound Messages',
                    icon: 'Mail',
                    children: receivesMessages.map((receive) => `item:message:${receive.data.id}:${receive.data.version}`),
                    visible: receivesMessages.length > 0,
                },
                hasOwners && {
                    type: 'section',
                    title: 'Owners',
                    icon: 'Users',
                    children: owners.map((owner) => ({ type: 'item', title: owner?.data.name ?? '', href: buildUrl(`/docs/${owner?.collection}/${owner?.data.id}`) })),
                    visible: hasOwners,
                },
            ].filter(Boolean) as ChildRef[]
        };
        return acc;
    }, {} as Record<string, NavNode>);


    const messageNodes = messagesWithOwners.reduce((acc, { message, owners }) => {

        const producers = message.data.producers || [];
        const consumers = message.data.consumers || [];
        const collection = message.collection;

        const hasOwners = owners.length > 0;
        const hasProducers = producers.length > 0;
        const hasConsumers = consumers.length > 0;

        console.log('MESSAGE ID', message.data.id)
        console.log(JSON.stringify(producers, null, 2))
        console.log('MESSAGE DATA', JSON.stringify(message.data, null, 2))

        // Determine badge based on collection type
        const badgeMap: Record<string, string> = {
            'events': 'Event',
            'commands': 'Command',
            'queries': 'Query',
        };
        const badge = badgeMap[collection] || 'Message';

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
                        { type: 'item', title: 'Overview', href: buildUrl(`/docs/${collection}/${message.data.id}/${message.data.version}`) },
                    ]
                },
                {
                    type: 'section',
                    title: 'Architecture & Design',
                    icon: 'Workflow',
                    children: [
                        { type: 'item', title: 'Interaction Map', href: buildUrl(`/visualiser/${collection}/${message.data.id}/${message.data.version}`) },
                    ]
                },

                hasProducers && {
                    type: 'section',
                    title: 'Producers',
                    icon: 'Server',
                    children: producers.map((producer) => `item:service:${producer.data.id}:${producer.data.version}`),
                    visible: producers.length > 0,
                },
                hasConsumers && {
                    type: 'section',
                    title: 'Consumers',
                    icon: 'Server',
                    children: consumers.map((consumer) => `item:service:${consumer.data.id}:${consumer.data.version}`),
                    visible: consumers.length > 0,
                },
                hasOwners && {
                    type: 'section',
                    title: 'Owners',
                    icon: 'Users',
                    children: owners.map((owner) => ({ type: 'item', title: owner?.data.name ?? '', href: buildUrl(`/docs/${owner?.collection}/${owner?.data.id}`) })),
                    visible: hasOwners,
                },
            ].filter(Boolean) as ChildRef[],
        };
        return acc;
    }, {} as Record<string, NavNode>);

    const containerNodes = containerWithOwners.reduce((acc, { container, owners }) => {

        const servicesWritingToContainer = container.data.servicesThatWriteToContainer || [];
        const servicesReadingFromContainer = container.data.servicesThatReadFromContainer || [];
        const hasServicesWritingToContainer = servicesWritingToContainer.length > 0;
        const hasServicesReadingFromContainer = servicesReadingFromContainer.length > 0;

        const hasOwners = container.data.owners || [];


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
                        { type: 'item', title: 'Overview', href: buildUrl(`/docs/containers/${container.data.id}/${container.data.version}`) },
                    ]
                },
                {
                    type: 'section',
                    title: 'Architecture & Design',
                    icon: 'Workflow',
                    children: [
                        { type: 'item', title: 'Interaction Map', href: buildUrl(`/visualiser/containers/${container.data.id}/${container.data.version}`) },
                    ]
                },
                hasServicesWritingToContainer && {
                    type: 'section',
                    title: 'Services (Writes)',
                    icon: 'Server',
                    children: servicesWritingToContainer.map((service) => `item:service:${service.data.id}:${service.data.version}`),
                    visible: hasServicesWritingToContainer,
                },
                hasServicesReadingFromContainer && {
                    type: 'section',
                    title: 'Services (Reads)',
                    icon: 'Server',
                    children: servicesReadingFromContainer.map((service) => `item:service:${service.data.id}:${service.data.version}`),
                    visible: hasServicesReadingFromContainer,
                },
                hasOwners && {
                    type: 'section',
                    title: 'Owners',
                    icon: 'Users',
                    children: owners.map((owner) => ({ type: 'item', title: owner?.data.name ?? '', href: buildUrl(`/docs/${owner?.collection}/${owner?.data.id}`) })),
                    visible: hasOwners,
                },
            ].filter(Boolean) as ChildRef[]
        };
        return acc;
    }, {} as Record<string, NavNode>);


    // Get the root domains only.
    const rootDomains = await getRootDomains();
    const servicesNotInAnyDomain = await getServicesNotInAnyDomain();

    const rootDomainsNodes = {
        "section:domains": {
            type: 'section',
            title: 'Domains',
            icon: 'Boxes',
            children: rootDomains.map((domain) => `item:domain:${domain.data.id}:${domain.data.version}`),
        },
        "section:services": {
            type: 'section',
            title: 'Services',
            icon: 'Server',
            children: servicesNotInAnyDomain.map((service) => `item:service:${service.data.id}:${service.data.version}`),
        },
    }

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
        }
    }
}
