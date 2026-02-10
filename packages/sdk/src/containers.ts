import fs from 'node:fs/promises';
import { join } from 'node:path';
import { findFileById } from './internal/utils';
import type { Container } from './types';
import {
  addFileToResource,
  getResource,
  getResourcePath,
  getResources,
  rmResourceById,
  versionResource,
  writeResource,
} from './internal/resources';

/**
 * Returns an container (e.g. data store) from EventCatalog.
 *
 * You can optionally specify a version to get a specific version of the container
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getContainer } = utils('/path/to/eventcatalog');
 *
 * // Gets the latest version of the container
 * const container = await getContainer('User');
 *
 * // Gets a version of the entity
 * const container = await getContainer('User', '0.0.1');
 *
 * ```
 */
export const getContainer =
  (directory: string) =>
  async (id: string, version?: string): Promise<Container> =>
    getResource(directory, id, version, { type: 'container' }) as Promise<Container>;

/**
 * Returns all containers (e.g. data stores) from EventCatalog.
 *
 * You can optionally specify if you want to get the latest version of the containers.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getContainers } = utils('/path/to/eventcatalog');
 *
 * // Gets all containers (and versions) from the catalog
 * const containers = await getContainers();
 *
 * // Gets all entities (only latest version) from the catalog
 * const containers = await getContainers({ latestOnly: true });
 *
 * ```
 */
export const getContainers =
  (directory: string) =>
  async (options?: { latestOnly?: boolean }): Promise<Container[]> =>
    getResources(directory, { type: 'containers', latestOnly: options?.latestOnly }) as Promise<Container[]>;

/**
 * Write a container (e.g. data store) to EventCatalog.
 */
export const writeContainer =
  (directory: string) =>
  async (
    data: Container,
    options: { path?: string; override?: boolean; versionExistingContent?: boolean; format?: 'md' | 'mdx' } = {
      path: '',
      override: false,
      format: 'mdx',
    }
  ) =>
    writeResource(directory, { ...data }, { ...options, type: 'container' });

/**
 * Version an container (e.g. data store) by its id.
 *
 * Takes the latest container and moves it to a versioned directory.
 * All files with this container are also versioned (e.g /containers/orders-db/schema.json)
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { versionContainer } = utils('/path/to/eventcatalog');
 *
 * // moves the latest orders-db container to a versioned directory
 * // the version within that container is used as the version number.
 * await versionContainer('orders-db');
 *
 * ```
 */
export const versionContainer = (directory: string) => async (id: string) => versionResource(directory, id);

/**
 * Delete an container (e.g. data store) at its given path.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmContainer } = utils('/path/to/eventcatalog');
 *
 * // removes an container at the given path (containers dir is appended to the given path)
 * // Removes the container at containers/orders-db
 * await rmContainer('/orders-db');
 * ```
 */
export const rmContainer = (directory: string) => async (path: string) => {
  await fs.rm(join(directory, path), { recursive: true });
};

/**
 * Delete an container (e.g. data store) by its id.
 *
 * Optionally specify a version to delete a specific version of the container.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmContainerById } = utils('/path/to/eventcatalog');
 *
 * // deletes the latest orders-db container
 * await rmContainerById('orders-db');
 *
 * // deletes a specific version of the orders-db container
 * await rmContainerById('orders-db', '0.0.1');
 * ```
 */
export const rmContainerById = (directory: string) => async (id: string, version?: string, persistFiles?: boolean) => {
  await rmResourceById(directory, id, version, { type: 'container', persistFiles });
};

/**
 * Check to see if the catalog has a version for the given container (e.g. data store).
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { containerHasVersion } = utils('/path/to/eventcatalog');
 *
 * // returns true if version is found for the given entity and version (supports semver)
 * await containerHasVersion('orders-db', '0.0.1');
 * await containerHasVersion('orders-db', 'latest');
 * await containerHasVersion('orders-db', '0.0.x');
 *
 * ```
 */
export const containerHasVersion = (directory: string) => async (id: string, version?: string) => {
  const file = await findFileById(directory, id, version);
  return !!file;
};

/**
 * Add a file to a container (e.g. data store) by it's id.
 *
 * Optionally specify a version to add a file to a specific version of the container.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { addFileToContainer } = utils('/path/to/eventcatalog');
 *
 * // adds a file to the latest InventoryAdjusted event
 * await addFileToContainer('InventoryAdjusted', { content: 'Hello world', fileName: 'hello.txt' });
 *
 * // adds a file to a specific version of the InventoryAdjusted event
 * await addFileToContainer('InventoryAdjusted', { content: 'Hello world', fileName: 'hello.txt' }, '0.0.1');
 *
 * ```
 */
export const addFileToContainer =
  (directory: string) => async (id: string, file: { content: string; fileName: string }, version?: string) =>
    addFileToResource(directory, id, file, version);

/**
 * Write an data store (e.g. data store) to a service in EventCatalog.
 *
 * You can optionally override the path of the data store.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { writeContainerToService } = utils('/path/to/eventcatalog');
 *
 * // Write a container to a given service in the catalog
 * // Container would be written to services/Inventory/containers/orders-db
 * await writeContainerToService({
 *   id: 'orders-db',
 *   name: 'Orders DB',
 *   version: '0.0.1',
 *   summary: 'This is a summary',
 *   markdown: '# Hello world',
 *   container_type: 'database',
 * }, { id: 'Inventory' });
 * ```
 */
export const writeContainerToService =
  (directory: string) =>
  async (
    container: Container,
    service: { id: string; version?: string },
    options: { path?: string; format?: 'md' | 'mdx'; override?: boolean } = { path: '', format: 'mdx', override: false }
  ) => {
    const resourcePath = await getResourcePath(directory, service.id, service.version);
    if (!resourcePath) {
      throw new Error('Service not found');
    }

    let pathForContainer =
      service.version && service.version !== 'latest'
        ? `${resourcePath.directory}/versioned/${service.version}/containers`
        : `${resourcePath.directory}/containers`;
    pathForContainer = join(pathForContainer, container.id);
    await writeResource(directory, { ...container }, { ...options, path: pathForContainer, type: 'container' });
  };
