import fs from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { findFileById } from './internal/utils';
import type { Entity } from './types';
import { getResource, getResources, rmResourceById, versionResource, writeResource } from './internal/resources';

/**
 * Returns an entity from EventCatalog.
 *
 * You can optionally specify a version to get a specific version of the entity
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getEntity } = utils('/path/to/eventcatalog');
 *
 * // Gets the latest version of the entity
 * const entity = await getEntity('User');
 *
 * // Gets a version of the entity
 * const entity = await getEntity('User', '0.0.1');
 *
 * ```
 */
export const getEntity =
  (directory: string) =>
  async (id: string, version?: string): Promise<Entity> =>
    getResource(directory, id, version, { type: 'entity' }) as Promise<Entity>;

/**
 * Returns all entities from EventCatalog.
 *
 * You can optionally specify if you want to get the latest version of the entities.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getEntities } = utils('/path/to/eventcatalog');
 *
 * // Gets all entities (and versions) from the catalog
 * const entities = await getEntities();
 *
 * // Gets all entities (only latest version) from the catalog
 * const entities = await getEntities({ latestOnly: true });
 *
 * ```
 */
export const getEntities =
  (directory: string) =>
  async (options?: { latestOnly?: boolean }): Promise<Entity[]> =>
    getResources(directory, { type: 'entities', latestOnly: options?.latestOnly }) as Promise<Entity[]>;

/**
 * Write an entity to EventCatalog.
 *
 * You can optionally override the path of the entity.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { writeEntity } = utils('/path/to/eventcatalog');
 *
 * // Write an entity to the catalog
 * // Entity would be written to entities/User
 * await writeEntity({
 *   id: 'User',
 *   name: 'User',
 *   version: '0.0.1',
 *   summary: 'User entity',
 *   markdown: '# User entity',
 * });
 *
 * // Write an entity to the catalog but override the path
 * // Entity would be written to entities/Account/User
 * await writeEntity({
 *    id: 'User',
 *    name: 'User',
 *    version: '0.0.1',
 *    summary: 'User entity',
 *    markdown: '# User entity',
 * }, { path: "/Account/User"});
 *
 * // Write an entity to the catalog and override the existing content (if there is any)
 * await writeEntity({
 *    id: 'User',
 *    name: 'User',
 *    version: '0.0.1',
 *    summary: 'User entity',
 *    markdown: '# User entity',
 * }, { override: true });
 *
 * // Write an entity to the catalog and version the previous version
 * // only works if the new version is greater than the previous version
 * await writeEntity({
 *    id: 'User',
 *    name: 'User',
 *    version: '0.0.1',
 *    summary: 'User entity',
 *    markdown: '# User entity',
 * }, { versionExistingContent: true });
 *
 * ```
 */
export const writeEntity =
  (directory: string) =>
  async (
    entity: Entity,
    options: { path?: string; override?: boolean; versionExistingContent?: boolean; format?: 'md' | 'mdx' } = {
      path: '',
      override: false,
      format: 'mdx',
    }
  ) =>
    writeResource(directory, { ...entity }, { ...options, type: 'entity' });

/**
 * Delete an entity at its given path.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmEntity } = utils('/path/to/eventcatalog');
 *
 * // removes an entity at the given path (entities dir is appended to the given path)
 * // Removes the entity at entities/User
 * await rmEntity('/User');
 * ```
 */
export const rmEntity = (directory: string) => async (path: string) => {
  await fs.rm(join(directory, path), { recursive: true });
};

/**
 * Delete an entity by its id.
 *
 * Optionally specify a version to delete a specific version of the entity.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmEntityById } = utils('/path/to/eventcatalog');
 *
 * // deletes the latest User entity
 * await rmEntityById('User');
 *
 * // deletes a specific version of the User entity
 * await rmEntityById('User', '0.0.1');
 * ```
 */
export const rmEntityById = (directory: string) => async (id: string, version?: string, persistFiles?: boolean) => {
  await rmResourceById(directory, id, version, { type: 'entity', persistFiles });
};

/**
 * Version an entity by its id.
 *
 * Takes the latest entity and moves it to a versioned directory.
 * All files with this entity are also versioned (e.g /entities/User/schema.json)
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { versionEntity } = utils('/path/to/eventcatalog');
 *
 * // moves the latest User entity to a versioned directory
 * // the version within that entity is used as the version number.
 * await versionEntity('User');
 *
 * ```
 */
export const versionEntity = (directory: string) => async (id: string) => versionResource(directory, id);

/**
 * Check to see if the catalog has a version for the given entity.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { entityHasVersion } = utils('/path/to/eventcatalog');
 *
 * // returns true if version is found for the given entity and version (supports semver)
 * await entityHasVersion('User', '0.0.1');
 * await entityHasVersion('User', 'latest');
 * await entityHasVersion('User', '0.0.x');
 *
 * ```
 */
export const entityHasVersion = (directory: string) => async (id: string, version?: string) => {
  const file = await findFileById(directory, id, version);
  return !!file;
};
