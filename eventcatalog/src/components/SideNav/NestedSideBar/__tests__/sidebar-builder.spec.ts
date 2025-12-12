import { describe, it, expect, vi } from 'vitest';
import { getNestedSideBarData, type NavigationData, type NavNode } from '../sidebar-builder';
import type { ContentCollectionKey } from 'astro:content';
import utils from '@eventcatalog/sdk';
import path from 'path';
import fs from 'fs';
import config from '@config';

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
    getCollection: async (key: ContentCollectionKey) => {
      switch (key) {
        case 'domains':
          const { getDomains } = utils(CATALOG_FOLDER);
          const domains = (await getDomains()) ?? [];
          return Promise.resolve(domains.map((domain) => toAstroCollection(domain, 'domains')));
        case 'services':
          const { getServices } = utils(CATALOG_FOLDER);
          const services = (await getServices()) ?? [];
          return Promise.resolve(services.map((service) => toAstroCollection(service, 'services')));
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
          // NO SDK Support for flows yet, so we just mock it out for now
          return Promise.resolve([]);
        case 'channels':
          const { getChannels } = utils(CATALOG_FOLDER);
          const channels = (await getChannels()) ?? [];
          return Promise.resolve(channels.map((channel) => toAstroCollection(channel, 'channels')));
        default:
          return Promise.resolve([]);
      }
    },
  };
});

const buildDomainQuickReferenceSection = (resource: any) => {
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
      {
        type: 'item',
        title: 'Ubiquitous Language',
        href: `/docs/domains/${resource.data.id}/language`,
      },
    ],
  };
};

const getChildNodeByTitle = (title: string, pages: any[]) => {
  return pages.find((child: any) => child.title === title);
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
    fs.rmSync(CATALOG_FOLDER, { recursive: true, force: true });
    fs.mkdirSync(CATALOG_FOLDER, { recursive: true });
    // Remove any navigation data from teh config
    delete config.navigation;
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
      it('the overview link ubiquitous language link are always listed in the navigation item', async () => {
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
        expect(domainNode).toHaveNavigationLink({
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
        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        expect(domainNode).not.toHaveNavigationLink({
          type: 'item',
          title: 'Ubiquitous Language',
          href: '/docs/domains/Shipping/language',
        });
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
        });

        const navigationData = await getNestedSideBarData();
        const domainNode = getNavigationConfigurationByKey('domain:Shipping:0.0.1', navigationData);
        expect(domainNode).toHaveNavigationLink({
          type: 'item',
          title: 'Interaction Map',
          href: '/visualiser/domains/Shipping/0.0.1',
        });
        expect(domainNode).toHaveNavigationLink({
          type: 'item',
          title: 'Architecture Diagram',
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
          title: 'Interaction Map',
          href: '/visualiser/domains/Shipping/0.0.1',
        });

        // Turn it back on
        config.visualiser.enabled = true;
      });

      it('the entity map link is only listed if the domain has entities', async () => {
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
          title: 'Entity Map',
          href: '/visualiser/domains/Shipping/0.0.1/entity-map',
        });
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
        const flowsSection = getChildNodeByTitle('Flows', domainNode.pages ?? []);
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
        const entitiesSection = getChildNodeByTitle('Entities', domainNode.pages ?? []);
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
        const entitiesSection = getChildNodeByTitle('Entities', domainNode.pages ?? []);
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
        const entitiesSection = getChildNodeByTitle('Entities', domainNode.pages ?? []);
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
        const servicesInDomainSection = getChildNodeByTitle('Services In Domain', domainNode.pages ?? []);
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
        const servicesInDomainSection = getChildNodeByTitle('Services In Domain', domainNode.pages ?? []);

        console.log(domainNode);

        // expect(servicesInDomainSection.pages).toEqual(['service:ShippingService:0.0.1']);
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
    });

    describe('Architecture & Design section', () => {
      it('the architecture Diagram and visualizer links are always listed in the navigation item', async () => {
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
          title: 'Architecture Diagram',
          href: '/architecture/services/ShippingService/0.0.1',
        });
        expect(serviceNode).toHaveNavigationLink({
          type: 'item',
          title: 'Interaction Map',
          href: '/visualiser/services/ShippingService/0.0.1',
        });
      });

      it('the interaction map link is not displayed if the visualizer is turned off in the catalog configuration', async () => {
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
          title: 'Interaction Map',
          href: '/visualiser/services/ShippingService/0.0.1',
        });

        // Turn it back on
        config.visualiser.enabled = true;
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
        expect(entitiesSection.pages).toEqual(['entity:Order:0.0.1']);
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
          title: 'Interaction Map',
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
          title: 'Interaction Map',
          href: '/visualiser/events/PaymentProcessed/0.0.1',
        });

        // Turn it back on
        config.visualiser.enabled = true;
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
          title: 'Interaction Map',
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
          title: 'Interaction Map',
          href: '/visualiser/containers/PaymentDataStore/0.0.1',
        });

        // Turn it back on
        config.visualiser.enabled = true;
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
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const servicesSection = getChildNodeByTitle('Services (Writes)', containerNode.pages ?? []);
        expect(servicesSection).toBeUndefined();
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
        const servicesSection = getChildNodeByTitle('Services (Writes)', containerNode.pages ?? []);
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
        const servicesSection = getChildNodeByTitle('Services (Writes)', containerNode.pages ?? []);
        expect(servicesSection.pages).toEqual(['service:PaymentService:0.0.1']);
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
        });

        const navigationData = await getNestedSideBarData();
        const containerNode = getNavigationConfigurationByKey('container:PaymentDataStore:0.0.1', navigationData);
        const servicesSection = getChildNodeByTitle('Services (Reads)', containerNode.pages ?? []);
        expect(servicesSection).toBeUndefined();
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
        const servicesSection = getChildNodeByTitle('Services (Reads)', containerNode.pages ?? []);
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
        const servicesSection = getChildNodeByTitle('Services (Reads)', containerNode.pages ?? []);
        expect(servicesSection.pages).toEqual(['service:PaymentService:0.0.1']);
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
  });
});
