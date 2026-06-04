import { getCollection } from 'astro:content';
import config from '@config';
import type { APIRoute } from 'astro';
import { getSpecificationsForService } from '@utils/collections/services';
import { isEventCatalogScaleEnabled } from '@utils/feature';

type MessageCollection = 'events' | 'commands' | 'queries';

const services = await getCollection('services');
const schemas = await getCollection('schemas');

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

const getMessagesWithSchemas = (collection: MessageCollection) => {
  const seenMessages = new Set<string>();

  return schemas
    .filter((schema) => schema.data.message.collection === collection)
    .map((schema) => {
      const key = `${schema.data.message.collection}:${schema.data.message.id}:${schema.data.message.version}`;
      if (seenMessages.has(key)) return null;
      seenMessages.add(key);

      return schema;
    })
    .filter((schema): schema is NonNullable<typeof schema> => schema !== null);
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

  const formatVersionedItem = (item: (typeof schemas)[number]) => {
    const message = item.data.message;
    return `- [${message.name || message.id} - ${message.id} - ${message.version}](${baseUrl}/api/schemas/${message.collection}/${message.id}/${message.version})} ${message.summary ? `- ${message.summary.trim()}` : ''}`;
  };

  const formatServiceWithSchema = (item: ServiceWithSchema) => {
    return `- [${item.id} - ${item.version} - ${item.specification} specification](${baseUrl}/api/schemas/${item.collection}/${item.id}/${item.version}/${item.specification}) ${item.summary ? `- Specification for ${item.summary}` : ''}`;
  };

  const content = [
    `# ${config.organizationName} EventCatalog Schemas`,
    `List of schemas for events, commands, queries, and services in EventCatalog.`,
    '',
    `## Events\n${getMessagesWithSchemas('events')
      .map((item) => formatVersionedItem(item))
      .join('\n')}`,
    '',
    `## Commands\n${getMessagesWithSchemas('commands')
      .map((item) => formatVersionedItem(item))
      .join('\n')}`,
    '',
    `## Queries\n${getMessagesWithSchemas('queries')
      .map((item) => formatVersionedItem(item))
      .join('\n')}`,
    '',
    `## Services\n${servicesWithSchemasFlat.map((item: any) => formatServiceWithSchema(item)).join('\n')}`,
  ].join('\n');
  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
