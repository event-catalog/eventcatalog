import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import path from 'node:path';
import fs from 'node:fs';
import { isEventCatalogScaleEnabled } from '@utils/feature';

export async function getStaticPaths() {
  const events = await getCollection('events');
  const commands = await getCollection('commands');
  const queries = await getCollection('queries');
  const messages = [...events, ...commands, ...queries];
  return messages
    .filter((message) => message.data.schemaPath)
    .filter((message) => fs.existsSync(path.join(path.dirname(message.filePath ?? ''), message.data.schemaPath ?? '')))
    .map((message) => ({
      params: { collection: message.collection, id: message.data.id, version: message.data.version },
      props: {
        pathToSchema: path.join(path.dirname(message.filePath ?? ''), message.data.schemaPath ?? ''),
        schema: fs.readFileSync(path.join(path.dirname(message.filePath ?? ''), message.data.schemaPath ?? ''), 'utf8'),
        extension: message.data.schemaPath?.split('.').pop(),
      },
    }));
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
