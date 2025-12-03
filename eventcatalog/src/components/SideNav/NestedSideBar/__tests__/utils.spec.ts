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
                case 'containers':
                    const { getDataStores } = utils(CATALOG_FOLDER);
                    const containers = await getDataStores() ?? [];
                    return Promise.resolve(containers.map(container => toAstroCollection(container, 'containers')));
                case 'users':
                    const { getUsers } = utils(CATALOG_FOLDER);
                    const users = await getUsers() ?? [];
                    return Promise.resolve(users.map(user => toAstroCollection(user, 'users')));
                case 'teams':
                    const { getTeams } = utils(CATALOG_FOLDER);
                    const teams = await getTeams() ?? [];
                    return Promise.resolve(teams.map(team => toAstroCollection(team, 'teams')));
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

        describe('Architecture & Design section', () => {
            it('the architecture Diagram and visualizer links are always listed in the navigation item', async () => {
                const { writeDomain } = utils(CATALOG_FOLDER);
                await writeDomain({
                    id: 'Shipping',
                    name: 'Shipping',
                    version: '0.0.1',
                    markdown: 'Shipping',
                })

                const navigationData = await getNestedSideBarData();
                const domainNode = getNavigationConfigurationByKey('item:domain:Shipping:0.0.1', navigationData);
                expect(domainNode).toHaveNavigationLink({ type: 'item', title: 'Interaction Map', href: '/visualiser/domains/Shipping/0.0.1' })
                expect(domainNode).toHaveNavigationLink({ type: 'item', title: 'Architecture Diagram', href: '/architecture/docs/services?domainId=Shipping&domainName=Shipping' })
            });

            it('the entity map link is only listed if the domain has entities', async () => {
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
                expect(domainNode).toHaveNavigationLink({ type: 'item', title: 'Entity Map', href: '/visualiser/domains/Shipping/0.0.1/entity-map' })
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
                const servicesInDomainSection = getChildNodeByTitle('Domain Services', domainNode.children ?? [])

                expect(servicesInDomainSection.children).toEqual(['item:service:ShippingService:0.0.1']);

            });
        })

        describe('owners section', () => {

            it('is not listed if the domain does not have any owners', async () => {
                const { writeDomain } = utils(CATALOG_FOLDER);
                await writeDomain({
                    id: 'Shipping',
                    name: 'Shipping',
                    version: '0.0.1',
                    markdown: 'Shipping',
                })
            });

            it('lists the owners that the domain has if the domain has owners', async () => {
                const { writeDomain, writeUser } = utils(CATALOG_FOLDER);
                await writeDomain({
                    id: 'Shipping',
                    name: 'Shipping',
                    version: '0.0.1',
                    markdown: 'Shipping',
                    owners: ['John Doe'],
                })

                await writeUser({
                    id: 'John Doe',
                    name: 'John Doe',
                    markdown: 'John Doe',
                    avatarUrl: 'https://example.com/avatar.png',
                })

                const navigationData = await getNestedSideBarData();
                const domainNode = getNavigationConfigurationByKey('item:domain:Shipping:0.0.1', navigationData);
                const ownersSection = getChildNodeByTitle('Owners', domainNode.children ?? [])
                expect(ownersSection.children).toEqual([{ type: 'item', title: 'John Doe', href: '/docs/users/John Doe' }]);

            });

        });

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

        describe('Architecture & Design section', () => {
            it('the architecture Diagram and visualizer links are always listed in the navigation item', async () => {
                const { writeService } = utils(CATALOG_FOLDER);
                await writeService({
                    id: 'ShippingService',
                    name: 'ShippingService',
                    version: '0.0.1',
                    markdown: 'ShippingService',
                })

                const navigationData = await getNestedSideBarData();
                const serviceNode = getNavigationConfigurationByKey('item:service:ShippingService:0.0.1', navigationData);
                expect(serviceNode).toHaveNavigationLink({ type: 'item', title: 'Architecture Diagram', href: '/architecture/docs/messages?serviceName=ShippingService&serviceId=ShippingService' })
                expect(serviceNode).toHaveNavigationLink({ type: 'item', title: 'Interaction Map', href: '/visualiser/services/ShippingService/0.0.1' })
            });
        });

        describe('API & Contracts section', () => {
            it('is not listed if the service does not have any specifications', async () => {
                const { writeService } = utils(CATALOG_FOLDER);
                await writeService({
                    id: 'ShippingService',
                    name: 'ShippingService',
                    version: '0.0.1',
                    markdown: 'ShippingService',
                })

                const navigationData = await getNestedSideBarData();
                const serviceNode = getNavigationConfigurationByKey('item:service:ShippingService:0.0.1', navigationData);
                const apiContractsSection = getChildNodeByTitle('API & Contracts', serviceNode.children ?? [])
                expect(apiContractsSection).toBeUndefined();
            });

            it('lists the specifications that the service has if the service has specifications', async () => {
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
                const apiContractsSection = getChildNodeByTitle('API & Contracts', serviceNode.children ?? [])
                expect(apiContractsSection.children).toEqual([
                    { type: 'item', title: 'OpenAPI (OpenAPI)', href: '/docs/services/ShippingService/0.0.1/spec/openapi' },
                    { type: 'item', title: 'AsyncAPI (AsyncAPI)', href: '/docs/services/ShippingService/0.0.1/asyncapi/asyncapi' },
                    { type: 'item', title: 'GraphQL (GraphQL)', href: '/docs/services/ShippingService/0.0.1/graphql/graphql' },
                ]);
            });
        });

        describe('State and Persistence section', () => {

            it('is not listed if the service does not have any data stores it reads from or writes to', async () => {
                const { writeService } = utils(CATALOG_FOLDER);
                await writeService({
                    id: 'ShippingService',
                    name: 'ShippingService',
                    version: '0.0.1',
                    markdown: 'ShippingService',
                })

                const navigationData = await getNestedSideBarData();
                const serviceNode = getNavigationConfigurationByKey('item:service:ShippingService:0.0.1', navigationData);
                const stateAndPersistenceSection = getChildNodeByTitle('State and Persistence', serviceNode.children ?? [])
                expect(stateAndPersistenceSection).toBeUndefined();
            });

            it('lists the data stores that the service reads from and writes to if the service has data stores it reads from or writes to', async () => {
                const { writeService, writeDataStore } = utils(CATALOG_FOLDER);
                await writeService({
                    id: 'ShippingService',
                    name: 'ShippingService',
                    version: '0.0.1',
                    markdown: 'ShippingService',
                    readsFrom: [{ id: 'Order', version: '0.0.1' }],
                    writesTo: [{ id: 'Order', version: '0.0.1' }],
                })

                await writeDataStore({
                    id: 'Order',
                    name: 'Order',
                    version: '0.0.1',
                    markdown: 'Order',
                    container_type: 'database',
                    technology: 'PostgreSQL',
                })


                const navigationData = await getNestedSideBarData();
                const serviceNode = getNavigationConfigurationByKey('item:service:ShippingService:0.0.1', navigationData);
                const stateAndPersistenceSection = getChildNodeByTitle('State and Persistence', serviceNode.children ?? [])
                expect(stateAndPersistenceSection.children).toEqual(['item:container:Order:0.0.1']);



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
            it('is not listed if the service does not send any messages', async () => {
                const { writeService } = utils(CATALOG_FOLDER);
                await writeService({
                    id: 'ShippingService',
                    name: 'ShippingService',
                    version: '0.0.1',
                    markdown: 'ShippingService',
                })

                const navigationData = await getNestedSideBarData();
                const serviceNode = getNavigationConfigurationByKey('item:service:ShippingService:0.0.1', navigationData);
                const producesMessagesSection = getChildNodeByTitle('Messages Produced', serviceNode.children ?? [])
                expect(producesMessagesSection).toBeUndefined();
            });

            it('lists the messages that the service sends if the service sends messages', async () => {
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
                const producesMessagesSection = getChildNodeByTitle('Messages Produced', serviceNode.children ?? [])
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
                const receivesMessagesSection = getChildNodeByTitle('Messages Consumed', serviceNode.children ?? [])
                expect(receivesMessagesSection).toBeUndefined();
            });

            it('lists the messages that the service consumes if the service consumes messages', async () => {
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
                const receivesMessagesSection = getChildNodeByTitle('Messages Consumed', serviceNode.children ?? [])
                expect(receivesMessagesSection.children).toEqual(['item:message:PaymentProcessed:0.0.1']);
            });
        });

        describe('owners section', () => {
            it('is not listed if the service does not have any owners', async () => {
                const { writeService } = utils(CATALOG_FOLDER);
                await writeService({
                    id: 'ShippingService',
                    name: 'ShippingService',
                    version: '0.0.1',
                    markdown: 'ShippingService',
                })
            });

            it('lists the owners that the service has if the service has owners', async () => {
                const { writeService, writeUser } = utils(CATALOG_FOLDER);
                await writeService({
                    id: 'ShippingService',
                    name: 'ShippingService',
                    version: '0.0.1',
                    markdown: 'ShippingService',
                    owners: ['John Doe'],
                })

                await writeUser({
                    id: 'John Doe',
                    name: 'John Doe',
                    markdown: 'John Doe',
                    avatarUrl: 'https://example.com/avatar.png',
                })

                const navigationData = await getNestedSideBarData();
                const serviceNode = getNavigationConfigurationByKey('item:service:ShippingService:0.0.1', navigationData);
                const ownersSection = getChildNodeByTitle('Owners', serviceNode.children ?? [])
                expect(ownersSection.children).toEqual([{ type: 'item', title: 'John Doe', href: '/docs/users/John Doe' }]);
            });
        });
    });

    describe('message navigation items', () => {

        describe('quick reference section', () => {
            it('the overview link is always listed in the navigation item', async () => {
                const { writeEvent } = utils(CATALOG_FOLDER);
                await writeEvent({
                    id: 'PaymentProcessed',
                    name: 'Payment Processed',
                    version: '0.0.1',
                    markdown: 'Payment Processed',
                })

                const navigationData = await getNestedSideBarData();
                const messageNode = getNavigationConfigurationByKey('item:message:PaymentProcessed:0.0.1', navigationData);
                expect(messageNode).toHaveNavigationLink({ type: 'item', title: 'Overview', href: '/docs/events/PaymentProcessed/0.0.1' })
            });

        });

        describe('architecture & design section', () => {
            it('the visualizer link is always listed in the navigation item', async () => {
                const { writeEvent } = utils(CATALOG_FOLDER);
                await writeEvent({
                    id: 'PaymentProcessed',
                    name: 'Payment Processed',
                    version: '0.0.1',
                    markdown: 'Payment Processed',
                })

                const navigationData = await getNestedSideBarData();
                const messageNode = getNavigationConfigurationByKey('item:message:PaymentProcessed:0.0.1', navigationData);
                expect(messageNode).toHaveNavigationLink({ type: 'item', title: 'Interaction Map', href: '/visualiser/events/PaymentProcessed/0.0.1' })
            });
        });

        describe('producers section', () => {
            it('is not listed if the no services produce the message', async () => {
                const { writeEvent } = utils(CATALOG_FOLDER);
                await writeEvent({
                    id: 'PaymentProcessed',
                    name: 'Payment Processed',
                    version: '0.0.1',
                    markdown: 'Payment Processed',
                })

                const navigationData = await getNestedSideBarData();
                const messageNode = getNavigationConfigurationByKey('item:message:PaymentProcessed:0.0.1', navigationData);
                const producesMessagesSection = getChildNodeByTitle('Producers', messageNode.children ?? [])
                expect(producesMessagesSection).toBeUndefined();
            });

            it('lists the producers if the message is produced by any services', async () => {
                const { writeEvent, writeService } = utils(CATALOG_FOLDER);

                await writeService({
                    id: 'PaymentService',
                    name: 'Payment Service',
                    version: '0.0.1',
                    markdown: 'Payment Service',
                    sends: [{ id: 'PaymentProcessed', version: '0.0.1' }],
                })

                await writeEvent({
                    id: 'PaymentProcessed',
                    name: 'Payment Processed',
                    version: '0.0.1',
                    markdown: 'Payment Processed',
                })

                const navigationData = await getNestedSideBarData();
                const messageNode = getNavigationConfigurationByKey('item:message:PaymentProcessed:0.0.1', navigationData);
                const producesMessagesSection = getChildNodeByTitle('Producers', messageNode.children ?? [])
                expect(producesMessagesSection.children).toEqual(['item:service:PaymentService:0.0.1']);
            });

        });

        describe('consumers section', () => {
            it('is not listed if the no services consume the message', async () => {
                const { writeEvent } = utils(CATALOG_FOLDER);
                await writeEvent({
                    id: 'PaymentProcessed',
                    name: 'Payment Processed',
                    version: '0.0.1',
                    markdown: 'Payment Processed',
                })

                const navigationData = await getNestedSideBarData();
                const messageNode = getNavigationConfigurationByKey('item:message:PaymentProcessed:0.0.1', navigationData);
                const consumersSection = getChildNodeByTitle('Consumers', messageNode.children ?? [])
                expect(consumersSection).toBeUndefined();
            });

            it('lists the consumers if the message is consumed by any services', async () => {
                const { writeEvent, writeService } = utils(CATALOG_FOLDER);
                await writeService({
                    id: 'ShippingService',
                    name: 'ShippingService',
                    version: '0.0.1',
                    markdown: 'ShippingService',
                    receives: [{ id: 'PaymentProcessed', version: '0.0.1' }],
                })

                await writeEvent({
                    id: 'PaymentProcessed',
                    name: 'Payment Processed',
                    version: '0.0.1',
                    markdown: 'Payment Processed',
                })

                const navigationData = await getNestedSideBarData();
                const messageNode = getNavigationConfigurationByKey('item:message:PaymentProcessed:0.0.1', navigationData);
                const consumersSection = getChildNodeByTitle('Consumers', messageNode.children ?? [])
                expect(consumersSection.children).toEqual(['item:service:ShippingService:0.0.1']);
            });

        });

        describe('owners section', () => {
            it('is not listed if the message does not have any owners', async () => {
                const { writeEvent } = utils(CATALOG_FOLDER);
                await writeEvent({
                    id: 'PaymentProcessed',
                    name: 'Payment Processed',
                    version: '0.0.1',
                    markdown: 'Payment Processed',
                })
            });

            it('lists the owners that the message has if the message has owners', async () => {
                const { writeEvent, writeUser } = utils(CATALOG_FOLDER);
                await writeEvent({
                    id: 'PaymentProcessed',
                    name: 'Payment Processed',
                    version: '0.0.1',
                    markdown: 'Payment Processed',
                    owners: ['John Doe'],
                })

                await writeUser({
                    id: 'John Doe',
                    name: 'John Doe',
                    markdown: 'John Doe',
                    avatarUrl: 'https://example.com/avatar.png',
                })

                const navigationData = await getNestedSideBarData();
                const messageNode = getNavigationConfigurationByKey('item:message:PaymentProcessed:0.0.1', navigationData);
                const ownersSection = getChildNodeByTitle('Owners', messageNode.children ?? [])
                expect(ownersSection.children).toEqual([{ type: 'item', title: 'John Doe', href: '/docs/users/John Doe' }]);
            });
        });
    });

    describe('container navigation items', () => {
        describe('quick reference section', () => {
            it('the overview link is always listed in the navigation item', async () => {
                const { writeDataStore } = utils(CATALOG_FOLDER);
                await writeDataStore({
                    id: 'PaymentDataStore',
                    name: 'Payment DataStore',
                    version: '0.0.1',
                    markdown: 'Payment DataStore',
                    container_type: 'database',
                })

                const navigationData = await getNestedSideBarData();
                const containerNode = getNavigationConfigurationByKey('item:container:PaymentDataStore:0.0.1', navigationData);
                expect(containerNode).toHaveNavigationLink({ type: 'item', title: 'Overview', href: '/docs/containers/PaymentDataStore/0.0.1' })
            });
        });

        describe('architecture & design section', () => {
            it.only('the visualizer link is always listed in the navigation item', async () => {
                const { writeDataStore } = utils(CATALOG_FOLDER);
                await writeDataStore({
                    id: 'PaymentDataStore',
                    name: 'Payment DataStore',
                    version: '0.0.1',
                    markdown: 'Payment DataStore',
                    container_type: 'database',
                })

                const navigationData = await getNestedSideBarData();
                const containerNode = getNavigationConfigurationByKey('item:container:PaymentDataStore:0.0.1', navigationData);
                expect(containerNode).toHaveNavigationLink({ type: 'item', title: 'Interaction Map', href: '/visualiser/containers/PaymentDataStore/0.0.1' })
            });
        });

        describe('services (writes) section', () => {
            it('is not listed if the container does not have any services that write to it', async () => {
                const { writeDataStore } = utils(CATALOG_FOLDER);
                await writeDataStore({
                    id: 'PaymentDataStore',
                    name: 'Payment DataStore',
                    version: '0.0.1',
                    markdown: 'Payment DataStore',
                    container_type: 'database',
                })

                const navigationData = await getNestedSideBarData();
                const containerNode = getNavigationConfigurationByKey('item:container:PaymentDataStore:0.0.1', navigationData);
                const servicesSection = getChildNodeByTitle('Services (Writes)', containerNode.children ?? [])
                expect(servicesSection).toBeUndefined();
            });

            it('lists the services that write to the container if the container has services that write to it', async () => {
                const { writeDataStore, writeService } = utils(CATALOG_FOLDER);
                await writeDataStore({
                    id: 'PaymentDataStore',
                    name: 'Payment DataStore',
                    version: '0.0.1',
                    markdown: 'Payment DataStore',
                    container_type: 'database',
                })

                await writeService({
                    id: 'PaymentService',
                    name: 'Payment Service',
                    version: '0.0.1',
                    markdown: 'Payment Service',
                    writesTo: [{ id: 'PaymentDataStore', version: '0.0.1' }],
                })

                const navigationData = await getNestedSideBarData();
                const containerNode = getNavigationConfigurationByKey('item:container:PaymentDataStore:0.0.1', navigationData);
                const servicesSection = getChildNodeByTitle('Services (Writes)', containerNode.children ?? [])
                expect(servicesSection.children).toEqual(['item:service:PaymentService:0.0.1']);
            });
        });

        describe('services (reads) section', () => {
            it('is not listed if the container does not have any services that read from it', async () => {
                const { writeDataStore } = utils(CATALOG_FOLDER);
                await writeDataStore({
                    id: 'PaymentDataStore',
                    name: 'Payment DataStore',
                    version: '0.0.1',
                    markdown: 'Payment DataStore',
                    container_type: 'database',
                })

                const navigationData = await getNestedSideBarData();
                const containerNode = getNavigationConfigurationByKey('item:container:PaymentDataStore:0.0.1', navigationData);
                const servicesSection = getChildNodeByTitle('Services (Reads)', containerNode.children ?? [])
                expect(servicesSection).toBeUndefined();
            });

            it('lists the services that read from the container if the container has services that read from it', async () => {
                const { writeDataStore, writeService } = utils(CATALOG_FOLDER);
                await writeDataStore({
                    id: 'PaymentDataStore',
                    name: 'Payment DataStore',
                    version: '0.0.1',
                    markdown: 'Payment DataStore',
                    container_type: 'database',
                })

                await writeService({
                    id: 'PaymentService',
                    name: 'Payment Service',
                    version: '0.0.1',
                    markdown: 'Payment Service',
                    readsFrom: [{ id: 'PaymentDataStore', version: '0.0.1' }],
                })

                const navigationData = await getNestedSideBarData();
                const containerNode = getNavigationConfigurationByKey('item:container:PaymentDataStore:0.0.1', navigationData);
                const servicesSection = getChildNodeByTitle('Services (Reads)', containerNode.children ?? [])
                expect(servicesSection.children).toEqual(['item:service:PaymentService:0.0.1']);
            });
        });

        describe('owners section', () => {
            it('is not listed if the container does not have any owners', async () => {
                const { writeDataStore } = utils(CATALOG_FOLDER);
                await writeDataStore({
                    id: 'PaymentDataStore',
                    name: 'Payment DataStore',
                    version: '0.0.1',
                    markdown: 'Payment DataStore',
                    container_type: 'database', 
                    owners: ['John Doe'],
                })

                const navigationData = await getNestedSideBarData();
                const containerNode = getNavigationConfigurationByKey('item:container:PaymentDataStore:0.0.1', navigationData);
                const ownersSection = getChildNodeByTitle('Owners', containerNode.children ?? [])
                expect(ownersSection).toBeUndefined();
            });

            it('lists the owners that the container has if the container has owners', async () => {
                const { writeDataStore, writeUser } = utils(CATALOG_FOLDER);
                await writeDataStore({
                    id: 'PaymentDataStore',
                    name: 'Payment DataStore',
                    version: '0.0.1',
                    markdown: 'Payment DataStore',
                    container_type: 'database',
                    owners: ['John Doe'],
                })

                await writeUser({
                    id: 'John Doe',
                    name: 'John Doe',
                    markdown: 'John Doe',
                    avatarUrl: 'https://example.com/avatar.png',
                })

                const navigationData = await getNestedSideBarData();
                const containerNode = getNavigationConfigurationByKey('item:container:PaymentDataStore:0.0.1', navigationData);
                const ownersSection = getChildNodeByTitle('Owners', containerNode.children ?? [])
                expect(ownersSection.children).toEqual([{ type: 'item', title: 'John Doe', href: '/docs/users/John Doe' }]);
            });
        });
    });

});