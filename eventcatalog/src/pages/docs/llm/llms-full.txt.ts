import { getCollection } from 'astro:content';
import config from '@config';
import type { APIRoute } from 'astro';
import fs from 'fs';

const events = await getCollection('events');
const commands = await getCollection('commands');
const queries = await getCollection('queries');
const services = await getCollection('services');
const domains = await getCollection('domains');
const teams = await getCollection('teams');
const users = await getCollection('users');

export const GET: APIRoute = async ({ params, request }) => {
  if (!config.llmsTxt?.enabled) {
    return new Response('llms.txt is not enabled for this Catalog.', { status: 404 });
  }

  const resources = [...events, ...commands, ...queries, ...services, ...domains, ...teams, ...users];

  const content = resources
    .map((item) => {
      if (!item.data.pathToFile) return '';
      return fs.readFileSync(item.data.pathToFile, 'utf8');
    })
    .join('\n');

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
