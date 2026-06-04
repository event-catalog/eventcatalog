/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import type { APIRoute } from 'astro';
import utils from '@eventcatalog/sdk';
import { isSSR } from '@utils/feature';
import { getContentDir } from '@utils/files';

/**
 * Route that dumps the whole catalog as JSON (without markdown)
 * Experimental API
 *
 * This route is injected only when `api.fullCatalogAPIEnabled` is true.
 */
export const GET: APIRoute = async () => {
  const { dumpCatalog } = utils(getContentDir());
  const catalog = await dumpCatalog({ includeMarkdown: false });

  return new Response(JSON.stringify(catalog), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const prerender = !isSSR();
