import { getCollection, type CollectionEntry } from 'astro:content';
import { sortVersioned } from './util';
import { isResourceDocsEnabled } from '@utils/feature';

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';

export type ResourceCollection =
  | 'domains'
  | 'services'
  | 'events'
  | 'commands'
  | 'queries'
  | 'flows'
  | 'containers'
  | 'channels'
  | 'entities'
  | 'data-products';

type BaseResourceDocEntry = CollectionEntry<'resourceDocs'>;
type BaseResourceDocCategoryEntry = CollectionEntry<'resourceDocCategories'>;

export type ResourceDocEntry = Omit<BaseResourceDocEntry, 'data'> & {
  data: BaseResourceDocEntry['data'] & {
    id: string;
    type: string;
    version: string;
    order?: number;
    resourceCollection: ResourceCollection;
    resourceId: string;
    resourceVersion: string;
    versions: string[];
    latestVersion: string;
  };
};

export type ResourceDocCategoryEntry = Omit<BaseResourceDocCategoryEntry, 'data'> & {
  data: BaseResourceDocCategoryEntry['data'] & {
    type: string;
    resourceCollection: ResourceCollection;
    resourceId: string;
    resourceVersion: string;
  };
};

export type ResourceDocGroup = {
  type: string;
  docs: ResourceDocEntry[];
  label?: string;
  position?: number;
};

type ResourceLookup = {
  latestById: Map<string, string>;
  versionsById: Map<string, Set<string>>;
};

type InferredResource = {
  resourceCollection: ResourceCollection;
  resourceId: string;
  resourceVersion: string;
};

let memoryCache: ResourceDocEntry[] | null = null;
let memoryCategoryCache: ResourceDocCategoryEntry[] | null = null;
let memoryResourceLookupCache: Record<ResourceCollection, ResourceLookup> | null = null;
let memoryResourceLookupPromise: Promise<Record<ResourceCollection, ResourceLookup>> | null = null;

const normalizePath = (value: string) => value.replace(/\\/g, '/').replace(/^\.\//, '');
const normalizeTypeName = (value: string) => value.trim().toLowerCase();

const inferOrderFromFilePath = (filePath: string): number | undefined => {
  const normalizedPath = normalizePath(filePath);
  const fileName = normalizedPath.split('/').pop();

  if (!fileName) {
    return undefined;
  }

  const fileNameWithoutExtension = fileName.replace(/\.(md|mdx)$/i, '');
  const orderMatch = fileNameWithoutExtension.match(/^(\d+)(?:[-_.\s]|$)/);

  if (!orderMatch) {
    return undefined;
  }

  const parsedOrder = Number.parseInt(orderMatch[1], 10);
  return Number.isFinite(parsedOrder) ? parsedOrder : undefined;
};

const inferDocIdFromFilePath = (filePath: string): string | undefined => {
  const normalizedPath = normalizePath(filePath);
  const fileName = normalizedPath.split('/').pop();

  if (!fileName) {
    return undefined;
  }

  const fileNameWithoutExtension = fileName.replace(/\.(md|mdx)$/i, '');
  if (!fileNameWithoutExtension) {
    return undefined;
  }

  // Support ordered filenames like "01-my-doc" while keeping stable ids.
  const idWithoutNumericPrefix = fileNameWithoutExtension.replace(/^\d+(?:[-_.\s]+)?/, '');
  return idWithoutNumericPrefix || fileNameWithoutExtension;
};

const inferDocTypeFromFilePath = (filePath: string): string | undefined => {
  const normalizedPath = normalizePath(filePath);
  const docsMarker = '/docs/';
  const docsIndex = normalizedPath.indexOf(docsMarker);

  if (docsIndex === -1) {
    return undefined;
  }

  const docsRelativePath = normalizedPath.slice(docsIndex + docsMarker.length);
  const segments = docsRelativePath.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (!firstSegment || firstSegment === 'versioned') {
    return undefined;
  }

  if (/\.[a-z0-9]+$/i.test(firstSegment)) {
    return undefined;
  }

  return firstSegment;
};

const getCategoryFilePriority = (filePath: string): number => {
  const fileName = normalizePath(filePath).split('/').pop()?.toLowerCase();
  if (fileName === 'category.json') {
    return 2;
  }
  if (fileName === '_category_.json') {
    return 1;
  }
  return 0;
};

const inferResourceFromFilePath = (filePath: string): InferredResource | null => {
  const normalizedPath = normalizePath(filePath);
  const docsIndex = normalizedPath.indexOf('/docs/');

  if (docsIndex === -1) {
    return null;
  }

  const resourcePath = normalizedPath.slice(0, docsIndex);
  const segments = resourcePath.split('/').filter(Boolean);

  const parseVersion = (index: number) => {
    if (segments[index + 2] === 'versioned' && segments[index + 3]) {
      return segments[index + 3];
    }
    return 'latest';
  };

  const segmentMappings: Array<{ segment: string; collection: ResourceCollection }> = [
    { segment: 'events', collection: 'events' },
    { segment: 'commands', collection: 'commands' },
    { segment: 'queries', collection: 'queries' },
    { segment: 'services', collection: 'services' },
    { segment: 'domains', collection: 'domains' },
    { segment: 'subdomains', collection: 'domains' },
    { segment: 'flows', collection: 'flows' },
    { segment: 'containers', collection: 'containers' },
    { segment: 'channels', collection: 'channels' },
    { segment: 'entities', collection: 'entities' },
    { segment: 'data-products', collection: 'data-products' },
  ];

  let matched: { index: number; collection: ResourceCollection } | null = null;

  for (let index = 0; index < segments.length; index++) {
    const match = segmentMappings.find((mapping) => mapping.segment === segments[index]);
    if (!match) {
      continue;
    }

    if (!segments[index + 1]) {
      continue;
    }

    if (!matched || index > matched.index) {
      matched = { index, collection: match.collection };
    }
  }

  if (!matched) {
    return null;
  }

  return {
    resourceCollection: matched.collection,
    resourceId: segments[matched.index + 1],
    resourceVersion: parseVersion(matched.index),
  };
};

const buildLookup = (
  resources: Array<{
    data: { id: string; version: string; hidden?: boolean };
  }>
): ResourceLookup => {
  const groupedById = new Map<string, string[]>();

  for (const resource of resources) {
    if (resource.data.hidden === true) {
      continue;
    }
    const list = groupedById.get(resource.data.id) || [];
    list.push(resource.data.version);
    groupedById.set(resource.data.id, list);
  }

  const latestById = new Map<string, string>();
  const versionsById = new Map<string, Set<string>>();

  for (const [id, versions] of groupedById.entries()) {
    const sorted = sortVersioned([...new Set(versions)], (version) => version);
    if (sorted.length > 0) {
      latestById.set(id, sorted[0]);
      versionsById.set(id, new Set(sorted));
    }
  }

  return { latestById, versionsById };
};

const getResourceLookups = async (): Promise<Record<ResourceCollection, ResourceLookup>> => {
  if (CACHE_ENABLED && memoryResourceLookupCache) {
    return memoryResourceLookupCache;
  }

  if (CACHE_ENABLED && memoryResourceLookupPromise) {
    return memoryResourceLookupPromise;
  }

  const lookupPromise = (async () => {
    const [domains, services, events, commands, queries, flows, containers, channels, entities, dataProducts] = await Promise.all(
      [
        getCollection('domains'),
        getCollection('services'),
        getCollection('events'),
        getCollection('commands'),
        getCollection('queries'),
        getCollection('flows'),
        getCollection('containers'),
        getCollection('channels'),
        getCollection('entities'),
        getCollection('data-products'),
      ]
    );

    return {
      domains: buildLookup(domains),
      services: buildLookup(services),
      events: buildLookup(events),
      commands: buildLookup(commands),
      queries: buildLookup(queries),
      flows: buildLookup(flows),
      containers: buildLookup(containers),
      channels: buildLookup(channels),
      entities: buildLookup(entities),
      'data-products': buildLookup(dataProducts),
    };
  })();

  if (CACHE_ENABLED) {
    memoryResourceLookupPromise = lookupPromise;
  }

  try {
    const lookups = await lookupPromise;
    if (CACHE_ENABLED) {
      memoryResourceLookupCache = lookups;
    }
    return lookups;
  } finally {
    if (CACHE_ENABLED) {
      memoryResourceLookupPromise = null;
    }
  }
};

const resolveResourceFromPath = (
  filePath: string,
  lookups: Record<ResourceCollection, ResourceLookup>
): InferredResource | null => {
  const inferredResource = inferResourceFromFilePath(filePath);
  if (!inferredResource) {
    return null;
  }

  const { resourceCollection, resourceId, resourceVersion } = inferredResource;
  const lookup = lookups[resourceCollection];
  const knownVersions = lookup.versionsById.get(resourceId);

  if (!knownVersions || knownVersions.size === 0) {
    return null;
  }

  const resolvedResourceVersion = resourceVersion === 'latest' ? (lookup.latestById.get(resourceId) ?? null) : resourceVersion;

  if (!resolvedResourceVersion || !knownVersions.has(resolvedResourceVersion)) {
    return null;
  }

  return {
    resourceCollection,
    resourceId,
    resourceVersion: resolvedResourceVersion,
  };
};

export const getResourceDocs = async (): Promise<ResourceDocEntry[]> => {
  if (!isResourceDocsEnabled()) {
    return [];
  }

  if (memoryCache && CACHE_ENABLED) {
    return memoryCache;
  }

  const [docs, lookups] = await Promise.all([getCollection('resourceDocs'), getResourceLookups()]);

  const docsWithResources = docs
    .filter((doc) => doc.data.hidden !== true)
    .map((doc) => {
      if (!doc.filePath) {
        return null;
      }

      const resolvedResource = resolveResourceFromPath(doc.filePath, lookups);
      if (!resolvedResource) {
        return null;
      }

      const inferredOrder = inferOrderFromFilePath(doc.filePath);
      const resolvedOrder = typeof doc.data.order === 'number' ? doc.data.order : inferredOrder;
      const inferredType = inferDocTypeFromFilePath(doc.filePath);
      const resolvedType = doc.data.type || inferredType || 'pages';
      const resolvedDocId = doc.data.id || inferDocIdFromFilePath(doc.filePath);
      const resolvedDocVersion = doc.data.version;
      const { resourceCollection, resourceId, resourceVersion } = resolvedResource;

      if (!resolvedDocId || !resolvedDocVersion) {
        return null;
      }

      return {
        ...doc,
        data: {
          ...doc.data,
          id: resolvedDocId,
          type: resolvedType,
          version: resolvedDocVersion,
          order: resolvedOrder,
          resourceCollection,
          resourceId,
          resourceVersion,
          versions: [],
          latestVersion: resolvedDocVersion,
        },
      } as ResourceDocEntry;
    })
    .filter((doc): doc is ResourceDocEntry => doc !== null);

  const docsByResourceAndId = new Map<string, ResourceDocEntry[]>();

  for (const doc of docsWithResources) {
    const key = `${doc.data.resourceCollection}:${doc.data.resourceId}:${doc.data.resourceVersion}:${doc.data.type}:${doc.data.id}`;
    const versions = docsByResourceAndId.get(key) || [];
    versions.push(doc);
    docsByResourceAndId.set(key, versions);
  }

  const enrichedDocs: ResourceDocEntry[] = [];

  for (const docsForResource of docsByResourceAndId.values()) {
    const sortedByVersion = sortVersioned(docsForResource, (doc) => doc.data.version);
    const allVersions = sortedByVersion.map((doc) => doc.data.version);
    const latestVersion = allVersions[0];

    for (const doc of sortedByVersion) {
      enrichedDocs.push({
        ...doc,
        data: {
          ...doc.data,
          versions: allVersions,
          latestVersion,
        },
      });
    }
  }

  enrichedDocs.sort((a, b) => {
    const resourceKeyA = `${a.data.resourceCollection}:${a.data.resourceId}:${a.data.resourceVersion}`;
    const resourceKeyB = `${b.data.resourceCollection}:${b.data.resourceId}:${b.data.resourceVersion}`;
    if (resourceKeyA !== resourceKeyB) {
      return resourceKeyA.localeCompare(resourceKeyB);
    }

    const typeCompare = a.data.type.localeCompare(b.data.type);
    if (typeCompare !== 0) {
      return typeCompare;
    }

    const titleA = (a.data.title || a.data.id).toLowerCase();
    const titleB = (b.data.title || b.data.id).toLowerCase();
    if (titleA !== titleB) {
      return titleA.localeCompare(titleB);
    }

    return b.data.version.localeCompare(a.data.version);
  });

  memoryCache = enrichedDocs;
  return enrichedDocs;
};

export const getResourceDocCategories = async (): Promise<ResourceDocCategoryEntry[]> => {
  if (!isResourceDocsEnabled()) {
    return [];
  }

  if (memoryCategoryCache && CACHE_ENABLED) {
    return memoryCategoryCache;
  }

  const [categories, lookups] = await Promise.all([getCollection('resourceDocCategories'), getResourceLookups()]);
  const categoriesByKey = new Map<string, ResourceDocCategoryEntry>();

  for (const category of categories) {
    if (!category.filePath) {
      continue;
    }

    const resolvedResource = resolveResourceFromPath(category.filePath, lookups);
    if (!resolvedResource) {
      continue;
    }

    const categoryType = inferDocTypeFromFilePath(category.filePath) || 'pages';
    const key = `${resolvedResource.resourceCollection}:${resolvedResource.resourceId}:${resolvedResource.resourceVersion}:${categoryType}`;
    const existing = categoriesByKey.get(key);

    const nextEntry: ResourceDocCategoryEntry = {
      ...category,
      data: {
        ...category.data,
        type: categoryType,
        resourceCollection: resolvedResource.resourceCollection,
        resourceId: resolvedResource.resourceId,
        resourceVersion: resolvedResource.resourceVersion,
      },
    };

    if (!existing) {
      categoriesByKey.set(key, nextEntry);
      continue;
    }

    const existingPriority = existing.filePath ? getCategoryFilePriority(existing.filePath) : 0;
    const nextPriority = getCategoryFilePriority(category.filePath);

    if (nextPriority >= existingPriority) {
      if (
        existing.filePath &&
        category.filePath &&
        getCategoryFilePriority(existing.filePath) !== getCategoryFilePriority(category.filePath)
      ) {
        // Prefer category.json over _category_.json when both exist in the same folder.
        console.warn(
          `[resource-docs] Both category.json and _category_.json found for ${key}. Using ${
            nextPriority > existingPriority ? category.filePath : existing.filePath
          }.`
        );
      }
      categoriesByKey.set(key, nextEntry);
    }
  }

  const resolvedCategories = [...categoriesByKey.values()].sort((a, b) => {
    const resourceKeyA = `${a.data.resourceCollection}:${a.data.resourceId}:${a.data.resourceVersion}`;
    const resourceKeyB = `${b.data.resourceCollection}:${b.data.resourceId}:${b.data.resourceVersion}`;
    if (resourceKeyA !== resourceKeyB) {
      return resourceKeyA.localeCompare(resourceKeyB);
    }

    const positionA = typeof a.data.position === 'number' ? a.data.position : Number.POSITIVE_INFINITY;
    const positionB = typeof b.data.position === 'number' ? b.data.position : Number.POSITIVE_INFINITY;
    if (positionA !== positionB) {
      return positionA - positionB;
    }

    return a.data.type.localeCompare(b.data.type);
  });

  memoryCategoryCache = resolvedCategories;
  return resolvedCategories;
};

export const getResourceDocCategoriesForResource = async (
  resourceCollection: ResourceCollection,
  resourceId: string,
  resourceVersion: string
): Promise<ResourceDocCategoryEntry[]> => {
  const categories = await getResourceDocCategories();
  return categories.filter(
    (category) =>
      category.data.resourceCollection === resourceCollection &&
      category.data.resourceId === resourceId &&
      category.data.resourceVersion === resourceVersion
  );
};

export const getResourceDocsForResource = async (
  resourceCollection: ResourceCollection,
  resourceId: string,
  resourceVersion: string
): Promise<ResourceDocEntry[]> => {
  const docs = await getResourceDocs();
  return docs.filter(
    (doc) =>
      doc.data.resourceCollection === resourceCollection &&
      doc.data.resourceId === resourceId &&
      doc.data.resourceVersion === resourceVersion
  );
};

export const getGroupedResourceDocsByType = (
  docs: ResourceDocEntry[],
  { latestOnly = true, categories = [] }: { latestOnly?: boolean; categories?: ResourceDocCategoryEntry[] } = {}
): ResourceDocGroup[] => {
  const docsByType = new Map<string, ResourceDocEntry[]>();
  const categoriesByType = new Map(categories.map((category) => [normalizeTypeName(category.data.type), category]));

  const findCategoryForType = (type: string): ResourceDocCategoryEntry | undefined => {
    const normalizedType = normalizeTypeName(type);
    const directMatch = categoriesByType.get(normalizedType);
    if (directMatch) {
      return directMatch;
    }

    if (normalizedType.endsWith('s')) {
      return categoriesByType.get(normalizedType.slice(0, -1));
    }

    return categoriesByType.get(`${normalizedType}s`);
  };

  for (const doc of docs) {
    if (latestOnly && doc.data.version !== doc.data.latestVersion) {
      continue;
    }
    const list = docsByType.get(doc.data.type) || [];
    list.push(doc);
    docsByType.set(doc.data.type, list);
  }

  return [...docsByType.entries()]
    .map(([type, typeDocs]) => {
      const category = findCategoryForType(type);
      return {
        type,
        label: category?.data.label,
        position: category?.data.position,
        docs: [...typeDocs].sort((a, b) => {
          const orderA = typeof a.data.order === 'number' ? a.data.order : Number.POSITIVE_INFINITY;
          const orderB = typeof b.data.order === 'number' ? b.data.order : Number.POSITIVE_INFINITY;

          if (orderA !== orderB) {
            return orderA - orderB;
          }

          const titleA = (a.data.title || a.data.id).toLowerCase();
          const titleB = (b.data.title || b.data.id).toLowerCase();
          const titleCompare = titleA.localeCompare(titleB);
          if (titleCompare !== 0) {
            return titleCompare;
          }

          return b.data.version.localeCompare(a.data.version);
        }),
      };
    })
    .sort((a, b) => {
      const positionA = typeof a.position === 'number' ? a.position : Number.POSITIVE_INFINITY;
      const positionB = typeof b.position === 'number' ? b.position : Number.POSITIVE_INFINITY;

      if (positionA !== positionB) {
        return positionA - positionB;
      }

      return a.type.localeCompare(b.type);
    });
};
