import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type Page = CollectionEntry<'pages'>;

export const getPages = async (): Promise<Page[]> => {
  // Get services that are not versioned
  const pages = await getCollection('pages');
  return pages;
};

export const getIndexPage = async (): Promise<Page> => {
  const pages = await getCollection('pages');
  return pages.find((page) => page.data?.id === 'index')!;
};

export const hasLandingPageForDocs = async (): Promise<boolean> => {
  const pages = await getCollection('pages');
  return pages.some((page) => page.data?.id === 'index')!;
};
