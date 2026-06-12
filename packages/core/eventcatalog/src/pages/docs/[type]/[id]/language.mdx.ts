import { getDomains, getUbiquitousLanguage, hasUbiquitousLanguageTerms } from '@utils/collections/domains';
import type { CollectionEntry } from 'astro:content';
import type { APIRoute } from 'astro';
import config from '@config';
import fs from 'fs';
import { isLLMSTxtEnabled } from '@utils/feature';
import { filterMarkdownForAgents } from '@utils/llms';

export async function getStaticPaths() {
  const domains = await getDomains({ getAllVersions: false });

  const buildPages = async (collection: CollectionEntry<'domains'>[]) => {
    const collectionWithUbiquitousLanguage = await collection.reduce<Promise<CollectionEntry<'domains'>[]>>(async (acc, item) => {
      const accumulator = await acc;
      const ubiquitousLanguages = await getUbiquitousLanguage(item);

      if (ubiquitousLanguages.some(hasUbiquitousLanguageTerms)) {
        return [...accumulator, item];
      }

      return accumulator;
    }, Promise.resolve([]));

    return collectionWithUbiquitousLanguage.map((item) => ({
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

  return [...(await buildPages(domains))];
}

export const GET: APIRoute = async ({ params, props }) => {
  // Just return empty array if LLMs are not enabled
  if (!isLLMSTxtEnabled()) {
    return new Response('llms.txt is not enabled for this Catalog.', { status: 404 });
  }

  const domains = await getDomains({ getAllVersions: false });
  const domain = props?.data ? (props as CollectionEntry<'domains'>) : domains.find((item) => item.data.id === params.id);
  if (!domain) {
    return new Response('Not found', { status: 404 });
  }

  const ubiquitousLanguages = await getUbiquitousLanguage(domain as CollectionEntry<'domains'>);
  const ubiquitousLanguage = ubiquitousLanguages[0];

  if (ubiquitousLanguage?.filePath && hasUbiquitousLanguageTerms(ubiquitousLanguage)) {
    let file = filterMarkdownForAgents(fs.readFileSync(ubiquitousLanguage.filePath, 'utf8'));

    return new Response(file, { status: 200 });
  }

  return new Response('Not found', { status: 404 });
};
