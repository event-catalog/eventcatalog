import * as Containers from './containers';

/**
 * Returns a data store (e.g. database, cache, etc.) from EventCatalog.
 *
 * You can optionally specify a version to get a specific version of the data store
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getContainer } = utils('/path/to/eventcatalog');
 *
 * // Gets the latest version of the data store
 * const container = await getDataStore('orders-db');
 *
 * // Gets a version of the entity
 * const container = await getDataStore('orders-db', '0.0.1');
 *
 * ```
 */
export const getDataStore = Containers.getContainer;

/**
 * Returns all data stores (e.g. databases, caches, etc.) from EventCatalog.
 *
 * You can optionally specify if you want to get the latest version of the data stores.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getDataStores } = utils('/path/to/eventcatalog');
 *
 * // Gets all data stores (and versions) from the catalog
 * const containers = await getDataStores();
 *
 * // Gets all data stores (only latest version) from the catalog
 * const containers = await getDataStores({ latestOnly: true });
 *
 * ```
 */
export const getDataStores = Containers.getContainers;

/**
 * Write a data store (e.g. database, cache, etc.) to EventCatalog.
 */
export const writeDataStore = Containers.writeContainer;

/**
 * Version an data store (e.g. database, cache, etc.) by its id.
 *
 * Takes the latest data store and moves it to a versioned directory.
 * All files with this data store are also versioned (e.g /containers/orders-db/schema.json)
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { versionDataStore } = utils('/path/to/eventcatalog');
 *
 * // moves the latest orders-db data store to a versioned directory
 * // the version within that data store is used as the version number.
 * await versionDataStore('orders-db');
 *
 * ```
 */
export const versionDataStore = Containers.versionContainer;

/**
 * Delete an data store (e.g. database, cache, etc.) at its given path.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmDataStore } = utils('/path/to/eventcatalog');
 *
 * // removes an data store at the given path (containers dir is appended to the given path)
 * // Removes the data store at containers/orders-db
 * await rmDataStore('/orders-db');
 * ```
 */
export const rmDataStore = Containers.rmContainer;

/**
 * Delete an data store (e.g. database, cache, etc.) by its id.
 *
 * Optionally specify a version to delete a specific version of the data store.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmDataStoreById } = utils('/path/to/eventcatalog');
 *
 * // deletes the latest orders-db data store
 * await rmDataStoreById('orders-db');
 *
 * // deletes a specific version of the orders-db data store
 * await rmDataStoreById('orders-db', '0.0.1');
 * ```
 */
export const rmDataStoreById = Containers.rmContainerById;

/**
 * Check to see if the catalog has a version for the given data store (e.g. database, cache, etc.).
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { dataStoreHasVersion } = utils('/path/to/eventcatalog');
 *
 * // returns true if version is found for the given data store and version (supports semver)
 * await dataStoreHasVersion('orders-db', '0.0.1');
 * await dataStoreHasVersion('orders-db', 'latest');
 * await dataStoreHasVersion('orders-db', '0.0.x');
 *
 * ```
 */
export const dataStoreHasVersion = Containers.containerHasVersion;

/**
 * Add a file to a data store (e.g. database, cache, etc.) by it's id.
 *
 * Optionally specify a version to add a file to a specific version of the data store.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { addFileToDataStore } = utils('/path/to/eventcatalog');
 *
 * // adds a file to the latest InventoryAdjusted data store
 * await addFileToDataStore('InventoryAdjusted', { content: 'Hello world', fileName: 'hello.txt' });
 *
 * // adds a file to a specific version of the InventoryAdjusted data store
 * await addFileToDataStore('InventoryAdjusted', { content: 'Hello world', fileName: 'hello.txt' }, '0.0.1');
 *
 * ```
 */
export const addFileToDataStore = Containers.addFileToContainer;

/**
 * Write an data store (e.g. database, cache, etc.) to a service in EventCatalog.
 *
 * You can optionally override the path of the data store.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { writeDataStoreToService } = utils('/path/to/eventcatalog');
 *
 * // Write a data store to a given service in the catalog
 * // Data store would be written to services/Inventory/containers/orders-db
 * await writeDataStoreToService({
 *   id: 'orders-db',
 *   name: 'Orders DB',
 *   version: '0.0.1',
 *   summary: 'This is a summary',
 *   markdown: '# Hello world',
 *   container_type: 'database',
 * }, { id: 'Inventory' });
 * ```
 */
export const writeDataStoreToService = Containers.writeContainerToService;
