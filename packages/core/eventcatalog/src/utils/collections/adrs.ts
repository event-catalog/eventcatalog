import { getCollection, type CollectionEntry } from 'astro:content';
import type { CollectionTypes, CollectionUserTypes } from '@types';
import { collectionToResourceMap, createVersionedMap, findInMap, versionMatches } from '@utils/collections/util';
export {
  ADR_STATUS,
  adrStatusBadgeColor,
  createAdrStatusBadge,
  formatAdrDate,
  formatAdrStatus,
  hasAdrStatus,
  isAdrCollection,
  isDeprecatedAdr,
  isSupersededAdr,
  type AdrStatus,
} from './adr-constants';

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';

export type Adr = CollectionEntry<'adrs'>;
export type AdrResourceType = NonNullable<Adr['data']['appliesTo']>[number]['type'];
export type AdrPointer = { id: string; version?: string };
export type AdrResource = CollectionEntry<CollectionTypes> | CollectionEntry<CollectionUserTypes>;

interface Props {
  getAllVersions?: boolean;
  returnBody?: boolean;
}

let memoryCache: Record<string, Adr[]> = {};

export const getAdrs = async ({ getAllVersions = true, returnBody = false }: Props = {}): Promise<Adr[]> => {
  const cacheKey = `${getAllVersions ? 'allVersions' : 'currentVersions'}-${returnBody ? 'withBody' : 'noBody'}`;

  if (memoryCache[cacheKey] && memoryCache[cacheKey].length > 0 && CACHE_ENABLED) {
    return memoryCache[cacheKey];
  }

  const allAdrs = await getCollection('adrs');
  const adrMap = createVersionedMap(allAdrs);

  const targetAdrs = allAdrs.filter((adr) => {
    if (adr.data.hidden === true) return false;
    if (!getAllVersions && adr.filePath?.includes('versioned')) return false;
    return true;
  });

  const processedAdrs = targetAdrs.map((adr) => {
    const adrVersions = adrMap.get(adr.data.id) || [];
    const latestVersion = adrVersions[0]?.data.version || adr.data.version;
    const versions = adrVersions.map((entry) => entry.data.version);

    return {
      ...adr,
      data: {
        ...adr.data,
        versions,
        latestVersion,
      },
      body: returnBody ? adr.body : undefined,
    };
  });

  processedAdrs.sort((a, b) => {
    const dateCompare = Number(b.data.date) - Number(a.data.date);
    if (dateCompare !== 0) return dateCompare;
    return (a.data.name || a.data.id).localeCompare(b.data.name || b.data.id);
  });

  memoryCache[cacheKey] = processedAdrs;

  return processedAdrs;
};

export const getAdrNodeKey = (adr: Adr) => `adr:${adr.data.id}:${adr.data.version}`;

export const getAdrAliasNodeKey = (adr: Adr) => `adr:${adr.data.id}`;

export const getAdrResourceNodeKey = (resource: AdrResource) => {
  const resourceType = collectionToResourceMap[resource.collection as keyof typeof collectionToResourceMap];
  if (!resourceType) return undefined;
  if (resource.collection === 'users' || resource.collection === 'teams') return `${resourceType}:${resource.data.id}`;
  return `${resourceType}:${resource.data.id}:${(resource.data as any).version}`;
};

const isResourcePointerMatch = (resource: AdrResource, pointer: NonNullable<Adr['data']['appliesTo']>[number]) => {
  const resourceType = collectionToResourceMap[resource.collection as keyof typeof collectionToResourceMap];
  if (pointer.type !== resourceType || pointer.id !== resource.data.id) return false;

  const resourceVersion = (resource.data as any).version;
  if (!resourceVersion) return true;
  if (!pointer.version || pointer.version === 'latest') return true;

  return versionMatches(resourceVersion, pointer.version);
};

export const getAdrsForResource = (resource: AdrResource, adrs: Adr[]) => {
  return adrs.filter((adr) => (adr.data.appliesTo || []).some((pointer) => isResourcePointerMatch(resource, pointer)));
};

export const resolveAdrPointers = (pointers: AdrPointer[] | undefined, adrs: Adr[]) => {
  if (!pointers || pointers.length === 0) return [];

  const adrMap = createVersionedMap(adrs);
  return pointers.map((pointer) => findInMap(adrMap, pointer.id, pointer.version)).filter((adr): adr is Adr => !!adr);
};

export const getAdrRelationships = (adr: Adr, adrs: Adr[]) => {
  const supersedes = resolveAdrPointers(adr.data.supersedes, adrs);
  const explicitSupersededBy = resolveAdrPointers(adr.data.supersededBy, adrs);
  const derivedSupersededBy = adrs.filter((candidate) =>
    (candidate.data.supersedes || []).some((pointer) => {
      if (pointer.id !== adr.data.id) return false;
      return !pointer.version || pointer.version === 'latest' || versionMatches(adr.data.version, pointer.version);
    })
  );

  const amends = resolveAdrPointers(adr.data.amends, adrs);
  const explicitAmendedBy = resolveAdrPointers(adr.data.amendedBy, adrs);
  const derivedAmendedBy = adrs.filter((candidate) =>
    (candidate.data.amends || []).some((pointer) => {
      if (pointer.id !== adr.data.id) return false;
      return !pointer.version || pointer.version === 'latest' || versionMatches(adr.data.version, pointer.version);
    })
  );

  return {
    supersedes,
    supersededBy: uniqueAdrs([...explicitSupersededBy, ...derivedSupersededBy], adr),
    amends,
    amendedBy: uniqueAdrs([...explicitAmendedBy, ...derivedAmendedBy], adr),
    related: resolveAdrPointers(adr.data.related, adrs),
  };
};

const uniqueAdrs = (adrs: Adr[], currentAdr?: Adr) => {
  const seen = new Set<string>();

  return adrs.filter((adr) => {
    if (currentAdr && adr.data.id === currentAdr.data.id && adr.data.version === currentAdr.data.version) return false;

    const key = `${adr.data.id}:${adr.data.version}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
