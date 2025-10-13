import type { APIRoute } from 'astro';
import utils from '@eventcatalog/sdk';
import config from '@config';

/**
 * Route the will dump the whole catalog as JSON (without markdown)
 * Experimental API
 * @param param0
 * @returns
 */
export const GET: APIRoute = async ({ params, request }) => {
  const isFullCatalogAPIEnabled = config.api?.fullCatalogAPIEnabled ?? true;

  if (!isFullCatalogAPIEnabled) {
    return new Response(JSON.stringify({ error: 'Full catalog API is not enabled' }), {
      status: 404,
    });
  }

  const { dumpCatalog } = utils(process.env.PROJECT_DIR || '');
  const catalog = await dumpCatalog({ includeMarkdown: false });

  return new Response(JSON.stringify(catalog), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
