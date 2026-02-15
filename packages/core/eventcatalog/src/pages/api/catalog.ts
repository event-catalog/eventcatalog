import type { APIRoute } from 'astro';
import utils from '@eventcatalog/sdk';
import config from '@config';

const isFullCatalogAPIEnabled = config.api?.fullCatalogAPIEnabled ?? false;

/**
 * Route that dumps the whole catalog as JSON (without markdown)
 * Experimental API
 *
 * Disabled by default. Enable via eventcatalog.config.js:
 * api: { fullCatalogAPIEnabled: true }
 */
export const GET: APIRoute = async () => {
  if (!isFullCatalogAPIEnabled) {
    return new Response(JSON.stringify({ error: 'Full catalog API is not enabled' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
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

// Only prerender if the API is enabled - this avoids loading all catalog data during build
// when the feature is disabled, saving memory for large catalogs
export const prerender = isFullCatalogAPIEnabled;
