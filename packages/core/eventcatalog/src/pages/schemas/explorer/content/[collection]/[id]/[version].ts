/**
 * Internal data route for the Schema Explorer's on-demand hydration.
 * URL: /schemas/explorer/content/{collection}/{id}/{version}
 *
 * The explorer no longer inlines message schema bodies into its `client:load`
 * props (they dominate the serialized HTML on large catalogs). It fetches the
 * SELECTED message's schema from here instead.
 *
 * This is an EventCatalog implementation detail — NOT the documented
 * `/api/schemas/...` Scale API. It ships with every catalog (no plan gating),
 * is prerendered to a static file per message in static output, and resolves
 * on demand in server (SSR) output.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { isSSR } from '@utils/feature';

// Prerender to a static file per message in static output; resolve on demand in SSR.
export const prerender = !isSSR();

export const getStaticPaths: GetStaticPaths = async () => {
  const schemas = await getCollection('schemas');
  return schemas.map((schema) => ({
    params: {
      collection: schema.data.message.collection,
      id: schema.data.message.id,
      version: schema.data.message.version,
    },
  }));
};

export const GET: APIRoute = async ({ params }) => {
  const { collection, id, version } = params;

  if (!collection || !id || !version) {
    return new Response('Not found', { status: 404 });
  }

  const schemas = await getCollection('schemas');
  const schema = schemas.find(
    (s) => s.data.message.collection === collection && s.data.message.id === id && s.data.message.version === version
  );

  if (schema?.data.content === undefined) {
    return new Response('Schema not found', { status: 404 });
  }

  return new Response(schema.data.content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
