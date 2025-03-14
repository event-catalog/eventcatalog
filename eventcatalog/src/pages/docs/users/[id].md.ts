// This file exposes the markdown for EventCatalog in the Url
// For example http://localhost:3000/docs/events/OrderAmended/0.0.1 loads the Page and http://localhost:3000/docs/events/OrderAmended/0.0.1.md loads the markdown
// This is used for the LLMs to load the markdown for the given item (llms.txt);

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import config from '@config';
import fs from 'fs';

const users = await getCollection('users');

export async function getStaticPaths() {
  // Just return empty array if LLMs are not enabled
  if (!config.llmsTxt?.enabled) {
    return [];
  }

  return users.map((user) => ({
    params: { type: 'users', id: user.data.id },
    props: { content: user },
  }));
}

export const GET: APIRoute = async ({ params, props }) => {
  // Just return empty array if LLMs are not enabled
  if (!config.llmsTxt?.enabled) {
    return new Response('llms.txt is not enabled for this Catalog.', { status: 404 });
  }

  if (props?.content?.filePath) {
    const file = fs.readFileSync(props.content?.filePath, 'utf8');
    return new Response(file, { status: 200 });
  }

  return new Response('Not found', { status: 404 });
};
