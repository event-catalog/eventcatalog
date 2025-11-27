import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import path from 'node:path';
import fs from 'node:fs';
import { isEventCatalogScaleEnabled } from '@utils/feature';
import { sortVersioned } from '@utils/collections/util';

export async function getStaticPaths() {
  const events = await getCollection('events');
  const commands = await getCollection('commands');
  const queries = await getCollection('queries');
  const messages = [...events, ...commands, ...queries];

  const messagesWithSchemas = messages
    .filter((message) => message.data.schemaPath)
    .filter((message) => fs.existsSync(path.join(path.dirname(message.filePath ?? ''), message.data.schemaPath ?? '')));

  // Generate paths for specific versions
  const versionedPaths = messagesWithSchemas.map((message) => ({
    params: { collection: message.collection, id: message.data.id, version: message.data.version },
    props: {
      pathToSchema: path.join(path.dirname(message.filePath ?? ''), message.data.schemaPath ?? ''),
      schema: fs.readFileSync(path.join(path.dirname(message.filePath ?? ''), message.data.schemaPath ?? ''), 'utf8'),
      extension: message.data.schemaPath?.split('.').pop(),
    },
  }));

  // Group messages by collection and id to find latest versions
  const groupedMessages = messagesWithSchemas.reduce(
    (acc, message) => {
      const key = `${message.collection}:${message.data.id}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(message);
      return acc;
    },
    {} as Record<string, typeof messagesWithSchemas>
  );

  // Generate "latest" paths for each unique collection/id combination
  const latestPaths = Object.values(groupedMessages).map((group) => {
    // Sort by version (descending) and get the latest
    const sorted = sortVersioned(group, (m) => m.data.version);
    const latestMessage = sorted[0];
    return {
      params: { collection: latestMessage.collection, id: latestMessage.data.id, version: 'latest' },
      props: {
        pathToSchema: path.join(path.dirname(latestMessage.filePath ?? ''), latestMessage.data.schemaPath ?? ''),
        schema: fs.readFileSync(
          path.join(path.dirname(latestMessage.filePath ?? ''), latestMessage.data.schemaPath ?? ''),
          'utf8'
        ),
        extension: latestMessage.data.schemaPath?.split('.').pop(),
      },
    };
  });

  return [...versionedPaths, ...latestPaths];
}

export const GET: APIRoute = async ({ props }) => {
  if (!isEventCatalogScaleEnabled()) {
    return new Response(
      JSON.stringify({
        error: 'feature_not_available_on_server',
        message: 'Schema API is not enabled for this deployment and supported in EventCatalog Scale.',
      }),
      {
        status: 501,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  return new Response(props.schema, {
    headers: { 'Content-Type': 'text/plain' },
  });
};
