// This file exposes the markdown for EventCatalog in the Url
// For example http://localhost:3000/docs/events/OrderAmended/0.0.1 loads the Page and http://localhost:3000/docs/events/OrderAmended/0.0.1.md loads the markdown
// This is used for the LLMs to load the markdown for the given item (llms.txt);

import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import config from '@config';
import fs from 'fs';

export const getStaticPaths = (async () => {
  const docs = await getCollection('customPages');
  const paths = docs.map((doc) => ({
    params: { path: doc.id.replace('docs/', '') },
    props: doc,
    type: 'custom',
  }));
  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, props }) => {
  // Just return empty array if LLMs are not enabled
  if (!config.llmsTxt?.enabled) {
    return new Response('llms.txt is not enabled for this Catalog.', { status: 404 });
  }

  if (props.filePath) {
    const file = fs.readFileSync(props.filePath, 'utf8');
    return new Response(file, { status: 200 });
  }

  return new Response('Not found', { status: 404 });
};
