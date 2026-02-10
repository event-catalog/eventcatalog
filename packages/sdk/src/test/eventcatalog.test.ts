import utils from '../index';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';

const CATALOG_PATH = path.join(__dirname, 'catalog-eventcatalog');

const { dumpCatalog, getEventCatalogConfigurationFile } = utils(CATALOG_PATH);

// clean the catalog before each test
beforeEach(() => {
  // fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  // fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(async () => {
  const dump = await dumpCatalog();
  fs.writeFileSync(path.join(CATALOG_PATH, 'eventcatalog.json'), JSON.stringify(dump, null, 2));
  // fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('EventCatalog', () => {
  describe('dumpCatalog', () => {
    it('the dump file should contain the catalog version, dump version and the createdAt date', async () => {
      const dump = await dumpCatalog();
      expect(dump.catalogVersion).toBe('2.33.5');
      expect(dump.version).toBe('0.0.1');
      expect(dump.createdAt).toBeDefined();
    });

    it('should not include markdown if the includeMarkdown option is false', async () => {
      const dump = await dumpCatalog({ includeMarkdown: false });
      expect(dump.resources.messages?.events?.[0].markdown).toBeUndefined();
    });

    describe('domains', () => {
      it('returns a list of domains from the catalog', async () => {
        const dump = await dumpCatalog();
        expect(dump.resources.domains).toHaveLength(3);

        const domain1 = dump.resources.domains?.[0];

        expect(domain1).toEqual(
          expect.objectContaining({
            id: 'Orders',
            name: 'Orders',
            version: '0.0.3',
            owners: ['dboyne', 'full-stack'],
            services: [
              {
                id: 'InventoryService',
              },
              {
                id: 'OrdersService',
              },
              {
                id: 'NotificationService',
              },
              {
                id: 'ShippingService',
              },
            ],
          })
        );
      });
    });

    describe('services', () => {
      it('returns a list of services from the catalog', async () => {
        const dump = await dumpCatalog();
        expect(dump.resources.services).toHaveLength(6);

        const service1 = dump.resources.services?.[0];

        expect(service1).toEqual(
          expect.objectContaining({
            id: 'ShippingService',
            version: '0.0.1',
            name: 'Shipping Service',
            summary: 'Service that handles shipping\n',
            owners: ['dboyne'],
            repository: {
              language: 'JavaScript',
              url: 'https://github.com/event-catalog/pretend-shipping-service',
            },
            markdown: expect.any(String),
          })
        );

        expect(service1?.sends).toHaveLength(6);
        expect(service1?.receives).toHaveLength(5);
      });
    });

    describe('messages', () => {
      describe('events', () => {
        it('returns a list of events from the catalog', async () => {
          const dump = await dumpCatalog();
          expect(dump.resources.messages?.events).toHaveLength(14);
        });
      });

      describe('queries', () => {
        it('returns a list of queries from the catalog', async () => {
          const dump = await dumpCatalog();
          expect(dump.resources.messages?.queries).toHaveLength(5);
        });
      });

      describe('commands', () => {
        it('returns a list of commands from the catalog', async () => {
          const dump = await dumpCatalog();
          expect(dump.resources.messages?.commands).toHaveLength(8);
        });
      });
    });

    describe('teams', () => {
      it('returns a list of teams from the catalog', async () => {
        const dump = await dumpCatalog();
        expect(dump.resources.teams).toHaveLength(4);
      });
    });

    describe('users', () => {
      it('returns a list of users from the catalog', async () => {
        const dump = await dumpCatalog();
        expect(dump.resources.users).toHaveLength(23);
      });
    });

    describe('channels', () => {
      it('returns a list of channels from the catalog', async () => {
        const dump = await dumpCatalog();
        expect(dump.resources.channels).toHaveLength(3);
      });
    });
  });

  describe('getEventCatalogConfigurationFile', () => {
    it('returns the event catalog configuration file', async () => {
      const config = await getEventCatalogConfigurationFile();
      expect(config).toEqual({
        cId: '8027010c-f3d6-417a-8234-e2f46087fc56',
        title: 'FlowMart',
        tagline:
          'Welcome to FlowMart EventCatalog. Here you can find all the information you need to know about our events and services (demo catalog).',
        organizationName: 'FlowMart',
        homepageLink: 'https://eventcatalog.dev',
        editUrl: 'https://github.com/event-catalog/eventcatalog/edit/main',
        port: 3000,
        outDir: 'dist',
        logo: {
          alt: 'FlowMart',
          src: '/logo.svg',
          text: 'FlowMart',
        },
        base: '/',
        trailingSlash: false,
        mermaid: {
          iconPacks: ['logos'],
        },
        rss: {
          enabled: true,
          limit: 15,
        },
        llmsTxt: {
          enabled: true,
        },
        chat: {
          enabled: true,
          similarityResults: 50,
          max_tokens: 4096,
          model: 'Hermes-3-Llama-3.2-3B-q4f16_1-MLC',
        },
        generators: [
          [
            '@eventcatalog/generator-ai',
            {
              debug: true,
              splitMarkdownFiles: false,
            },
          ],
        ],
        customDocs: {
          sidebar: [
            {
              label: 'Guides',
              badge: {
                text: 'New',
                color: 'green',
              },
              collapsed: false,
              items: [
                {
                  label: 'Creating new microservices',
                  autogenerated: {
                    directory: 'guides/creating-new-microservices',
                  },
                },
                {
                  label: 'Event Storming',
                  autogenerated: {
                    directory: 'guides/event-storming',
                    collapsed: false,
                  },
                },
              ],
            },
            {
              label: 'Technical Architecture & Design',
              badge: {
                text: 'New',
                color: 'green',
              },
              collapsed: false,
              items: [
                {
                  label: 'Architecture Decision Records',
                  autogenerated: {
                    directory: 'technical-architecture-design/architecture-decision-records',
                    collapsed: false,
                  },
                },
                {
                  label: 'System Architecture Diagrams',
                  autogenerated: {
                    directory: 'technical-architecture-design/system-architecture-diagrams',
                    collapsed: false,
                  },
                },
                {
                  label: 'Infrastructure as Code',
                  autogenerated: {
                    directory: 'technical-architecture-design/infrastructure-as-code',
                    collapsed: false,
                  },
                },
                {
                  label: 'Read more on GitHub',
                  link: 'https://github.com/event-catalog/eventcatalog',
                  attrs: {
                    target: '_blank',
                    style: 'font-style: italic;',
                  },
                },
              ],
            },
            {
              label: 'Operations & Support',
              badge: {
                text: 'New',
                color: 'green',
              },
              collapsed: false,
              items: [
                {
                  label: 'Runbooks',
                  autogenerated: {
                    directory: 'operations-and-support/runbooks',
                    collapsed: false,
                  },
                },
              ],
            },
          ],
        },
      });
    });
  });
});
