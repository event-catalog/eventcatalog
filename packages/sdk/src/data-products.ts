import fs from 'node:fs/promises';
import { join } from 'node:path';
import { findFileById } from './internal/utils';
import type { DataProduct } from './types';
import {
  addFileToResource,
  getResource,
  getResources,
  rmResourceById,
  versionResource,
  writeResource,
} from './internal/resources';

/**
 * Returns a data product from EventCatalog.
 *
 * You can optionally specify a version to get a specific version of the data product
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getDataProduct } = utils('/path/to/eventcatalog');
 *
 * // Gets the latest version of the data product
 * const dataProduct = await getDataProduct('CustomerDataProduct');
 *
 * // Gets a version of the data product
 * const dataProduct = await getDataProduct('CustomerDataProduct', '0.0.1');
 *
 * ```
 */
export const getDataProduct =
  (directory: string) =>
  async (id: string, version?: string): Promise<DataProduct> =>
    getResource(directory, id, version, { type: 'data-product' }) as Promise<DataProduct>;

/**
 * Returns all data products from EventCatalog.
 *
 * You can optionally specify if you want to get the latest version of the data products.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getDataProducts } = utils('/path/to/eventcatalog');
 *
 * // Gets all data products (and versions) from the catalog
 * const dataProducts = await getDataProducts();
 *
 * // Gets all data products (only latest version) from the catalog
 * const dataProducts = await getDataProducts({ latestOnly: true });
 *
 * ```
 */
export const getDataProducts =
  (directory: string) =>
  async (options?: { latestOnly?: boolean }): Promise<DataProduct[]> =>
    getResources(directory, { type: 'data-products', latestOnly: options?.latestOnly }) as Promise<DataProduct[]>;

/**
 * Write a data product to EventCatalog.
 *
 * You can optionally override the path of the data product.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { writeDataProduct } = utils('/path/to/eventcatalog');
 *
 * // Write a data product to the catalog
 * // Data product would be written to data-products/CustomerDataProduct
 * await writeDataProduct({
 *   id: 'CustomerDataProduct',
 *   name: 'Customer Data Product',
 *   version: '0.0.1',
 *   summary: 'Customer data product',
 *   markdown: '# Customer data product',
 * });
 *
 * // Write a data product to the catalog but override the path
 * // Data product would be written to data-products/Account/CustomerDataProduct
 * await writeDataProduct({
 *    id: 'CustomerDataProduct',
 *    name: 'Customer Data Product',
 *    version: '0.0.1',
 *    summary: 'Customer data product',
 *    markdown: '# Customer data product',
 * }, { path: "/Account/CustomerDataProduct"});
 *
 * // Write a data product to the catalog and override the existing content (if there is any)
 * await writeDataProduct({
 *    id: 'CustomerDataProduct',
 *    name: 'Customer Data Product',
 *    version: '0.0.1',
 *    summary: 'Customer data product',
 *    markdown: '# Customer data product',
 * }, { override: true });
 *
 * // Write a data product to the catalog and version the previous version
 * // only works if the new version is greater than the previous version
 * await writeDataProduct({
 *    id: 'CustomerDataProduct',
 *    name: 'Customer Data Product',
 *    version: '0.0.1',
 *    summary: 'Customer data product',
 *    markdown: '# Customer data product',
 * }, { versionExistingContent: true });
 *
 * ```
 */
export const writeDataProduct =
  (directory: string) =>
  async (
    dataProduct: DataProduct,
    options: { path?: string; override?: boolean; versionExistingContent?: boolean; format?: 'md' | 'mdx' } = {
      path: '',
      override: false,
      format: 'mdx',
    }
  ) =>
    writeResource(directory, { ...dataProduct }, { ...options, type: 'data-product' });

/**
 * Write a data product to a domain in EventCatalog.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { writeDataProductToDomain } = utils('/path/to/eventcatalog');
 *
 * // Write a data product to a domain
 * // Data product would be written to domains/Shopping/data-products/CustomerDataProduct
 * await writeDataProductToDomain({
 *   id: 'CustomerDataProduct',
 *   name: 'Customer Data Product',
 *   version: '0.0.1',
 *   summary: 'Customer data product',
 *   markdown: '# Customer data product',
 * }, { id: 'Shopping' });
 * ```
 */
export const writeDataProductToDomain =
  (directory: string) =>
  async (
    dataProduct: DataProduct,
    domain: { id: string; version?: string },
    options: { path?: string; format?: 'md' | 'mdx'; override?: boolean } = { path: '', format: 'mdx', override: false }
  ) => {
    let pathForDataProduct =
      domain.version && domain.version !== 'latest'
        ? `/${domain.id}/versioned/${domain.version}/data-products`
        : `/${domain.id}/data-products`;
    pathForDataProduct = join(pathForDataProduct, dataProduct.id);

    await writeResource(directory, { ...dataProduct }, { ...options, path: pathForDataProduct, type: 'data-product' });
  };

/**
 * Delete a data product at its given path.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmDataProduct } = utils('/path/to/eventcatalog');
 *
 * // removes a data product at the given path (data-products dir is appended to the given path)
 * // Removes the data product at data-products/CustomerDataProduct
 * await rmDataProduct('/CustomerDataProduct');
 * ```
 */
export const rmDataProduct = (directory: string) => async (path: string) => {
  await fs.rm(join(directory, path), { recursive: true });
};

/**
 * Delete a data product by its id.
 *
 * Optionally specify a version to delete a specific version of the data product.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmDataProductById } = utils('/path/to/eventcatalog');
 *
 * // deletes the latest CustomerDataProduct data product
 * await rmDataProductById('CustomerDataProduct');
 *
 * // deletes a specific version of the CustomerDataProduct data product
 * await rmDataProductById('CustomerDataProduct', '0.0.1');
 * ```
 */
export const rmDataProductById = (directory: string) => async (id: string, version?: string, persistFiles?: boolean) => {
  await rmResourceById(directory, id, version, { type: 'data-product', persistFiles });
};

/**
 * Version a data product by its id.
 *
 * Takes the latest data product and moves it to a versioned directory.
 * All files with this data product are also versioned (e.g /data-products/CustomerDataProduct/schema.json)
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { versionDataProduct } = utils('/path/to/eventcatalog');
 *
 * // moves the latest CustomerDataProduct data product to a versioned directory
 * // the version within that data product is used as the version number.
 * await versionDataProduct('CustomerDataProduct');
 *
 * ```
 */
export const versionDataProduct = (directory: string) => async (id: string) => versionResource(directory, id);

/**
 * Check to see if the catalog has a version for the given data product.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { dataProductHasVersion } = utils('/path/to/eventcatalog');
 *
 * // returns true if version is found for the given data product and version (supports semver)
 * await dataProductHasVersion('CustomerDataProduct', '0.0.1');
 * await dataProductHasVersion('CustomerDataProduct', 'latest');
 * await dataProductHasVersion('CustomerDataProduct', '0.0.x');
 *
 * ```
 */
export const dataProductHasVersion = (directory: string) => async (id: string, version?: string) => {
  const file = await findFileById(directory, id, version);
  return !!file;
};

/**
 * Add a file to a data product by its id.
 *
 * Optionally specify a version to add a file to a specific version of the data product.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { addFileToDataProduct } = utils('/path/to/eventcatalog');
 *
 * // adds a file to the latest CustomerDataProduct data product
 * await addFileToDataProduct('CustomerDataProduct', { content: 'Hello world', fileName: 'hello.txt' });
 *
 * // adds a file to a specific version of the CustomerDataProduct data product
 * await addFileToDataProduct('CustomerDataProduct', { content: 'Hello world', fileName: 'hello.txt' }, '0.0.1');
 *
 * ```
 */
export const addFileToDataProduct =
  (directory: string) => async (id: string, file: { content: string; fileName: string }, version?: string) =>
    addFileToResource(directory, id, file, version);
