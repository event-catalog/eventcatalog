import { getCollection } from 'astro:content';
import { getItemsFromCollectionByIdAndSemverOrLatest, sortVersioned } from './collections/util';
import { buildUrl } from './url-builder';

export const isVersionedReference = (collection: string) => !['users', 'teams', 'customPages'].includes(collection);

export const getResourceReferenceUrl = (collection: string, id: string, version?: string) => {
  if (!isVersionedReference(collection)) return buildUrl(`/docs/${collection}/${id}`);
  return buildUrl(`${collection === 'diagrams' ? '/diagrams' : `/docs/${collection}`}/${id}/${version}`);
};

export const resolveMessageReference = async (message: { id: string; version?: string }) => {
  for (const collection of ['events', 'commands', 'queries'] as const) {
    const items = await getCollection(collection);
    const matches = getItemsFromCollectionByIdAndSemverOrLatest(items, message.id, message.version);
    const [resource] = sortVersioned(matches, (item) => item.data.version);
    if (resource) return { version: resource.data.version, collection };
  }
  return { version: null, collection: null };
};

export const resolveOwnerReference = async (owner: string | { id: string }) => {
  const id = typeof owner === 'string' ? owner : owner.id;
  for (const collection of ['users', 'teams'] as const) {
    const items = await getCollection(collection);
    if (items.some((item) => item.data.id === id)) return { id, href: getResourceReferenceUrl(collection, id) };
  }
  return { id, href: null };
};
