// sum.test.js
import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-containers');

const {
  writeService,
  writeDataStore,
  getDataStore,
  versionDataStore,
  getDataStores,
  rmDataStore,
  rmDataStoreById,
  dataStoreHasVersion,
  addFileToDataStore,
  writeDataStoreToService,
} = utils(CATALOG_PATH);

// clean the catalog before each test
beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Data Store SDK', () => {
  describe('getDataStore', () => {
    it('returns the given data store id from EventCatalog and the latest version when no version is given,', async () => {
      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });

      const test = await getDataStore('orders-db');

      expect(test).toEqual({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });
    });

    it('returns the given entity id from EventCatalog and the requested version when a version is given,', async () => {
      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });

      await versionDataStore('orders-db');

      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '2.0.0',
        markdown: '# Orders',
        container_type: 'database',
      });

      const test = await getDataStore('orders-db', '0.0.1');

      expect(test).toEqual({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });
    });

    it('returns undefined when a given resource is not found', async () => {
      const entity = await getDataStore('orders-db-test');
      await expect(entity).toEqual(undefined);
    });
  });

  describe('getDataStores', () => {
    it('returns all data stores from the catalog', async () => {
      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });

      await writeDataStore({
        id: 'products-db',
        name: 'Products Database',
        version: '0.0.1',
        markdown: '# Products',
        container_type: 'database',
      });

      const dataStores = await getDataStores();
      expect(dataStores).toHaveLength(2);
      expect(dataStores.map((e) => e.id)).toEqual(['products-db', 'orders-db']);
    });

    it('returns only latest versions when latestOnly is true', async () => {
      await writeDataStore({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        markdown: '# User entity',
        container_type: 'database',
      });

      await versionDataStore('User');

      await writeDataStore({
        id: 'products-db',
        name: 'Products Database',
        version: '0.0.2',
        markdown: '# Products',
        container_type: 'database',
      });

      const dataStores = await getDataStores({ latestOnly: true });
      expect(dataStores).toHaveLength(1);
      expect(dataStores[0].version).toBe('0.0.2');
    });
  });

  describe('writeDataStore', () => {
    it('writes the given entity to the file system', async () => {
      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });

      const entity = await getDataStore('orders-db');

      expect(entity).toEqual({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });
    });

    it('writes the data store to a custom path when path is provided', async () => {
      await writeDataStore(
        {
          id: 'orders-db',
          name: 'Orders Database',
          version: '0.0.1',
          markdown: '# Orders Database in Account',
          container_type: 'database',
        },
        { path: '/Account/orders-db' }
      );

      const entity = await getDataStore('orders-db');
      expect(entity).toEqual({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders Database in Account',
        container_type: 'database',
      });
    });
  });

  describe('rmDataStore', () => {
    it('removes an data store by its path', async () => {
      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });

      await rmDataStore('/orders-db');

      const entity = await getDataStore('orders-db');

      await expect(entity).toEqual(undefined);
    });
  });

  describe('rmDataStoreById', () => {
    it('removes an data store by its id', async () => {
      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });

      await rmDataStoreById('orders-db');

      const entity = await getDataStore('orders-db');

      await expect(entity).toEqual(undefined);
    });

    it('removes a specific version of an data store by its id and version', async () => {
      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });

      await versionDataStore('orders-db');

      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.2',
        markdown: '# Orders',
        container_type: 'database',
      });

      await rmDataStoreById('orders-db', '0.0.1');

      const oldEntity = await getDataStore('orders-db', '0.0.1');
      expect(oldEntity).toEqual(undefined);

      const newEntity = await getDataStore('orders-db', '0.0.2');
      expect(newEntity).toEqual({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.2',
        markdown: '# Orders',
        container_type: 'database',
      });
    });
  });

  describe('versionDataStore', () => {
    it('versions an data store by moving it to a versioned directory', async () => {
      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });

      await versionDataStore('orders-db');

      const versionedEntity = await getDataStore('orders-db', '0.0.1');
      expect(versionedEntity).toEqual({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });
    });
  });

  describe('dataStoreHasVersion', () => {
    it('returns true if data store version exists', async () => {
      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });

      const hasVersion = await dataStoreHasVersion('orders-db', '0.0.1');
      expect(hasVersion).toBe(true);
    });

    it('returns false if data store version does not exist', async () => {
      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });

      const hasVersion = await dataStoreHasVersion('orders-db', '0.0.2');
      expect(hasVersion).toBe(false);
    });

    it('returns false if data store does not exist', async () => {
      const hasVersion = await dataStoreHasVersion('NonExistentEntity', '0.0.1');
      expect(hasVersion).toBe(false);
    });
  });

  describe('addFileToDataStore', () => {
    it('takes a given file and writes it to the location of the given data store', async () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });

      await addFileToDataStore('orders-db', file);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'containers/orders-db', 'test.txt'))).toBe(true);
    });

    it('takes a given file and version and writes the file to the correct location', async () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      await writeDataStore({
        id: 'orders-db',
        name: 'Orders Database',
        version: '0.0.1',
        markdown: '# Orders',
        container_type: 'database',
      });

      // version the event
      await versionDataStore('orders-db');

      await addFileToDataStore('orders-db', file, '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'containers/orders-db/versioned/0.0.1', 'test.txt'))).toBe(true);
    });

    it('throws an error when trying to write to a data store that does not exist', () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      expect(addFileToDataStore('orders-db', file)).rejects.toThrowError('Cannot find directory to write file to');
    });

    // describe('when events are within a service directory', () => {
    //   it('takes a given file and writes it to the location of the given event', async () => {
    //     const file = { content: 'hello', fileName: 'test.txt' };

    //     await writeService({
    //       id: 'InventoryService',
    //       name: 'Inventory Service',
    //       version: '0.0.1',
    //       summary: 'This is a summary',
    //       markdown: '# Hello world',
    //     });

    //     await writeEventToService(
    //       {
    //         id: 'InventoryAdjusted',
    //         name: 'Inventory Adjusted',
    //         version: '0.0.1',
    //         summary: 'This is a summary',
    //         markdown: '# Hello world',
    //       },
    //       { id: 'InventoryService' }
    //     );

    //     await addFileToDataStore('InventoryAdjusted', file);

    //     expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted', 'test.txt'))).toBe(
    //       true
    //     );
    //   });

    //   it('takes a given file and version and writes the file to the correct location', async () => {
    //     const file = { content: 'hello', fileName: 'test.txt' };

    //     await writeService({
    //       id: 'InventoryService',
    //       name: 'Inventory Service',
    //       version: '0.0.1',
    //       summary: 'This is a summary',
    //       markdown: '# Hello world',
    //     });

    //     await writeEventToService(
    //       {
    //         id: 'InventoryAdjusted',
    //         name: 'Inventory Adjusted',
    //         version: '0.0.1',
    //         summary: 'This is a summary',
    //         markdown: '# Hello world',
    //       },
    //       { id: 'InventoryService' }
    //     );

    //     // version the event
    //     await versionEvent('InventoryAdjusted');

    //     await addFileToDataStore('InventoryAdjusted', file, '0.0.1');

    //     expect(
    //       fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/events/InventoryAdjusted/versioned/0.0.1', 'test.txt'))
    //     ).toBe(true);
    //   });
    // });
  });

  describe('writeDataStoreToService', () => {
    it('writes an data store to the given service. When no version if given for the service the data store is added to the latest service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '0.0.1',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await writeDataStoreToService(
        {
          id: 'orders-db',
          name: 'Orders Database',
          version: '0.0.1',
          markdown: '# Orders',
          container_type: 'database',
        },
        {
          id: 'InventoryService',
        }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/containers/orders-db', 'index.mdx'))).toBe(true);
    });
    it('writes an data store to the given service. When a version is given for the service the data store is added to that service version', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '1.0.0',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
      await writeDataStoreToService(
        {
          id: 'orders-db',
          name: 'Orders Database',
          version: '0.0.1',
          markdown: '# Orders',
          container_type: 'database',
        },
        {
          id: 'InventoryService',
          version: '1.0.0',
        }
      );
      expect(
        fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService/versioned/1.0.0/containers/orders-db', 'index.mdx'))
      ).toBe(true);
    });
    it('writes an data store to the given service. When a version is the latest the data store is added to the latest version of the service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '1.0.0',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });

      await writeDataStoreToService(
        {
          id: 'orders-db',
          name: 'Orders Database',
          version: '0.0.1',
          markdown: '# Orders',
          container_type: 'database',
        },
        {
          id: 'InventoryService',
          version: 'latest',
        }
      );
      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/InventoryService//containers/orders-db', 'index.mdx'))).toBe(true);
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
      await writeDataStoreToService(
        {
          id: 'orders-db',
          name: 'Orders Database',
          version: '0.0.1',
          markdown: '# Orders',
          container_type: 'database',
        },
        {
          id: 'InventoryService',
        }
      );

      await writeDataStoreToService(
        {
          id: 'orders-db',
          name: 'Orders Database',
          version: '0.0.1',
          markdown: 'Overridden content',
          container_type: 'database',
        },
        {
          id: 'InventoryService',
        },
        {
          override: true,
        }
      );

      const event = await getDataStore('orders-db', '0.0.1');

      expect(event.markdown).toBe('Overridden content');
    });
  });
});
