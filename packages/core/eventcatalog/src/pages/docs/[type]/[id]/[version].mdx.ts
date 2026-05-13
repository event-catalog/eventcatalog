// This file exposes the markdown for EventCatalog in the Url
// For example http://localhost:3000/docs/events/OrderAmended/0.0.1 loads the Page and http://localhost:3000/docs/events/OrderAmended/0.0.1.md loads the markdown
// This is used for the LLMs to load the markdown for the given item (llms.txt);

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import config from '@config';
import fs from 'fs';
import { addSchemaToMarkdown, filterMarkdownForAgents } from '@utils/llms';
import { isLLMSTxtEnabled, isSSR } from '@utils/feature';
const events = await getCollection('events');
const commands = await getCollection('commands');
const queries = await getCollection('queries');
const services = await getCollection('services');
const dataProducts = await getCollection('data-products');
const domains = await getCollection('domains');
const flows = await getCollection('flows');
const channels = await getCollection('channels');
const containers = await getCollection('containers');
const entities = await getCollection('entities');

import utils from '@eventcatalog/sdk';

const collections = {
  events,
  commands,
  queries,
  services,
  'data-products': dataProducts,
  domains,
  flows,
  channels,
  containers,
  entities,
};

const findContent = (params: Record<string, string | undefined>) => {
  const collection = collections[params.type as keyof typeof collections];
  return collection?.find((item) => item.data.id === params.id && item.data.version === params.version);
};

export async function getStaticPaths() {
  // Just return empty array if LLMs are not enabled
  if (!isLLMSTxtEnabled()) {
    return [];
  }

  const paths = Object.keys(collections).map((type) => {
    return collections[type as keyof typeof collections].map((item: { data: { id: string; version: string } }) => ({
      params: { type, id: item.data.id, version: item.data.version },
      props: { content: item },
    }));
  });

  return paths.flat();
}

export const GET: APIRoute = async ({ params, props }) => {
  // Just return empty array if LLMs are not enabled
  if (!isLLMSTxtEnabled()) {
    return new Response('llms.txt is not enabled for this Catalog.', { status: 404 });
  }

  const content = props?.content ?? findContent(params);
  if (content?.filePath) {
    let file = fs.readFileSync(content.filePath, 'utf8');

    try {
      file = addSchemaToMarkdown(content, file);
    } catch (error) {
      console.log('Warning: Cant find the schema for', content.data.id, content.data.version);
    }

    return new Response(filterMarkdownForAgents(file), { status: 200 });
  }

  if (isSSR()) {
    const { getResourcePath } = utils(process.env.PROJECT_DIR ?? '');
    const filePath = await getResourcePath(process.env.PROJECT_DIR ?? '', params.id ?? '', params.version ?? '');
    if (!filePath) {
      return new Response('Not found', { status: 404 });
    }
    const file = filterMarkdownForAgents(fs.readFileSync(filePath.fullPath, 'utf8'));
    return new Response(file, { status: 200 });
  }

  return new Response('Not found', { status: 404 });
};
