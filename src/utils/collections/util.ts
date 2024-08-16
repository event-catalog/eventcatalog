import type { CollectionTypes } from '@types';
import type { CollectionEntry } from 'astro:content';
import { satisfies, validRange } from 'semver';

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
  const versions = [...new Set(allVersionsForItem)].reverse();
  const latestVersion = versions[0];
  return { versions, latestVersion };
};

export const getItemsFromCollectionByIdAndSemverOrLatest = <T extends { data: { id: string; version: string } }>(
  collection: T[],
  id: string,
  version?: string
): T[] => {
  const semverRange = validRange(version);
  const filteredCollection = collection.filter((c) => c.data.id == id);

  if (semverRange) {
    return filteredCollection.filter((c) => satisfies(c.data.version, semverRange));
  }

  // Order by version
  const sorted = filteredCollection.sort((a, b) => {
    return a.data.version.localeCompare(b.data.version);
  });

  // latest version
  return sorted.length > 0 ? [sorted[sorted.length - 1]] : [];
};
