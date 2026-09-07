import type { APIRoute } from 'astro';
import { isSSR } from '@utils/feature';
import { getSchemaRegistry, getSchemaDetails } from '@utils/schema-explorer';

export const prerender = !isSSR();

export async function getStaticPaths() {
  return [...(await getSchemaRegistry()).keys()].map((key) => ({ params: { key } }));
}

export const GET: APIRoute = async ({ params }) => {
  const details = params.key ? await getSchemaDetails(params.key) : undefined;
  if (!details) return new Response('Schema not found', { status: 404 });
  return new Response(JSON.stringify(details), {
    headers: { 'Content-Type': 'application/json' },
  });
};
