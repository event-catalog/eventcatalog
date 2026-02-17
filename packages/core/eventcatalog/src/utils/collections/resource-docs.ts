import { getCollection, type CollectionEntry } from 'astro:content';
import path from 'node:path';
import { buildUrl } from '@utils/url-builder';
import { isEventCatalogScaleEnabled } from '@utils/feature';

type ResourceCollection =
  | 'domains'
  | 'services'
  | 'events'
  | 'commands'
  | 'queries'
  | 'flows'
  | 'channels'
  | 'entities'
  | 'containers'
  | 'data-products';

export interface ResourceDocEntry {
  id: string;
  version: string;
  type: string;
  title: string;
  body: string;
  filePath?: string;
  resource: {
    collection: ResourceCollection;
    id: string;
    version: string;
  };
  href: string;
}

export interface ResourceDocGroup {
  type: string;
  docs: ResourceDocEntry[];
}

const RESOURCE_COLLECTIONS: ResourceCollection[] = [
  'domains',
  'services',
  'events',
  'commands',
  'queries',
  'flows',
  'channels',
  'entities',
  'containers',
  'data-products',
];

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';
let docsCache: ResourceDocEntry[] | null = null;

const normalizePath = (value?: string) => (value || '').replace(/\\/g, '/');

const getResourceKey = (collection: string, id: string, version: string) => `${collection}:${id}:${version}`;

const getDocHref = (doc: {
  resourceCollection: string;
  resourceId: string;
  resourceVersion: string;
  type: string;
  id: string;
  version: string;
}) =>
  buildUrl(
    `/docs/${doc.resourceCollection}/${encodeURIComponent(doc.resourceId)}/${encodeURIComponent(doc.resourceVersion)}/docs/${encodeURIComponent(doc.type)}/${encodeURIComponent(doc.id)}/${encodeURIComponent(doc.version)}`
  );

export const getResourceDocs = async (): Promise<ResourceDocEntry[]> => {
  if (!isEventCatalogScaleEnabled()) {
    return [];
  }

  if (docsCache && CACHE_ENABLED) {
    return docsCache;
  }

  const [resourceDocs, ...resourceCollections] = await Promise.all([
    getCollection('resourceDocs' as any),
    ...RESOURCE_COLLECTIONS.map((collection) => getCollection(collection as any)),
  ]);

  const resources = resourceCollections.flatMap((items, index) => {
    const collection = RESOURCE_COLLECTIONS[index];
    return (items as any[]).map((item: any) => ({
      collection,
      id: item.data.id,
      version: item.data.version,
      dir: normalizePath(path.dirname(item.filePath || '')),
    }));
  });

  const seen = new Set<string>();
  const docs: ResourceDocEntry[] = [];

  for (const doc of resourceDocs as CollectionEntry<'resourceDocs'>[]) {
    const filePath = normalizePath(doc.filePath);
    const match = resources.find((resource) => filePath.startsWith(`${resource.dir}/docs/`));
    if (!match) continue;

    const key = `${getResourceKey(match.collection, match.id, match.version)}:${doc.data.type}:${doc.data.id}:${doc.data.version}`;
    if (seen.has(key)) continue;
    seen.add(key);

    docs.push({
      id: doc.data.id,
      version: doc.data.version,
      type: doc.data.type,
      title: doc.data.name || doc.data.id,
      body: doc.body || '',
      filePath: doc.filePath,
      resource: {
        collection: match.collection,
        id: match.id,
        version: match.version,
      },
      href: getDocHref({
        resourceCollection: match.collection,
        resourceId: match.id,
        resourceVersion: match.version,
        type: doc.data.type,
        id: doc.data.id,
        version: doc.data.version,
      }),
    });
  }

  docsCache = docs;
  return docs;
};

export const getResourceDocsForResource = async (collection: ResourceCollection, id: string, version: string) => {
  const docs = await getResourceDocs();
  return docs.filter(
    (doc) => doc.resource.collection === collection && doc.resource.id === id && doc.resource.version === version
  );
};

export const getGroupedResourceDocsForResource = async (collection: ResourceCollection, id: string, version: string) => {
  const docs = await getResourceDocsForResource(collection, id, version);

  const grouped = docs.reduce<Map<string, ResourceDocEntry[]>>((acc, doc) => {
    const key = doc.type.trim();
    const current = acc.get(key) || [];
    current.push(doc);
    acc.set(key, current);
    return acc;
  }, new Map());

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, groupedDocs]) => ({
      type,
      docs: groupedDocs.sort((a, b) => a.title.localeCompare(b.title)),
    }));
};
