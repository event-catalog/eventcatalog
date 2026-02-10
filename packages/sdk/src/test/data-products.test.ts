// sum.test.js
import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-data-products');

const {
  writeDataProduct,
  writeDataProductToDomain,
  getDataProduct,
  getDataProducts,
  rmDataProduct,
  rmDataProductById,
  versionDataProduct,
  dataProductHasVersion,
  addFileToDataProduct,
  writeDomain,
  getDomain,
  versionDomain,
} = utils(CATALOG_PATH);

// clean the catalog before each test
beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Data Products SDK', () => {
  describe('getDataProduct', () => {
    it('returns the given data product id from EventCatalog and the latest version when no version is given', async () => {
      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
        inputs: [{ id: 'CustomerEvent', version: '1.0.0' }],
        outputs: [{ id: 'CustomerOutput', version: '1.0.0' }],
      });

      const test = await getDataProduct('CustomerDataProduct');

      expect(test).toEqual({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
        inputs: [{ id: 'CustomerEvent', version: '1.0.0' }],
        outputs: [{ id: 'CustomerOutput', version: '1.0.0' }],
      });
    });

    it('returns the given data product id from EventCatalog and the requested version when a version is given', async () => {
      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
      });

      await versionDataProduct('CustomerDataProduct');

      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.2',
        summary: 'Customer data product v2',
        markdown: '# Customer data product v2',
      });

      const test = await getDataProduct('CustomerDataProduct', '0.0.1');

      expect(test).toEqual({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
      });
    });

    it('returns undefined when a given resource is not found', async () => {
      const dataProduct = await getDataProduct('NonExistentDataProduct');
      await expect(dataProduct).toEqual(undefined);
    });

    it('returns a data product from within a domain', async () => {
      await writeDomain({
        id: 'Orders',
        name: 'Orders Domain',
        version: '0.0.1',
        summary: 'Orders domain',
        markdown: '# Orders domain',
      });

      await writeDataProductToDomain(
        {
          id: 'OrdersDataProduct',
          name: 'Orders Data Product',
          version: '1.0.0',
          summary: 'Orders data product',
          markdown: '# Orders data product',
        },
        { id: 'Orders' }
      );

      const dataProduct = await getDataProduct('OrdersDataProduct');

      expect(dataProduct).toEqual({
        id: 'OrdersDataProduct',
        name: 'Orders Data Product',
        version: '1.0.0',
        summary: 'Orders data product',
        markdown: '# Orders data product',
      });
    });
  });

  describe('getDataProducts', () => {
    it('returns all data products from the catalog', async () => {
      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
      });

      await writeDataProduct({
        id: 'SalesDataProduct',
        name: 'Sales Data Product',
        version: '0.0.1',
        summary: 'Sales data product',
        markdown: '# Sales data product',
      });

      const dataProducts = await getDataProducts();
      expect(dataProducts).toHaveLength(2);
      expect(dataProducts.map((dp) => dp.id).sort()).toEqual(['CustomerDataProduct', 'SalesDataProduct']);
    });

    it('returns only latest versions when latestOnly is true', async () => {
      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
      });

      await versionDataProduct('CustomerDataProduct');

      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.2',
        summary: 'Customer data product v2',
        markdown: '# Customer data product v2',
      });

      const dataProducts = await getDataProducts({ latestOnly: true });
      expect(dataProducts).toHaveLength(1);
      expect(dataProducts[0].version).toBe('0.0.2');
    });
  });

  describe('writeDataProduct', () => {
    it('writes the given data product to the file system', async () => {
      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
        inputs: [{ id: 'CustomerEvent', version: '1.0.0' }],
        outputs: [
          {
            id: 'CustomerOutput',
            version: '1.0.0',
            contract: {
              path: '/contracts/customer.json',
              name: 'Customer Contract',
              type: 'json-schema',
            },
          },
        ],
      });

      const dataProduct = await getDataProduct('CustomerDataProduct');

      expect(dataProduct).toEqual({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
        inputs: [{ id: 'CustomerEvent', version: '1.0.0' }],
        outputs: [
          {
            id: 'CustomerOutput',
            version: '1.0.0',
            contract: {
              path: '/contracts/customer.json',
              name: 'Customer Contract',
              type: 'json-schema',
            },
          },
        ],
      });
    });

    it('writes the data product to a custom path when path is provided', async () => {
      await writeDataProduct(
        {
          id: 'CustomerDataProduct',
          name: 'Customer Data Product',
          version: '0.0.1',
          summary: 'Customer data product',
          markdown: '# Customer data product',
        },
        { path: '/Account/CustomerDataProduct' }
      );

      const dataProduct = await getDataProduct('CustomerDataProduct');
      expect(dataProduct).toEqual({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
      });
    });

    it('throws an error when trying to write a data product that already exists', async () => {
      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
      });

      await expect(
        writeDataProduct({
          id: 'CustomerDataProduct',
          name: 'Customer Data Product',
          version: '0.0.1',
          summary: 'Customer data product',
          markdown: '# Customer data product',
        })
      ).rejects.toThrowError('Failed to write CustomerDataProduct (data-product) as the version 0.0.1 already exists');
    });

    it('overrides the data product when trying to write a data product that already exists and override is true', async () => {
      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
      });

      await writeDataProduct(
        {
          id: 'CustomerDataProduct',
          name: 'Customer Data Product',
          version: '0.0.1',
          summary: 'Customer data product',
          markdown: 'Overridden content',
        },
        { override: true }
      );

      const dataProduct = await getDataProduct('CustomerDataProduct');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'data-products/CustomerDataProduct', 'index.mdx'))).toBe(true);
      expect(dataProduct.markdown).toBe('Overridden content');
    });

    describe('versionExistingContent', () => {
      it('versions the previous data product when trying to write a data product that already exists and versionExistingContent is true', async () => {
        await writeDataProduct({
          id: 'CustomerDataProduct',
          name: 'Customer Data Product',
          version: '0.0.1',
          summary: 'Customer data product',
          markdown: '# Customer data product',
        });

        await writeDataProduct(
          {
            id: 'CustomerDataProduct',
            name: 'Customer Data Product',
            version: '1.0.0',
            summary: 'Customer data product',
            markdown: 'New',
          },
          { versionExistingContent: true }
        );

        const dataProduct = await getDataProduct('CustomerDataProduct');
        expect(dataProduct.version).toBe('1.0.0');
        expect(dataProduct.markdown).toBe('New');

        expect(fs.existsSync(path.join(CATALOG_PATH, 'data-products/CustomerDataProduct/versioned/0.0.1', 'index.mdx'))).toBe(
          true
        );
        expect(fs.existsSync(path.join(CATALOG_PATH, 'data-products/CustomerDataProduct', 'index.mdx'))).toBe(true);
      });

      it('throws an error when trying to write a data product and versionExistingContent is true and the new version is not greater than the previous one', async () => {
        await writeDataProduct(
          {
            id: 'CustomerDataProduct',
            name: 'Customer Data Product',
            version: '1.0.0',
            summary: 'Customer data product',
            markdown: 'New',
          },
          { versionExistingContent: true }
        );

        await expect(
          writeDataProduct(
            {
              id: 'CustomerDataProduct',
              name: 'Customer Data Product',
              version: '0.0.0',
              summary: 'Customer data product',
              markdown: 'New',
            },
            { versionExistingContent: true }
          )
        ).rejects.toThrowError('New version 0.0.0 is not greater than current version 1.0.0');
      });
    });

    describe('formats', () => {
      it('writes the data product as md when format is md', async () => {
        await writeDataProduct(
          {
            id: 'CustomerDataProduct',
            name: 'Customer Data Product',
            version: '0.0.1',
            summary: 'Customer data product',
            markdown: '# Customer data product',
          },
          { format: 'md' }
        );

        expect(fs.existsSync(path.join(CATALOG_PATH, 'data-products/CustomerDataProduct', 'index.md'))).toBe(true);
      });

      it('writes the data product as mdx when format is mdx (default)', async () => {
        await writeDataProduct({
          id: 'CustomerDataProduct',
          name: 'Customer Data Product',
          version: '0.0.1',
          summary: 'Customer data product',
          markdown: '# Customer data product',
        });

        expect(fs.existsSync(path.join(CATALOG_PATH, 'data-products/CustomerDataProduct', 'index.mdx'))).toBe(true);
      });
    });
  });

  describe('writeDataProductToDomain', () => {
    it('writes a data product to a domain', async () => {
      await writeDomain({
        id: 'Orders',
        name: 'Orders Domain',
        version: '0.0.1',
        summary: 'Orders domain',
        markdown: '# Orders domain',
      });

      await writeDataProductToDomain(
        {
          id: 'OrdersDataProduct',
          name: 'Orders Data Product',
          version: '1.0.0',
          summary: 'Orders data product',
          markdown: '# Orders data product',
        },
        { id: 'Orders' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Orders/data-products/OrdersDataProduct', 'index.mdx'))).toBe(true);
    });

    it('writes a data product to a versioned domain', async () => {
      await writeDomain({
        id: 'Orders',
        name: 'Orders Domain',
        version: '0.0.1',
        summary: 'Orders domain',
        markdown: '# Orders domain',
      });

      await versionDomain('Orders');

      await writeDomain({
        id: 'Orders',
        name: 'Orders Domain',
        version: '1.0.0',
        summary: 'Orders domain',
        markdown: '# Orders domain',
      });

      await writeDataProductToDomain(
        {
          id: 'OrdersDataProduct',
          name: 'Orders Data Product',
          version: '1.0.0',
          summary: 'Orders data product',
          markdown: '# Orders data product',
        },
        { id: 'Orders', version: '0.0.1' }
      );

      expect(
        fs.existsSync(path.join(CATALOG_PATH, 'domains/Orders/versioned/0.0.1/data-products/OrdersDataProduct', 'index.mdx'))
      ).toBe(true);
    });
  });

  describe('versionDataProduct', () => {
    it('versions a data product by moving it to a versioned directory', async () => {
      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
      });

      await versionDataProduct('CustomerDataProduct');

      const versionedDataProduct = await getDataProduct('CustomerDataProduct', '0.0.1');
      expect(versionedDataProduct).toEqual({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
      });
    });
  });

  describe('rmDataProduct', () => {
    it('removes a data product by its path', async () => {
      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
      });

      await rmDataProduct('/CustomerDataProduct');

      const dataProduct = await getDataProduct('CustomerDataProduct');

      await expect(dataProduct).toEqual(undefined);
    });
  });

  describe('rmDataProductById', () => {
    it('removes a data product by its id', async () => {
      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
      });

      await rmDataProductById('CustomerDataProduct');

      const dataProduct = await getDataProduct('CustomerDataProduct');

      await expect(dataProduct).toEqual(undefined);
    });

    it('removes a specific version of a data product by its id and version', async () => {
      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
      });

      await versionDataProduct('CustomerDataProduct');

      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.2',
        summary: 'Customer data product v2',
        markdown: '# Customer data product v2',
      });

      await rmDataProductById('CustomerDataProduct', '0.0.1');

      const oldDataProduct = await getDataProduct('CustomerDataProduct', '0.0.1');
      expect(oldDataProduct).toEqual(undefined);

      const newDataProduct = await getDataProduct('CustomerDataProduct', '0.0.2');
      expect(newDataProduct).toEqual({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.2',
        summary: 'Customer data product v2',
        markdown: '# Customer data product v2',
      });
    });
  });

  describe('dataProductHasVersion', () => {
    it('returns true if data product version exists', async () => {
      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
      });

      const hasVersion = await dataProductHasVersion('CustomerDataProduct', '0.0.1');
      expect(hasVersion).toBe(true);
    });

    it('returns false if data product version does not exist', async () => {
      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
      });

      const hasVersion = await dataProductHasVersion('CustomerDataProduct', '0.0.2');
      expect(hasVersion).toBe(false);
    });

    it('returns false if data product does not exist', async () => {
      const hasVersion = await dataProductHasVersion('NonExistentDataProduct', '0.0.1');
      expect(hasVersion).toBe(false);
    });
  });

  describe('addFileToDataProduct', () => {
    it('takes a given file and writes it to the location of the given data product', async () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
      });

      await addFileToDataProduct('CustomerDataProduct', file);

      expect(fs.existsSync(path.join(CATALOG_PATH, 'data-products/CustomerDataProduct', 'test.txt'))).toBe(true);
    });

    it('takes a given file and version and writes the file to the correct location', async () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      await writeDataProduct({
        id: 'CustomerDataProduct',
        name: 'Customer Data Product',
        version: '0.0.1',
        summary: 'Customer data product',
        markdown: '# Customer data product',
      });

      await versionDataProduct('CustomerDataProduct');

      await addFileToDataProduct('CustomerDataProduct', file, '0.0.1');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'data-products/CustomerDataProduct/versioned/0.0.1', 'test.txt'))).toBe(true);
    });

    it('throws an error when trying to write to a data product that does not exist', () => {
      const file = { content: 'hello', fileName: 'test.txt' };

      expect(addFileToDataProduct('NonExistentDataProduct', file)).rejects.toThrowError('Cannot find directory to write file to');
    });
  });
});
