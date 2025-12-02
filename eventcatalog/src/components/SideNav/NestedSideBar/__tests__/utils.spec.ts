import { describe, it, expect, vi } from 'vitest';
import { getNestedSideBarData, type ChildRef, type NavigationData, type NavNode } from '../utils';
import type { ContentCollectionKey } from 'astro:content';
import { mockDomains, mockServices, mockEvents, mockCommands } from './mocks';
import utils from '@eventcatalog/sdk';
import path from 'path';
import fs from 'fs';
import type { Assertion, AsymmetricMatchersContaining } from 'vitest';

const CATALOG_FOLDER = path.join(__dirname, 'catalog');

declare global {
    interface Window {
        __EC_TRAILING_SLASH__: boolean;
    }
    namespace NodeJS {
        interface ImportMeta {
            env: {
                BASE_URL: string;
            };
        }
    }
}

declare module 'vitest' {
    interface Assertion<T = any> {
        toHaveNavigationLink(expected: { type: 'item' | 'section'; title: string; href: string }): void;
    }
    interface AsymmetricMatchersContaining {
        toHaveNavigationLink(expected: { type: 'item' | 'section'; title: string; href: string }): void;
    }
}

const toAstroCollection = (item: any, collection: string) => {
    return {
        id: item.id,
        collection: collection,
        data: item,
    };
};

const getNavigationConfigurationByKey = (key: string, data: NavigationData): NavNode => {
    return data.nodes[key] as NavNode;
}


// mock out astro collection for domains
vi.mock('astro:content', async (importOriginal) => {
    return {
        ...(await importOriginal<typeof import('astro:content')>()),
        getCollection: async (key: ContentCollectionKey) => {
            switch (key) {
                case 'domains':
                    const { getDomains } = utils(CATALOG_FOLDER);
                    const domains = await getDomains() ?? [];
                    return Promise.resolve(domains.map(domain => toAstroCollection(domain, 'domains')));
                case 'services':
                    const { getServices } = utils(CATALOG_FOLDER);
                    const services = await getServices() ?? [];
                    return Promise.resolve(services.map(service => toAstroCollection(service, 'services')));
                case 'entities':
                    const { getEntities } = utils(CATALOG_FOLDER);
                    const entities = await getEntities() ?? [];
                    return Promise.resolve(entities.map(entity => toAstroCollection(entity, 'entities')));
                case 'events':
                    const { getEvents } = utils(CATALOG_FOLDER);
                    const events = await getEvents() ?? [];
                    return Promise.resolve(events.map(event => toAstroCollection(event, 'events')));
                case 'commands':
                    const { getCommands } = utils(CATALOG_FOLDER);
                    const commands = await getCommands() ?? [];
                    return Promise.resolve(commands.map(command => toAstroCollection(command, 'commands')));
                case 'queries':
                    const { getQueries } = utils(CATALOG_FOLDER);
                    const queries = await getQueries() ?? [];
                    return Promise.resolve(queries.map(query => toAstroCollection(query, 'queries')));
                default:
                    return Promise.resolve([]);
            }
        },
    };
});


const buildDomainQuickReferenceSection = (resource: any) => {
    return {
        "type": "section",
        "title": "Quick Reference",
        "icon": "BookOpen",
        "children": [
            {
                "type": "item",
                "title": "Overview",
                "href": `/docs/${resource.collection}/${resource.data.id}/${resource.data.version}`
            },
            {
                "type": "item",
                "title": "Ubiquitous Language",
                "href": `/docs/domains/${resource.data.id}/language`
            }
        ]
    }
}

const getChildNodeByTitle = (title: string, children: any[]) => {
    return children.find((child: any) => child.title === title);
}

expect.extend({
    toHaveNavigationLink(received, expected) {
        const { type, title, href } = expected;
        const { children } = received;
        const allChildren = children?.flatMap((child: any) => child.children ?? []);
        const hasMatch = allChildren.some((child: any) => child.type === type && child.title === title && child.href === href);
        return {
            message: () => `expected ${received.title} to have a navigation link to ${expected.title}`,
            pass: hasMatch,
        }
    }
});


describe('getNestedSideBarData', () => {

    beforeEach(() => {
        // @ts-ignore
        global.__EC_TRAILING_SLASH__ = false;
        fs.rmSync(CATALOG_FOLDER, { recursive: true, force: true });
        fs.mkdirSync(CATALOG_FOLDER, { recursive: true });
    });

    describe('root navigation items', () => {

        it('renders a list of domains (that are not in a subdomain) as a root navigation item', async () => {
            const { writeDomain, getDomain } = utils(CATALOG_FOLDER);

            await writeDomain({
                id: 'Shipping',
                name: 'Shipping',
                version: '0.0.1',
                markdown: 'Shipping',
            })

            const navigationData = await getNestedSideBarData();

            const domain = toAstroCollection(await getDomain('Shipping', '0.0.1'), 'domains')
            const domainNode = getNavigationConfigurationByKey('item:domain:Shipping:0.0.1', navigationData);

            const subdomainSection = getChildNodeByTitle('Subdomains', domainNode.children ?? [])

            expect(navigationData.roots).toContain('section:domains');
            expect(subdomainSection).toBeUndefined();

            expect(domainNode).toEqual(expect.objectContaining({
                type: 'item',
                title: 'Shipping',
                badge: 'Domain',
                children: expect.arrayContaining([
                    buildDomainQuickReferenceSection(domain)]
                )
            }))
        });

        it('does not render any subdomain as a root navigation item', async () => {
            const { writeDomain } = utils(CATALOG_FOLDER);

            // Core domain
            await writeDomain({
                id: 'Shipping',
                name: 'Shipping',
                version: '0.0.1',
                markdown: 'Shipping',
                domains: [{ id: 'Checkout', version: '0.0.1' }],
            })

            // Subdomain
            await writeDomain({
                id: 'Checkout',
                name: 'Checkout',
                version: '0.0.1',
                markdown: 'Checkout',
            })

            const navigationData = await getNestedSideBarData();

            const rootDomainsToRender = getNavigationConfigurationByKey('section:domains', navigationData);
            expect(rootDomainsToRender.children).toEqual(['item:domain:Shipping:0.0.1']);

        });

        it('renders a list of services that are not in any domain as a root navigation item', async () => {
            const { writeService } = utils(CATALOG_FOLDER);
            await writeService({
                id: 'ShippingService',
                name: 'ShippingService',
                version: '0.0.1',
                markdown: 'ShippingService',
            })

            const navigationData = await getNestedSideBarData();
            const servicesNode = getNavigationConfigurationByKey('section:services', navigationData);
            expect(servicesNode.children).toEqual(['item:service:ShippingService:0.0.1']);

        });

    });

    describe('when domains are documented in the catalog', () => {

        describe('domain navigation item', () => {

            describe('quick reference section', () => {

                it('the overview link ubiquitous language link are always listed in the navigation item', async () => {

                    const { writeDomain } = utils(CATALOG_FOLDER);

                    await writeDomain({
                        id: 'Shipping',
                        name: 'Shipping',
                        version: '0.0.1',
                        markdown: 'Shipping',
                    })

                    const navigationData = await getNestedSideBarData();
                    const domainNode = getNavigationConfigurationByKey('item:domain:Shipping:0.0.1', navigationData);

                    expect(domainNode).toHaveNavigationLink({ type: 'item', title: 'Overview', href: '/docs/domains/Shipping/0.0.1' })
                    expect(domainNode).toHaveNavigationLink({ type: 'item', title: 'Ubiquitous Language', href: '/docs/domains/Shipping/language' })

                });
            });

            describe('architecture diagrams section', () => {
                it('the architecture and visualizer links are always listed in the navigation item', async () => {
                    const { writeDomain } = utils(CATALOG_FOLDER);
                    await writeDomain({
                        id: 'Shipping',
                        name: 'Shipping',
                        version: '0.0.1',
                        markdown: 'Shipping',
                    })

                    const navigationData = await getNestedSideBarData();
                    const domainNode = getNavigationConfigurationByKey('item:domain:Shipping:0.0.1', navigationData);
                    expect(domainNode).toHaveNavigationLink({ type: 'item', title: 'Visualizer', href: '/visualiser/domains/Shipping/0.0.1' })

                    expect(domainNode).toHaveNavigationLink({ type: 'item', title: 'Architecture', href: '/architecture/docs/services?domainId=Shipping&domainName=Shipping' })
                });
            });

            describe('entities section', () => {

                it('if a domain has entities, the entities section is listed in the navigation item', async () => {
                    const { writeDomain, writeEntity } = utils(CATALOG_FOLDER);
                    await writeDomain({
                        id: 'Shipping',
                        name: 'Shipping',
                        version: '0.0.1',
                        markdown: 'Shipping',
                        entities: [{ id: 'Order', version: '0.0.1' }],
                    })

                    await writeEntity({
                        id: 'Order',
                        name: 'Order',
                        version: '0.0.1',
                        markdown: 'Order',
                    })

                    const navigationData = await getNestedSideBarData();
                    const domainNode = getNavigationConfigurationByKey('item:domain:Shipping:0.0.1', navigationData);
                    console.log(JSON.stringify(domainNode, null, 2));
                    const entitiesSection = getChildNodeByTitle('Entities', domainNode.children ?? [])
                    expect(entitiesSection.children).toEqual([{ type: 'item', title: 'Order', href: '/docs/entities/Order/0.0.1' }]);
                });

                it('is not listed if the domain does not have any entities', async () => {
                    const { writeDomain } = utils(CATALOG_FOLDER);
                    await writeDomain({
                        id: 'Shipping',
                        name: 'Shipping',
                        version: '0.0.1',
                        markdown: 'Shipping',
                    })
                    const navigationData = await getNestedSideBarData();
                    const domainNode = getNavigationConfigurationByKey('item:domain:Shipping:0.0.1', navigationData);
                    const entitiesSection = getChildNodeByTitle('Entities', domainNode.children ?? [])
                    expect(entitiesSection).toBeUndefined();
                });

            });

            describe('subdomains section', () => {

                it('is not listed if the domain does not have any subdomains', async () => {
                    const { writeDomain } = utils(CATALOG_FOLDER);
                    await writeDomain({
                        id: 'Shipping',
                        name: 'Shipping',
                        version: '0.0.1',
                        markdown: 'Shipping',
                    })

                    const navigationData = await getNestedSideBarData();
                    const domainNode = getNavigationConfigurationByKey('item:domain:Shipping:0.0.1', navigationData);
                    expect(domainNode.children).not.toContain('section:subdomains');
                });

                it('lists subdomains if the domain has subdomains', async () => {
                    const { writeDomain } = utils(CATALOG_FOLDER);
                    await writeDomain({
                        id: 'Shipping',
                        name: 'Shipping',
                        version: '0.0.1',
                        markdown: 'Shipping',
                        domains: [{ id: 'Checkout', version: '0.0.1' }],
                    })

                    await writeDomain({
                        id: 'Checkout',
                        name: 'Checkout',
                        version: '0.0.1',
                        markdown: 'Checkout',
                        domains: [{ id: 'Shipping', version: '0.0.1' }],
                    })

                    const navigationData = await getNestedSideBarData();
                    const domainNode = getNavigationConfigurationByKey('item:domain:Shipping:0.0.1', navigationData);
                    const subdomainSection = getChildNodeByTitle('Subdomains', domainNode.children ?? [])
                    expect(subdomainSection.children).toEqual(['item:domain:Checkout:0.0.1']);
                });

            });

            describe('services section', () => {

                it('does not render any services for the domain if the domain does not have any services', async () => {
                    const { writeDomain } = utils(CATALOG_FOLDER);
                    await writeDomain({
                        id: 'Shipping',
                        name: 'Shipping',
                        version: '0.0.1',
                        markdown: 'Shipping',
                    })

                    const navigationData = await getNestedSideBarData();
                    const domainNode = getNavigationConfigurationByKey('item:domain:Shipping:0.0.1', navigationData);
                    const servicesInDomainSection = getChildNodeByTitle('Services in Domain', domainNode.children ?? [])
                    expect(servicesInDomainSection).toBeUndefined();

                });


                it('renders services for the domain if the domain has services', async () => {
                    const { writeDomain, writeService } = utils(CATALOG_FOLDER);

                    await writeDomain({
                        id: 'Shipping',
                        name: 'Shipping',
                        version: '0.0.1',
                        markdown: 'Shipping',
                        services: [{ id: 'ShippingService', version: '0.0.1' }],
                        domains: [{ id: 'Checkout', version: '0.0.1' }],
                    })

                    await writeService({
                        id: 'ShippingService',
                        name: 'ShippingService',
                        version: '0.0.1',
                        markdown: 'LocationService',
                    })

                    // We create a subdomain that also has services, that should not be listed in the `Services in Domain` section
                    await writeDomain({
                        id: 'Checkout',
                        name: 'Checkout',
                        version: '0.0.1',
                        markdown: 'Checkout',
                        services: [{ id: 'CheckoutService', version: '0.0.1' }],
                    })

                    await writeService({
                        id: 'CheckoutService',
                        name: 'CheckoutService',
                        version: '0.0.1',
                        markdown: 'CheckoutService',
                    })

                    const navigationData = await getNestedSideBarData();
                    const domainNode = getNavigationConfigurationByKey('item:domain:Shipping:0.0.1', navigationData);
                    const servicesInDomainSection = getChildNodeByTitle('Services in Domain', domainNode.children ?? [])

                    expect(servicesInDomainSection.children).toEqual(['item:service:ShippingService:0.0.1']);

                });
            })

        });

        describe('service navigation items', () => {

            describe('quick reference section', () => {
                it('the overview link is always listed in the navigation item', async () => {
                    const { writeService } = utils(CATALOG_FOLDER);
                    await writeService({
                        id: 'ShippingService',
                        name: 'ShippingService',
                        version: '0.0.1',
                        markdown: 'ShippingService',
                    })

                    const navigationData = await getNestedSideBarData();
                    const serviceNode = getNavigationConfigurationByKey('item:service:ShippingService:0.0.1', navigationData);
                    expect(serviceNode).toHaveNavigationLink({ type: 'item', title: 'Overview', href: '/docs/services/ShippingService/0.0.1' })
                });

            });

            describe('architecture diagrams section', () => {
                it('the architecture and visualizer links are always listed in the navigation item', async () => {
                    const { writeService } = utils(CATALOG_FOLDER);
                    await writeService({
                        id: 'ShippingService',
                        name: 'ShippingService',
                        version: '0.0.1',
                        markdown: 'ShippingService',
                    })

                    const navigationData = await getNestedSideBarData();
                    const serviceNode = getNavigationConfigurationByKey('item:service:ShippingService:0.0.1', navigationData);
                    expect(serviceNode).toHaveNavigationLink({ type: 'item', title: 'Architecture', href: '/architecture/docs/messages?serviceName=ShippingService&serviceId=ShippingService' })
                    expect(serviceNode).toHaveNavigationLink({ type: 'item', title: 'Visualizer', href: '/visualiser/services/ShippingService/0.0.1' })
                });
            });

            describe('specifications section', () => {
                it.only('is not listed if the service does not have any specifications', async () => {
                    const { writeService } = utils(CATALOG_FOLDER);
                    await writeService({
                        id: 'ShippingService',
                        name: 'ShippingService',
                        version: '0.0.1',
                        markdown: 'ShippingService',
                    })

                    const navigationData = await getNestedSideBarData();
                    const serviceNode = getNavigationConfigurationByKey('item:service:ShippingService:0.0.1', navigationData);
                    const specificationsSection = getChildNodeByTitle('Specifications', serviceNode.children ?? [])
                    expect(specificationsSection).toBeUndefined();
                });

                it.only('lists the specifications that the service has if the service has specifications', async () => {
                    const { writeService } = utils(CATALOG_FOLDER);
                    await writeService({
                        id: 'ShippingService',
                        name: 'ShippingService',
                        version: '0.0.1',
                        markdown: 'ShippingService',
                        specifications: [
                            { type: 'openapi', path: 'openapi.yaml', name: 'OpenAPI' },
                            { type: 'asyncapi', path: 'asyncapi.yaml', name: 'AsyncAPI' },
                            { type: 'graphql', path: 'graphql.yaml', name: 'GraphQL' },
                        ],
                    })

                    const navigationData = await getNestedSideBarData();
                    const serviceNode = getNavigationConfigurationByKey('item:service:ShippingService:0.0.1', navigationData);
                    const specificationsSection = getChildNodeByTitle('Specifications', serviceNode.children ?? [])
                    expect(specificationsSection.children).toEqual([
                        { type: 'item', title: 'OpenAPI (OpenAPI)', href: '/docs/services/ShippingService/0.0.1/spec/openapi' },
                        { type: 'item', title: 'AsyncAPI (AsyncAPI)', href: '/docs/services/ShippingService/0.0.1/asyncapi/asyncapi' },
                        { type: 'item', title: 'GraphQL (GraphQL)', href: '/docs/services/ShippingService/0.0.1/graphql/graphql' },
                    ]);
                });
            });

            describe('entities section', () => {
                it('is not listed if the service does not have any entities', async () => {
                    const { writeService } = utils(CATALOG_FOLDER);
                    await writeService({
                        id: 'ShippingService',
                        name: 'ShippingService',
                        version: '0.0.1',
                        markdown: 'ShippingService',
                    })
                });

                it('lists the entities that the service has if the service has entities', async () => {
                    const { writeService, writeEntity } = utils(CATALOG_FOLDER);
                    await writeEntity({
                        id: 'Order',
                        name: 'Order',
                        version: '0.0.1',
                        markdown: 'Order',
                    })

                    await writeService({
                        id: 'ShippingService',
                        name: 'ShippingService',
                        version: '0.0.1',
                        markdown: 'ShippingService',
                        entities: [{ id: 'Order', version: '0.0.1' }],
                    })

                    const navigationData = await getNestedSideBarData();
                    const serviceNode = getNavigationConfigurationByKey('item:service:ShippingService:0.0.1', navigationData);
                    const entitiesSection = getChildNodeByTitle('Entities', serviceNode.children ?? [])
                    expect(entitiesSection.children).toEqual(['item:entity:Order:0.0.1']);
                });

            });

            describe('sends messages section', () => {
                it('is not listed if the service does not produce any messages', async () => {
                    const { writeService } = utils(CATALOG_FOLDER);
                    await writeService({
                        id: 'ShippingService',
                        name: 'ShippingService',
                        version: '0.0.1',
                        markdown: 'ShippingService',
                    })

                    const navigationData = await getNestedSideBarData();
                    const serviceNode = getNavigationConfigurationByKey('item:service:ShippingService:0.0.1', navigationData);
                    const producesMessagesSection = getChildNodeByTitle('Sends Messages', serviceNode.children ?? [])
                    expect(producesMessagesSection).toBeUndefined();
                });

                it('lists the messages that the service produces if the service produces messages', async () => {
                    const { writeService, writeEvent } = utils(CATALOG_FOLDER);
                    await writeEvent({
                        id: 'PaymentProcessed',
                        name: 'Payment Processed',
                        version: '0.0.1',
                        markdown: 'Payment Processed',
                    })

                    await writeService({
                        id: 'ShippingService',
                        name: 'ShippingService',
                        version: '0.0.1',
                        markdown: 'ShippingService',
                        sends: [{ id: 'PaymentProcessed', version: '0.0.1' }],
                    })

                    const navigationData = await getNestedSideBarData();
                    const serviceNode = getNavigationConfigurationByKey('item:service:ShippingService:0.0.1', navigationData);
                    const producesMessagesSection = getChildNodeByTitle('Sends Messages', serviceNode.children ?? [])
                    expect(producesMessagesSection.children).toEqual(['item:message:PaymentProcessed:0.0.1']);
                });
            });

            describe('receives messages section', () => {
                it('is not listed if the service does not receive any messages', async () => {
                    const { writeService } = utils(CATALOG_FOLDER);
                    await writeService({
                        id: 'ShippingService',
                        name: 'ShippingService',
                        version: '0.0.1',
                        markdown: 'ShippingService',
                    })

                    const navigationData = await getNestedSideBarData();
                    const serviceNode = getNavigationConfigurationByKey('item:service:ShippingService:0.0.1', navigationData);
                    const receivesMessagesSection = getChildNodeByTitle('Receives Messages', serviceNode.children ?? [])
                    expect(receivesMessagesSection).toBeUndefined();
                });

                it('lists the messages that the service receives if the service receives messages', async () => {
                    const { writeService, writeEvent } = utils(CATALOG_FOLDER);
                    await writeEvent({
                        id: 'PaymentProcessed',
                        name: 'Payment Processed',
                        version: '0.0.1',
                        markdown: 'Payment Processed',
                    })

                    await writeService({
                        id: 'ShippingService',
                        name: 'ShippingService',
                        version: '0.0.1',
                        markdown: 'ShippingService',
                        receives: [{ id: 'PaymentProcessed', version: '0.0.1' }],
                    })

                    const navigationData = await getNestedSideBarData();
                    const serviceNode = getNavigationConfigurationByKey('item:service:ShippingService:0.0.1', navigationData);
                    const receivesMessagesSection = getChildNodeByTitle('Receives Messages', serviceNode.children ?? [])
                    expect(receivesMessagesSection.children).toEqual(['item:message:PaymentProcessed:0.0.1']);
                });
            });

        });




    });

});


// Entity Map....
// Data Map...