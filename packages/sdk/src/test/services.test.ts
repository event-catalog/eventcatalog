// sum.test.js
import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';
import { Specifications } from '../types';

const CATALOG_PATH = path.join(__dirname, 'catalog-services');

const {
  writeService,
  writeServiceToDomain,
  writeVersionedService,
  writeEvent,
  getService,
  getServiceByPath,
  getServices,
  versionService,
  rmService,
  rmServiceById,
  addFileToService,
  addEventToService,
  addCommandToService,
  addQueryToService,
  addEntityToService,
  serviceHasVersion,
  getSpecificationFilesForService,
  isService,
  toService,
  addDataStoreToService,
  writeDataStore,
} = utils(CATALOG_PATH);

// clean the catalog before each test
beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Services SDK', () => {
  describe('getService', () => {
    it('returns the given service id from EventCatalog and the latest version when no version is given,', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
        repository: {
          language: 'TypeScript',
          url: 'https://github.com/eventcatalog/eventcatalog',
        },
        attachments: ['https://example.com'],
        diagrams: [{ id: 'InventoryServiceDiagram', version: '1.0.0' }],
      });

      const test = await getService('InventoryService');

      expect(test).toEqual({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
        repository: {
          language: 'TypeScript',
          url: 'https://github.com/eventcatalog/eventcatalog',
        },
        attachments: ['https://example.com'],
        diagrams: [{ id: 'InventoryServiceDiagram', version: '1.0.0' }],
      });
    });

    it('returns the given service id from EventCatalog and the requested version when a version is given,', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      await versionService('InventoryService');

      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '1.0.0',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      const test = await getService('InventoryService', '0.0.1');

      expect(test).toEqual({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });
    });

    it('returns the latest version of the service if the version matches the latest version', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      const test = await getService('InventoryService', '0.0.1');

      expect(test).toEqual({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });
    });

    it('returns the latest version of the service when `latest` is passed as the version', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      await versionService('InventoryService');

      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '1.0.0',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      const test = await getService('InventoryService', 'latest');

      expect(test).toEqual({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '1.0.0',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });
    });

    it('returns undefined when a service cannot be found', async () => {
      await expect(await getService('PaymentService')).toEqual(undefined);
    });

    it('returns undefined if the service is found but not the version', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      await expect(await getService('InventoryService', '1.0.0')).toEqual(undefined);
    });

    it('returns the specifications for the service if the service has specifications', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        specifications: {
          asyncapiPath: 'spec.yaml',
          graphqlPath: 'spec.graphql',
        } satisfies Specifications,
        markdown: '# Hello world',
      });

      const test = await getService('InventoryService', 'latest');

      expect(test).toEqual({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
        specifications: { asyncapiPath: 'spec.yaml', graphqlPath: 'spec.graphql' },
      });
    });

    describe('getServiceByPath', () => {
      it('returns the given service id from EventCatalog and the latest version when no version is given,', async () => {
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service tat handles the inventory',
          markdown: '# Hello world',
        });

        const pathToService = path.join(CATALOG_PATH, 'services/InventoryService/index.mdx');

        const service = await getServiceByPath(pathToService);

        expect(service).toEqual({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service tat handles the inventory',
          markdown: '# Hello world',
        });
      });

      it('returns undefined if the service is not found', async () => {
        await expect(await getServiceByPath(path.join(CATALOG_PATH, 'services/PaymentService/index.mdx'))).toEqual(undefined);
      });
    });

    describe('when services are within a domain directory', () => {
      it('returns the given service id from EventCatalog and the latest version when no version is given,', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service tat handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        const test = await getService('InventoryService');

        expect(test).toEqual({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service tat handles the inventory',
          markdown: '# Hello world',
        });
      });

      it('returns the given service id from EventCatalog and the requested version when a version is given,', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service tat handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await versionService('InventoryService');

        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '1.0.0',
            summary: 'Service tat handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        const test = await getService('InventoryService', '0.0.1');

        expect(test).toEqual({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service tat handles the inventory',
          markdown: '# Hello world',
        });
      });
    });
  });

  describe('getServices', () => {
    it('returns all the services in the catalog,', async () => {
      // versioned service
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // latest service
      await writeService(
        {
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { versionExistingContent: true }
      );

      // service in the services folder
      await writeService(
        {
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/services/OrderService' }
      );

      const services = await getServices();

      expect(services).toEqual(
        expect.arrayContaining([
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'OrderService',
            name: 'Order Service',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
        ])
      );
    });

    it('when messages are nested into the service folder it only returns the services', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await writeEvent(
        {
          id: 'InventoryUpdatedEvent',
          version: '2.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
          name: 'Inventory Updated Event',
        },
        { path: '/services/InventoryService' }
      );

      const services = await getServices();

      expect(services).toEqual([
        {
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
      ]);
    });

    it('returns only the latest services when `latestOnly` is set to true,', async () => {
      // versioned service
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // latest service
      await writeService(
        {
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { versionExistingContent: true }
      );

      // service in the services folder
      await writeService(
        {
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/services/OrderService' }
      );

      // service in the services folder
      await writeService(
        {
          id: 'OrderService',
          name: 'Order Service',
          version: '2.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/services/OrderService', versionExistingContent: true }
      );

      const services = await getServices({ latestOnly: true });

      expect(services).toEqual(
        expect.arrayContaining([
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'OrderService',
            name: 'Order Service',
            version: '2.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
        ])
      );
    });
  });

  describe('writeService', () => {
    it('writes the given service to EventCatalog and assumes the path if one if not given', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
        sends: [{ id: 'InventoryUpdatedEvent', version: '2.0.0', to: [{ id: 'InventoryChannel', version: '1.0.0' }] }],
        receives: [{ id: 'OrderComplete', version: '2.0.0', from: [{ id: 'OrderChannel', version: '1.0.0' }] }],
      });

      const service = await getService('InventoryService');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(true);

      expect(service).toEqual({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
        sends: [{ id: 'InventoryUpdatedEvent', version: '2.0.0', to: [{ id: 'InventoryChannel', version: '1.0.0' }] }],
        receives: [{ id: 'OrderComplete', version: '2.0.0', from: [{ id: 'OrderChannel', version: '1.0.0' }] }],
      });
    });

    it('writes the given service (as .md) to EventCatalog if the format is .md', async () => {
      await writeService(
        {
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service tat handles the inventory',
          markdown: '# Hello world',
        },
        { format: 'md' }
      );

      const service = await getService('InventoryService');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.md'))).toBe(true);

      expect(service).toEqual({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });
    });

    it('writes the given service to EventCatalog under the correct path when a path is given', async () => {
      await writeService(
        {
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service tat handles the inventory',
          markdown: '# Hello world',
        },
        { path: '/Inventory/InventoryService' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/Inventory/InventoryService', 'index.mdx'))).toBe(true);
    });

    it('messages written to a service are always unique', async () => {
      await writeService(
        {
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service tat handles the inventory',
          markdown: '# Hello world',
          sends: [
            { id: 'InventoryUpdatedEvent', version: '2.0.0' },
            { id: 'InventoryUpdatedEvent', version: '2.0.0' },
            { id: 'InventoryRemoved', version: '1.0.0' },
            { id: 'InventoryRemoved', version: '1.0.0' },
            { id: 'InventoryUpdated', version: '1.0.0' },
          ],
          receives: [
            { id: 'OrderComplete', version: '2.0.0' },
            { id: 'OrderComplete', version: '2.0.0' },
          ],
        },
        { path: '/Inventory/InventoryService' }
      );

      const service = await getService('InventoryService');

      expect(service.sends).toHaveLength(3);
      expect(service.receives).toHaveLength(1);

      expect(service.sends).toEqual([
        {
          id: 'InventoryUpdatedEvent',
          version: '2.0.0',
        },
        {
          id: 'InventoryRemoved',
          version: '1.0.0',
        },
        {
          id: 'InventoryUpdated',
          version: '1.0.0',
        },
      ]);

      expect(service.receives).toEqual([
        {
          id: 'OrderComplete',
          version: '2.0.0',
        },
      ]);
    });

    it('throws an error when trying to write an service that already exists', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      await expect(
        writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service tat handles the inventory',
          markdown: '# Hello world',
        })
      ).rejects.toThrowError('Failed to write InventoryService (service) as the version 0.0.1 already exists');
    });

    it('overrides the service when trying to write an service that already exists and override is true', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      await writeService(
        {
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service tat handles the inventory',
          markdown: 'Overridden content',
        },
        { override: true }
      );

      const service = await getService('InventoryService');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(true);
      expect(service.markdown).toBe('Overridden content');
    });

    describe('versionExistingContent', () => {
      it('versions the previous service when trying to write a service that already exists and versionExistingContent is true and the new version number is greater than the previous one', async () => {
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service tat handles the inventory',
          markdown: '# Hello world',
        });

        await writeService(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '1.0.0',
            summary: 'Service tat handles the inventory',
            markdown: 'New',
          },
          { versionExistingContent: true }
        );

        const service = await getService('InventoryService');
        expect(service.version).toBe('1.0.0');
        expect(service.markdown).toBe('New');

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/versioned/0.0.1', 'index.mdx'))).toBe(true);
        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(true);
      });

      it('throws an error when trying to write a service and versionExistingContent is true and the new version number is not greater than the previous one', async () => {
        await writeService(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '1.0.0',
            summary: 'Service tat handles the inventory',
            markdown: 'New',
          },
          { versionExistingContent: true }
        );

        await expect(
          writeService(
            {
              id: 'InventoryService',
              name: 'Inventory Service',
              version: '0.0.0',
              summary: 'Service tat handles the inventory',
              markdown: 'New',
            },
            { versionExistingContent: true }
          )
        ).rejects.toThrowError('New version 0.0.0 is not greater than current version 1.0.0');
      });
    });
  });

  describe('writeVersionedService', () => {
    it('writes the given service to EventCatalog into versioned folder', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '1.0.0',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });
      await writeVersionedService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      const service = await getService('InventoryService', '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/versioned/0.0.1', 'index.mdx'))).toBe(true);

      expect(service).toEqual({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });
    });
  });

  describe('writeServiceToDomain', () => {
    it('writes a service to the given domain. When no version if given for the domain the service is added to the latest domain', async () => {
      await writeServiceToDomain(
        {
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service tat handles the inventory',
          markdown: '# Hello world',
        },
        {
          id: 'Shopping',
        }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService', 'index.mdx'))).toBe(true);
    });

    it('writes a service to the given domain (as md). When no version if given for the domain the service is added to the latest domain', async () => {
      await writeServiceToDomain(
        {
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service tat handles the inventory',
          markdown: '# Hello world',
        },
        {
          id: 'Shopping',
        },
        { format: 'md' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService', 'index.md'))).toBe(true);
    });

    it('writes a service to the given domain. When a version is given for the domain the service is added to that domain version', async () => {
      await writeServiceToDomain(
        {
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles the inventory',
          markdown: '# Hello world',
        },
        {
          id: 'Shopping',
          version: '1.0.0',
        }
      );
      expect(
        fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/versioned/1.0.0/services/InventoryService', 'index.mdx'))
      ).toBe(true);
    });
    it('writes a service to the given domain. When a version is the latest the service is added to the latest version of the domain', async () => {
      await writeServiceToDomain(
        {
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles the inventory',
          markdown: '# Hello world',
        },
        {
          id: 'Shopping',
          version: 'latest',
        }
      );
      expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService/', 'index.mdx'))).toBe(true);
    });

    it('when override is true, it overrides the service if it already exists', async () => {
      await writeServiceToDomain(
        {
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service tat handles the inventory',
          markdown: '# Hello world',
        },
        {
          id: 'Shopping',
        }
      );

      await writeServiceToDomain(
        {
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'This is overridden content',
          markdown: 'Overridden content',
        },
        {
          id: 'Shopping',
        },
        { override: true }
      );

      const service = await getService('InventoryService', '0.0.1');

      expect(service.markdown).toBe('Overridden content');
      expect(service.summary).toBe('This is overridden content');
      expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService', 'index.mdx'))).toBe(true);
    });
  });

  describe('versionService', () => {
    it('adds the given service to the versioned directory and removes itself from the root', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      await versionService('InventoryService');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/versioned/0.0.1', 'index.mdx'))).toBe(true);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(false);
    });
    it('adds the given service to the versioned directory and all files that are associated to it', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      // Add random file in there
      await fs.writeFileSync(path.join(CATALOG_PATH, 'services/InventoryService', 'schema.json'), 'SCHEMA!');

      await versionService('InventoryService');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/versioned/0.0.1', 'index.mdx'))).toBe(true);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/versioned/0.0.1', 'schema.json'))).toBe(true);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(false);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'schema.json'))).toBe(false);
    });

    describe('when services are within a domain directory', () => {
      it('versions a service within a domain correctly (cross-platform path handling)', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service that handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await versionService('InventoryService');

        // Service should be versioned within the domain directory
        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService/versioned/0.0.1', 'index.mdx'))
        ).toBe(true);
        expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService', 'index.mdx'))).toBe(false);
      });

      it('versions a service within a domain and preserves associated files', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service that handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        // Add a file to the service
        fs.writeFileSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService', 'schema.json'), 'SCHEMA!');

        await versionService('InventoryService');

        // Both the index and schema should be versioned
        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService/versioned/0.0.1', 'index.mdx'))
        ).toBe(true);
        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService/versioned/0.0.1', 'schema.json'))
        ).toBe(true);
        // Original files should be removed
        expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService', 'index.mdx'))).toBe(false);
        expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService', 'schema.json'))).toBe(false);
      });
    });
  });

  describe('rmService', () => {
    it('removes a service from eventcatalog by the given path', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(true);

      await rmService('/InventoryService');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(false);
    });

    it('removes all files with that service directory when the service is deleted', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      // add random file
      fs.writeFileSync(path.join(CATALOG_PATH, 'services/InventoryService', 'schema.json'), 'dummy-data');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(true);

      await rmService('/InventoryService');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(false);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'schema.json'))).toBe(false);
    });
  });

  describe('rmServiceById', () => {
    it('removes a service from eventcatalog by id', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(true);

      await rmServiceById('InventoryService');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(false);
    });

    it('removes all files with that service directory when the service is deleted by id', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      // add random file
      fs.writeFileSync(path.join(CATALOG_PATH, 'services/InventoryService', 'schema.json'), 'dummy-data');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(true);

      await rmServiceById('InventoryService');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(false);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'schema.json'))).toBe(false);
    });

    it('removes a service from eventcatalog by id and version', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(true);

      await rmServiceById('InventoryService', '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(false);
    });

    it('if version is given, only removes that version and not any other versions of the service', async () => {
      // write the first events
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      await versionService('InventoryService');

      // Write the versioned event
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Adjusted',
        version: '0.0.2',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(true);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/versioned/0.0.1', 'index.mdx'))).toBe(true);

      await rmServiceById('InventoryService', '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.mdx'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryAdjusted/versioned/0.0.2', 'index.mdx'))).toBe(false);
    });

    describe('when services are within a domain directory', () => {
      it('removes a service from eventcatalog by id', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service tat handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService', 'index.mdx'))).toBe(true);

        await rmServiceById('InventoryService');

        expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService', 'index.mdx'))).toBe(false);
      });

      it('removes a service from eventcatalog by id and version', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service tat handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService', 'index.mdx'))).toBe(true);

        await rmServiceById('InventoryService', '0.0.1');

        expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService', 'index.mdx'))).toBe(false);
      });
    });
  });

  describe('addFileToService', () => {
    it('takes a given file and writes it to the location of the given service', async () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      await addFileToService('InventoryService', file);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'test.txt'))).toBe(true);
    });

    it('takes a given file and version and writes the file to the correct location', async () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      await versionService('InventoryService');

      await addFileToService('InventoryService', file, '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/versioned/0.0.1', 'test.txt'))).toBe(true);
    });

    it('taskes a given file for the serivce with id using yaml block string ">-" and writes the file to correct location', async () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      await writeService({
        id: 'AVeryLargeIdWhichForcesWriteServiceToAddABlockCharacterxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service tat handles the inventory',
        markdown: '# Hello world',
      });

      await addFileToService(
        'AVeryLargeIdWhichForcesWriteServiceToAddABlockCharacterxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        file,
        '0.0.1'
      );

      expect(
        fs.existsSync(
          path.join(
            CATALOG_PATH,
            'services/AVeryLargeIdWhichForcesWriteServiceToAddABlockCharacterxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            'test.txt'
          )
        )
      ).toBe(true);
    });

    it('throws an error when trying to write to a service that does not exist', () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      expect(addFileToService('InventoryService', file)).rejects.toThrowError('Cannot find directory to write file to');
    });

    describe('when services are within a domain directory', () => {
      it('takes a given file and writes it to the location of the given service', async () => {
        const file = { content: 'hello', fileName: 'test.txt' };

        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service tat handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await addFileToService('InventoryService', file);

        expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService', 'test.txt'))).toBe(true);
      });

      it('takes a given file and version and writes the file to the correct location', async () => {
        const file = { content: 'hello', fileName: 'test.txt' };

        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service tat handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await versionService('InventoryService');

        await addFileToService('InventoryService', file, '0.0.1');

        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService/versioned/0.0.1', 'test.txt'))
        ).toBe(true);
      });
    });
  });

  describe('addEventToService', () => {
    it('takes an existing event and adds it to the sends of an existing service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      await addEventToService('InventoryService', 'sends', { id: 'InventoryUpdatedEvent', version: '2.0.0' }, '0.0.1');

      const service = await getService('InventoryService');

      expect(service).toEqual({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        sends: [
          {
            id: 'InventoryUpdatedEvent',
            version: '2.0.0',
          },
        ],
        markdown: '# Hello world',
      });
    });

    it('takes an existing event and adds it to the receives of an existing service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      await addEventToService('InventoryService', 'receives', { id: 'InventoryUpdatedEvent', version: '2.0.0' }, '0.0.1');

      const service = await getService('InventoryService');

      expect(service).toEqual({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        receives: [
          {
            id: 'InventoryUpdatedEvent',
            version: '2.0.0',
          },
        ],
        markdown: '# Hello world',
      });
    });

    it('throws an error when trying to add an event to a service with an unsupported direction', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      expect(
        addEventToService('InventoryService', 'doesnotexist', { id: 'InventoryUpdatedEvent', version: '2.0.0' }, '0.0.1')
      ).rejects.toThrowError("Direction doesnotexist is invalid, only 'receives' and 'sends' are supported");
    });

    it('when an event is added to the service, the extension of the service is maintained', async () => {
      await writeService(
        {
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles the inventory',
          markdown: '# Hello world',
        },
        { format: 'md' }
      );

      await addEventToService('InventoryService', 'sends', { id: 'InventoryUpdatedEvent', version: '2.0.0' }, '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.md'))).toBe(true);
    });

    describe('when services are within a domain directory', () => {
      it('takes an existing event and adds it to the sends of an existing service', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service that handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await addEventToService('InventoryService', 'sends', { id: 'InventoryUpdatedEvent', version: '2.0.0' }, '0.0.1');

        const service = await getService('InventoryService');

        expect(service).toEqual({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles the inventory',
          sends: [
            {
              id: 'InventoryUpdatedEvent',
              version: '2.0.0',
            },
          ],
          markdown: '# Hello world',
        });

        //expect file where is was
        expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService', 'index.mdx'))).toBe(true);
      });

      it('takes an existing event and adds it to the receives of an existing service', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service that handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await addEventToService('InventoryService', 'receives', { id: 'InventoryUpdatedEvent', version: '2.0.0' }, '0.0.1');

        const service = await getService('InventoryService');

        expect(service).toEqual({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles the inventory',
          receives: [
            {
              id: 'InventoryUpdatedEvent',
              version: '2.0.0',
            },
          ],
          markdown: '# Hello world',
        });
      });
    });
  });
  describe('addCommandToService', () => {
    it('takes an existing command and adds it to the sends of an existing service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      await addCommandToService('InventoryService', 'sends', { id: 'UpdateInventory', version: '2.0.0' }, '0.0.1');

      const service = await getService('InventoryService');

      expect(service).toEqual({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        sends: [
          {
            id: 'UpdateInventory',
            version: '2.0.0',
          },
        ],
        markdown: '# Hello world',
      });
    });

    it('takes an existing command and adds it to the receives of an existing service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      await addCommandToService('InventoryService', 'receives', { id: 'UpdateInventory', version: '2.0.0' }, '0.0.1');

      const service = await getService('InventoryService');

      expect(service).toEqual({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        receives: [
          {
            id: 'UpdateInventory',
            version: '2.0.0',
          },
        ],
        markdown: '# Hello world',
      });
    });

    describe('when services are within a domain directory', () => {
      it('takes an existing command and adds it to the sends of an existing service', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service that handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await addCommandToService('InventoryService', 'sends', { id: 'UpdateInventory', version: '2.0.0' }, '0.0.1');

        const service = await getService('InventoryService');

        expect(service).toEqual({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles the inventory',
          sends: [
            {
              id: 'UpdateInventory',
              version: '2.0.0',
            },
          ],
          markdown: '# Hello world',
        });
      });

      it('takes an existing command and adds it to the receives of an existing service', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service that handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await addCommandToService('InventoryService', 'receives', { id: 'UpdateInventory', version: '2.0.0' }, '0.0.1');

        const service = await getService('InventoryService');

        expect(service).toEqual({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles the inventory',
          receives: [
            {
              id: 'UpdateInventory',
              version: '2.0.0',
            },
          ],
          markdown: '# Hello world',
        });
      });
    });

    it('throws an error when trying to add an event to a service with an unsupported direction', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      expect(
        addCommandToService('InventoryService', 'doesnotexist', { id: 'InventoryUpdatedEvent', version: '2.0.0' }, '0.0.1')
      ).rejects.toThrowError("Direction doesnotexist is invalid, only 'receives' and 'sends' are supported");
    });
  });
  describe('addQueryToService', () => {
    it('takes an existing query and adds it to the sends of an existing service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      await addQueryToService('InventoryService', 'sends', { id: 'GetInventory', version: '2.0.0' }, '0.0.1');

      const service = await getService('InventoryService');

      expect(service).toEqual({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        sends: [
          {
            id: 'GetInventory',
            version: '2.0.0',
          },
        ],
        markdown: '# Hello world',
      });
    });

    it('takes an existing query and adds it to the receives of an existing service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      await addQueryToService('InventoryService', 'receives', { id: 'GetInventory', version: '2.0.0' }, '0.0.1');

      const service = await getService('InventoryService');

      expect(service).toEqual({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        receives: [
          {
            id: 'GetInventory',
            version: '2.0.0',
          },
        ],
        markdown: '# Hello world',
      });
    });

    describe('when services are within a domain directory', () => {
      it('takes an existing query and adds it to the sends of an existing service', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service that handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await addQueryToService('InventoryService', 'sends', { id: 'GetInventory', version: '2.0.0' }, '0.0.1');

        const service = await getService('InventoryService');

        expect(service).toEqual({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles the inventory',
          sends: [
            {
              id: 'GetInventory',
              version: '2.0.0',
            },
          ],
          markdown: '# Hello world',
        });
      });

      it('takes an existing query and adds it to the receives of an existing service', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service that handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await addQueryToService('InventoryService', 'receives', { id: 'GetInventory', version: '2.0.0' }, '0.0.1');

        const service = await getService('InventoryService');

        expect(service).toEqual({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles the inventory',
          receives: [
            {
              id: 'GetInventory',
              version: '2.0.0',
            },
          ],
          markdown: '# Hello world',
        });
      });
    });

    it('throws an error when trying to add an event to a service with an unsupported direction', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      expect(
        addQueryToService('InventoryService', 'doesnotexist', { id: 'GetInventory', version: '2.0.0' }, '0.0.1')
      ).rejects.toThrowError("Direction doesnotexist is invalid, only 'receives' and 'sends' are supported");
    });
  });

  describe('addEntityToService', () => {
    it('takes an existing entity and adds it to an existing service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      await addEntityToService('InventoryService', { id: 'User', version: '1.0.0' }, '0.0.1');

      const service = await getService('InventoryService');

      expect(service).toEqual({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        entities: [
          {
            id: 'User',
            version: '1.0.0',
          },
        ],
        markdown: '# Hello world',
      });
    });

    it('adds multiple entities to a service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      await addEntityToService('InventoryService', { id: 'User', version: '1.0.0' }, '0.0.1');
      await addEntityToService('InventoryService', { id: 'Product', version: '2.0.0' }, '0.0.1');

      const service = await getService('InventoryService');

      expect(service.entities).toEqual([
        {
          id: 'User',
          version: '1.0.0',
        },
        {
          id: 'Product',
          version: '2.0.0',
        },
      ]);
    });

    it('does not add duplicate entities to a service', async () => {
      await writeService({
        id: 'InventoryService2',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      await addEntityToService('InventoryService2', { id: 'User', version: '1.0.0' }, '0.0.1');
      await addEntityToService('InventoryService2', { id: 'User', version: '1.0.0' }, '0.0.1');

      const service = await getService('InventoryService2');

      expect(service.entities).toEqual([
        {
          id: 'User',
          version: '1.0.0',
        },
      ]);
    });

    it('maintains the extension of the service when adding an entity', async () => {
      await writeService(
        {
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles the inventory',
          markdown: '# Hello world',
        },
        { format: 'md' }
      );

      await addEntityToService('InventoryService', { id: 'User', version: '1.0.0' }, '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService', 'index.md'))).toBe(true);
    });

    describe('when services are within a domain directory', () => {
      it('adds an entity to a service within a domain and maintains location', async () => {
        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '0.0.1',
            summary: 'Service that handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await addEntityToService('InventoryService', { id: 'User', version: '1.0.0' }, '0.0.1');
        // Ensure file remains in the domain directory
        expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Shopping/services/InventoryService', 'index.mdx'))).toBe(true);
      });
    });
  });

  describe('serviceHasVersion', () => {
    it('returns true when a given service and version exists in the catalog', async () => {
      await writeService({
        id: 'AccountService',
        name: 'Accounts Service',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(await serviceHasVersion('AccountService', '0.0.1')).toEqual(true);
    });

    it('returns true when a semver version is given and the version exists in the catalog', async () => {
      await writeService({
        id: 'AccountService',
        name: 'Accounts Service',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(await serviceHasVersion('AccountService', '0.0.x')).toEqual(true);
    });

    it('returns true when a `latest` version is given and the version exists in the catalog', async () => {
      await writeService({
        id: 'AccountService',
        name: 'Accounts Service',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(await serviceHasVersion('AccountService', 'latest')).toEqual(true);
    });

    it('returns false when service does not exist in the catalog', async () => {
      await writeService({
        id: 'AccountService',
        name: 'Accounts Service',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(await serviceHasVersion('AccountService', '5.0.0')).toEqual(false);
    });
  });

  describe('getSpecificationFilesForService', () => {
    it('returns the specification files for a service', async () => {
      await writeService({
        id: 'AccountService',
        name: 'Accounts Service',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        specifications: {
          asyncapiPath: 'spec.yaml',
          graphqlPath: 'spec.graphql',
        },
      });

      await addFileToService('AccountService', { content: 'fake-async-api-file', fileName: 'spec.yaml' }, '0.0.1');
      await addFileToService('AccountService', { content: 'fake-graphql-file', fileName: 'spec.graphql' }, '0.0.1');

      const specFiles = await getSpecificationFilesForService('AccountService', '0.0.1');

      expect(specFiles).toEqual([
        {
          content: 'fake-async-api-file',
          fileName: 'spec.yaml',
          path: expect.stringContaining(path.join('services', 'AccountService', 'spec.yaml')),
          key: 'asyncapiPath',
        },
        {
          content: 'fake-graphql-file',
          fileName: 'spec.graphql',
          path: expect.stringContaining(path.join('services', 'AccountService', 'spec.graphql')),
          key: 'graphqlPath',
        },
      ]);
    });

    it('returns the specification files for a service (if specifications is an array)', async () => {
      await writeService({
        id: 'AccountService',
        name: 'Accounts Service',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        specifications: [
          {
            type: 'asyncapi',
            path: 'spec.yaml',
          },
          {
            type: 'graphql',
            path: 'spec.graphql',
          },
        ],
      });

      await addFileToService('AccountService', { content: 'fake-async-api-file', fileName: 'spec.yaml' }, '0.0.1');
      await addFileToService('AccountService', { content: 'fake-graphql-file', fileName: 'spec.graphql' }, '0.0.1');

      const specFiles = await getSpecificationFilesForService('AccountService', '0.0.1');

      expect(specFiles).toEqual([
        {
          content: 'fake-async-api-file',
          fileName: 'spec.yaml',
          path: expect.stringContaining(path.join('services', 'AccountService', 'spec.yaml')),
          key: 'asyncapi',
        },
        {
          content: 'fake-graphql-file',
          fileName: 'spec.graphql',
          path: expect.stringContaining(path.join('services', 'AccountService', 'spec.graphql')),
          key: 'graphql',
        },
      ]);
    });

    it('returns the specification files for a versioned service', async () => {
      await writeService({
        id: 'AccountService',
        name: 'Accounts Service',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        specifications: {
          asyncapiPath: 'spec.yaml',
        },
      });

      await addFileToService('AccountService', { content: 'fake-async-api-file', fileName: 'spec.yaml' }, '0.0.1');

      await versionService('AccountService');

      const specFiles = await getSpecificationFilesForService('AccountService', '0.0.1');

      expect(specFiles).toEqual([
        {
          content: 'fake-async-api-file',
          fileName: 'spec.yaml',
          path: expect.stringContaining(path.join('services', 'AccountService', 'versioned', '0.0.1', 'spec.yaml')),
          key: 'asyncapiPath',
        },
      ]);
    });

    it('throw an error if the specifications have been defined in the service but nothing can be found on disk', async () => {
      await writeService({
        id: 'AccountService',
        name: 'Accounts Service',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        specifications: {
          asyncapiPath: 'spec.yaml',
        },
      });

      await expect(getSpecificationFilesForService('AccountService', '0.0.1')).rejects.toThrowError(
        'File spec.yaml does not exist in resource AccountService v(0.0.1)'
      );
    });
    it('returns an empty array of no specifications for a service have been defined', async () => {
      await writeService({
        id: 'AccountService',
        name: 'Accounts Service',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      const specFiles = await getSpecificationFilesForService('AccountService', '0.0.1');

      expect(specFiles).toEqual([]);
    });

    describe('when services are within a domain directory', () => {
      it('returns the specification files for a service', async () => {
        await writeServiceToDomain(
          {
            id: 'AccountService',
            name: 'Accounts Service',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
            specifications: {
              asyncapiPath: 'spec.yaml',
            },
          },
          { id: 'Shopping' }
        );

        await addFileToService('AccountService', { content: 'fake-async-api-file', fileName: 'spec.yaml' }, '0.0.1');

        const specFiles = await getSpecificationFilesForService('AccountService', '0.0.1');

        expect(specFiles).toEqual([
          {
            content: 'fake-async-api-file',
            fileName: 'spec.yaml',
            path: expect.stringContaining(path.join('services', 'AccountService', 'spec.yaml')),
            key: 'asyncapiPath',
          },
        ]);
      });

      it('returns the specification files for a versioned service', async () => {
        await writeServiceToDomain(
          {
            id: 'AccountService',
            name: 'Accounts Service',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
            specifications: {
              asyncapiPath: 'spec.yaml',
            },
          },
          { id: 'Shopping' }
        );

        await addFileToService('AccountService', { content: 'fake-async-api-file', fileName: 'spec.yaml' }, '0.0.1');

        await versionService('AccountService');

        const specFiles = await getSpecificationFilesForService('AccountService', '0.0.1');

        expect(specFiles).toEqual([
          {
            content: 'fake-async-api-file',
            fileName: 'spec.yaml',
            path: expect.stringContaining(path.join('services', 'AccountService', 'versioned', '0.0.1', 'spec.yaml')),
            key: 'asyncapiPath',
          },
        ]);
      });
    });
  });

  describe('addMessageToService (addEventToService)', () => {
    it('adds the given message to the service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await addEventToService('InventoryService', 'sends', { id: 'InventoryAdjusted', version: '0.0.1' }, '0.0.1');

      const service = await getService('InventoryService');

      expect(service.sends).toEqual([
        {
          id: 'InventoryAdjusted',
          version: '0.0.1',
        },
      ]);
    });

    it('the folder location of the service does not change when adding a message to the service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      await writeEvent({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await addEventToService('InventoryService', 'sends', { id: 'InventoryAdjusted', version: '0.0.1' }, '0.0.1');

      const pathToService = path.join(CATALOG_PATH, 'services', 'InventoryService');
      expect(fs.existsSync(pathToService)).toEqual(true);
    });
  });

  describe('addDataStoreToService (addDataStoreToService)', () => {
    it('adds the given data store to the service (writesTo)', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });

      await addDataStoreToService('InventoryService', 'writesTo', { id: 'orders-db', version: '0.0.1' }, '0.0.1');

      const service = await getService('InventoryService');

      expect(service.writesTo).toEqual([
        {
          id: 'orders-db',
          version: '0.0.1',
        },
      ]);
    });

    it('adds the given data store to the service (readsFrom)', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });

      await addDataStoreToService('InventoryService', 'readsFrom', { id: 'orders-db', version: '0.0.1' }, '0.0.1');

      const service = await getService('InventoryService');

      expect(service.readsFrom).toEqual([
        {
          id: 'orders-db',
          version: '0.0.1',
        },
      ]);
    });

    it('the folder location of the service does not change when adding a data store to the service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });

      await addDataStoreToService('InventoryService', 'writesTo', { id: 'orders-db', version: '0.0.1' }, '0.0.1');

      const pathToService = path.join(CATALOG_PATH, 'services', 'InventoryService');
      expect(fs.existsSync(pathToService)).toEqual(true);
    });
  });

  describe('isService', () => {
    it('returns true if the path is a service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      expect(await isService(path.join(CATALOG_PATH, 'services', 'InventoryService', 'index.mdx'))).toEqual(true);
    });

    it('returns false if the path is not a service', async () => {
      expect(await isService('/services/InventoryService/index.mdx')).toEqual(false);
    });
  });

  describe('toService', () => {
    it('converts a file to a service', async () => {
      // First we create a service for the test
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles the inventory',
        markdown: '# Hello world',
      });

      // Get the path to the service
      const pathToService = path.join(CATALOG_PATH, 'services', 'InventoryService', 'index.mdx');

      // Convert the file to a service
      const service = await toService(fs.readFileSync(pathToService, 'utf8'));

      // Assert the service is correct
      expect(service).toEqual(
        expect.objectContaining({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles the inventory',
          markdown: '# Hello world',
        })
      );
    });
  });
});
