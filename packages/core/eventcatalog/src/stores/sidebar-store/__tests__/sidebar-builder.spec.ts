import { describe, it, expect, vi } from 'vitest';
import { getNestedSideBarData, type NavigationData, type NavNode } from '../state';
import type { CollectionKey } from 'astro:content';
import utils from '@eventcatalog/sdk';
import path from 'path';
import fs from 'fs';
import config from '@config';

const CATALOG_FOLDER = path.join(__dirname, 'catalog');
const mockFlows: any[] = [];
// NO SDK support for systems yet, so we provide test fixtures directly.
const mockSystems: any[] = [];
const mockResourceDocs: any[] = [];
const mockResourceDocCategories: any[] = [];
const mockAgents: any[] = [];
const mockSchemas: any[] = [];
const mockUbiquitousLanguages: any[] = [];

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
    toHaveNavigationLink(expected: { type: 'item' | 'group'; title: string; href: string }): void;
  }
  interface AsymmetricMatchersContaining {
    toHaveNavigationLink(expected: { type: 'item' | 'group'; title: string; href: string }): void;
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
};

// mock out astro collection for domains
vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: async (key: CollectionKey) => {
      switch (key) {
        case 'domains':
          const { getDomains } = utils(CATALOG_FOLDER);
          const domains = (await getDomains()) ?? [];
          return Promise.resolve(domains.map((domain) => toAstroCollection(domain, 'domains')));
        case 'services':
          const { getServices } = utils(CATALOG_FOLDER);
          const services = (await getServices()) ?? [];
          return Promise.resolve(services.map((service) => toAstroCollection(service, 'services')));
        case 'agents':
          return Promise.resolve(mockAgents.map((agent) => toAstroCollection(agent, 'agents')));
        case 'entities':
          const { getEntities } = utils(CATALOG_FOLDER);
          const entities = (await getEntities()) ?? [];
          return Promise.resolve(entities.map((entity) => toAstroCollection(entity, 'entities')));
        case 'events':
          const { getEvents } = utils(CATALOG_FOLDER);
          const events = (await getEvents()) ?? [];
          return Promise.resolve(events.map((event) => toAstroCollection(event, 'events')));
        case 'commands':
          const { getCommands } = utils(CATALOG_FOLDER);
          const commands = (await getCommands()) ?? [];
          return Promise.resolve(commands.map((command) => toAstroCollection(command, 'commands')));
        case 'queries':
          const { getQueries } = utils(CATALOG_FOLDER);
          const queries = (await getQueries()) ?? [];
          return Promise.resolve(queries.map((query) => toAstroCollection(query, 'queries')));
        case 'containers':
          const { getDataStores } = utils(CATALOG_FOLDER);
          const containers = (await getDataStores()) ?? [];
          return Promise.resolve(containers.map((container) => toAstroCollection(container, 'containers')));
        case 'users':
          const { getUsers } = utils(CATALOG_FOLDER);
          const users = (await getUsers()) ?? [];
          return Promise.resolve(users.map((user) => toAstroCollection(user, 'users')));
        case 'teams':
          const { getTeams } = utils(CATALOG_FOLDER);
          const teams = (await getTeams()) ?? [];
          return Promise.resolve(teams.map((team) => toAstroCollection(team, 'teams')));
        case 'flows':
          // NO SDK support for flows yet, so we provide test fixtures directly.
          return Promise.resolve(mockFlows.map((flow) => toAstroCollection(flow, 'flows')));
        case 'systems':
          // NO SDK support for systems yet, so we provide test fixtures directly.
          return Promise.resolve(mockSystems.map((system) => toAstroCollection(system, 'systems')));
        case 'diagrams':
          // NO SDK Support for diagrams yet, so we just mock it out for now
          return Promise.resolve([]);
        case 'schemas':
          return Promise.resolve(mockSchemas.map((schema) => toAstroCollection(schema, 'schemas')));
        case 'channels':
          const { getChannels } = utils(CATALOG_FOLDER);
          const channels = (await getChannels()) ?? [];
          return Promise.resolve(channels.map((channel) => toAstroCollection(channel, 'channels')));
        case 'data-products':
          const { getDataProducts } = utils(CATALOG_FOLDER);
          const dataProducts = (await getDataProducts()) ?? [];
          return Promise.resolve(dataProducts.map((dataProduct) => toAstroCollection(dataProduct, 'data-products')));
        case 'ubiquitousLanguages':
          return Promise.resolve(
            mockUbiquitousLanguages.map((ubiquitousLanguage) => toAstroCollection(ubiquitousLanguage, 'ubiquitousLanguages'))
          );
        case 'resourceDocs':
          return Promise.resolve(mockResourceDocs);
        case 'resourceDocCategories':
          return Promise.resolve(mockResourceDocCategories);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

const buildDomainQuickReferenceSection = (resource: any, includeUbiquitousLanguage = false, includeResources = false) => {
  return {
    type: 'group',
    title: 'Quick Reference',
    icon: 'BookOpen',
    pages: [
      {
        type: 'item',
        title: 'Overview',
        href: `/docs/${resource.collection}/${resource.data.id}/${resource.data.version}`,
      },
      includeResources && {
        type: 'item',
        title: 'Domain Resources',
        href: `/docs/domains/${resource.data.id}/${resource.data.version}/resources`,
      },
      includeUbiquitousLanguage && {
        type: 'item',
        title: 'Ubiquitous Language',
        href: `/docs/domains/${resource.data.id}/language`,
      },
    ].filter(Boolean),
  };
};

const getChildNodeByTitle = (title: string, pages: any[]) => {
  return pages.find((child: any) => child.title === title);
};

// Find a subtle subsection (e.g. Services / Flows / Entities) nested inside the
// top-level "Resources" group of a system/domain node.
const getResourceSubsection = (title: string, pages: any[]) => {
  const resources = pages.find((child: any) => child.title === 'Resources');
  return (resources?.pages ?? []).find((child: any) => child.title === title);
};

expect.extend({
  toHaveNavigationLink(received: any, expected: any) {
    const { type, title, href } = expected;
    const { pages } = received;
    const allChildren = pages?.flatMap((child: any) => child.pages ?? []);
    const hasMatch = allChildren.some((child: any) => child.type === type && child.title === title && child.href === href);
    return {
      message: () => `expected ${received.title} to have a navigation link to ${expected.title}`,
      pass: hasMatch,
    };
  },
});

describe('getNestedSideBarData', () => {
  beforeEach(() => {
    // @ts-ignore
    global.__EC_TRAILING_SLASH__ = false;
    mockFlows.length = 0;
    mockSystems.length = 0;
    mockResourceDocs.length = 0;
    mockResourceDocCategories.length = 0;
    mockAgents.length = 0;
    mockSchemas.length = 0;
    mockUbiquitousLanguages.length = 0;
    fs.rmSync(CATALOG_FOLDER, { recursive: true, force: true });
    fs.mkdirSync(CATALOG_FOLDER, { recursive: true });
    // Remove any navigation data from teh config
    delete config.navigation;
    // Reset changelog config
    delete config.changelog;
  });

  describe('root navigation items (default navigation config)', () => {
    it('renders a list of domains (that are not in a subdomain) as a root navigation item', async () => {
      const { writeDomain, getDomain } = utils(CATALOG_FOLDER);

      await writeDomain({
        id: 'Shipping',
        name: 'Shipping',
        version: '0.0.1',
        markdown: 'Shipping',
      });

      const navigationData = await getNestedSideBarData();

      const domain = toAstroCollection(await getDomain('Shipping', '0.0.1'), 'domains');
      const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);

      const subdomainSection = getChildNodeByTitle('Subdomains', domainNode.pages ?? []);

      expect(navigationData.roots).toContain('list:top-level-domains');
      expect(subdomainSection).toBeUndefined();

      expect(domainNode).toEqual(
        expect.objectContaining({
          type: 'item',
          title: 'Shipping',
          badge: 'Domain',
          pages: expect.arrayContaining([buildDomainQuickReferenceSection(domain)]),
        })
      );
      // A domain without a custom icon gets no default icon in the sidebar.
      expect(domainNode.icon).toBeUndefined();
      expect(domainNode.leftIcon).toBeUndefined();
    });

    it('renders top-level diagrams with the System Context Map below top-level domains', async () => {
      const { writeDomain } = utils(CATALOG_FOLDER);

      await writeDomain({
        id: 'Shipping',
        name: 'Shipping',
        version: '0.0.1',
        markdown: 'Shipping',
      });

      mockSystems.push({
        id: 'CoreMonolith',
        name: 'Core Monolith',
        version: '1.0.0',
        summary: 'The legacy core monolith',
      });

      const navigationData = await getNestedSideBarData();
      const diagramsNode = getNavigationConfigurationByKey('list:top-level-diagrams', navigationData);

      expect(navigationData.roots).toEqual(['list:top-level-domains', 'list:top-level-diagrams', 'list:all']);
      expect(diagramsNode).toEqual({
        type: 'group',
        title: 'Top level diagrams',
        icon: 'Workflow',
        pages: [
          {
            type: 'item',
            title: 'System Context Map',
            href: '/visualiser/system-context-map',
          },
        ],
      });
    });

    it('uses the domain style icon when one is configured', async () => {
      const { writeDomain } = utils(CATALOG_FOLDER);

      await writeDomain({
        id: 'Shipping',
        name: 'Shipping',
        version: '0.0.1',
        markdown: 'Shipping',
        styles: {
          icon: '/icons/domain.svg',
        },
      });

      const navigationData = await getNestedSideBarData();

      expect(getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData)).toEqual(
        expect.objectContaining({
          type: 'item',
          title: 'Shipping',
          badge: 'Domain',
          leftIcon: '/icons/domain.svg',
        })
      );
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
      });

      // Subdomain
      await writeDomain({
        id: 'Checkout',
        name: 'Checkout',
        version: '0.0.1',
        markdown: 'Checkout',
      });

      const navigationData = await getNestedSideBarData();

      const rootDomainsToRender = getNavigationConfigurationByKey('list:top-level-domains', navigationData);
      expect(rootDomainsToRender.pages).toEqual(['domain:Shipping:0.0.1']);
    });

    it('lists the systems that belong to a domain above its subdomains', async () => {
      const { writeDomain } = utils(CATALOG_FOLDER);

      mockSystems.push({
        id: 'CoreMonolith',
        name: 'Core Monolith',
        version: '1.0.0',
        summary: 'The legacy core monolith',
      });

      // `systems` has no SDK support yet, so cast past the SDK's Domain type.
      await writeDomain({
        id: 'Shipping',
        name: 'Shipping',
        version: '0.0.1',
        markdown: 'Shipping',
        systems: [{ id: 'CoreMonolith', version: '1.0.0' }],
        domains: [{ id: 'Checkout', version: '0.0.1' }],
      } as any);

      // Subdomain
      await writeDomain({
        id: 'Checkout',
        name: 'Checkout',
        version: '0.0.1',
        markdown: 'Checkout',
      });

      const navigationData = await getNestedSideBarData();
      const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
      const pages = domainNode.pages ?? [];

      const systemsSection = getChildNodeByTitle('Systems', pages);
      expect(systemsSection).toMatchObject({
        type: 'group',
        title: 'Systems',
        icon: 'Group',
        pages: ['system:CoreMonolith:1.0.0'],
      });

      // Systems appear above Subdomains
      const systemsIndex = pages.findIndex((page: any) => page?.title === 'Systems');
      const subdomainsIndex = pages.findIndex((page: any) => page?.title === 'Subdomains');
      expect(systemsIndex).toBeGreaterThanOrEqual(0);
      expect(subdomainsIndex).toBeGreaterThan(systemsIndex);
    });

    it('the browser section only lists resources that are in the catalog', async () => {
      const { writeDomain, writeService } = utils(CATALOG_FOLDER);
      await writeDomain({
        id: 'Shipping',
        name: 'Shipping',
        version: '0.0.1',
        markdown: 'Shipping',
      });
      await writeService({
        id: 'ShippingService',
        name: 'ShippingService',
        version: '0.0.1',
        markdown: 'ShippingService',
      });
      const navigationData = await getNestedSideBarData();
      const browseNode = getNavigationConfigurationByKey('list:all', navigationData);
      expect(browseNode.pages).toEqual(['list:domains', 'list:services']);
    });

    it('leads the browse section with Domains, Systems, Services then Messages before the rest alphabetically', async () => {
      const { writeDomain, writeService, writeEvent, writeEntity } = utils(CATALOG_FOLDER);
      await writeDomain({ id: 'Shipping', name: 'Shipping', version: '0.0.1', markdown: 'Shipping' });
      await writeService({ id: 'ShippingService', name: 'ShippingService', version: '0.0.1', markdown: 'ShippingService' });
      await writeEvent({ id: 'OrderPlaced', name: 'OrderPlaced', version: '0.0.1', markdown: 'OrderPlaced' });
      await writeEntity({ id: 'Order', name: 'Order', version: '0.0.1', markdown: 'Order' });

      const navigationData = await getNestedSideBarData();
      const browseNode = getNavigationConfigurationByKey('list:all', navigationData);

      // Domains, Services and Messages lead in their fixed priority order; the
      // remainder (here just Entities) follows alphabetically.
      expect(browseNode.pages).toEqual(['list:domains', 'list:services', 'list:messages', 'list:entities']);
    });

    it('orders browse resources by name', async () => {
      const { writeDomain } = utils(CATALOG_FOLDER);

      await writeDomain({
        id: 'Shipping',
        name: 'Shipping',
        version: '0.0.1',
        markdown: 'Shipping',
      });
      await writeDomain({
        id: 'Payments',
        name: 'Payments',
        version: '0.0.1',
        markdown: 'Payments',
      });

      const navigationData = await getNestedSideBarData();
      const domainsList = getNavigationConfigurationByKey('list:domains', navigationData);

      expect(domainsList.pages).toEqual(['domain:Payments:0.0.1', 'domain:Shipping:0.0.1']);
    });

    it('lists entities as searchable browse resources when they are in the catalog', async () => {
      const { writeEntity } = utils(CATALOG_FOLDER);

      await writeEntity({
        id: 'Order',
        name: 'Order',
        version: '0.0.1',
        summary: 'Order aggregate',
        markdown: 'Order',
      });

      const navigationData = await getNestedSideBarData();
      const browseNode = getNavigationConfigurationByKey('list:all', navigationData);
      const entitiesList = getNavigationConfigurationByKey('list:entities', navigationData);
      const entityNode = getNavigationConfigurationByKey('entity:Order:0.0.1', navigationData);

      expect(browseNode.pages).toContain('list:entities');
      expect(entitiesList.pages).toEqual(['entity:Order:0.0.1']);
      expect(entityNode).toEqual(
        expect.objectContaining({
          type: 'item',
          title: 'Order',
          badge: 'Entity',
          summary: 'Order aggregate',
          pages: expect.arrayContaining([
            {
              type: 'group',
              title: 'Quick Reference',
              icon: 'BookOpen',
              pages: [
                {
                  type: 'item',
                  title: 'Overview',
                  href: '/docs/entities/Order/0.0.1',
                },
              ],
            },
          ]),
        })
      );
    });

    it('lists systems as searchable browse resources when they are in the catalog', async () => {
      mockSystems.push({
        id: 'CoreMonolith',
        name: 'Core Monolith',
        version: '1.0.0',
        summary: 'The legacy core monolith',
      });

      const navigationData = await getNestedSideBarData();
      const browseNode = getNavigationConfigurationByKey('list:all', navigationData);
      const systemsList = getNavigationConfigurationByKey('list:systems', navigationData);
      const systemNode = getNavigationConfigurationByKey('system:CoreMonolith:1.0.0', navigationData);

      expect(browseNode.pages).toContain('list:systems');
      expect(systemsList.pages).toEqual(['system:CoreMonolith:1.0.0']);
      expect(systemNode).toEqual(
        expect.objectContaining({
          type: 'item',
          title: 'Core Monolith',
          badge: 'System',
          summary: 'The legacy core monolith',
          pages: expect.arrayContaining([
            {
              type: 'group',
              title: 'Quick Reference',
              icon: 'BookOpen',
              pages: [
                {
                  type: 'item',
                  title: 'Overview',
                  href: '/docs/systems/CoreMonolith/1.0.0',
                },
              ],
            },
          ]),
        })
      );
    });

    it('keeps a flat systems list (no scope sub-sections) when all systems are internal', async () => {
      mockSystems.push(
        { id: 'CoreMonolith', name: 'Core Monolith', version: '1.0.0', summary: 'Internal by default' },
        { id: 'Billing', name: 'Billing', version: '1.0.0', scope: 'internal', summary: 'Explicitly internal' }
      );

      const navigationData = await getNestedSideBarData();
      const systemsList = getNavigationConfigurationByKey('list:systems', navigationData);

      // No external systems → single flat list, ordered by name.
      expect(systemsList.pages).toEqual(['system:Billing:1.0.0', 'system:CoreMonolith:1.0.0']);
    });

    it('splits the systems list into Internal and External sub-sections (each ordered by name)', async () => {
      mockSystems.push(
        { id: 'CoreMonolith', name: 'Core Monolith', version: '1.0.0', summary: 'Internal (default scope)' },
        { id: 'Identity', name: 'Identity', version: '1.0.0', scope: 'internal', summary: 'Internal' },
        { id: 'Resend', name: 'Resend', version: '1.0.0', scope: 'external', summary: 'External SaaS' },
        { id: 'Stripe', name: 'Stripe', version: '1.0.0', scope: 'external', summary: 'External SaaS' }
      );

      const navigationData = await getNestedSideBarData();
      const systemsList = getNavigationConfigurationByKey('list:systems', navigationData);
      const internalList = getNavigationConfigurationByKey('list:systems-internal', navigationData);
      const externalList = getNavigationConfigurationByKey('list:systems-external', navigationData);

      // Top-level Systems item points at the two scope sub-sections.
      expect(systemsList.pages).toEqual(['list:systems-internal', 'list:systems-external']);

      // Internal section: systems with scope internal (or unset), ordered by name.
      expect(internalList).toEqual(
        expect.objectContaining({
          type: 'group',
          title: 'Internal',
          pages: ['system:CoreMonolith:1.0.0', 'system:Identity:1.0.0'],
        })
      );

      // External section: systems with scope external, ordered by name.
      expect(externalList).toEqual(
        expect.objectContaining({
          type: 'group',
          title: 'External',
          pages: ['system:Resend:1.0.0', 'system:Stripe:1.0.0'],
        })
      );
    });

    it('lists the services that belong to a system', async () => {
      const { writeService } = utils(CATALOG_FOLDER);

      await writeService({
        id: 'OrdersService',
        name: 'Orders Service',
        version: '1.0.0',
        summary: 'Handles orders',
        markdown: 'Orders Service',
      });

      mockSystems.push({
        id: 'CoreMonolith',
        name: 'Core Monolith',
        version: '1.0.0',
        summary: 'The legacy core monolith',
        services: [{ id: 'OrdersService', version: '1.0.0' }],
      });

      const navigationData = await getNestedSideBarData();
      const systemNode = getNavigationConfigurationByKey('system:CoreMonolith:1.0.0', navigationData);

      const servicesSection = getResourceSubsection('Services', systemNode.pages ?? []);
      expect(servicesSection).toMatchObject({
        type: 'group',
        title: 'Services',
        icon: 'Server',
        pages: ['service:OrdersService:1.0.0'],
      });

      // A system with resources gets the System Resources quick-reference link.
      const quickReference = getChildNodeByTitle('Quick Reference', systemNode.pages ?? []);
      expect(quickReference.pages).toContainEqual({
        type: 'item',
        title: 'System Resources',
        href: '/docs/systems/CoreMonolith/1.0.0/resources',
      });
    });

    it('lists an Architecture section with Overview and Resource Diagram links for the system', async () => {
      mockSystems.push({
        id: 'CoreMonolith',
        name: 'Core Monolith',
        version: '1.0.0',
        summary: 'The legacy core monolith',
      });

      const navigationData = await getNestedSideBarData();
      const systemNode = getNavigationConfigurationByKey('system:CoreMonolith:1.0.0', navigationData);
      const architectureSection = getChildNodeByTitle('Architecture', systemNode.pages ?? []);

      expect(architectureSection).toEqual({
        type: 'group',
        title: 'Architecture',
        icon: 'Workflow',
        pages: [
          {
            type: 'item',
            title: 'Overview',
            href: '/architecture/systems/CoreMonolith/1.0.0',
          },
          {
            type: 'item',
            title: 'Resource Diagram',
            href: '/visualiser/systems/CoreMonolith/1.0.0',
          },
        ],
      });
    });

    it('lists the flows that belong to a system', async () => {
      mockFlows.push({
        id: 'CheckoutFlow',
        name: 'Checkout Flow',
        version: '1.0.0',
        markdown: 'Checkout Flow',
        steps: [],
      });

      mockSystems.push({
        id: 'CoreMonolith',
        name: 'Core Monolith',
        version: '1.0.0',
        summary: 'The legacy core monolith',
        flows: [{ id: 'CheckoutFlow', version: '1.0.0' }],
      });

      const navigationData = await getNestedSideBarData();
      const systemNode = getNavigationConfigurationByKey('system:CoreMonolith:1.0.0', navigationData);

      const flowsSection = getResourceSubsection('Flows', systemNode.pages ?? []);
      expect(flowsSection).toMatchObject({
        type: 'group',
        title: 'Flows',
        icon: 'Waypoints',
        pages: ['flow:CheckoutFlow:1.0.0'],
      });
    });

    it('lists the entities that belong to a system', async () => {
      const { writeEntity } = utils(CATALOG_FOLDER);

      await writeEntity({
        id: 'Order',
        name: 'Order',
        version: '1.0.0',
        markdown: 'Order',
      });

      mockSystems.push({
        id: 'CoreMonolith',
        name: 'Core Monolith',
        version: '1.0.0',
        summary: 'The legacy core monolith',
        entities: [{ id: 'Order', version: '1.0.0' }],
      });

      const navigationData = await getNestedSideBarData();
      const systemNode = getNavigationConfigurationByKey('system:CoreMonolith:1.0.0', navigationData);

      const entitiesSection = getChildNodeByTitle('Entities', systemNode.pages ?? []);
      expect(entitiesSection).toMatchObject({
        type: 'group',
        title: 'Entities',
        icon: 'Box',
        pages: [{ type: 'item', title: 'Order', href: '/docs/entities/Order/1.0.0' }],
      });
    });
  });

  describe('entity navigation item', () => {
    it('lists the domains and services that reference the entity', async () => {
      const { writeDomain, writeEntity, writeService } = utils(CATALOG_FOLDER);

      await writeEntity({
        id: 'Order',
        name: 'Order',
        version: '0.0.1',
        markdown: 'Order',
      });

      await writeDomain({
        id: 'Shipping',
        name: 'Shipping',
        version: '0.0.1',
        markdown: 'Shipping',
        entities: [{ id: 'Order', version: '0.0.1' }],
      });

      await writeService({
        id: 'OrdersService',
        name: 'OrdersService',
        version: '0.0.1',
        markdown: 'OrdersService',
        entities: [{ id: 'Order', version: '0.0.1' }],
      });

      const navigationData = await getNestedSideBarData();
      const entityNode = getNavigationConfigurationByKey('entity:Order:0.0.1', navigationData);
      const architectureSection = getChildNodeByTitle('Architecture', entityNode.pages ?? []);
      const domainsSection = getChildNodeByTitle('Domains', entityNode.pages ?? []);
      const servicesSection = getChildNodeByTitle('Services', entityNode.pages ?? []);

      expect(architectureSection).toEqual({
        type: 'group',
        title: 'Architecture',
        icon: 'Workflow',
        pages: [
          {
            type: 'item',
            title: 'Domain Entity Map',
            href: '/visualiser/domains/Shipping/0.0.1/entity-map',
          },
          {
            type: 'item',
            title: 'Service Entity Map',
            href: '/visualiser/services/OrdersService/0.0.1/entity-map',
          },
        ],
      });
      expect(domainsSection).toEqual({
        type: 'group',
        title: 'Domains',
        icon: 'Boxes',
        pages: ['domain:Shipping:0.0.1'],
      });
      expect(servicesSection).toEqual({
        type: 'group',
        title: 'Services',
        icon: 'Server',
        pages: ['service:OrdersService:0.0.1'],
      });
    });
  });

  describe('domain navigation item', () => {
    it('users can reference the latest version of a resource without passing in the version', async () => {
      const { writeDomain } = utils(CATALOG_FOLDER);
      await writeDomain({
        id: 'Shipping',
        name: 'Shipping',
        version: '0.0.1',
        markdown: 'Shipping',
      });
      const navigationData = await getNestedSideBarData();
      const domainNode = getNavigationConfigurationByKey('domain:Shipping', navigationData);
      expect(domainNode).toBeDefined();
    });

    describe('quick reference section', () => {
      it('the overview link is always listed in the navigation item', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);

        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);

        expect(domainNode).toHaveNavigationLink({ type: 'item', title: 'Overview', href: '/docs/domains/Shipping/0.0.1' });
      });

      it('the ubiquitous language link is listed when terms are defined', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);

        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });
        mockUbiquitousLanguages.push({
          dictionary: [
            {
              id: 'Shipment',
              name: 'Shipment',
              summary: 'Goods prepared for delivery',
            },
          ],
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);

        expect(domainNode).toHaveNavigationLink({
          type: 'item',
          title: 'Ubiquitous Language',
          href: '/docs/domains/Shipping/language',
        });
      });

      it('the ubiquitous language link is not listed when no terms are defined', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);

        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);

        expect(domainNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Ubiquitous Language',
          href: '/docs/domains/Shipping/language',
        });
      });

      it('the ubiquitous language link is not listed if the domain is configured not to render the page', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          detailsPanel: {
            ubiquitousLanguage: {
              visible: false,
            },
          },
        });
        mockUbiquitousLanguages.push({
          dictionary: [
            {
              id: 'Shipment',
              name: 'Shipment',
              summary: 'Goods prepared for delivery',
            },
          ],
        });
        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        expect(domainNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Ubiquitous Language',
          href: '/docs/domains/Shipping/language',
        });
      });

      it('the changelog link is listed when changelog is enabled', async () => {
        config.changelog = { enabled: true };
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });
        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        expect(domainNode).toHaveNavigationLink({
          type: 'item',
          title: 'Changelog',
          href: '/docs/domains/Shipping/0.0.1/changelog',
        });
        config.changelog = { enabled: false };
      });

      it('the changelog link is not listed when changelog is disabled', async () => {
        config.changelog = { enabled: false };
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });
        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        expect(domainNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Changelog',
          href: '/docs/domains/Shipping/0.0.1/changelog',
        });
      });

      it('the changelog link is not listed when the domain is configured to hide it', async () => {
        config.changelog = { enabled: true };
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          detailsPanel: {
            changelog: {
              visible: false,
            },
          },
        });
        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        expect(domainNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Changelog',
          href: '/docs/domains/Shipping/0.0.1/changelog',
        });
        config.changelog = { enabled: false };
      });
    });

    describe('Architecture section', () => {
      it('lists the Overview and Resource Diagram links when the domain has resources to draw', async () => {
        const { writeDomain, writeService } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          services: [{ id: 'ShippingService', version: '0.0.1' }],
        });
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        expect(domainNode).toHaveNavigationLink({
          type: 'item',
          title: 'Resource Diagram',
          href: '/visualiser/domains/Shipping/0.0.1',
        });
        expect(domainNode).toHaveNavigationLink({
          type: 'item',
          title: 'Overview',
          href: '/architecture/domains/Shipping/0.0.1',
        });
      });

      it('does not list the Resource Diagram link when the domain has no resources to draw', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        expect(domainNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Resource Diagram',
          href: '/visualiser/domains/Shipping/0.0.1',
        });
        // The Architecture Overview link is always present.
        expect(domainNode).toHaveNavigationLink({
          type: 'item',
          title: 'Overview',
          href: '/architecture/domains/Shipping/0.0.1',
        });
      });

      it('the visualizer link is not displayed if the visualizer is turned off in the catalog configuration', async () => {
        // Globally set the visualizer to be disabled in the EventCatalog configuration
        config.visualiser.enabled = false;

        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        expect(domainNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Resource Diagram',
          href: '/visualiser/domains/Shipping/0.0.1',
        });

        // Turn it back on
        config.visualiser.enabled = true;
      });

      it('the entity diagram link is only listed if the domain has entities', async () => {
        const { writeDomain, writeEntity } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          entities: [{ id: 'Order', version: '0.0.1' }],
        });
        await writeEntity({
          id: 'Order',
          name: 'Order',
          version: '0.0.1',
          markdown: 'Order',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        expect(domainNode).toHaveNavigationLink({
          type: 'item',
          title: 'Entity Diagram',
          href: '/visualiser/domains/Shipping/0.0.1/entity-map',
        });
      });

      it('lists a Diagrams section if the domain has diagrams', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          diagrams: [{ id: 'system-architecture', version: '1.0.0' }],
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const diagramsSection = getChildNodeByTitle('Diagrams', domainNode.pages ?? []);

        expect(diagramsSection).toBeDefined();
        expect(diagramsSection.pages).toEqual([
          { type: 'item', title: 'system-architecture', href: '/diagrams/system-architecture/1.0.0' },
        ]);
      });

      it('does not list a Diagrams section if the domain does not have any diagrams', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const diagramsSection = getChildNodeByTitle('Diagrams', domainNode.pages ?? []);

        expect(diagramsSection).toBeUndefined();
      });
    });

    describe('Flows section', () => {
      it('is not listed if the domain does not have any flows', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const flowsSection = getResourceSubsection('Flows', domainNode.pages ?? []);
        expect(flowsSection).toBeUndefined();
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
        });

        await writeEntity({
          id: 'Order',
          name: 'Order',
          version: '0.0.1',
          markdown: 'Order',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const entitiesSection = getResourceSubsection('Entities', domainNode.pages ?? []);
        expect(entitiesSection.pages).toEqual([{ type: 'item', title: 'Order', href: '/docs/entities/Order/0.0.1' }]);
      });

      it('is not listed if the domain is configured not to render the section', async () => {
        const { writeDomain, writeEntity } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          entities: [{ id: 'Order', version: '0.0.1' }],
          detailsPanel: {
            entities: {
              visible: false,
            },
          },
        });

        await writeEntity({
          id: 'Order',
          name: 'Order',
          version: '0.0.1',
          markdown: 'Order',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const entitiesSection = getResourceSubsection('Entities', domainNode.pages ?? []);
        expect(entitiesSection).toBeUndefined();
      });

      it('is not listed if the domain does not have any entities', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });
        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const entitiesSection = getResourceSubsection('Entities', domainNode.pages ?? []);
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
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        expect(domainNode.pages).not.toContain('list:subdomains');
      });

      it('is not listed if the domain is configured not to render the section', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          domains: [{ id: 'Checkout', version: '0.0.1' }],
          detailsPanel: {
            subdomains: {
              visible: false,
            },
          },
        });

        await writeDomain({
          id: 'Checkout',
          name: 'Checkout',
          version: '0.0.1',
          markdown: 'Checkout',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const subdomainSection = getChildNodeByTitle('Subdomains', domainNode.pages ?? []);
        expect(subdomainSection).toBeUndefined();
      });

      it('lists subdomains if the domain has subdomains', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          domains: [{ id: 'Checkout', version: '0.0.1' }],
        });

        await writeDomain({
          id: 'Checkout',
          name: 'Checkout',
          version: '0.0.1',
          markdown: 'Checkout',
          domains: [{ id: 'Shipping', version: '0.0.1' }],
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const subdomainSection = getChildNodeByTitle('Subdomains', domainNode.pages ?? []);
        expect(subdomainSection.pages).toEqual(['domain:Checkout:0.0.1']);
      });
    });

    describe('resource group section', () => {
      it('is not listed if the domain does not have any resource groups', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });
        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const resourceGroupSection = getChildNodeByTitle('Resource Groups', domainNode.pages ?? []);
        expect(resourceGroupSection).toBeUndefined();
      });

      // it.only('if it defines a resource group, these resources are returned', async () => {

      //   const { writeDomain } = utils(CATALOG_FOLDER);
      //   await writeDomain({
      //     id: 'Shipping',
      //     name: 'Shipping',
      //     version: '0.0.1',
      //     markdown: 'Shipping',
      //     resourceGroups: [{
      //       id: 'ShippingResourceGroup',
      //       title: 'Shipping Resource Group',
      //       items: [{ id: 'ShippingResource', version: '0.0.1' }],
      //     }],
      //   });

      //   const navigationData = await getNestedSideBarData();
      //   const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
      //   const resourceGroupSection = getChildNodeByTitle('Resource Groups', domainNode.pages ?? []);
      //   expect(resourceGroupSection).toBeDefined();

      // });
    });

    describe('services section', () => {
      it('does not render any services for the domain if the domain does not have any services', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const servicesInDomainSection = getChildNodeByTitle('Services in Domain', domainNode.pages ?? []);
        expect(servicesInDomainSection).toBeUndefined();
      });

      it('is not listed if the domain is configured not to render the section', async () => {
        const { writeDomain, writeService } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          services: [{ id: 'ShippingService', version: '0.0.1' }],
          detailsPanel: {
            services: {
              visible: false,
            },
          },
        });

        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const servicesInDomainSection = getResourceSubsection('Services', domainNode.pages ?? []);
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
        });

        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'LocationService',
        });

        // We create a subdomain that also has services, that should not be listed in the `Services in Domain` section
        await writeDomain({
          id: 'Checkout',
          name: 'Checkout',
          version: '0.0.1',
          markdown: 'Checkout',
          services: [{ id: 'CheckoutService', version: '0.0.1' }],
        });

        await writeService({
          id: 'CheckoutService',
          name: 'CheckoutService',
          version: '0.0.1',
          markdown: 'CheckoutService',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const servicesInDomainSection = getResourceSubsection('Services', domainNode.pages ?? []);

        expect(servicesInDomainSection.pages).toEqual(['service:ShippingService:0.0.1']);
      });
    });

    describe('external systems', () => {
      it('renders an "External Integrations" section in a domain with services that have externalSystem: true, and excludes them from "Services In Domain"', async () => {
        const { writeDomain, writeService } = utils(CATALOG_FOLDER);

        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          services: [
            { id: 'ShippingService', version: '0.0.1' },
            { id: 'Stripe', version: '1.0.0' },
          ],
        });

        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
        });

        await writeService({
          id: 'Stripe',
          name: 'Stripe',
          version: '1.0.0',
          markdown: 'Stripe',
          externalSystem: true,
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);

        const servicesInDomainSection = getResourceSubsection('Services', domainNode.pages ?? []);
        const externalIntegrationsSection = getChildNodeByTitle('External Integrations', domainNode.pages ?? []);

        expect(servicesInDomainSection.pages).toEqual(['service:ShippingService:0.0.1']);
        expect(externalIntegrationsSection).toEqual(
          expect.objectContaining({
            type: 'group',
            title: 'External Integrations',
            icon: 'Globe',
            pages: ['service:Stripe:1.0.0'],
          })
        );
      });

      it('renders a separate "list:external-systems" root node and excludes externals from "list:services"', async () => {
        const { writeService } = utils(CATALOG_FOLDER);

        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
        });

        await writeService({
          id: 'Stripe',
          name: 'Stripe',
          version: '1.0.0',
          markdown: 'Stripe',
          externalSystem: true,
        });

        const navigationData = await getNestedSideBarData();

        const servicesList = getNavigationConfigurationByKey('list:services', navigationData);
        const externalSystemsList = getNavigationConfigurationByKey('list:external-systems', navigationData);

        expect(servicesList.pages).toEqual(['service:ShippingService:0.0.1']);
        expect(externalSystemsList).toEqual(
          expect.objectContaining({
            type: 'item',
            title: 'External Systems',
            icon: 'Globe',
            pages: ['service:Stripe:1.0.0'],
          })
        );
      });

      it('renders the per-service nav item with badge "External System" when externalSystem is true', async () => {
        const { writeService } = utils(CATALOG_FOLDER);

        await writeService({
          id: 'Stripe',
          name: 'Stripe',
          version: '1.0.0',
          markdown: 'Stripe',
          externalSystem: true,
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:Stripe:1.0.0', navigationData);

        expect(serviceNode).toEqual(
          expect.objectContaining({
            type: 'item',
            title: 'Stripe',
            badge: 'External System',
          })
        );
      });
    });

    describe('owners section', () => {
      it('is not listed if the domain does not have any owners', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });
      });

      it('is not listed if the domain is configured not to render the section', async () => {
        const { writeDomain, writeUser } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          owners: ['John Doe'],
          detailsPanel: {
            owners: {
              visible: false,
            },
          },
        });

        await writeUser({
          id: 'John Doe',
          name: 'John Doe',
          markdown: 'John Doe',
          avatarUrl: 'https://example.com/avatar.png',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const ownersSection = getChildNodeByTitle('Owners', domainNode.pages ?? []);
        expect(ownersSection).toBeUndefined();
      });

      it('lists the owners that the domain has if the domain has owners', async () => {
        const { writeDomain, writeUser } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          owners: ['John Doe'],
        });

        await writeUser({
          id: 'John Doe',
          name: 'John Doe',
          markdown: 'John Doe',
          avatarUrl: 'https://example.com/avatar.png',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const ownersSection = getChildNodeByTitle('Owners', domainNode.pages ?? []);
        expect(ownersSection.pages).toEqual([{ type: 'item', title: 'John Doe', href: '/docs/users/John Doe' }]);
      });
    });

    describe('code section', () => {
      it('is not listed if the domain does not have a repository configured', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const codeSection = getChildNodeByTitle('Code', domainNode.pages ?? []);
        expect(codeSection).toBeUndefined();
      });

      it('is not listed if the domain is configured not to render the section', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          repository: {
            url: 'https://github.com/eventcatalog/eventcatalog',
            language: 'TypeScript',
          },
          detailsPanel: {
            repository: {
              visible: false,
            },
          },
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const codeSection = getChildNodeByTitle('Code', domainNode.pages ?? []);
        expect(codeSection).toBeUndefined();
      });

      it('lists the code repository if the domain has a repository configured', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          repository: {
            url: 'https://github.com/eventcatalog/eventcatalog',
            language: 'TypeScript',
          },
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const codeSection = getChildNodeByTitle('Code', domainNode.pages ?? []);
        expect(codeSection).toBeDefined();
      });
    });

    describe('attachments section', () => {
      it('is not listed if the domain does not have any attachments', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });
      });

      it('lists the attachments if the domain has attachments configured', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          repository: {
            url: 'https://github.com/eventcatalog/eventcatalog',
            language: 'TypeScript',
          },
          attachments: [
            {
              url: 'https://example.com/attachment.pdf',
              title: 'Attachment 1',
              type: 'pdf',
            },
          ],
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const attachmentsSection = getChildNodeByTitle('Attachments', domainNode.pages ?? []);
        expect(attachmentsSection).toBeDefined();
        expect(attachmentsSection.pages).toEqual([
          {
            type: 'item',
            title: 'Attachment 1',
            href: 'https://example.com/attachment.pdf',
          },
        ]);
      });
    });

    describe('API & Contracts section (domain)', () => {
      it('is not listed if the domain does not have any specifications', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const apiContractsSection = getChildNodeByTitle('API & Contracts', domainNode.pages ?? []);
        expect(apiContractsSection).toBeUndefined();
      });

      it('is not listed if the domain is configured not to render the section', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        // SDK update required to support specifications on domains
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          detailsPanel: {
            specifications: {
              visible: false,
            },
          } as any,
          specifications: [{ type: 'openapi', path: 'openapi.yaml', name: 'OpenAPI' }],
        } as any);

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const apiContractsSection = getChildNodeByTitle('API & Contracts', domainNode.pages ?? []);
        expect(apiContractsSection).toBeUndefined();
      });

      it('lists the specifications that the domain has if the domain has specifications', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        // SDK update required to support specifications on domains
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          specifications: [
            { type: 'openapi', path: 'openapi.yaml', name: 'OpenAPI' },
            { type: 'asyncapi', path: 'asyncapi.yaml', name: 'AsyncAPI' },
            { type: 'graphql', path: 'graphql.yaml', name: 'GraphQL' },
          ],
        } as any);

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const apiContractsSection = getChildNodeByTitle('API & Contracts', domainNode.pages ?? []);
        expect(apiContractsSection.pages).toEqual([
          {
            type: 'item',
            title: 'OpenAPI',
            leftIcon: '/icons/openapi-black.svg',
            href: '/docs/domains/Shipping/0.0.1/spec/openapi',
          },
          {
            type: 'item',
            title: 'AsyncAPI',
            leftIcon: '/icons/asyncapi-black.svg',
            href: '/docs/domains/Shipping/0.0.1/asyncapi/asyncapi',
          },
          {
            type: 'item',
            title: 'GraphQL',
            leftIcon: '/icons/graphql-black.svg',
            href: '/docs/domains/Shipping/0.0.1/graphql/graphql',
          },
        ]);
      });
    });

    describe('domain events section (sends)', () => {
      it('is not listed if the domain does not send any messages', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const domainEventsSection = getResourceSubsection('Domain Events', domainNode.pages ?? []);
        expect(domainEventsSection).toBeUndefined();
      });

      it('is not listed if the domain is configured not to render the section', async () => {
        const { writeDomain, writeEvent } = utils(CATALOG_FOLDER);

        await writeEvent({
          id: 'OrderShipped',
          name: 'Order Shipped',
          version: '0.0.1',
          markdown: 'Order Shipped',
        });

        // SDK update required to support sends/receives on domains
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          detailsPanel: {
            messages: {
              visible: false,
            },
          },
          sends: [{ id: 'OrderShipped', version: '0.0.1' }],
        } as any);

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const domainEventsSection = getResourceSubsection('Domain Events', domainNode.pages ?? []);
        expect(domainEventsSection).toBeUndefined();
      });

      it('lists the messages that the domain sends if the domain sends messages', async () => {
        const { writeDomain, writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'OrderShipped',
          name: 'Order Shipped',
          version: '0.0.1',
          markdown: 'Order Shipped',
        });

        // SDK update required to support sends/receives on domains
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          sends: [{ id: 'OrderShipped', version: '0.0.1' }],
        } as any);

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const domainEventsSection = getResourceSubsection('Domain Events', domainNode.pages ?? []);
        expect(domainEventsSection.pages).toEqual(['event:OrderShipped:0.0.1']);
      });
    });

    describe('external events section (receives)', () => {
      it('is not listed if the domain does not receive any messages', async () => {
        const { writeDomain } = utils(CATALOG_FOLDER);
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const externalEventsSection = getResourceSubsection('External Events', domainNode.pages ?? []);
        expect(externalEventsSection).toBeUndefined();
      });

      it('is not listed if the domain is configured not to render the section', async () => {
        const { writeDomain, writeEvent } = utils(CATALOG_FOLDER);

        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        // SDK update required to support sends/receives on domains
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          detailsPanel: {
            messages: {
              visible: false,
            },
          },
          receives: [{ id: 'PaymentProcessed', version: '0.0.1' }],
        } as any);

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const externalEventsSection = getResourceSubsection('External Events', domainNode.pages ?? []);
        expect(externalEventsSection).toBeUndefined();
      });

      it('lists the messages that the domain receives if the domain receives messages', async () => {
        const { writeDomain, writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        // SDK update required to support sends/receives on domains
        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
          receives: [{ id: 'PaymentProcessed', version: '0.0.1' }],
        } as any);

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const externalEventsSection = getResourceSubsection('External Events', domainNode.pages ?? []);
        expect(externalEventsSection.pages).toEqual(['event:PaymentProcessed:0.0.1']);
      });
    });
  });

  describe('service navigation items', () => {
    it('users can reference the latest version of a resource without passing in the version', async () => {
      const { writeService } = utils(CATALOG_FOLDER);
      await writeService({
        id: 'ShippingService',
        name: 'ShippingService',
        version: '0.0.1',
        markdown: 'ShippingService',
      });
      const navigationData = await getNestedSideBarData();
      const serviceNode = getNavigationConfigurationByKey('service:ShippingService', navigationData);
      expect(serviceNode).toBeDefined();
    });

    describe('quick reference section', () => {
      it('the overview link is always listed in the navigation item', async () => {
        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        expect(serviceNode).toHaveNavigationLink({
          type: 'item',
          title: 'Overview',
          href: '/docs/services/ShippingService/0.0.1',
        });
      });

      it('the changelog link is listed when changelog is enabled', async () => {
        config.changelog = { enabled: true };
        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
        });
        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        expect(serviceNode).toHaveNavigationLink({
          type: 'item',
          title: 'Changelog',
          href: '/docs/services/ShippingService/0.0.1/changelog',
        });
        config.changelog = { enabled: false };
      });

      it('the changelog link is not listed when changelog is disabled', async () => {
        config.changelog = { enabled: false };
        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
        });
        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        expect(serviceNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Changelog',
          href: '/docs/services/ShippingService/0.0.1/changelog',
        });
      });

      it('the changelog link is not listed when the service is configured to hide it', async () => {
        config.changelog = { enabled: true };
        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
          detailsPanel: {
            changelog: {
              visible: false,
            },
          },
        });
        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        expect(serviceNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Changelog',
          href: '/docs/services/ShippingService/0.0.1/changelog',
        });
        config.changelog = { enabled: false };
      });
    });

    describe('Architecture section', () => {
      it('the architecture overview and visualizer links are always listed in the navigation item', async () => {
        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        expect(serviceNode).toHaveNavigationLink({
          type: 'item',
          title: 'Overview',
          href: '/architecture/services/ShippingService/0.0.1',
        });
        expect(serviceNode).toHaveNavigationLink({
          type: 'item',
          title: 'Map',
          href: '/visualiser/services/ShippingService/0.0.1',
        });
      });

      it('the map link is not displayed if the visualizer is turned off in the catalog configuration', async () => {
        // Globally set the visualizer to be disabled in the EventCatalog configuration
        config.visualiser.enabled = false;

        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        expect(serviceNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Map',
          href: '/visualiser/services/ShippingService/0.0.1',
        });

        // Turn it back on
        config.visualiser.enabled = true;
      });

      it('lists a Diagrams section if the service has diagrams', async () => {
        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
          diagrams: [{ id: 'service-architecture', version: '1.0.0' }],
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const diagramsSection = getChildNodeByTitle('Diagrams', serviceNode.pages ?? []);

        expect(diagramsSection).toBeDefined();
        expect(diagramsSection.pages).toEqual([
          { type: 'item', title: 'service-architecture', href: '/diagrams/service-architecture/1.0.0' },
        ]);
      });

      it('does not list a Diagrams section if the service does not have any diagrams', async () => {
        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const diagramsSection = getChildNodeByTitle('Diagrams', serviceNode.pages ?? []);

        expect(diagramsSection).toBeUndefined();
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
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const apiContractsSection = getChildNodeByTitle('API & Contracts', serviceNode.pages ?? []);
        expect(apiContractsSection).toBeUndefined();
      });

      it('is not listed if the service is configured not to render the section', async () => {
        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
          detailsPanel: {
            specifications: {
              visible: false,
            },
          },
          specifications: [{ type: 'openapi', path: 'openapi.yaml', name: 'OpenAPI' }],
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const apiContractsSection = getChildNodeByTitle('API & Contracts', serviceNode.pages ?? []);
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
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const apiContractsSection = getChildNodeByTitle('API & Contracts', serviceNode.pages ?? []);
        expect(apiContractsSection.pages).toEqual([
          {
            type: 'item',
            title: 'OpenAPI',
            leftIcon: '/icons/openapi-black.svg',
            href: '/docs/services/ShippingService/0.0.1/spec/openapi',
          },
          {
            type: 'item',
            title: 'AsyncAPI',
            leftIcon: '/icons/asyncapi-black.svg',
            href: '/docs/services/ShippingService/0.0.1/asyncapi/asyncapi',
          },
          {
            type: 'item',
            title: 'GraphQL',
            leftIcon: '/icons/graphql-black.svg',
            href: '/docs/services/ShippingService/0.0.1/graphql/graphql',
          },
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
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const stateAndPersistenceSection = getChildNodeByTitle('State and Persistence', serviceNode.pages ?? []);
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
        });

        await writeDataStore({
          id: 'Order',
          name: 'Order',
          version: '0.0.1',
          markdown: 'Order',
          container_type: 'database',
          technology: 'PostgreSQL',
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const stateAndPersistenceSection = getChildNodeByTitle('State and Persistence', serviceNode.pages ?? []);
        expect(stateAndPersistenceSection.pages).toEqual(['container:Order:0.0.1']);
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
        });
      });

      it('is not listed if the service is configured not to render the section', async () => {
        const { writeService, writeEntity } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
          detailsPanel: {
            entities: {
              visible: false,
            },
          },
          entities: [{ id: 'Order', version: '0.0.1' }],
        });

        await writeEntity({
          id: 'Order',
          name: 'Order',
          version: '0.0.1',
          markdown: 'Order',
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const entitiesSection = getChildNodeByTitle('Entities', serviceNode.pages ?? []);
        expect(entitiesSection).toBeUndefined();
      });

      it('lists the entities that the service has if the service has entities', async () => {
        const { writeService, writeEntity } = utils(CATALOG_FOLDER);
        await writeEntity({
          id: 'Order',
          name: 'Order',
          version: '0.0.1',
          markdown: 'Order',
        });

        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
          entities: [{ id: 'Order', version: '0.0.1' }],
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const entitiesSection = getChildNodeByTitle('Entities', serviceNode.pages ?? []);
        expect(entitiesSection.pages).toEqual([{ type: 'item', title: 'Order', href: '/docs/entities/Order/0.0.1' }]);
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
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const producesMessagesSection = getChildNodeByTitle('Outbound Messages', serviceNode.pages ?? []);
        expect(producesMessagesSection).toBeUndefined();
      });

      it('is not listed if the service is configured not to render the section', async () => {
        const { writeService, writeEvent } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
          detailsPanel: {
            messages: {
              visible: false,
            },
          },
          sends: [{ id: 'PaymentProcessed', version: '0.0.1' }],
        });

        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const producesMessagesSection = getChildNodeByTitle('Outbound Messages', serviceNode.pages ?? []);
        expect(producesMessagesSection).toBeUndefined();
      });

      it('lists the messages that the service sends if the service sends messages', async () => {
        const { writeService, writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
          sends: [{ id: 'PaymentProcessed', version: '0.0.1' }],
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const producesMessagesSection = getChildNodeByTitle('Outbound Messages', serviceNode.pages ?? []);
        expect(producesMessagesSection.pages).toEqual(['event:PaymentProcessed:0.0.1']);
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
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const receivesMessagesSection = getChildNodeByTitle('Inbound Messages', serviceNode.pages ?? []);
        expect(receivesMessagesSection).toBeUndefined();
      });

      it('is not listed if the service is configured not to render the section', async () => {
        const { writeService, writeEvent } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
          detailsPanel: {
            messages: {
              visible: false,
            },
          },
          receives: [{ id: 'PaymentProcessed', version: '0.0.1' }],
        });

        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const receivesMessagesSection = getChildNodeByTitle('Inbound Messages', serviceNode.pages ?? []);
        expect(receivesMessagesSection).toBeUndefined();
      });

      it('lists the messages that the service consumes if the service consumes messages', async () => {
        const { writeService, writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
          receives: [{ id: 'PaymentProcessed', version: '0.0.1' }],
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const receivesMessagesSection = getChildNodeByTitle('Inbound Messages', serviceNode.pages ?? []);
        expect(receivesMessagesSection.pages).toEqual(['event:PaymentProcessed:0.0.1']);
      });
    });

    describe('flows section', () => {
      it('is not listed if the service has no flows and no flows reference the service', async () => {
        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const flowsSection = getChildNodeByTitle('Appears in flows', serviceNode.pages ?? []);
        expect(flowsSection).toBeUndefined();
      });

      it('lists flows that reference the service in flow steps', async () => {
        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '0.0.1',
          markdown: 'Payment Service',
        });

        mockFlows.push({
          id: 'CheckoutFlow',
          name: 'Checkout Flow',
          version: '0.0.1',
          markdown: 'Checkout Flow',
          steps: [{ id: 'payment-service', title: 'Payment service', service: { id: 'PaymentService' } }],
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:PaymentService:0.0.1', navigationData);
        const flowsSection = getChildNodeByTitle('Appears in flows', serviceNode.pages ?? []);

        expect(flowsSection.pages).toEqual(['flow:CheckoutFlow:0.0.1']);
      });

      it('merges explicit service flows with flows that reference the service and removes duplicates', async () => {
        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '0.0.1',
          markdown: 'Payment Service',
          flows: [{ id: 'CheckoutFlow', version: '0.0.1' }, { id: 'FraudFlow' }],
        });

        mockFlows.push(
          {
            id: 'CheckoutFlow',
            name: 'Checkout Flow',
            version: '0.0.1',
            markdown: 'Checkout Flow',
            steps: [{ id: 'payment-service', title: 'Payment service', service: { id: 'PaymentService' } }],
          },
          {
            id: 'FraudFlow',
            name: 'Fraud Flow',
            version: '0.0.1',
            markdown: 'Fraud Flow',
            steps: [],
          }
        );

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:PaymentService:0.0.1', navigationData);
        const flowsSection = getChildNodeByTitle('Flows', serviceNode.pages ?? []);

        expect(flowsSection.pages).toEqual(['flow:CheckoutFlow:0.0.1', 'flow:FraudFlow:0.0.1']);
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
        });
      });

      it('is not listed if the service is configured not to render the section', async () => {
        const { writeService, writeUser } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
          detailsPanel: {
            owners: {
              visible: false,
            },
          },
          owners: ['John Doe'],
        });

        writeUser({
          id: 'John Doe',
          name: 'John Doe',
          markdown: 'John Doe',
          avatarUrl: 'https://example.com/avatar.png',
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const ownersSection = getChildNodeByTitle('Owners', serviceNode.pages ?? []);
        expect(ownersSection).toBeUndefined();
      });

      it('lists the owners that the service has if the service has owners', async () => {
        const { writeService, writeUser } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
          owners: ['John Doe'],
        });

        await writeUser({
          id: 'John Doe',
          name: 'John Doe',
          markdown: 'John Doe',
          avatarUrl: 'https://example.com/avatar.png',
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const ownersSection = getChildNodeByTitle('Owners', serviceNode.pages ?? []);
        expect(ownersSection.pages).toEqual([{ type: 'item', title: 'John Doe', href: '/docs/users/John Doe' }]);
      });
    });

    describe('repository section', () => {
      it('is not listed if the service does not have a repository', async () => {
        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const repositorySection = getChildNodeByTitle('Code', serviceNode.pages ?? []);
        expect(repositorySection).toBeUndefined();
      });

      it('is not listed if the service is configured not to render the section', async () => {
        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
          detailsPanel: {
            repository: {
              visible: false,
            },
          },
          repository: {
            url: 'https://github.com/eventcatalog/eventcatalog',
            language: 'TypeScript',
          },
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const repositorySection = getChildNodeByTitle('Code', serviceNode.pages ?? []);
        expect(repositorySection).toBeUndefined();
      });

      it('lists the repository if the service has a repository configured', async () => {
        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
          repository: {
            url: 'https://github.com/eventcatalog/eventcatalog',
            language: 'TypeScript',
          },
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const repositorySection = getChildNodeByTitle('Code', serviceNode.pages ?? []);
        expect(repositorySection).toBeDefined();
      });
    });

    describe('attachments section', () => {
      it('is not listed if the service does not have any attachments', async () => {
        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'Shipping',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
        });
      });

      it('lists the attachments if the service has attachments configured', async () => {
        const { writeService } = utils(CATALOG_FOLDER);
        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
          attachments: [
            {
              url: 'https://example.com/attachment.pdf',
              title: 'Attachment 1',
              type: 'pdf',
            },
          ],
        });

        const navigationData = await getNestedSideBarData();
        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const attachmentsSection = getChildNodeByTitle('Attachments', serviceNode.pages ?? []);
        expect(attachmentsSection).toBeDefined();
        expect(attachmentsSection.pages).toEqual([
          {
            type: 'item',
            title: 'Attachment 1',
            href: 'https://example.com/attachment.pdf',
          },
        ]);
      });
    });
  });

  describe('agent navigation items', () => {
    describe('Architecture section', () => {
      it('lists the visualizer map but not an architecture overview page', async () => {
        mockAgents.push({
          id: 'FraudReviewAgent',
          name: 'Fraud Review Agent',
          version: '0.0.1',
          markdown: 'Fraud Review Agent',
        });

        const navigationData = await getNestedSideBarData();
        const agentNode = getNavigationConfigurationByKey('agent:FraudReviewAgent:0.0.1', navigationData);

        expect(agentNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Overview',
          href: '/architecture/agents/FraudReviewAgent/0.0.1',
        });
        expect(agentNode).toHaveNavigationLink({
          type: 'item',
          title: 'Map',
          href: '/visualiser/agents/FraudReviewAgent/0.0.1',
        });
      });
    });
  });

  describe('message navigation items', () => {
    it('users can reference the latest version of a resource without passing in the version', async () => {
      const { writeEvent } = utils(CATALOG_FOLDER);
      await writeEvent({
        id: 'PaymentProcessed',
        name: 'Payment Processed',
        version: '0.0.1',
        markdown: 'Payment Processed',
      });
      const navigationData = await getNestedSideBarData();
      const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed', navigationData);
      expect(messageNode).toBeDefined();
    });

    describe('quick reference section', () => {
      it('the overview link is always listed in the navigation item', async () => {
        const { writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        expect(messageNode).toHaveNavigationLink({
          type: 'item',
          title: 'Overview',
          href: '/docs/events/PaymentProcessed/0.0.1',
        });
      });

      it('the changelog link is listed when changelog is enabled', async () => {
        config.changelog = { enabled: true };
        const { writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });
        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        expect(messageNode).toHaveNavigationLink({
          type: 'item',
          title: 'Changelog',
          href: '/docs/events/PaymentProcessed/0.0.1/changelog',
        });
        config.changelog = { enabled: false };
      });

      it('the changelog link is not listed when changelog is disabled', async () => {
        config.changelog = { enabled: false };
        const { writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });
        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        expect(messageNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Changelog',
          href: '/docs/events/PaymentProcessed/0.0.1/changelog',
        });
      });

      it('the changelog link is not listed when the message is configured to hide it', async () => {
        config.changelog = { enabled: true };
        const { writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
          detailsPanel: {
            changelog: {
              visible: false,
            },
          },
        });
        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        expect(messageNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Changelog',
          href: '/docs/events/PaymentProcessed/0.0.1/changelog',
        });
        config.changelog = { enabled: false };
      });
    });

    describe('API & Contracts section', () => {
      it('lists a schema link when the message has a resolved schema entry', async () => {
        const { writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
          schemas: [{ ref: 'git://contracts/events/PaymentProcessed.schema.json' }],
        });
        mockSchemas.push({
          id: 'git://contracts/events/PaymentProcessed.schema.json',
          ref: 'git://contracts/events/PaymentProcessed.schema.json',
          format: 'jsonschema',
          source: { provider: 'git', path: 'events/PaymentProcessed.schema.json' },
          message: { collection: 'events', id: 'PaymentProcessed', version: '0.0.1' },
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        expect(messageNode).toHaveNavigationLink({
          type: 'item',
          title: 'Schema (JSON)',
          href: '/schemas/events/PaymentProcessed/0.0.1',
        });
      });

      it('does not list a schema link when declared schemas are not resolved', async () => {
        const { writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
          schemas: [{ ref: 'git://contracts/events/Missing.schema.json' }],
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        expect(messageNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Schema (JSON)',
          href: '/schemas/events/PaymentProcessed/0.0.1',
        });
      });

      it('uses a generic schemas label when the message has multiple resolved schemas', async () => {
        const { writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
          schemas: [
            { ref: 'git://contracts/events/PaymentProcessed.schema.json' },
            { ref: 'git://contracts/events/PaymentProcessed.schema.avsc' },
          ],
        });
        mockSchemas.push(
          {
            id: 'git://contracts/events/PaymentProcessed.schema.json',
            ref: 'git://contracts/events/PaymentProcessed.schema.json',
            format: 'jsonschema',
            source: { provider: 'git', path: 'events/PaymentProcessed.schema.json' },
            message: { collection: 'events', id: 'PaymentProcessed', version: '0.0.1' },
          },
          {
            id: 'git://contracts/events/PaymentProcessed.schema.avsc',
            ref: 'git://contracts/events/PaymentProcessed.schema.avsc',
            format: 'avro',
            source: { provider: 'git', path: 'events/PaymentProcessed.schema.avsc' },
            message: { collection: 'events', id: 'PaymentProcessed', version: '0.0.1' },
          }
        );

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        expect(messageNode).toHaveNavigationLink({
          type: 'item',
          title: 'Schemas',
          href: '/schemas/events/PaymentProcessed/0.0.1',
        });
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
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        expect(messageNode).toHaveNavigationLink({
          type: 'item',
          title: 'Map',
          href: '/visualiser/events/PaymentProcessed/0.0.1',
        });
      });

      it('the visalizer link is not displayed if the visualizer is turned off in the catalog configuration', async () => {
        // Globally set the visualizer to be disabled in the EventCatalog configuration
        config.visualiser.enabled = false;

        const { writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        expect(messageNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Map',
          href: '/visualiser/events/PaymentProcessed/0.0.1',
        });

        // Turn it back on
        config.visualiser.enabled = true;
      });
    });

    describe('field usage section', () => {
      it('the field usage link is shown when a service declares fields for the message', async () => {
        const { writeEvent, writeService } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
          schemaPath: 'schema.json',
        });
        mockSchemas.push({
          id: 'schema:events:PaymentProcessed:0.0.1:schema.json',
          format: 'jsonschema',
          file: 'schema.json',
          source: { provider: 'file', path: 'schema.json' },
          message: { collection: 'events', id: 'PaymentProcessed', version: '0.0.1' },
        });
        await writeService({
          id: 'ShippingService',
          name: 'Shipping Service',
          version: '0.0.1',
          markdown: 'Shipping Service',
          receives: [{ id: 'PaymentProcessed', version: '0.0.1', fields: ['orderId', 'amount'] }],
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        expect(messageNode).toHaveNavigationLink({
          type: 'item',
          title: 'Field Usage',
          href: '/docs/events/PaymentProcessed/0.0.1/field-lineage',
        });
      });

      it('the field usage link is shown when the message declares schemas', async () => {
        const { writeEvent, writeService } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
          schemas: [{ ref: 'git://contracts/events/PaymentProcessed.schema.json' }],
        });
        mockSchemas.push({
          id: 'git://contracts/events/PaymentProcessed.schema.json',
          ref: 'git://contracts/events/PaymentProcessed.schema.json',
          format: 'jsonschema',
          source: { provider: 'git', path: 'events/PaymentProcessed.schema.json' },
          message: { collection: 'events', id: 'PaymentProcessed', version: '0.0.1' },
        });
        await writeService({
          id: 'ShippingService',
          name: 'Shipping Service',
          version: '0.0.1',
          markdown: 'Shipping Service',
          receives: [{ id: 'PaymentProcessed', version: '0.0.1', fields: ['orderId', 'amount'] }],
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        expect(messageNode).toHaveNavigationLink({
          type: 'item',
          title: 'Field Usage',
          href: '/docs/events/PaymentProcessed/0.0.1/field-lineage',
        });
      });

      it('the field usage link is not shown when no service declares fields for the message', async () => {
        const { writeEvent, writeService } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
          schemaPath: 'schema.json',
        });
        await writeService({
          id: 'ShippingService',
          name: 'Shipping Service',
          version: '0.0.1',
          markdown: 'Shipping Service',
          receives: [{ id: 'PaymentProcessed', version: '0.0.1' }],
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        expect(messageNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Field Usage',
          href: '/docs/events/PaymentProcessed/0.0.1/field-lineage',
        });
      });

      it('the field usage link is not shown when the message has no schema', async () => {
        const { writeEvent, writeService } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });
        await writeService({
          id: 'ShippingService',
          name: 'Shipping Service',
          version: '0.0.1',
          markdown: 'Shipping Service',
          receives: [{ id: 'PaymentProcessed', version: '0.0.1', fields: ['orderId', 'amount'] }],
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        expect(messageNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Field Usage',
          href: '/docs/events/PaymentProcessed/0.0.1/field-lineage',
        });
      });

      it('the field usage link is shown when a service declares fields in its sends for the message', async () => {
        const { writeEvent, writeService } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '1.0.0',
          markdown: 'Inventory Adjusted',
          schemaPath: 'schema.json',
        });
        mockSchemas.push({
          id: 'schema:events:InventoryAdjusted:1.0.0:schema.json',
          format: 'jsonschema',
          file: 'schema.json',
          source: { provider: 'file', path: 'schema.json' },
          message: { collection: 'events', id: 'InventoryAdjusted', version: '1.0.0' },
        });
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          markdown: 'Inventory Service',
          sends: [{ id: 'InventoryAdjusted', version: '1.0.0', fields: ['productId', 'quantity'] }],
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:InventoryAdjusted:1.0.0', navigationData);
        expect(messageNode).toHaveNavigationLink({
          type: 'item',
          title: 'Field Usage',
          href: '/docs/events/InventoryAdjusted/1.0.0/field-lineage',
        });
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
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const producesMessagesSection = getChildNodeByTitle('Producers', messageNode.pages ?? []);
        expect(producesMessagesSection).toBeUndefined();
      });

      it('is not listed if the message is configured not to render the section', async () => {
        const { writeEvent, writeService } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
          detailsPanel: {
            producers: {
              visible: false,
            },
          },
        });
        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '0.0.1',
          markdown: 'Payment Service',
          sends: [{ id: 'PaymentProcessed', version: '0.0.1' }],
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const producesMessagesSection = getChildNodeByTitle('Producers', messageNode.pages ?? []);
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
        });

        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const producesMessagesSection = getChildNodeByTitle('Producers', messageNode.pages ?? []);
        expect(producesMessagesSection.pages).toEqual(['service:PaymentService:0.0.1']);
      });

      it('lists agent producers with agent sidebar references', async () => {
        const { writeEvent } = utils(CATALOG_FOLDER);

        mockAgents.push({
          id: 'FraudReviewAgent',
          name: 'Fraud Review Agent',
          version: '0.0.1',
          sends: [{ id: 'PaymentProcessed', version: '0.0.1' }],
        });

        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const producesMessagesSection = getChildNodeByTitle('Producers', messageNode.pages ?? []);
        expect(producesMessagesSection.pages).toEqual(['agent:FraudReviewAgent:0.0.1']);
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
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const consumersSection = getChildNodeByTitle('Consumers', messageNode.pages ?? []);
        expect(consumersSection).toBeUndefined();
      });

      it('is not listed if the message is configured not to render the section', async () => {
        const { writeEvent, writeService } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
          detailsPanel: {
            consumers: {
              visible: false,
            },
          },
        });

        await writeService({
          id: 'ShippingService',
          name: 'ShippingService',
          version: '0.0.1',
          markdown: 'ShippingService',
          receives: [{ id: 'PaymentProcessed', version: '0.0.1' }],
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const consumersSection = getChildNodeByTitle('Consumers', messageNode.pages ?? []);
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
        });

        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const consumersSection = getChildNodeByTitle('Consumers', messageNode.pages ?? []);
        expect(consumersSection.pages).toEqual(['service:ShippingService:0.0.1']);
      });

      it('lists agent consumers with agent sidebar references', async () => {
        const { writeEvent } = utils(CATALOG_FOLDER);

        mockAgents.push({
          id: 'FraudReviewAgent',
          name: 'Fraud Review Agent',
          version: '0.0.1',
          receives: [{ id: 'PaymentProcessed', version: '0.0.1' }],
        });

        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const consumersSection = getChildNodeByTitle('Consumers', messageNode.pages ?? []);
        expect(consumersSection.pages).toEqual(['agent:FraudReviewAgent:0.0.1']);
      });
    });

    describe('flows section', () => {
      it('is not listed if no flows reference the message', async () => {
        const { writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const flowsSection = getChildNodeByTitle('Appears in flows', messageNode.pages ?? []);
        expect(flowsSection).toBeUndefined();
      });

      it('lists flows that reference event, command, and query messages', async () => {
        const { writeEvent, writeCommand, writeQuery } = utils(CATALOG_FOLDER);

        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });
        await writeCommand({
          id: 'ReserveInventory',
          name: 'Reserve Inventory',
          version: '0.0.1',
          markdown: 'Reserve Inventory',
        });
        await writeQuery({
          id: 'GetPaymentStatus',
          name: 'Get Payment Status',
          version: '0.0.1',
          markdown: 'Get Payment Status',
        });

        mockFlows.push({
          id: 'CheckoutFlow',
          name: 'Checkout Flow',
          version: '0.0.1',
          markdown: 'Checkout Flow',
          steps: [
            { id: 'payment-processed', title: 'Payment processed', message: { id: 'PaymentProcessed' } },
            { id: 'reserve-inventory', title: 'Reserve inventory', message: { id: 'ReserveInventory', version: '0.0.1' } },
            { id: 'get-payment-status', title: 'Get payment status', message: { id: 'GetPaymentStatus' } },
          ],
        });

        const navigationData = await getNestedSideBarData();
        const eventNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const commandNode = getNavigationConfigurationByKey('command:ReserveInventory:0.0.1', navigationData);
        const queryNode = getNavigationConfigurationByKey('query:GetPaymentStatus:0.0.1', navigationData);

        expect(getChildNodeByTitle('Appears in flows', eventNode.pages ?? []).pages).toEqual(['flow:CheckoutFlow:0.0.1']);
        expect(getChildNodeByTitle('Appears in flows', commandNode.pages ?? []).pages).toEqual(['flow:CheckoutFlow:0.0.1']);
        expect(getChildNodeByTitle('Appears in flows', queryNode.pages ?? []).pages).toEqual(['flow:CheckoutFlow:0.0.1']);
      });

      it('deduplicates flows when multiple steps reference the same message', async () => {
        const { writeEvent } = utils(CATALOG_FOLDER);

        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        mockFlows.push({
          id: 'CheckoutFlow',
          name: 'Checkout Flow',
          version: '0.0.1',
          markdown: 'Checkout Flow',
          steps: [
            { id: 'payment-processed-1', title: 'Payment processed', message: { id: 'PaymentProcessed' } },
            { id: 'payment-processed-2', title: 'Payment processed again', message: { id: 'PaymentProcessed' } },
          ],
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const flowsSection = getChildNodeByTitle('Appears in flows', messageNode.pages ?? []);

        expect(flowsSection.pages).toEqual(['flow:CheckoutFlow:0.0.1']);
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
        });
      });

      it('is not listed if the message is configured not to render the section', async () => {
        const { writeEvent, writeUser } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });
        await writeUser({
          id: 'John Doe',
          name: 'John Doe',
          markdown: 'John Doe',
          avatarUrl: 'https://example.com/avatar.png',
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const ownersSection = getChildNodeByTitle('Owners', messageNode.pages ?? []);
        expect(ownersSection).toBeUndefined();
      });

      it('lists the owners that the message has if the message has owners', async () => {
        const { writeEvent, writeUser } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
          owners: ['John Doe'],
        });

        await writeUser({
          id: 'John Doe',
          name: 'John Doe',
          markdown: 'John Doe',
          avatarUrl: 'https://example.com/avatar.png',
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const ownersSection = getChildNodeByTitle('Owners', messageNode.pages ?? []);
        expect(ownersSection.pages).toEqual([{ type: 'item', title: 'John Doe', href: '/docs/users/John Doe' }]);
      });
    });

    describe('repository section', () => {
      it('is not listed if the message does not have a repository', async () => {
        const { writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const repositorySection = getChildNodeByTitle('Code', messageNode.pages ?? []);
        expect(repositorySection).toBeUndefined();
      });

      it('is not listed if the message is configured not to render the section', async () => {
        const { writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
          detailsPanel: {
            repository: {
              visible: false,
            },
          },
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const repositorySection = getChildNodeByTitle('Code', messageNode.pages ?? []);
        expect(repositorySection).toBeUndefined();
      });

      it('lists the repository if the message has a repository', async () => {
        const { writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
          repository: {
            url: 'https://github.com/eventcatalog/eventcatalog',
            language: 'TypeScript',
          },
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const repositorySection = getChildNodeByTitle('Code', messageNode.pages ?? []);
        expect(repositorySection).toBeDefined();
      });
    });

    describe('attachments section', () => {
      it('is not listed if the message does not have any attachments', async () => {
        const { writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const attachmentsSection = getChildNodeByTitle('Attachments', messageNode.pages ?? []);
        expect(attachmentsSection).toBeUndefined();
      });

      it('lists the attachments if the message has attachments configured', async () => {
        const { writeEvent } = utils(CATALOG_FOLDER);
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
          attachments: [
            {
              url: 'https://example.com/attachment.pdf',
              title: 'Attachment 1',
              type: 'pdf',
            },
          ],
        });

        const navigationData = await getNestedSideBarData();
        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const attachmentsSection = getChildNodeByTitle('Attachments', messageNode.pages ?? []);
        expect(attachmentsSection).toBeDefined();
        expect(attachmentsSection.pages).toEqual([
          {
            type: 'item',
            title: 'Attachment 1',
            href: 'https://example.com/attachment.pdf',
          },
        ]);
      });
    });
  });

  describe('container navigation items', () => {
    it('users can reference the latest version of a resource without passing in the version', async () => {
      const { writeDataStore } = utils(CATALOG_FOLDER);
      await writeDataStore({
        id: 'PaymentDataStore',
        name: 'Payment DataStore',
        version: '0.0.1',
        markdown: 'Payment DataStore',
        container_type: 'database',
      });
      const navigationData = await getNestedSideBarData();
      const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore', navigationData);
      expect(containerNode).toBeDefined();
    });

    describe('quick reference section', () => {
      it('the overview link is always listed in the navigation item', async () => {
        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        expect(containerNode).toHaveNavigationLink({
          type: 'item',
          title: 'Overview',
          href: '/docs/containers/PaymentDataStore/0.0.1',
        });
      });

      it('the changelog link is listed when changelog is enabled', async () => {
        config.changelog = { enabled: true };
        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });
        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        expect(containerNode).toHaveNavigationLink({
          type: 'item',
          title: 'Changelog',
          href: '/docs/containers/PaymentDataStore/0.0.1/changelog',
        });
        config.changelog = { enabled: false };
      });

      it('the changelog link is not listed when changelog is disabled', async () => {
        config.changelog = { enabled: false };
        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });
        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        expect(containerNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Changelog',
          href: '/docs/containers/PaymentDataStore/0.0.1/changelog',
        });
      });

      it('the changelog link is not listed when the container is configured to hide it', async () => {
        config.changelog = { enabled: true };
        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
          detailsPanel: {
            changelog: {
              visible: false,
            },
          },
        });
        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        expect(containerNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Changelog',
          href: '/docs/containers/PaymentDataStore/0.0.1/changelog',
        });
        config.changelog = { enabled: false };
      });
    });

    describe('architecture & design section', () => {
      it('the visualizer link is always listed in the navigation item', async () => {
        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        expect(containerNode).toHaveNavigationLink({
          type: 'item',
          title: 'Map',
          href: '/visualiser/containers/PaymentDataStore/0.0.1',
        });
      });

      it('the visualizer link is not displayed if the visualizer is turned off in the catalog configuration', async () => {
        // Globally set the visualizer to be disabled in the EventCatalog configuration
        config.visualiser.enabled = false;

        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        expect(containerNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Map',
          href: '/visualiser/containers/PaymentDataStore/0.0.1',
        });

        // Turn it back on
        config.visualiser.enabled = true;
      });
    });

    describe('writes section', () => {
      it('is not listed if the container does not have any services or data products that write to it', async () => {
        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const writesSection = getChildNodeByTitle('Writes', containerNode.pages ?? []);
        expect(writesSection).toBeUndefined();
      });

      it('is not listed if the container is configured not to render the section', async () => {
        const { writeDataStore, writeService } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
          detailsPanel: {
            // @ts-ignore
            services: {
              visible: false,
            },
          },
        });
        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '0.0.1',
          markdown: 'Payment Service',
          writesTo: [{ id: 'PaymentDataStore', version: '0.0.1' }],
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const writesSection = getChildNodeByTitle('Writes', containerNode.pages ?? []);
        expect(writesSection).toBeUndefined();
      });

      it('lists the services that write to the container', async () => {
        const { writeDataStore, writeService } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '0.0.1',
          markdown: 'Payment Service',
          writesTo: [{ id: 'PaymentDataStore', version: '0.0.1' }],
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const writesSection = getChildNodeByTitle('Writes', containerNode.pages ?? []);
        expect(writesSection.pages).toContain('service:PaymentService:0.0.1');
      });

      it('lists the data products that write to the container (have it as output)', async () => {
        const { writeDataStore, writeDataProduct } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        await writeDataProduct({
          id: 'PaymentPipeline',
          name: 'Payment Pipeline',
          version: '0.0.1',
          markdown: 'Payment Pipeline',
          outputs: [{ id: 'PaymentDataStore', version: '0.0.1' }],
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const writesSection = getChildNodeByTitle('Writes', containerNode.pages ?? []);
        expect(writesSection.pages).toContain('data-product:PaymentPipeline:0.0.1');
      });

      it('lists both services and data products that write to the container', async () => {
        const { writeDataStore, writeService, writeDataProduct } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '0.0.1',
          markdown: 'Payment Service',
          writesTo: [{ id: 'PaymentDataStore', version: '0.0.1' }],
        });

        await writeDataProduct({
          id: 'PaymentPipeline',
          name: 'Payment Pipeline',
          version: '0.0.1',
          markdown: 'Payment Pipeline',
          outputs: [{ id: 'PaymentDataStore', version: '0.0.1' }],
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const writesSection = getChildNodeByTitle('Writes', containerNode.pages ?? []);
        expect(writesSection.pages).toContain('service:PaymentService:0.0.1');
        expect(writesSection.pages).toContain('data-product:PaymentPipeline:0.0.1');
      });
    });

    describe('reads section', () => {
      it('is not listed if the container does not have any services or data products that read from it', async () => {
        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const readsSection = getChildNodeByTitle('Reads', containerNode.pages ?? []);
        expect(readsSection).toBeUndefined();
      });

      it('is not listed if the container is configured not to render the section', async () => {
        const { writeDataStore, writeService } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
          detailsPanel: {
            // @ts-ignore
            services: {
              visible: false,
            },
          },
        });
        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '0.0.1',
          markdown: 'Payment Service',
          readsFrom: [{ id: 'PaymentDataStore', version: '0.0.1' }],
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const readsSection = getChildNodeByTitle('Reads', containerNode.pages ?? []);
        expect(readsSection).toBeUndefined();
      });

      it('lists the services that read from the container', async () => {
        const { writeDataStore, writeService } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '0.0.1',
          markdown: 'Payment Service',
          readsFrom: [{ id: 'PaymentDataStore', version: '0.0.1' }],
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const readsSection = getChildNodeByTitle('Reads', containerNode.pages ?? []);
        expect(readsSection.pages).toContain('service:PaymentService:0.0.1');
      });

      it('lists the data products that read from the container (have it as input)', async () => {
        const { writeDataStore, writeDataProduct } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        await writeDataProduct({
          id: 'PaymentAnalytics',
          name: 'Payment Analytics',
          version: '0.0.1',
          markdown: 'Payment Analytics',
          inputs: [{ id: 'PaymentDataStore', version: '0.0.1' }],
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const readsSection = getChildNodeByTitle('Reads', containerNode.pages ?? []);
        expect(readsSection.pages).toContain('data-product:PaymentAnalytics:0.0.1');
      });

      it('lists both services and data products that read from the container', async () => {
        const { writeDataStore, writeService, writeDataProduct } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '0.0.1',
          markdown: 'Payment Service',
          readsFrom: [{ id: 'PaymentDataStore', version: '0.0.1' }],
        });

        await writeDataProduct({
          id: 'PaymentAnalytics',
          name: 'Payment Analytics',
          version: '0.0.1',
          markdown: 'Payment Analytics',
          inputs: [{ id: 'PaymentDataStore', version: '0.0.1' }],
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const readsSection = getChildNodeByTitle('Reads', containerNode.pages ?? []);
        expect(readsSection.pages).toContain('service:PaymentService:0.0.1');
        expect(readsSection.pages).toContain('data-product:PaymentAnalytics:0.0.1');
      });
    });

    describe('flows section', () => {
      it('is not listed if no flows reference the container', async () => {
        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const flowsSection = getChildNodeByTitle('Appears in flows', containerNode.pages ?? []);
        expect(flowsSection).toBeUndefined();
      });

      it('lists flows that reference the container in flow steps', async () => {
        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        mockFlows.push({
          id: 'CheckoutFlow',
          name: 'Checkout Flow',
          version: '0.0.1',
          markdown: 'Checkout Flow',
          steps: [{ id: 'payments-db', title: 'Payments DB', container: { id: 'PaymentDataStore' } }],
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const flowsSection = getChildNodeByTitle('Appears in flows', containerNode.pages ?? []);

        expect(flowsSection.pages).toEqual(['flow:CheckoutFlow:0.0.1']);
      });

      it('deduplicates flows when multiple steps reference the same container', async () => {
        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        mockFlows.push({
          id: 'CheckoutFlow',
          name: 'Checkout Flow',
          version: '0.0.1',
          markdown: 'Checkout Flow',
          steps: [
            { id: 'payments-db-read', title: 'Read Payments DB', container: { id: 'PaymentDataStore' } },
            { id: 'payments-db-write', title: 'Write Payments DB', container: { id: 'PaymentDataStore', version: '0.0.1' } },
          ],
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const flowsSection = getChildNodeByTitle('Appears in flows', containerNode.pages ?? []);

        expect(flowsSection.pages).toEqual(['flow:CheckoutFlow:0.0.1']);
      });

      it('is not listed if the container is configured not to render the section', async () => {
        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
          detailsPanel: {
            // @ts-ignore
            flows: {
              visible: false,
            },
          },
        });

        mockFlows.push({
          id: 'CheckoutFlow',
          name: 'Checkout Flow',
          version: '0.0.1',
          markdown: 'Checkout Flow',
          steps: [{ id: 'payments-db', title: 'Payments DB', container: { id: 'PaymentDataStore' } }],
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const flowsSection = getChildNodeByTitle('Appears in flows', containerNode.pages ?? []);
        expect(flowsSection).toBeUndefined();
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
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const ownersSection = getChildNodeByTitle('Owners', containerNode.pages ?? []);
        expect(ownersSection).toBeUndefined();
      });

      it('is not listed if the container is configured not to render the section', async () => {
        const { writeDataStore, writeUser } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
          owners: ['John Doe'],
          detailsPanel: {
            owners: {
              visible: false,
            },
          },
        });
        await writeUser({
          id: 'John Doe',
          name: 'John Doe',
          markdown: 'John Doe',
          avatarUrl: 'https://example.com/avatar.png',
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const ownersSection = getChildNodeByTitle('Owners', containerNode.pages ?? []);
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
        });

        await writeUser({
          id: 'John Doe',
          name: 'John Doe',
          markdown: 'John Doe',
          avatarUrl: 'https://example.com/avatar.png',
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const ownersSection = getChildNodeByTitle('Owners', containerNode.pages ?? []);
        expect(ownersSection.pages).toEqual([{ type: 'item', title: 'John Doe', href: '/docs/users/John Doe' }]);
      });
    });

    describe('repository section', () => {
      it('is not listed if the container does not have a repository', async () => {
        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const repositorySection = getChildNodeByTitle('Code', containerNode.pages ?? []);
        expect(repositorySection).toBeUndefined();
      });
    });

    describe('repository section', () => {
      it('is not listed if the container is configured not to render the section', async () => {
        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
          detailsPanel: {
            repository: {
              visible: false,
            },
          },
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const repositorySection = getChildNodeByTitle('Code', containerNode.pages ?? []);
        expect(repositorySection).toBeUndefined();
      });

      it('lists the repository if the container has a repository', async () => {
        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
          repository: {
            url: 'https://github.com/eventcatalog/eventcatalog',
            language: 'TypeScript',
          },
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);

        const repositorySection = getChildNodeByTitle('Code', containerNode.pages ?? []);

        expect(repositorySection).toBeDefined();
        expect(repositorySection.pages).toEqual([
          {
            type: 'item',
            title: 'https://github.com/eventcatalog/eventcatalog',
            href: 'https://github.com/eventcatalog/eventcatalog',
          },
        ]);
      });
    });

    describe('attachments section', () => {
      it('is not listed if the container does not have any attachments', async () => {
        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const attachmentsSection = getChildNodeByTitle('Attachments', containerNode.pages ?? []);
        expect(attachmentsSection).toBeUndefined();
      });
    });

    describe('attachments section', () => {
      it('lists the attachments if the container has attachments configured', async () => {
        const { writeDataStore } = utils(CATALOG_FOLDER);
        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
          attachments: [
            {
              url: 'https://example.com/attachment.pdf',
              title: 'Attachment 1',
              type: 'pdf',
            },
          ],
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const attachmentsSection = getChildNodeByTitle('Attachments', containerNode.pages ?? []);
        expect(attachmentsSection).toBeDefined();
        expect(attachmentsSection.pages).toEqual([
          {
            type: 'item',
            title: 'Attachment 1',
            href: 'https://example.com/attachment.pdf',
          },
        ]);
      });
    });
  });

  describe('channel navigation items', () => {
    it('users can reference the latest version of a resource without passing in the version', async () => {
      const { writeChannel } = utils(CATALOG_FOLDER);
      await writeChannel({
        id: 'PaymentChannel',
        name: 'Payment Channel',
        version: '0.0.1',
        markdown: 'Payment Channel',
      });
      const navigationData = await getNestedSideBarData();
      const channelNode = getNavigationConfigurationByKey('channel:PaymentChannel', navigationData);
      expect(channelNode).toBeDefined();
    });

    it('users can reference the latest version of a resource passing in the version', async () => {
      const { writeChannel } = utils(CATALOG_FOLDER);
      await writeChannel({
        id: 'PaymentChannel',
        name: 'Payment Channel',
        version: '0.0.1',
        markdown: 'Payment Channel',
      });
      const navigationData = await getNestedSideBarData();
      const channelNode = getNavigationConfigurationByKey('channel:PaymentChannel:0.0.1', navigationData);
      expect(channelNode).toBeDefined();
    });

    it('the changelog link is listed when changelog is enabled', async () => {
      config.changelog = { enabled: true };
      const { writeChannel } = utils(CATALOG_FOLDER);
      await writeChannel({
        id: 'PaymentChannel',
        name: 'Payment Channel',
        version: '0.0.1',
        markdown: 'Payment Channel',
      });
      const navigationData = await getNestedSideBarData();
      const channelNode = getNavigationConfigurationByKey('channel:PaymentChannel:0.0.1', navigationData);
      expect(channelNode).toHaveNavigationLink({
        type: 'item',
        title: 'Changelog',
        href: '/docs/channels/PaymentChannel/0.0.1/changelog',
      });
      config.changelog = { enabled: false };
    });

    it('the changelog link is not listed when changelog is disabled', async () => {
      config.changelog = { enabled: false };
      const { writeChannel } = utils(CATALOG_FOLDER);
      await writeChannel({
        id: 'PaymentChannel',
        name: 'Payment Channel',
        version: '0.0.1',
        markdown: 'Payment Channel',
      });
      const navigationData = await getNestedSideBarData();
      const channelNode = getNavigationConfigurationByKey('channel:PaymentChannel:0.0.1', navigationData);
      expect(channelNode).not.toHaveNavigationLink({
        type: 'item',
        title: 'Changelog',
        href: '/docs/channels/PaymentChannel/0.0.1/changelog',
      });
    });
  });

  describe('data product navigation items', () => {
    describe('flows section', () => {
      it('is not listed if no flows reference the data product', async () => {
        const { writeDataProduct } = utils(CATALOG_FOLDER);
        await writeDataProduct({
          id: 'PaymentAnalytics',
          name: 'Payment Analytics',
          version: '0.0.1',
          markdown: 'Payment Analytics',
        });

        const navigationData = await getNestedSideBarData();
        const dataProductNode = getNavigationConfigurationByKey('data-product:PaymentAnalytics:0.0.1', navigationData);
        const flowsSection = getChildNodeByTitle('Appears in flows', dataProductNode.pages ?? []);
        expect(flowsSection).toBeUndefined();
      });

      it('lists flows that reference the data product in flow steps', async () => {
        const { writeDataProduct } = utils(CATALOG_FOLDER);
        await writeDataProduct({
          id: 'PaymentAnalytics',
          name: 'Payment Analytics',
          version: '0.0.1',
          markdown: 'Payment Analytics',
        });

        mockFlows.push({
          id: 'CheckoutFlow',
          name: 'Checkout Flow',
          version: '0.0.1',
          markdown: 'Checkout Flow',
          steps: [{ id: 'payment-analytics', title: 'Payment Analytics', dataProduct: { id: 'PaymentAnalytics' } }],
        });

        const navigationData = await getNestedSideBarData();
        const dataProductNode = getNavigationConfigurationByKey('data-product:PaymentAnalytics:0.0.1', navigationData);
        const flowsSection = getChildNodeByTitle('Appears in flows', dataProductNode.pages ?? []);

        expect(flowsSection.pages).toEqual(['flow:CheckoutFlow:0.0.1']);
      });

      it('deduplicates flows when multiple steps reference the same data product', async () => {
        const { writeDataProduct } = utils(CATALOG_FOLDER);
        await writeDataProduct({
          id: 'PaymentAnalytics',
          name: 'Payment Analytics',
          version: '0.0.1',
          markdown: 'Payment Analytics',
        });

        mockFlows.push({
          id: 'CheckoutFlow',
          name: 'Checkout Flow',
          version: '0.0.1',
          markdown: 'Checkout Flow',
          steps: [
            { id: 'payment-analytics-ingest', title: 'Ingest Payment Analytics', dataProduct: { id: 'PaymentAnalytics' } },
            {
              id: 'payment-analytics-read',
              title: 'Read Payment Analytics',
              dataProduct: { id: 'PaymentAnalytics', version: '0.0.1' },
            },
          ],
        });

        const navigationData = await getNestedSideBarData();
        const dataProductNode = getNavigationConfigurationByKey('data-product:PaymentAnalytics:0.0.1', navigationData);
        const flowsSection = getChildNodeByTitle('Appears in flows', dataProductNode.pages ?? []);

        expect(flowsSection.pages).toEqual(['flow:CheckoutFlow:0.0.1']);
      });

      it('is not listed if the data product is configured not to render the section', async () => {
        const { writeDataProduct } = utils(CATALOG_FOLDER);
        await writeDataProduct({
          id: 'PaymentAnalytics',
          name: 'Payment Analytics',
          version: '0.0.1',
          markdown: 'Payment Analytics',
          detailsPanel: {
            flows: {
              visible: false,
            },
          },
        });

        mockFlows.push({
          id: 'CheckoutFlow',
          name: 'Checkout Flow',
          version: '0.0.1',
          markdown: 'Checkout Flow',
          steps: [{ id: 'payment-analytics', title: 'Payment Analytics', dataProduct: { id: 'PaymentAnalytics' } }],
        });

        const navigationData = await getNestedSideBarData();
        const dataProductNode = getNavigationConfigurationByKey('data-product:PaymentAnalytics:0.0.1', navigationData);
        const flowsSection = getChildNodeByTitle('Appears in flows', dataProductNode.pages ?? []);
        expect(flowsSection).toBeUndefined();
      });
    });
  });

  describe('flow navigation items', () => {
    it('lists messages, services, flows, data stores, and data products referenced by flow steps', async () => {
      const { writeEvent, writeCommand, writeQuery, writeService, writeDataStore, writeDataProduct } = utils(CATALOG_FOLDER);

      await writeEvent({
        id: 'PaymentRequested',
        name: 'Payment Requested',
        version: '0.0.1',
        markdown: 'Payment Requested',
      });
      await writeCommand({
        id: 'ReserveInventory',
        name: 'Reserve Inventory',
        version: '0.0.1',
        markdown: 'Reserve Inventory',
      });
      await writeQuery({
        id: 'GetPaymentStatus',
        name: 'Get Payment Status',
        version: '0.0.1',
        markdown: 'Get Payment Status',
      });
      await writeService({
        id: 'PaymentService',
        name: 'Payment Service',
        version: '0.0.1',
        markdown: 'Payment Service',
      });
      await writeDataStore({
        id: 'PaymentsDB',
        name: 'Payments DB',
        version: '0.0.1',
        markdown: 'Payments DB',
        container_type: 'database',
      });
      await writeDataProduct({
        id: 'PaymentAnalytics',
        name: 'Payment Analytics',
        version: '0.0.1',
        markdown: 'Payment Analytics',
      });
      mockAgents.push({
        id: 'FraudReviewAgent',
        name: 'Fraud Review Agent',
        version: '0.0.1',
        markdown: 'Fraud Review Agent',
      });

      mockFlows.push(
        {
          id: 'CheckoutFlow',
          name: 'Checkout Flow',
          version: '0.0.1',
          markdown: 'Checkout Flow',
          steps: [
            { id: 'payment-requested', title: 'Payment requested', message: { id: 'PaymentRequested' } },
            { id: 'reserve-inventory', title: 'Reserve inventory', message: { id: 'ReserveInventory', version: '0.0.1' } },
            { id: 'get-payment-status', title: 'Get payment status', message: { id: 'GetPaymentStatus' } },
            { id: 'payment-service', title: 'Payment service', service: { id: 'PaymentService' } },
            { id: 'fraud-review-agent', title: 'Fraud review agent', agent: { id: 'FraudReviewAgent' } },
            { id: 'fraud-flow', title: 'Fraud flow', flow: { id: 'FraudFlow' } },
            { id: 'payments-db', title: 'Payments DB', container: { id: 'PaymentsDB' } },
            { id: 'payment-analytics', title: 'Payment Analytics', dataProduct: { id: 'PaymentAnalytics' } },
          ],
        },
        {
          id: 'FraudFlow',
          name: 'Fraud Flow',
          version: '0.0.1',
          markdown: 'Fraud Flow',
          steps: [],
        }
      );

      const navigationData = await getNestedSideBarData();
      const flowNode = getNavigationConfigurationByKey('flow:CheckoutFlow:0.0.1', navigationData);
      const messagesSection = getChildNodeByTitle('Messages', flowNode.pages ?? []);
      const servicesSection = getChildNodeByTitle('Services', flowNode.pages ?? []);
      const agentsSection = getChildNodeByTitle('Agents', flowNode.pages ?? []);
      const subflowsSection = getChildNodeByTitle('Subflows', flowNode.pages ?? []);
      const dataStoresSection = getChildNodeByTitle('Data Stores', flowNode.pages ?? []);
      const dataProductsSection = getChildNodeByTitle('Data Products', flowNode.pages ?? []);

      expect(messagesSection.pages).toEqual([
        'event:PaymentRequested:0.0.1',
        'command:ReserveInventory:0.0.1',
        'query:GetPaymentStatus:0.0.1',
      ]);
      expect(servicesSection.pages).toEqual(['service:PaymentService:0.0.1']);
      expect(agentsSection.pages).toEqual(['agent:FraudReviewAgent:0.0.1']);
      expect(subflowsSection.pages).toEqual(['flow:FraudFlow:0.0.1']);
      expect(dataStoresSection.pages).toEqual(['container:PaymentsDB:0.0.1']);
      expect(dataProductsSection.pages).toEqual(['data-product:PaymentAnalytics:0.0.1']);

      const agentNode = getNavigationConfigurationByKey('agent:FraudReviewAgent:0.0.1', navigationData);
      const agentFlowsSection = getChildNodeByTitle('Appears in flows', agentNode.pages ?? []);
      expect(agentFlowsSection.pages).toEqual(['flow:CheckoutFlow:0.0.1']);
    });

    it('does not list reference sections when a flow has no resource step references', async () => {
      mockFlows.push({
        id: 'ManualFlow',
        name: 'Manual Flow',
        version: '0.0.1',
        markdown: 'Manual Flow',
        steps: [{ id: 'start', title: 'Start' }],
      });

      const navigationData = await getNestedSideBarData();
      const flowNode = getNavigationConfigurationByKey('flow:ManualFlow:0.0.1', navigationData);

      expect(getChildNodeByTitle('Messages', flowNode.pages ?? [])).toBeUndefined();
      expect(getChildNodeByTitle('Services', flowNode.pages ?? [])).toBeUndefined();
      expect(getChildNodeByTitle('Agents', flowNode.pages ?? [])).toBeUndefined();
      expect(getChildNodeByTitle('Subflows', flowNode.pages ?? [])).toBeUndefined();
      expect(getChildNodeByTitle('Data Stores', flowNode.pages ?? [])).toBeUndefined();
      expect(getChildNodeByTitle('Data Products', flowNode.pages ?? [])).toBeUndefined();
    });
  });

  describe('resource documentation sidebar sections', () => {
    it('renders Documentation sections for domain, service, message, flow, container, channel, and data product', async () => {
      const previousScale = process.env.EVENTCATALOG_SCALE;
      process.env.EVENTCATALOG_SCALE = 'true';
      try {
        const { writeDomain, writeService, writeEvent, writeDataStore, writeDataProduct, writeChannel } = utils(CATALOG_FOLDER);

        await writeDomain({
          id: 'Shipping',
          name: 'Shipping',
          version: '0.0.1',
          markdown: 'Shipping',
        });

        await writeService({
          id: 'ShippingService',
          name: 'Shipping Service',
          version: '0.0.1',
          markdown: 'Shipping Service',
        });

        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: 'Payment Processed',
        });

        await writeDataStore({
          id: 'PaymentDataStore',
          name: 'Payment DataStore',
          version: '0.0.1',
          markdown: 'Payment DataStore',
          container_type: 'database',
        });

        await writeDataProduct({
          id: 'PaymentAnalytics',
          name: 'Payment Analytics',
          version: '0.0.1',
          markdown: 'Payment Analytics',
        });

        await writeChannel({
          id: 'PaymentChannel',
          name: 'Payment Channel',
          version: '0.0.1',
          markdown: 'Payment Channel',
        });

        mockFlows.push({
          id: 'PaymentFlow',
          name: 'Payment Flow',
          version: '0.0.1',
          markdown: 'Payment Flow',
        });

        mockResourceDocs.push(
          {
            id: 'domains/Shipping/docs/adrs/order-boundary.mdx',
            collection: 'resourceDocs',
            filePath: 'domains/Shipping/docs/adrs/order-boundary.mdx',
            data: { id: 'order-boundary', type: 'adrs', version: '1.0.0', title: 'Order Boundary ADR' },
          },
          {
            id: 'domains/Shipping/docs/adrs/versioned/0.9.0/order-boundary.mdx',
            collection: 'resourceDocs',
            filePath: 'domains/Shipping/docs/adrs/versioned/0.9.0/order-boundary.mdx',
            data: { id: 'order-boundary', type: 'adrs', version: '0.9.0', title: 'Order Boundary ADR' },
          },
          {
            id: 'domains/Shipping/docs/operating-model.mdx',
            collection: 'resourceDocs',
            filePath: 'domains/Shipping/docs/operating-model.mdx',
            data: { id: 'operating-model', version: '1.0.0', title: 'Operating Model' },
          },
          {
            id: 'domains/Shipping/services/ShippingService/docs/adrs/service-boundary.mdx',
            collection: 'resourceDocs',
            filePath: 'domains/Shipping/services/ShippingService/docs/adrs/service-boundary.mdx',
            data: { id: 'service-boundary', type: 'adrs', version: '1.0.0', title: 'Service Boundary ADR' },
          },
          {
            id: 'domains/Shipping/services/ShippingService/events/PaymentProcessed/docs/runbooks/retry-failures.mdx',
            collection: 'resourceDocs',
            filePath: 'domains/Shipping/services/ShippingService/events/PaymentProcessed/docs/runbooks/retry-failures.mdx',
            data: { id: 'retry-failures', type: 'runbooks', version: '1.0.0', title: 'Retry Failures' },
          },
          {
            id: 'flows/PaymentFlow/docs/adrs/orchestration-strategy.mdx',
            collection: 'resourceDocs',
            filePath: 'flows/PaymentFlow/docs/adrs/orchestration-strategy.mdx',
            data: { id: 'orchestration-strategy', type: 'adrs', version: '1.0.0', title: 'Orchestration Strategy ADR' },
          },
          {
            id: 'containers/PaymentDataStore/docs/adrs/data-retention.mdx',
            collection: 'resourceDocs',
            filePath: 'containers/PaymentDataStore/docs/adrs/data-retention.mdx',
            data: { id: 'data-retention', type: 'adrs', version: '1.0.0', title: 'Data Retention ADR' },
          },
          {
            id: 'channels/PaymentChannel/docs/guides/channel-usage.mdx',
            collection: 'resourceDocs',
            filePath: 'channels/PaymentChannel/docs/guides/channel-usage.mdx',
            data: { id: 'channel-usage', type: 'guides', version: '1.0.0', title: 'Channel Usage Guide' },
          },
          {
            id: 'data-products/PaymentAnalytics/docs/contracts/fact-table-definition.mdx',
            collection: 'resourceDocs',
            filePath: 'data-products/PaymentAnalytics/docs/contracts/fact-table-definition.mdx',
            data: { id: 'fact-table-definition', type: 'contracts', version: '1.0.0', title: 'Fact Table Definition' },
          }
        );

        mockResourceDocCategories.push({
          id: 'domains/Shipping/docs/category.json',
          collection: 'resourceDocCategories',
          filePath: 'domains/Shipping/docs/category.json',
          data: { label: 'Pages', position: 1 },
        });

        const navigationData = await getNestedSideBarData();

        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        const domainDocs = getChildNodeByTitle('Documentation', domainNode.pages ?? []);
        const domainAdrs = getChildNodeByTitle('ADR', domainDocs.pages ?? []);
        const domainPages = getChildNodeByTitle('Pages', domainDocs.pages ?? []);
        expect(domainAdrs.pages).toEqual([
          { type: 'item', title: 'Order Boundary ADR', href: '/docs/domains/Shipping/0.0.1/adrs/order-boundary' },
        ]);
        expect(domainPages.pages).toEqual([
          { type: 'item', title: 'Operating Model', href: '/docs/domains/Shipping/0.0.1/pages/operating-model' },
        ]);

        const serviceNode = getNavigationConfigurationByKey('service:ShippingService:0.0.1', navigationData);
        const serviceDocs = getChildNodeByTitle('Documentation', serviceNode.pages ?? []);
        const serviceAdrs = getChildNodeByTitle('ADR', serviceDocs.pages ?? []);
        expect(serviceAdrs.pages).toEqual([
          {
            type: 'item',
            title: 'Service Boundary ADR',
            href: '/docs/services/ShippingService/0.0.1/adrs/service-boundary',
          },
        ]);

        const messageNode = getNavigationConfigurationByKey('event:PaymentProcessed:0.0.1', navigationData);
        const messageDocs = getChildNodeByTitle('Documentation', messageNode.pages ?? []);
        const messageRunbooks = getChildNodeByTitle('Runbook', messageDocs.pages ?? []);
        expect(messageRunbooks.pages).toEqual([
          {
            type: 'item',
            title: 'Retry Failures',
            href: '/docs/events/PaymentProcessed/0.0.1/runbooks/retry-failures',
          },
        ]);

        const flowNode = getNavigationConfigurationByKey('flow:PaymentFlow:0.0.1', navigationData);
        const flowDocs = getChildNodeByTitle('Documentation', flowNode.pages ?? []);
        const flowAdrs = getChildNodeByTitle('ADR', flowDocs.pages ?? []);
        expect(flowAdrs.pages).toEqual([
          {
            type: 'item',
            title: 'Orchestration Strategy ADR',
            href: '/docs/flows/PaymentFlow/0.0.1/adrs/orchestration-strategy',
          },
        ]);

        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const containerDocs = getChildNodeByTitle('Documentation', containerNode.pages ?? []);
        const containerAdrs = getChildNodeByTitle('ADR', containerDocs.pages ?? []);
        expect(containerAdrs.pages).toEqual([
          {
            type: 'item',
            title: 'Data Retention ADR',
            href: '/docs/containers/PaymentDataStore/0.0.1/adrs/data-retention',
          },
        ]);

        const channelNode = getNavigationConfigurationByKey('channel:PaymentChannel:0.0.1', navigationData);
        const channelDocs = getChildNodeByTitle('Documentation', channelNode.pages ?? []);
        const channelGuides = getChildNodeByTitle('Guide', channelDocs.pages ?? []);
        expect(channelGuides.pages).toEqual([
          {
            type: 'item',
            title: 'Channel Usage Guide',
            href: '/docs/channels/PaymentChannel/0.0.1/guides/channel-usage',
          },
        ]);

        const dataProductNode = getNavigationConfigurationByKey('data-product:PaymentAnalytics:0.0.1', navigationData);
        const dataProductDocs = getChildNodeByTitle('Documentation', dataProductNode.pages ?? []);
        const dataProductContracts = getChildNodeByTitle('Contract', dataProductDocs.pages ?? []);
        expect(dataProductContracts.pages).toEqual([
          {
            type: 'item',
            title: 'Fact Table Definition',
            href: '/docs/data-products/PaymentAnalytics/0.0.1/contracts/fact-table-definition',
          },
        ]);
      } finally {
        if (previousScale === undefined) {
          delete process.env.EVENTCATALOG_SCALE;
        } else {
          process.env.EVENTCATALOG_SCALE = previousScale;
        }
      }
    });
  });

  describe('system navigation items', () => {
    it('shows the System section with Domain Map when domains exist', async () => {
      const { writeDomain } = utils(CATALOG_FOLDER);
      await writeDomain({
        id: 'Shipping',
        name: 'Shipping',
        version: '0.0.1',
        markdown: 'Shipping',
      });

      const navigationData = await getNestedSideBarData();
      const systemNode = navigationData.nodes['list:system'] as NavNode;

      expect(systemNode).toBeDefined();
      expect(systemNode.title).toBe('System');
      expect(systemNode.pages).toEqual([
        {
          type: 'item',
          title: 'Domain Map',
          href: '/visualiser/domain-integrations',
        },
      ]);
    });

    it('does not show the System section when visualizer is disabled', async () => {
      config.visualiser.enabled = false;

      const { writeDomain } = utils(CATALOG_FOLDER);
      await writeDomain({
        id: 'Shipping',
        name: 'Shipping',
        version: '0.0.1',
        markdown: 'Shipping',
      });

      const navigationData = await getNestedSideBarData();
      const systemNode = navigationData.nodes['list:system'];

      expect(systemNode).toBeUndefined();

      // Turn it back on
      config.visualiser.enabled = true;
    });
  });
});
