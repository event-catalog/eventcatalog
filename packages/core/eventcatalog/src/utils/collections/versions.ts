import type { CollectionTypes } from '@types';
import type { CollectionEntry } from 'astro:content';
import { getItemsFromCollectionByIdAndSemverOrLatest } from './util';

export const getVersionFromCollection = (
  collection: CollectionEntry<CollectionTypes>[],
  id: string,
  version?: string
): CollectionEntry<CollectionTypes>[] => {
  return getItemsFromCollectionByIdAndSemverOrLatest(collection, id, version);
};
