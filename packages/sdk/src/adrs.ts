import fs from 'node:fs/promises';
import { join } from 'node:path';
import { findFileById, invalidateFileCache } from './internal/utils';
import type { Adr } from './types';
import {
  addFileToResource,
  getResource,
  getResources,
  rmResourceById,
  versionResource,
  writeResource,
} from './internal/resources';

export const getAdr =
  (directory: string) =>
  async (id: string, version?: string): Promise<Adr> =>
    getResource(directory, id, version, { type: 'adr' }) as Promise<Adr>;

export const getAdrs =
  (directory: string) =>
  async (options?: { latestOnly?: boolean }): Promise<Adr[]> =>
    getResources(directory, { type: 'adrs', latestOnly: options?.latestOnly }) as Promise<Adr[]>;

export const writeAdr =
  (directory: string) =>
  async (
    adr: Adr,
    options: { path?: string; override?: boolean; versionExistingContent?: boolean; format?: 'md' | 'mdx' } = {
      path: '',
      override: false,
      format: 'mdx',
    }
  ) =>
    writeResource(directory, { ...adr }, { ...options, type: 'adr' });

export const rmAdr = (directory: string) => async (path: string) => {
  await fs.rm(join(directory, path), { recursive: true });
  invalidateFileCache();
};

export const rmAdrById = (directory: string) => async (id: string, version?: string, persistFiles?: boolean) => {
  await rmResourceById(directory, id, version, { type: 'adr', persistFiles });
};

export const versionAdr = (directory: string) => async (id: string) => versionResource(directory, id);

export const adrHasVersion = (directory: string) => async (id: string, version?: string) => {
  const file = await findFileById(directory, id, version);
  return !!file;
};

export const addFileToAdr =
  (directory: string) =>
  async (id: string, file: { content: string; fileName: string }, version?: string): Promise<void> =>
    addFileToResource(directory, id, file, version, { type: 'adr' });
