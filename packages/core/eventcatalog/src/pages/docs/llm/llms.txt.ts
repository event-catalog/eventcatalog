import { getCollection } from 'astro:content';
import config from '@config';
import type { APIRoute } from 'astro';

import { isCustomDocsEnabled, isResourceDocsEnabled, isLLMSTxtEnabled } from '@utils/feature';
import { getUbiquitousLanguage } from '@utils/collections/domains';
import { getResourceDocs } from '@utils/collections/resource-docs';
import { formatVersionedItem, joinLlmsItems, renderUbiquitousLanguages } from '@utils/llms-txt';

const events = await getCollection('events');
const commands = await getCollection('commands');
const queries = await getCollection('queries');

const agents = await getCollection('agents');
const services = await getCollection('services');
const dataProducts = await getCollection('data-products');
const domains = await getCollection('domains');

const teams = await getCollection('teams');
const users = await getCollection('users');

const flows = await getCollection('flows');
const channels = await getCollection('channels');
const containers = await getCollection('containers');

const entities = await getCollection('entities');

const customDocs = await getCollection('customPages');
const resourceDocsList = isResourceDocsEnabled() ? await getResourceDocs() : [];

const ubiquitousLanguages: Record<string, { properties: any }[]> = {};

for (const domain of domains) {
  const ubiquitousLanguagesForDomain = await getUbiquitousLanguage(domain);
  if (ubiquitousLanguagesForDomain.length > 0) {
    ubiquitousLanguages[domain.id] = ubiquitousLanguagesForDomain.map((item) => ({
      properties: item.data.dictionary,
    }));
  }
}

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
  if (!isLLMSTxtEnabled()) {
    return new Response('llms.txt is not enabled for this Catalog.', { status: 404 });
  }

  const url = new URL(request.url);
  const baseUrl = process.env.LLMS_TXT_BASE_URL || `${url.origin}`;

  const formatItem = (item: any, type: string, extraParams?: string | string[]) => {
    const params = Array.isArray(extraParams) ? extraParams.join('&') : extraParams || '';
    return formatVersionedItem(baseUrl, item, type, params);
  };

  const formatSimpleItem = (item: any, type: string) =>
    `- [${item.id.replace('.mdx', '')}](${baseUrl}/docs/${type}/${item.data.id}.mdx) - ${item.data.name}`;

  const formatCustomDoc = (item: any, route: string) =>
    `- [${item.data.title}](${baseUrl}/${route}/${item.id.replace('docs\/', '')}.mdx) - ${item.data.summary || ''}`;

  const formatResourceDoc = (doc: any) => {
    const { resourceCollection, resourceId, resourceVersion, type, id } = doc.data;
    const title = doc.data.title || id || doc.id;
    const docUrl = `${baseUrl}/docs/${resourceCollection}/${resourceId}/${resourceVersion}/${type}/${id}.mdx`;
    return `- [${title}](${docUrl})${doc.data.summary ? ` - ${doc.data.summary}` : ''}`;
  };

  const renderResourceDocs = () => {
    const grouped = new Map<string, { resourceCollection: string; resourceId: string; resourceVersion: string; docs: any[] }>();

    for (const doc of resourceDocsList) {
      const { resourceCollection, resourceId, resourceVersion } = doc.data;
      const key = `${resourceCollection}:${resourceId}:${resourceVersion}`;
      let group = grouped.get(key);
      if (!group) {
        group = { resourceCollection, resourceId, resourceVersion, docs: [] };
        grouped.set(key, group);
      }
      group.docs.push(doc);
    }

    return Array.from(grouped.values())
      .map((group) => {
        const parentUrl = `${baseUrl}/docs/${group.resourceCollection}/${group.resourceId}/${group.resourceVersion}.mdx`;
        const heading = `### [${group.resourceId}](${parentUrl}) (${group.resourceCollection})`;
        return [heading, group.docs.map(formatResourceDoc).join('\n')].join('\n');
      })
      .join('\n\n');
  };

  const content = [
    `# ${config.organizationName} EventCatalog Documentation\n`,
    `> ${config.tagline}\n`,
    '## Events',
    joinLlmsItems(events.map((item) => formatItem(item, 'events'))),
    '\n## Commands',
    joinLlmsItems(commands.map((item) => formatItem(item, 'commands'))),
    '\n## Queries',
    joinLlmsItems(queries.map((item) => formatItem(item, 'queries'))),
    '\n## Agents',
    joinLlmsItems(agents.map((item) => formatItem(item, 'agents'))),
    '\n## Services',
    joinLlmsItems(services.map((item) => formatItem(item, 'services'))),
    '\n## Data Products',
    joinLlmsItems(dataProducts.map((item) => formatItem(item, 'data-products'))),
    '\n## Domains',
    joinLlmsItems(domains.map((item) => formatItem(item, 'domains'))),
    '\n## Flows',
    joinLlmsItems(flows.map((item) => formatItem(item, 'flows'))),
    '\n## Channels',
    joinLlmsItems(
      channels.map((item) => formatItem(item, 'channels', item.data.protocols?.map((protocol) => `protocol - ${protocol}`).join('&')))
    ),
    ...(Object.keys(ubiquitousLanguages).length > 0
      ? ['## Ubiquitous Language', renderUbiquitousLanguages(baseUrl, domains, ubiquitousLanguages)]
      : []),
    '\n## Containers (Databases, External Systems)',
    joinLlmsItems(containers.map((item) => formatItem(item, 'containers'))),
    '\n## Entities',
    renderEntities(baseUrl),
    '\n## Teams',
    joinLlmsItems(teams.map((item) => formatSimpleItem(item, 'teams'))),
    '\n## Users',
    joinLlmsItems(users.map((item) => formatSimpleItem(item, 'users'))),
    ...(isCustomDocsEnabled()
      ? ['\n## Custom Docs', joinLlmsItems(customDocs.map((item) => formatCustomDoc(item, 'docs/custom')))]
      : []),
    ...(isResourceDocsEnabled() && resourceDocsList.length > 0 ? ['\n## Resource Docs', renderResourceDocs()] : []),
  ].join('\n');

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
