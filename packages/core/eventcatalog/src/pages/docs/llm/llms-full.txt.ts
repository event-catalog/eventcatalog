import { getCollection, type CollectionEntry } from 'astro:content';
import type { APIRoute } from 'astro';
import fs from 'fs';
import { isCustomDocsEnabled, isResourceDocsEnabled, isLLMSTxtEnabled } from '@utils/feature';
import { addSchemaToMarkdown, filterMarkdownForAgents } from '@utils/llms';

type AllowedCollections =
  | 'agents'
  | 'events'
  | 'commands'
  | 'queries'
  | 'services'
  | 'data-products'
  | 'domains'
  | 'teams'
  | 'users'
  | 'customPages'
  | 'channels'
  | 'entities'
  | 'flows'
  | 'containers'
  | 'ubiquitousLanguages'
  | 'resourceDocs';

const events = await getCollection('events');
const commands = await getCollection('commands');
const queries = await getCollection('queries');
const agents = await getCollection('agents');
const services = await getCollection('services');
const dataProducts = await getCollection('data-products');
const domains = await getCollection('domains');
const teams = await getCollection('teams');
const users = await getCollection('users');
const entities = await getCollection('entities');
const channels = await getCollection('channels');
const flows = await getCollection('flows');
const containers = await getCollection('containers');
const ubiquitousLanguages = await getCollection('ubiquitousLanguages');
const customDocs = await getCollection('customPages');
const resourceDocs = isResourceDocsEnabled() ? await getCollection('resourceDocs') : [];

export const GET: APIRoute = async ({ params, request }) => {
  if (!isLLMSTxtEnabled()) {
    return new Response('llms.txt is not enabled for this Catalog.', { status: 404 });
  }

  const resources: CollectionEntry<AllowedCollections>[] = [
    ...events,
    ...commands,
    ...queries,
    ...agents,
    ...services,
    ...dataProducts,
    ...domains,
    ...teams,
    ...users,
    ...entities,
    ...channels,
    ...containers,
    ...flows,
    ...ubiquitousLanguages,
  ];

  if (isCustomDocsEnabled()) {
    resources.push(...(customDocs as CollectionEntry<AllowedCollections>[]));
  }

  if (isResourceDocsEnabled()) {
    resources.push(...(resourceDocs as CollectionEntry<AllowedCollections>[]));
  }

  const content = resources
    .map((item) => {
      if (!item.filePath) return '';
      if (!fs.existsSync(item.filePath)) return '';

      let file = fs.readFileSync(item.filePath, 'utf8');

      try {
        // Try and add the schemas to the resource
        // @ts-ignore
        file = addSchemaToMarkdown(item, file);
      } catch (error) {
        // just skip the resource if it has no schema
      }

      return filterMarkdownForAgents(file);
    })
    .join('\n');

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
