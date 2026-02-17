import type { APIRoute } from 'astro';
import utils from '@eventcatalog/sdk';
import { isDevMode } from '@utils/feature';

const dslTypeFromCollection: Record<string, 'service' | 'event' | 'command' | 'query' | 'domain'> = {
  services: 'service',
  events: 'event',
  commands: 'command',
  queries: 'query',
  domains: 'domain',
};

export const GET: APIRoute = async ({ url }) => {
  if (!isDevMode()) {
    return new Response(JSON.stringify({ error: 'Playground export is only available in dev mode.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const collection = url.searchParams.get('collection') ?? '';
  const id = url.searchParams.get('id') ?? '';
  const version = url.searchParams.get('version') ?? '';
  const hydrate = (url.searchParams.get('hydrate') ?? 'true') === 'true';

  if (!collection || !id || !version) {
    return new Response(JSON.stringify({ error: 'Missing required params: collection, id, version' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const dslType = dslTypeFromCollection[collection];
  if (!dslType) {
    return new Response(JSON.stringify({ error: `Collection '${collection}' is not supported for DSL export.` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const projectDir = process.env.PROJECT_DIR ?? '';
  const sdk = utils(projectDir) as any;

  try {
    let resource: unknown;

    switch (dslType) {
      case 'service':
        resource = await sdk.getService(id, version);
        break;
      case 'event':
        resource = await sdk.getEvent(id, version);
        break;
      case 'command':
        resource = await sdk.getCommand(id, version);
        break;
      case 'query':
        resource = await sdk.getQuery(id, version);
        break;
      case 'domain':
        resource = await sdk.getDomain(id, version);
        break;
      default:
        resource = undefined;
    }

    if (!resource) {
      return new Response(JSON.stringify({ error: `Could not find ${dslType} '${id}' (${version}).` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const dsl = await sdk.toDSL(resource as any, {
      type: dslType,
      hydrate,
    });

    return new Response(JSON.stringify({ dsl }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: `Failed to export DSL: ${message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const prerender = false;
