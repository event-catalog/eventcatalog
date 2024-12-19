import type { CollectionTypes } from '@types';
import type { CollectionEntry } from 'astro:content';
import { coerce, satisfies as satisfiesRange, compare } from 'semver';

export const getPreviousVersion = (version: string, versions: string[]) => {
  const index = versions.indexOf(version);
  return index === -1 ? null : versions[index + 1];
};

export const getVersions = (data: CollectionEntry<CollectionTypes>[]) => {
  const allVersions = data.map((item) => item.data.version).sort();
  const versions = [...new Set(allVersions)].reverse();
  const latestVersion = versions[0];
  return { versions, latestVersion };
};

export const getVersionForCollectionItem = (
  item: CollectionEntry<CollectionTypes>,
  collection: CollectionEntry<CollectionTypes>[]
) => {
  const allVersionsForItem = collection
    .filter((i) => i.data.id === item.data.id)
    .map((i) => i.data.version)
    .sort();

  // unique versions
  const versions = [...new Set(allVersionsForItem)];

  // Use semver to order the versions
  const orderedVersions = versions.sort((a, b) => {
    return compare(b, a);
  });

  const latestVersion = orderedVersions[0];

  return { versions, latestVersion };
};

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
  const sorted = filteredCollection.sort((a, b) => {
    return a.data.version.localeCompare(b.data.version);
  });

  // latest version
  return sorted.length > 0 ? [sorted[sorted.length - 1]] : [];
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
