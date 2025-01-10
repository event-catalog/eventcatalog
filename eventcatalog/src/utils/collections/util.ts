import type { CollectionTypes } from '@types';
import type { CollectionEntry } from 'astro:content';
import { coerce, compare, satisfies as satisfiesRange } from 'semver';

export const getPreviousVersion = (version: string, versions: string[]) => {
  const index = versions.indexOf(version);
  return index === -1 ? null : versions[index + 1];
};

export const getVersions = (data: CollectionEntry<CollectionTypes>[]) => {
  const allVersions = data.map((item) => item.data.version);
  const versions = [...new Set(allVersions)];
  return sortStringVersions(versions);
};

/**
 * Sorts versioned items. Latest version first.
 */
export function sortVersioned<T>(versioned: T[], versionExtractor: (e: T) => string): T[] {
  // try to coerce semver versions from input version
  const semverVersions = versioned.map((v) => ({ original: v, semver: coerce(versionExtractor(v)) }));

  // if all versions are semver'ish, use semver to sort them
  if (semverVersions.every((v) => v.semver != null)) {
    const sorted = semverVersions.sort((a, b) => compare(b.semver!, a.semver!));

    return sorted.map((v) => v.original);
  } else {
    // fallback to default sort
    return versioned.sort((a, b) => versionExtractor(b).localeCompare(versionExtractor(a)));
  }
}

export const getVersionForCollectionItem = (
  item: CollectionEntry<CollectionTypes>,
  collection: CollectionEntry<CollectionTypes>[]
) => {
  const allVersionsForItem = collection.filter((i) => i.data.id === item.data.id);

  return getVersions(allVersionsForItem);
};

export function sortStringVersions(versions: string[]) {
  const sorted = sortVersioned(versions, (v) => v);

  return { latestVersion: sorted[0], versions: sorted };
}

/**
 * @param {string} version A valid version (number | v{\d+} | semver)
 * @param {string} range A semver range or exact version to compare
 * @returns {boolean} Returns true if the version satisfies the range.
 */
export const satisfies = (version: string, range: string): boolean => {
  const coercedVersion = coerce(version);
  if (!coercedVersion) return false;
  return satisfiesRange(coercedVersion, range);
};

export const getItemsFromCollectionByIdAndSemverOrLatest = <T extends { data: { id: string; version: string } }>(
  collection: T[],
  id: string,
  version?: string
): T[] => {
  const filteredCollection = collection.filter((c) => c.data.id == id);

  if (version && version != 'latest') {
    return filteredCollection.filter((c) => satisfies(c.data.version, version));
  }

  // Order by version
  const sorted = sortVersioned(filteredCollection, (item) => item.data.version);

  // latest version
  return sorted[0] != null ? [sorted[0]] : [];
};

export const findMatchingNodes = (
  nodesA: CollectionEntry<'events' | 'commands' | 'queries' | 'services'>[],
  nodesB: CollectionEntry<'events' | 'commands' | 'queries' | 'services'>[]
) => {
  // Track messages that are both sent and received
  return nodesA.filter((nodeA) => {
    return nodesB.some((nodeB) => {
      return nodeB.data.id === nodeA.data.id && nodeB.data.version === nodeA.data.version;
    });
  });
};
