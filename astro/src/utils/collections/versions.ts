import type { CollectionTypes } from '@types';
import type { CollectionEntry } from 'astro:content';
import { satisfies, validRange } from 'semver';

export const getVersionFromCollection = (
  collection: CollectionEntry<CollectionTypes>[],
  id: string,
  version?: string
): CollectionEntry<CollectionTypes>[] => {
  const data = collection;
  const semverRange = validRange(version);

  if (semverRange) {
    return data.filter((msg) => msg.data.id == id).filter((msg) => satisfies(msg.data.version, semverRange));
  }

  const filteredEvents = data.filter((event) => event.data.id === id);

  // Order by version
  const sorted = filteredEvents.sort((a, b) => {
    return a.data.version.localeCompare(b.data.version);
  });

  // latest version
  return [sorted[sorted.length - 1]];
};
