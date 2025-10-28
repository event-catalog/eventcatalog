import { getCollection } from 'astro:content';
import config from '@config';
import type { APIRoute } from 'astro';
import type { CollectionEntry } from 'astro:content';
import { getSpecificationsForService } from '@utils/collections/services';
import { isEventCatalogScaleEnabled } from '@utils/feature';

const events = await getCollection('events');
const commands = await getCollection('commands');
const queries = await getCollection('queries');
const services = await getCollection('services');

type ServiceWithSchema = {
  collection: string;
  id: string;
  version: string;
  specification: string;
  summary: string;
};

const servicesWithSchemas = services.filter((service) => getSpecificationsForService(service).length > 0);

const servicesWithSchemasFlat = servicesWithSchemas.reduce<ServiceWithSchema[]>((acc, service) => {
  return [
    ...acc,
    ...getSpecificationsForService(service).map((specification) => ({
      collection: 'services',
      id: service.data.id,
      version: service.data.version,
      specification: specification.type,
      summary: service.data.summary?.trim() || '',
    })),
  ];
}, []) as ServiceWithSchema[];

const messageHasSchema = (message: CollectionEntry<'events' | 'commands' | 'queries'>) => {
  return message.data.schemaPath;
};

export const GET: APIRoute = async ({ params, request }) => {
  if (!isEventCatalogScaleEnabled()) {
    return new Response(
      JSON.stringify({
        error: 'feature_not_available_on_server',
        message: 'Schema API is not enabled for this deployment and supported in EventCatalog Scale.',
      }),
      { status: 501, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );
  }

  const url = new URL(request.url);
  const baseUrl = process.env.LLMS_TXT_BASE_URL || `${url.origin}`;

  const formatVersionedItem = (item: any, type: string, extraParams?: string | string[]) => {
    return `- [${item.data.name} - ${item.data.id} - ${item.data.version}](${baseUrl}/api/schemas/${type}/${item.data.id}/${item.data.version})} ${item.data.summary ? `- ${item.data.summary.trim()}` : ''}`;
  };

  const formatServiceWithSchema = (item: ServiceWithSchema) => {
    return `- [${item.id} - ${item.version} - ${item.specification} specification](${baseUrl}/api/schemas/${item.collection}/${item.id}/${item.version}/${item.specification}) ${item.summary ? `- Specification for ${item.summary}` : ''}`;
  };

  const content = [
    `# ${config.organizationName} EventCatalog Schemas`,
    `List of schemas for events, commands, queries, and services in EventCatalog.`,
    '',
    `## Events\n${events
      .filter(messageHasSchema)
      .map((item) => formatVersionedItem(item, 'events'))
      .join('\n')}`,
    '',
    `## Commands\n${commands
      .filter(messageHasSchema)
      .map((item) => formatVersionedItem(item, 'commands'))
      .join('\n')}`,
    '',
    `## Queries\n${queries
      .filter(messageHasSchema)
      .map((item) => formatVersionedItem(item, 'queries'))
      .join('\n')}`,
    '',
    `## Services\n${servicesWithSchemasFlat.map((item: any) => formatServiceWithSchema(item)).join('\n')}`,
  ].join('\n');
  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
