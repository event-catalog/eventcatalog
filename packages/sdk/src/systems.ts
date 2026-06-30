import type { System } from './types';
import fs from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import {
  addFileToResource,
  getResource,
  getResourcePath,
  getResources,
  rmResourceById,
  toResource,
  versionResource,
  writeResource,
} from './internal/resources';
import { findFileById, invalidateFileCache, uniqueVersions } from './internal/utils';

type SystemResourceField = 'services' | 'flows' | 'entities' | 'containers';

const SYSTEM_RESOURCE_IGNORES = [
  '**/systems/**/agents/**',
  '**/systems/**/services/**',
  '**/systems/**/events/**',
  '**/systems/**/commands/**',
  '**/systems/**/queries/**',
  '**/systems/**/flows/**',
  '**/systems/**/channels/**',
  '**/systems/**/entities/**',
  '**/systems/**/containers/**',
  '**/systems/**/diagrams/**',
  '**/systems/**/data-products/**',
  '**/systems/**/adrs/**',
  '**/systems/**/docs/**',
];

const normalizeResourcePointers = (system: System): System => {
  const resource = { ...system };

  if (Array.isArray(system.services)) {
    resource.services = uniqueVersions(system.services as { id: string; version: string }[]);
  }

  if (Array.isArray(system.flows)) {
    resource.flows = uniqueVersions(system.flows as { id: string; version: string }[]);
  }

  if (Array.isArray(system.entities)) {
    resource.entities = uniqueVersions(system.entities as { id: string; version: string }[]);
  }

  if (Array.isArray(system.containers)) {
    resource.containers = uniqueVersions(system.containers as { id: string; version: string }[]);
  }

  return resource;
};

const persistSystemAtExistingPath = async (directory: string, system: System, version?: string) => {
  const systemPath = await getResourcePath(directory, system.id, version);
  const extension = extname(systemPath?.fullPath || '');

  if (!systemPath) {
    throw new Error(`Cannot find system ${system.id} in the catalog`);
  }

  await rmSystemById(directory)(system.id, version, true);
  await writeSystem(directory)(system, {
    path: systemPath.directory,
    format: extension === '.md' ? 'md' : 'mdx',
  });
};

export const getSystem =
  (directory: string) =>
  async (id: string, version?: string): Promise<System> =>
    getResource(directory, id, version, { type: 'system' }) as Promise<System>;

export const getSystemByPath = (directory: string) => async (path: string) => {
  const system = await getResource(directory, undefined, undefined, { type: 'system' }, path);
  return system as System;
};

export const getSystems =
  (directory: string) =>
  async (options?: { latestOnly?: boolean }): Promise<System[]> =>
    getResources(directory, {
      type: 'systems',
      ignore: SYSTEM_RESOURCE_IGNORES,
      latestOnly: options?.latestOnly,
    }) as Promise<System[]>;

export const writeSystem =
  (directory: string) =>
  async (
    system: System,
    options: { path?: string; override?: boolean; versionExistingContent?: boolean; format?: 'md' | 'mdx' } = {
      path: '',
      override: false,
      format: 'mdx',
    }
  ) => {
    const resource = normalizeResourcePointers(system);

    return await writeResource(directory, resource, { ...options, type: 'system' });
  };

export const writeSystemToDomain =
  (directory: string) =>
  async (
    system: System,
    domain: { id: string; version?: string },
    options: { path?: string; format?: 'md' | 'mdx'; override?: boolean } = { path: '', format: 'mdx', override: false }
  ) => {
    const resourcePath = await getResourcePath(directory, domain.id, domain.version);
    if (!resourcePath) {
      throw new Error('Domain not found');
    }

    const pathForSystem = join(resourcePath.directory, 'systems', system.id);
    await writeSystem(directory)({ ...system }, { ...options, path: pathForSystem });
  };

export const versionSystem = (directory: string) => async (id: string) => versionResource(directory, id);

export const rmSystem = (directory: string) => async (path: string) => {
  await fs.rm(join(directory, path), { recursive: true });
  invalidateFileCache();
};

export const rmSystemById = (directory: string) => async (id: string, version?: string, persistFiles?: boolean) => {
  await rmResourceById(directory, id, version, { type: 'system', persistFiles });
};

export const addFileToSystem =
  (directory: string) => async (id: string, file: { content: string; fileName: string }, version?: string) =>
    addFileToResource(directory, id, file, version);

export const systemHasVersion = (directory: string) => async (id: string, version?: string) => {
  const file = await findFileById(directory, id, version);
  return !!file;
};

export const isSystem = (directory: string) => async (path: string) => {
  const system = await getSystemByPath(directory)(path);
  const relativePath = relative(directory, path);
  const segments = relativePath.split(/[/\\]+/);

  return !!system && segments.includes('systems');
};

export const toSystem = (directory: string) => async (file: string) => toResource(directory, file) as Promise<System>;

export const addResourceToSystem =
  (directory: string, resourceField: SystemResourceField) =>
  async (id: string, resource: { id: string; version: string }, version?: string) => {
    const system: System = await getSystem(directory)(id, version);

    if (!system) {
      throw new Error(`Cannot find system ${id} in the catalog`);
    }

    if (system[resourceField] === undefined) {
      system[resourceField] = [];
    }

    const resourceExistsInList = system[resourceField]?.some(
      (item) => item.id === resource.id && item.version === resource.version
    );

    if (resourceExistsInList) {
      return;
    }

    system[resourceField]?.push(resource);

    await persistSystemAtExistingPath(directory, system, version);
  };

export const addServiceToSystem = (directory: string) => addResourceToSystem(directory, 'services');
export const addFlowToSystem = (directory: string) => addResourceToSystem(directory, 'flows');
export const addEntityToSystem = (directory: string) => addResourceToSystem(directory, 'entities');
export const addContainerToSystem = (directory: string) => addResourceToSystem(directory, 'containers');
