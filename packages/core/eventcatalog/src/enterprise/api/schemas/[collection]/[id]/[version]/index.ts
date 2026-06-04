/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { isEventCatalogScaleEnabled } from '@utils/feature';
import { sortVersioned } from '@utils/collections/util';

const findSchema = async (collection: string | undefined, id: string, version: string | undefined) => {
  const schemas = await getCollection('schemas');
  const matchingSchemas = schemas.filter(
    (schema) => schema.data.message.collection === collection && schema.data.message.id === id
  );

  if (version === 'latest') {
    return (
      matchingSchemas.find((schema) => schema.data.latest) ??
      sortVersioned(matchingSchemas, (schema) => schema.data.message.version)[0]
    );
  }

  return matchingSchemas.find((schema) => schema.data.message.version === version);
};

export async function getStaticPaths() {
  const schemas = await getCollection('schemas');

  // Generate paths for specific versions
  const versionedPaths = schemas.map((schema) => ({
    params: {
      collection: schema.data.message.collection,
      id: schema.data.message.id,
      version: schema.data.message.version,
    },
    props: {
      pathToSchema: schema.data.filePath,
      schema: schema.data.content,
    },
  }));

  // Generate "latest" paths for each unique collection/id combination
  const latestPaths = schemas
    .filter((schema) => schema.data.latest)
    .map((latestSchema) => ({
      params: {
        collection: latestSchema.data.message.collection,
        id: latestSchema.data.message.id,
        version: 'latest',
      },
      props: {
        pathToSchema: latestSchema.data.filePath,
        schema: latestSchema.data.content,
      },
    }));

  return [...versionedPaths, ...latestPaths];
}

export const GET: APIRoute = async ({ props, params }) => {
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

  // In static mode, props are pre-computed by getStaticPaths
  if (props.schema !== undefined) {
    return new Response(props.schema, {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // In SSR mode, dynamically resolve the schema using the generated schema collection
  const { collection, id, version } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const schema = await findSchema(collection, id, version);

  if (schema?.data.content === undefined) {
    return new Response(JSON.stringify({ error: 'Schema not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(schema.data.content, {
    headers: { 'Content-Type': 'text/plain' },
  });
};
