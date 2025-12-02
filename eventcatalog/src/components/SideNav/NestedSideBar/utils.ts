import { getDomains, getRootDomains, getUbiquitousLanguageWithSubdomains } from '@utils/collections/domains';
import { getServices, getServicesNotInAnyDomain, getSpecificationsForService } from '@utils/collections/services';
import { getMessages } from '@utils/messages';
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

/**
 * Get the navigation data for the sidebar
 */
export const getNestedSideBarData = async (): Promise<NavigationData> => {

    const domains = await getDomains({ getAllVersions: false, includeServicesInSubdomains: false });
    const services = await getServices({ getAllVersions: false });
    const { events, commands, queries } = await getMessages({ getAllVersions: false });
    const messages = [...events, ...commands, ...queries];

    const domainNodes = domains.reduce((acc, domain) => {
        const servicesInDomain = domain.data.services || [];
        const hasServices = servicesInDomain.length > 0;

        const domains = domain.data.domains || [];
        const hasSubDomains = domains.length > 0;

        const entitiesInDomain = domain.data.entities || [];
        const hasEntities = entitiesInDomain.length > 0;

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
                    title: 'Architecture Diagrams',
                    icon: 'Workflow',
                    children: [
                        {
                            type: 'item', title: 'Architecture', href: buildUrlWithParams('/architecture/docs/services', {
                                domainId: domain.data.id,
                                domainName: domain.data.name,
                            })
                        },
                        { type: 'item', title: 'Visualizer', href: buildUrl(`/visualiser/domains/${domain.data.id}/${domain.data.version}`) },
                    ]
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
                    title: 'Services in Domain',
                    icon: 'Server',
                    children: servicesInDomain.map((service) => `item:service:${service.data.id}:${service.data.version}`),
                    visible: hasServices,
                },

            ].filter(Boolean) as ChildRef[]
        };
        return acc;
    }, {} as Record<string, NavNode>);


    const serviceNodes = services.reduce((acc, service) => {
        const sendsMessages = service.data.sends || [];
        const receivesMessages = service.data.receives || [];
        const serviceEntities = service.data.entities || [];

        const specifications = getSpecificationsForService(service);
        const hasSpecifications = specifications.length > 0;
        const openAPISpecifications = specifications.filter((specification) => specification.type === 'openapi');
        const asyncAPISpecifications = specifications.filter((specification) => specification.type === 'asyncapi');
        const graphQLSpecifications = specifications.filter((specification) => specification.type === 'graphql');

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
                    title: 'Architecture Diagrams',
                    icon: 'Workflow',
                    children: [
                        {
                            type: 'item', title: 'Architecture', href: buildUrlWithParams('/architecture/docs/messages', {
                                serviceName: service.data.name,
                                serviceId: service.data.id,
                            })
                        },
                        { type: 'item', title: 'Visualizer', href: buildUrl(`/visualiser/services/${service.data.id}/${service.data.version}`) },
                    ]
                },
                hasSpecifications && {
                    type: 'section',
                    title: 'Specifications',
                    icon: 'FileCode',
                    children: [
                        ...openAPISpecifications.map((specification) => ({ type: 'item', title: `${specification.name} (OpenAPI)`, href: buildUrl(`/docs/services/${service.data.id}/${service.data.version}/spec/${specification.filenameWithoutExtension}`) })),
                        ...asyncAPISpecifications.map((specification) => ({ type: 'item', title: `${specification.name} (AsyncAPI)`, href: buildUrl(`/docs/services/${service.data.id}/${service.data.version}/asyncapi/${specification.filenameWithoutExtension}`) })),
                        ...graphQLSpecifications.map((specification) => ({ type: 'item', title: `${specification.name} (GraphQL)`, href: buildUrl(`/docs/services/${service.data.id}/${service.data.version}/graphql/${specification.filenameWithoutExtension}`) })),
                    ]
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
                    title: 'Sends Messages',
                    icon: 'Mail',
                    children: sendsMessages.map((message) => `item:message:${message.data.id}:${message.data.version}`),
                    visible: sendsMessages.length > 0,
                },  
                receivesMessages.length > 0 && {
                    type: 'section',
                    title: 'Receives Messages',
                    icon: 'Mail',
                    children: receivesMessages.map((receive) => `item:message:${receive.data.id}:${receive.data.version}`),
                    visible: receivesMessages.length > 0,
                }
            ].filter(Boolean) as ChildRef[]
        };
        return acc;
    }, {} as Record<string, NavNode>);


    const messageNodes = messages.reduce((acc, message) => {

        const producers = message.data.producers || [];
        const consumers = message.data.consumers || [];
        const collection = message.collection;

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
                        { type: 'item', title: 'Documentation', href: buildUrl(`/docs/${collection}/${message.data.id}/${message.data.version}`) },
                    ]
                },
                {
                    type: 'section',
                    title: 'Architecture Diagrams',
                    icon: 'Workflow',
                    children: [
                        { type: 'item', title: 'Architecture', href: buildUrl(`/docs/architecture`) },
                        { type: 'item', title: 'Visualizer', href: buildUrl(`/visualiser/messages/${message.data.id}/${message.data.version}`) },
                    ]
                },

                {
                    type: 'section',
                    title: 'Producers',
                    icon: 'Server',
                    children: producers.map((producer) => `item:service:${producer.id}:${producer.version}`),
                    visible: producers.length > 0,
                },
                {
                    type: 'section',
                    title: 'Consumers',
                    icon: 'Server',
                    children: consumers.map((consumer) => `item:service:${consumer.id}:${consumer.version}`),
                    visible: consumers.length > 0,
                }
            ],
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
        }
    }
}
