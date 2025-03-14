import { getCollection } from 'astro:content';
import config from '@config';
import type { APIRoute } from 'astro';

const events = await getCollection('events');
const commands = await getCollection('commands');
const queries = await getCollection('queries');

const services = await getCollection('services');
const domains = await getCollection('domains');

const teams = await getCollection('teams');
const users = await getCollection('users');

export const GET: APIRoute = async ({ params, request }) => {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const formatVersionedItem = (item: any, type: string) =>
    `- [${item.data.name} - ${item.data.id} - ${item.data.version}](${baseUrl}/docs/${type}/${item.data.id}/${item.data.version}.mdx) - ${item.data.summary}`;

  const formatSimpleItem = (item: any, type: string) =>
    `- [${item.id.replace('.mdx', '')}](${baseUrl}/docs/${type}/${item.data.id}.mdx) - ${item.data.name}`;

  const content = [
    `# ${config.organizationName} EventCatalog Documentation\n`,
    `> ${config.tagline}`,
    '\n## Events',
    events.map((item) => formatVersionedItem(item, 'events')).join(''),
    '\n## Commands',
    commands.map((item) => formatVersionedItem(item, 'commands')).join(''),
    '\n## Queries',
    queries.map((item) => formatVersionedItem(item, 'queries')).join(''),
    '\n## Services',
    services.map((item) => formatVersionedItem(item, 'services')).join(''),
    '\n## Domains',
    domains.map((item) => formatVersionedItem(item, 'domains')).join(''),
    '\n## Teams',
    teams.map((item) => formatSimpleItem(item, 'teams')).join('\n'),
    '\n## Users',
    users.map((item) => formatSimpleItem(item, 'users')).join('\n'),
  ].join('\n');

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
