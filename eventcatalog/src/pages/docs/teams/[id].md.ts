// This file exposes the markdown for EventCatalog in the Url
// For example http://localhost:3000/docs/events/OrderAmended/0.0.1 loads the Page and http://localhost:3000/docs/events/OrderAmended/0.0.1.md loads the markdown
// This is used for the LLMs to load the markdown for the given item (llms.txt);

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import config from '@config';
import fs from 'fs';

const teams = await getCollection('teams');

export async function getStaticPaths() {
  // Just return empty array if LLMs are not enabled
  if (!config.llmsTxt?.enabled) {
    return [];
  }

  console.log(teams);

  return teams.map((team) => ({
    params: { type: 'teams', id: team.data.id },
    props: { content: team },
  }));
}

export const GET: APIRoute = async ({ params, props }) => {
  // Just return empty array if LLMs are not enabled
  if (!config.llmsTxt?.enabled) {
    return new Response('llms.txt is not enabled for this Catalog.', { status: 404 });
  }

  console.log(props.context);

  if (props?.content?.data?.pathToFile) {
    const file = fs.readFileSync(props.content.data.pathToFile, 'utf8');
    return new Response(file, { status: 200 });
  }

  return new Response('Not found', { status: 404 });
};
