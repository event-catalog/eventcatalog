import type { CollectionTypes } from '@types';
import type { CollectionEntry } from 'astro:content';

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
