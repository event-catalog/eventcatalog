import fs from 'node:fs';
import path from 'node:path';

type DirectoryStoreResource = {
  id: string;
  markdown?: string;
  [key: string]: unknown;
};

type DirectoryStore = {
  version: string;
  generatedAt?: string;
  resources?: {
    users?: DirectoryStoreResource[];
    teams?: DirectoryStoreResource[];
  };
};

type DirectoryStoreCollection = 'users' | 'teams';

const DIRECTORY_STORE_PATH = path.join('.eventcatalog', 'store', 'directory.json');

const getCatalogRoot = (catalogDir: string, collection: DirectoryStoreCollection) => {
  return path.basename(catalogDir) === collection ? path.dirname(catalogDir) : catalogDir;
};

export const getDirectoryStorePath = (catalogDir: string, collection: DirectoryStoreCollection) => {
  return path.join(getCatalogRoot(catalogDir, collection), DIRECTORY_STORE_PATH);
};

type ResourceWithId = {
  id: string;
};

export const readDirectoryStoreResources = <T extends ResourceWithId>(
  catalogDir: string,
  collection: DirectoryStoreCollection
): T[] => {
  const storePath = getDirectoryStorePath(catalogDir, collection);
  if (!fs.existsSync(storePath)) return [];

  try {
    const store = JSON.parse(fs.readFileSync(storePath, 'utf8')) as DirectoryStore;
    const resources = store.resources?.[collection];
    return Array.isArray(resources) ? (resources as unknown as T[]) : [];
  } catch {
    return [];
  }
};

export const readDirectoryStoreResource = <T extends ResourceWithId>(
  catalogDir: string,
  collection: DirectoryStoreCollection,
  id: string
): T | undefined => {
  return readDirectoryStoreResources<T>(catalogDir, collection).find((resource) => resource.id === id);
};

export const mergeDirectoryStoreResources = <T extends ResourceWithId>(local: T[], directory: T[]) => {
  const localIds = new Set(local.map((resource) => resource.id));
  return [...local, ...directory.filter((resource) => !localIds.has(resource.id))];
};
