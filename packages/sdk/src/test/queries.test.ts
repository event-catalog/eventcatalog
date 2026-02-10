// sum.test.js
import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-queries');

const {
  writeQuery,
  writeQueryToService,
  getQuery,
  getQueries,
  rmQuery,
  rmQueryById,
  versionQuery,
  addFileToQuery,
  addSchemaToQuery,
  queryHasVersion,
  writeServiceToDomain,
  writeService,
  writeDomain,
} = utils(CATALOG_PATH);

// clean the catalog before each test
beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Queries SDK', () => {
  describe('getQuery', () => {
    it('returns the given query id from EventCatalog and the latest version when no version is given,', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        attachments: ['https://example.com'],
      });

      const test = await getQuery('GetOrder');

      expect(test).toEqual({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        attachments: ['https://example.com'],
      });
    });

    it('returns the given query id from EventCatalog and the latest version when no version is given and the query is inside a services folder,', async () => {
      await writeQuery(
        {
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/services/InventoryService/GetOrder' }
      );

      const test = await getQuery('GetOrder');

      expect(test).toEqual({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('returns the given query id from EventCatalog and the requested version when a version is given,', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await versionQuery('GetOrder');

      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '1.0.0',
        summary: 'This is version 1.0.0',
        markdown: '# Hello world',
      });

      const test = await getQuery('GetOrder', '0.0.1');

      expect(test).toEqual({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('returns the latest version of the query if the version matches the latest version', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      const test = await getQuery('GetOrder', '0.0.1');

      expect(test).toEqual({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('returns the version of the query even if the query does not match semver matching', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '100',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      const test = await getQuery('GetOrder', '100');

      expect(test).toEqual({
        id: 'GetOrder',
        name: 'Get Order',
        version: '100',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('returns the query with the schema attached when the attachSchema option is set to true', async () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      };

      const file = { schema: JSON.stringify(schema), fileName: 'schema.json' };

      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        schemaPath: 'schema.json',
      });

      await addSchemaToQuery('GetOrder', file);

      const test = await getQuery('GetOrder', '0.0.1', { attachSchema: true });

      expect(test.schema).toEqual(schema);
    });

    it('does not attach the schema if the attachSchema option is set to false', async () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      };

      const file = { schema: JSON.stringify(schema), fileName: 'schema.json' };

      await writeQuery({
        id: 'GetOrder2',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        schemaPath: 'schema.json',
      });

      await addSchemaToQuery('GetOrder2', file);

      const test = await getQuery('GetOrder2', '0.0.1', { attachSchema: false });

      expect(test.schema).toEqual(undefined);
    });

    it('returns undefined when a given resource is not found', async () => {
      const query = await getQuery('GetOrder');
      await expect(query).toEqual(undefined);
    });

    it('throws an error if the query is found but not the version', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await expect(await getQuery('GetOrder', '1.0.0')).toEqual(undefined);
    });

    describe('when queries are within a service that is within a domain', async () => {
      it('returns the given query id from EventCatalog and the latest version when no version is given,', async () => {
        await writeDomain({
          id: 'Shopping',
          name: 'Shopping Domain',
          version: '0.0.1',
          summary: 'Domain that handles the shopping',
          markdown: '# Hello world',
        });

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

        await writeQueryToService(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        const test = await getQuery('GetOrder');

        expect(test).toEqual({
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });
      });

      it('returns the given query id from EventCatalog and the latest version when no version is given and the query is inside a services folder,', async () => {
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service tat handles the inventory',
          markdown: '# Hello world',
        });

        await writeDomain({
          id: 'Shopping',
          name: 'Shopping Domain',
          version: '0.0.1',
          summary: 'Domain that handles the shopping',
          markdown: '# Hello world',
        });

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

        await writeQueryToService(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        const test = await getQuery('GetOrder');

        expect(test).toEqual({
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });
      });

      it('returns the given query id from EventCatalog and the requested version when a version is given,', async () => {
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service tat handles the inventory',
          markdown: '# Hello world',
        });

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

        await writeQueryToService(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        await versionQuery('GetOrder');

        await writeQueryToService(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        const test = await getQuery('GetOrder', '0.0.1');

        expect(test).toEqual({
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });
      });

      it('returns the latest version of the query if the version matches the latest version', async () => {
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service tat handles the inventory',
          markdown: '# Hello world',
        });

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

        await writeQueryToService(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        const test = await getQuery('GetOrder', '0.0.1');

        expect(test).toEqual({
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });
      });

      it('returns the version of the query even if the query does not match semver matching', async () => {
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '100',
          summary: 'Service tat handles the inventory',
          markdown: '# Hello world',
        });

        await writeServiceToDomain(
          {
            id: 'InventoryService',
            name: 'Inventory Service',
            version: '100',
            summary: 'Service tat handles the inventory',
            markdown: '# Hello world',
          },
          { id: 'Shopping' }
        );

        await writeQueryToService(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '100',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        const test = await getQuery('GetOrder', '100');

        expect(test).toEqual({
          id: 'GetOrder',
          name: 'Get Order',
          version: '100',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });
      });
    });
  });

  describe('getQueries', () => {
    it('returns all the queries in the catalog,', async () => {
      // versioned query
      await writeQuery({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // latest query
      await writeQuery(
        {
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { versionExistingContent: true }
      );

      // query in the services folder
      await writeQuery(
        {
          id: 'OrderComplete',
          name: 'Order Complete',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/services/OrderService' }
      );

      const queries = await getQueries({ latestOnly: false });

      expect(queries).toEqual(
        expect.arrayContaining([
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'OrderComplete',
            name: 'Order Complete',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
        ])
      );
    });
    it('returns only the latest queries when `latestOnly` is set to true,', async () => {
      // versioned query
      await writeQuery({
        id: 'InventoryAdjusted',
        name: 'Inventory Adjusted',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // latest query
      await writeQuery(
        {
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { versionExistingContent: true }
      );

      // query in the services folder
      await writeQuery(
        {
          id: 'OrderComplete',
          name: 'Order Complete',
          version: '1.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/services/OrderService' }
      );

      // query in the services folder
      await writeQuery(
        {
          id: 'OrderComplete',
          name: 'Order Complete',
          version: '2.0.0',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/services/OrderService', versionExistingContent: true }
      );

      const queries = await getQueries({ latestOnly: true });

      expect(queries).toEqual(
        expect.arrayContaining([
          {
            id: 'InventoryAdjusted',
            name: 'Inventory Adjusted',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'OrderComplete',
            name: 'Order Complete',
            version: '2.0.0',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
        ])
      );
    });
    it('returns the queries with the schema attached when the attachSchema option is set to true', async () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      };

      const file = { schema: JSON.stringify(schema), fileName: 'schema.json' };

      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
        schemaPath: 'schema.json',
      });

      await addSchemaToQuery('GetOrder', file);

      const test = await getQueries({ attachSchema: true });

      expect(test[0].schema).toEqual(schema);
    });
  });

  describe('writeQuery', () => {
    it('writes the given query to EventCatalog and assumes the path if one if not given', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      const query = await getQuery('GetOrder');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(true);

      expect(query).toEqual({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('writes the given query to EventCatalog (as md). When no version if given for the query the service is added to the latest service', async () => {
      await writeQuery(
        {
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { format: 'md' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.md'))).toBe(true);
    });

    it('writes the given query to EventCatalog under the correct path when a path is given', async () => {
      await writeQuery(
        {
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/Inventory/GetOrder' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/Inventory/GetOrder', 'index.mdx'))).toBe(true);
    });

    it('throws an error when trying to write an query that already exists', async () => {
      const createQuery = async () =>
        writeQuery({
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

      await createQuery();

      await expect(
        writeQuery({
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        })
      ).rejects.toThrowError('Failed to write GetOrder (query) as the version 0.0.1 already exists');
    });

    it('overrides the query when trying to write an query that already exists and override is true', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await writeQuery(
        {
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: 'Overridden content',
        },
        {
          override: true,
        }
      );

      const query = await getQuery('GetOrder');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(true);
      expect(query.markdown).toBe('Overridden content');
    });

    describe('versionExistingContent', () => {
      it('versions the previous query when trying to write a query that already exists and versionExistingContent is true and the new version number is greater than the previous one', async () => {
        await writeQuery({
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        });

        await writeQuery(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: 'New',
          },
          { versionExistingContent: true }
        );

        const query = await getQuery('GetOrder');
        expect(query.version).toBe('1.0.0');
        expect(query.markdown).toBe('New');

        expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder/versioned/0.0.1', 'index.mdx'))).toBe(true);
        expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(true);
      });

      it('throws an error when trying to write a query and versionExistingContent is true and the new version number is not greater than the previous one', async () => {
        await writeQuery(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '1.0.0',
            summary: 'This is a summary',
            markdown: 'New',
          },
          { versionExistingContent: true }
        );

        await expect(
          writeQuery(
            {
              id: 'GetOrder',
              name: 'Get Order',
              version: '0.0.0',
              summary: 'This is a summary',
              markdown: 'New',
            },
            { versionExistingContent: true }
          )
        ).rejects.toThrowError('New version 0.0.0 is not greater than current version 1.0.0');
      });
    });
  });

  describe('writeQueryToService', () => {
    it('writes an query to the given service. When no version if given for the service the query is added to the latest service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles inventory',
        markdown: '# Hello world',
      });

      await writeQueryToService(
        {
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        {
          id: 'InventoryService',
        }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder', 'index.mdx'))).toBe(true);
    });
    it('writes an query to the given service (as md). When no version if given for the service the query is added to the latest service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles inventory',
        markdown: '# Hello world',
      });

      await writeQueryToService(
        {
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        {
          id: 'InventoryService',
        },
        { format: 'md' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder', 'index.md'))).toBe(true);
    });
    it('writes an query to the given service. When a version is given for the service the query is added to that service version', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '1.0.0',
        summary: 'Service that handles inventory',
        markdown: '# Hello world',
      });

      await writeQueryToService(
        {
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        {
          id: 'InventoryService',
          version: '1.0.0',
        }
      );
      expect(
        fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/versioned/1.0.0/queries/GetOrder', 'index.mdx'))
      ).toBe(true);
    });
    it('writes an query to the given service. When a version is the latest the query is added to the latest version of the service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'Service that handles inventory',
        markdown: '# Hello world',
      });

      await writeQueryToService(
        {
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        {
          id: 'InventoryService',
          version: 'latest',
        }
      );
      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder', 'index.mdx'))).toBe(true);
    });

    it('when override is true, it overrides the event if it already exists', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '1.0.0',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // Write the first event
      await writeQueryToService(
        {
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        {
          id: 'InventoryService',
        }
      );

      await writeQueryToService(
        {
          id: 'GetOrder',
          name: 'Get Order',
          version: '0.0.1',
          summary: 'This is a summary',
          markdown: 'Overridden content',
        },
        {
          id: 'InventoryService',
        },
        {
          override: true,
        }
      );

      const query = await getQuery('GetOrder', '0.0.1');

      expect(query.markdown).toBe('Overridden content');
    });
  });

  describe('rmQuery', () => {
    it('removes an query from eventcatalog', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(true);

      await rmQuery('/GetOrder');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(false);
    });
  });

  describe('rmQueryById', () => {
    it('removes an query from eventcatalog by id', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(true);

      await rmQueryById('GetOrder');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(false);
    });

    it('removes a query and all files in that query', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      fs.writeFileSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'schema.json'), 'SCHEMA!');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(true);

      await rmQueryById('GetOrder');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(false);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'schema.json'))).toBe(false);
    });

    it('removes a query but keeps its files when persistFiles is set to true', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      fs.writeFileSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'schema.json'), 'SCHEMA!');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(true);

      await rmQueryById('GetOrder', '0.0.1', true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(false);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'schema.json'))).toBe(true);
    });

    it('removes an query from eventcatalog by id and version', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(true);

      await rmQueryById('GetOrder', '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(false);
    });

    it('if version is given, only removes that version and not any other versions of the query', async () => {
      // write the first queries
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await versionQuery('GetOrder');

      // Write the versioned query
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.2',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(true);
      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder/versioned/0.0.1', 'index.mdx'))).toBe(true);

      await rmQueryById('GetOrder', '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder/versioned/0.0.2', 'index.mdx'))).toBe(false);
    });

    describe('when queries are within a service directory', () => {
      it('removes an query from EventCatalog by id', async () => {
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        });

        await writeQueryToService(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder', 'index.mdx'))).toBe(true);
        await rmQueryById('GetOrder');
        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder', 'index.mdx'))).toBe(false);
      });

      it('if version is given, only removes that version and not any other versions of the query', async () => {
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        });

        await writeQueryToService(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        await versionQuery('GetOrder');

        await writeQueryToService(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '0.0.2',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          {
            id: 'InventoryService',
          }
        );

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder', 'index.mdx'))).toBe(true);
        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder/versioned/0.0.1', 'index.mdx'))
        ).toBe(true);

        await rmQueryById('GetOrder', '0.0.1');

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder', 'index.mdx'))).toBe(true);
        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder/versioned/0.0.1', 'index.mdx'))
        ).toBe(false);
      });
    });
  });

  describe('versionQuery', () => {
    it('adds the given query to the versioned directory and removes itself from the root', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.2',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // // Add random file in there
      // await fs.writeFileSync(path.join(CATALOG_PATH, 'queries/Inventory/GetOrder', 'schema.json'), 'SCHEMA!');

      await versionQuery('GetOrder');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder/versioned/0.0.2', 'index.mdx'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(false);
    });
    it('adds the given query to the versioned directory and all files that are associated to it', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.2',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // Add random file in there
      await fs.writeFileSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'schema.json'), 'SCHEMA!');

      await versionQuery('GetOrder');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder/versioned/0.0.2', 'index.mdx'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder/versioned/0.0.2', 'schema.json'))).toBe(true);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'index.mdx'))).toBe(false);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'schema.json'))).toBe(false);
    });

    describe('when queries are within a service directory', () => {
      it('adds the given query to the versioned directory and removes itself from the root', async () => {
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        });

        await writeQueryToService(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '0.0.2',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'InventoryService' }
        );

        await versionQuery('GetOrder');

        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder/versioned/0.0.2', 'index.mdx'))
        ).toBe(true);
        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder', 'index.mdx'))).toBe(false);
      });
      it('adds the given query to the versioned directory and all files that are associated to it', async () => {
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        });

        await writeQueryToService(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '0.0.2',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'InventoryService' }
        );

        // Add random file in there
        await fs.writeFileSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder', 'schema.json'), 'SCHEMA!');

        await versionQuery('GetOrder');

        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder/versioned/0.0.2', 'index.mdx'))
        ).toBe(true);

        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder/versioned/0.0.2', 'schema.json'))
        ).toBe(true);

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder', 'index.mdx'))).toBe(false);

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder', 'schema.json'))).toBe(false);
      });
    });
  });

  describe('addFileToQuery', () => {
    it('takes a given file and writes it to the location of the given query', async () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await addFileToQuery('GetOrder', file);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'test.txt'))).toBe(true);
    });

    it('takes a given file and version and writes the file to the correct location', async () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // version the query
      await versionQuery('GetOrder');

      await addFileToQuery('GetOrder', file, '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder/versioned/0.0.1', 'test.txt'))).toBe(true);
    });

    it('throws an error when trying to write to a query that does not exist', () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      expect(addFileToQuery('GetOrder', file)).rejects.toThrowError('Cannot find directory to write file to');
    });

    describe('when queries are within a service directory', () => {
      it('takes a given file and writes it to the location of the given query', async () => {
        const file = { content: 'hello', fileName: 'test.txt' };

        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        });

        await writeQueryToService(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'InventoryService' }
        );

        await addFileToQuery('GetOrder', file);

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder', 'test.txt'))).toBe(true);
      });

      it('takes a given file and version and writes the file to the correct location', async () => {
        const file = { content: 'hello', fileName: 'test.txt' };

        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        });

        await writeQueryToService(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'InventoryService' }
        );

        await versionQuery('GetOrder');

        await addFileToQuery('GetOrder', file, '0.0.1');

        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder/versioned/0.0.1', 'test.txt'))
        ).toBe(true);
      });
    });
  });

  describe('addSchemaToQuery', () => {
    it('takes a given file and writes it to the location of the given query', async () => {
      const schema = `{
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "age": {
            "type": "number"
          }
        }
      }`;
      const file = { schema, fileName: 'schema.json' };

      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await addSchemaToQuery('GetOrder', file);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder', 'schema.json'))).toBe(true);
    });

    it('takes a given file and version and writes the file to the correct location', async () => {
      const schema = `{
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "age": {
            "type": "number"
          }
        }
      }`;
      const file = { schema, fileName: 'schema.json' };

      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      // version the query
      await versionQuery('GetOrder');

      await addSchemaToQuery('GetOrder', file, '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'queries/GetOrder/versioned/0.0.1', 'schema.json'))).toBe(true);
    });

    it('throws an error when trying to write to a query that does not exist', () => {
      const file = { schema: 'hello', fileName: 'test.txt' };

      expect(addSchemaToQuery('GetOrder', file)).rejects.toThrowError('Cannot find directory to write file to');
    });

    describe('when queries are within a service directory', () => {
      it('takes a given file and writes it to the location of the given query', async () => {
        const schema = `{
          "type": "object",
          "properties": {
            "name": {
              "type": "string"
            },
            "age": {
              "type": "number"
            }
          }
        }`;
        const file = { schema, fileName: 'schema.json' };

        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        });

        await writeQueryToService(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'InventoryService' }
        );

        await addSchemaToQuery('GetOrder', file);

        expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder', 'schema.json'))).toBe(true);
      });

      it('takes a given file and version and writes the file to the correct location', async () => {
        const schema = `{
          "type": "object",
          "properties": {
            "name": {
              "type": "string"
            },
            "age": {
              "type": "number"
            }
          }
        }`;
        const file = { schema, fileName: 'schema.json' };

        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '0.0.1',
          summary: 'Service that handles inventory',
          markdown: '# Hello world',
        });

        await writeQueryToService(
          {
            id: 'GetOrder',
            name: 'Get Order',
            version: '0.0.1',
            summary: 'This is a summary',
            markdown: '# Hello world',
          },
          { id: 'InventoryService' }
        );

        await versionQuery('GetOrder');

        await addSchemaToQuery('GetOrder', file, '0.0.1');

        expect(
          fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/queries/GetOrder/versioned/0.0.1', 'schema.json'))
        ).toBe(true);
      });
    });
  });

  describe('queryHasVersion', () => {
    it('returns true when a given query and version exists in the catalog', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(await queryHasVersion('GetOrder', '0.0.1')).toEqual(true);
    });

    it('returns true when a semver version is given and the version exists in the catalog', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(await queryHasVersion('GetOrder', '0.0.x')).toEqual(true);
    });

    it('returns true when a `latest` version is given and the version exists in the catalog', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(await queryHasVersion('GetOrder', 'latest')).toEqual(true);
    });

    it('returns false when query does not exist in the catalog', async () => {
      await writeQuery({
        id: 'GetOrder',
        name: 'Get Order',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      expect(await queryHasVersion('GetOrder', '5.0.0')).toEqual(false);
    });
  });
});
