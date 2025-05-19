import { getCollection, type CollectionEntry } from 'astro:content';
import config from '@config';
import type { APIRoute } from 'astro';
import fs from 'fs';
import { isCustomDocsEnabled } from '@utils/feature';
import { addSchemaToMarkdown } from '@utils/llms';

type AllowedCollections = 'events' | 'commands' | 'queries' | 'services' | 'domains' | 'teams' | 'users' | 'customPages';

const events = await getCollection('events');
const commands = await getCollection('commands');
const queries = await getCollection('queries');
const services = await getCollection('services');
const domains = await getCollection('domains');
const teams = await getCollection('teams');
const users = await getCollection('users');

const customDocs = await getCollection('customPages');

export const GET: APIRoute = async ({ params, request }) => {
  if (!config.llmsTxt?.enabled) {
    return new Response('llms.txt is not enabled for this Catalog.', { status: 404 });
  }

  const resources: CollectionEntry<AllowedCollections>[] = [
    ...events,
    ...commands,
    ...queries,
    ...services,
    ...domains,
    ...teams,
    ...users,
  ];

  if (isCustomDocsEnabled()) {
    resources.push(...(customDocs as CollectionEntry<AllowedCollections>[]));
  }

  const content = resources
    .map((item) => {
      if (!item.filePath) return '';

      let file = fs.readFileSync(item.filePath, 'utf8');

      try {
        // Try and add the schemas to the resource
        // @ts-ignore
        file = addSchemaToMarkdown(item, file);
      } catch (error) {
        // just skip the resource if it has no schema
      }

      return file;
    })
    .join('\n');

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
