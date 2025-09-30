import { getCollection } from 'astro:content';
import config from '@config';
import type { APIRoute } from 'astro';

import { isCustomDocsEnabled } from '@utils/feature';
import { getUbiquitousLanguage } from '@utils/collections/domains';

const events = await getCollection('events');
const commands = await getCollection('commands');
const queries = await getCollection('queries');

const services = await getCollection('services');
const domains = await getCollection('domains');

const teams = await getCollection('teams');
const users = await getCollection('users');

const flows = await getCollection('flows');
const channels = await getCollection('channels');
const containers = await getCollection('containers');

const entities = await getCollection('entities');

const customDocs = await getCollection('customPages');

const ubiquitousLanguages: Record<string, { id: string; version: string; properties: any }[]> = {};

for (const domain of domains) {
  const ubiquitousLanguagesForDomain = await getUbiquitousLanguage(domain);
  if (ubiquitousLanguagesForDomain.length > 0) {
    ubiquitousLanguages[domain.id] = ubiquitousLanguagesForDomain.map((item) => ({
      id: domain.id,
      version: domain.data.version,
      properties: item.data.dictionary,
    }));
  }
}

// Render the Ubiquitous Languages section
const renderUbiquitousLanguages = (baseUrl: string) => {
  return Object.entries(ubiquitousLanguages)
    .map(([domainId, items]) => {
      const domainName = domains.find((domain) => domain.id === domainId)?.data.name || domainId;
      const itemsList = items
        .map((item) => {
          // @ts-ignore
          const propertiesList = Object.entries(item.properties)
            .map(
              ([key, value]: any) =>
                `    - [${value.name}: - ${value.summary}](${baseUrl}/docs/domains/${domainId.split('-')[0]}/language.mdx)`
            )
            .join('\n');
          return propertiesList;
        })
        .join('\n');
      return `- ${domainName} Domain\n${itemsList}`;
    })
    .join('\n');
};

// render the entities from the domain list
const renderEntities = (baseUrl: string) => {
  const domainsWithEntities = domains.filter((domain) => domain.data.entities?.length && domain.data.entities.length > 0);

  if (domainsWithEntities.length === 0) {
    return '';
  }

  return domainsWithEntities
    .map((domain) => {
      const entitiesList = domain.data.entities
        ?.map((entity) => {
          const entityItem = entities.find((e) => e.data.id === entity.id);
          return `    - [${entityItem?.data.name}](${baseUrl}/docs/entities/${entityItem?.data.id}/${entityItem?.data.version}.mdx) - ${entityItem?.data.summary}`;
        })
        .join('\n');
      return `- ${domain.data.name} Domain\n${entitiesList || ''}`;
    })
    .join('\n');
};

export const GET: APIRoute = async ({ params, request }) => {
  const url = new URL(request.url);
  const baseUrl = process.env.LLMS_TXT_BASE_URL || `${url.origin}`;

  const formatVersionedItem = (item: any, type: string, extraParams?: string | string[]) => {
    const params = Array.isArray(extraParams) ? extraParams.join('&') : extraParams || '';
    return `- [${item.data.name} - ${item.data.id} - ${item.data.version} ${params ? `- ${params}` : ''}](${baseUrl}/docs/${type}/${item.data.id}/${item.data.version}.mdx) ${item.data.summary ? `- ${item.data.summary}` : ''}`;
  };

  const formatSimpleItem = (item: any, type: string) =>
    `- [${item.id.replace('.mdx', '')}](${baseUrl}/docs/${type}/${item.data.id}.mdx) - ${item.data.name}`;

  const formatCustomDoc = (item: any, route: string) =>
    `- [${item.data.title}](${baseUrl}/${route}/${item.id.replace('docs\/', '')}.mdx) - ${item.data.summary || ''}`;

  const content = [
    `# ${config.organizationName} EventCatalog Documentation\n`,
    `> ${config.tagline}\n`,
    '## Events',
    events.map((item) => formatVersionedItem(item, 'events')).join(''),
    '\n## Commands',
    commands.map((item) => formatVersionedItem(item, 'commands')).join(''),
    '\n## Queries',
    queries.map((item) => formatVersionedItem(item, 'queries')).join(''),
    '\n## Services',
    services.map((item) => formatVersionedItem(item, 'services')).join(''),
    '\n## Domains',
    domains.map((item) => formatVersionedItem(item, 'domains')).join(''),
    '\n## Flows',
    flows.map((item) => formatVersionedItem(item, 'flows')).join('\n'),
    '\n## Channels',
    channels
      .map((item) =>
        formatVersionedItem(item, 'channels', item.data.protocols?.map((protocol) => `protocol - ${protocol}`).join('&'))
      )
      .join(''),
    ...(Object.keys(ubiquitousLanguages).length > 0 ? ['## Ubiquitous Language', renderUbiquitousLanguages(baseUrl)] : []),
    '\n## Containers (Databases, External Systems)',
    containers.map((item) => formatVersionedItem(item, 'containers')).join('\n'),
    '\n## Entities',
    renderEntities(baseUrl),
    '\n## Teams',
    teams.map((item) => formatSimpleItem(item, 'teams')).join('\n'),
    '\n## Users',
    users.map((item) => formatSimpleItem(item, 'users')).join('\n'),
    ...(isCustomDocsEnabled()
      ? ['\n## Custom Docs', customDocs.map((item) => formatCustomDoc(item, 'docs/custom')).join('\n')]
      : []),
  ].join('\n');

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
