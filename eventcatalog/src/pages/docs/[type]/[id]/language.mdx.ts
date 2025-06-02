import { getDomains, getUbiquitousLanguage } from '@utils/collections/domains';
import type { CollectionEntry } from 'astro:content';
import type { APIRoute } from 'astro';
import config from '@config';
import fs from 'fs';

export async function getStaticPaths() {
  const domains = await getDomains({ getAllVersions: false });

  const buildPages = (collection: CollectionEntry<'domains'>[]) => {
    return collection.map((item) => ({
      params: {
        type: item.collection,
        id: item.data.id,
      },
      props: {
        type: item.collection,
        ...item,
      },
    }));
  };

  return [...buildPages(domains)];
}

export const GET: APIRoute = async ({ params, props }) => {
  // Just return empty array if LLMs are not enabled
  if (!config.llmsTxt?.enabled) {
    return new Response('llms.txt is not enabled for this Catalog.', { status: 404 });
  }

  const ubiquitousLanguages = await getUbiquitousLanguage(props as CollectionEntry<'domains'>);
  const ubiquitousLanguage = ubiquitousLanguages[0];

  if (ubiquitousLanguage?.filePath) {
    let file = fs.readFileSync(ubiquitousLanguage.filePath, 'utf8');

    return new Response(file, { status: 200 });
  }

  return new Response('Not found', { status: 404 });
};
