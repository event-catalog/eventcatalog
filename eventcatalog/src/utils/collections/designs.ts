import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type Design = CollectionEntry<'designs'>;

interface Props {
  getAllVersions?: boolean;
}

export const getDesigns = async ({ getAllVersions = true }: Props = {}): Promise<Design[]> => {
  const designs = await getCollection('designs');
  return designs.sort((a, b) => a.data.name.localeCompare(b.data.name));
};
