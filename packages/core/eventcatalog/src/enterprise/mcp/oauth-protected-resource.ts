/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import type { APIRoute } from 'astro';
import { getMcpProtectedResourceMetadata } from './mcp-auth';

export const GET: APIRoute = async ({ request }) => {
  const metadata = getMcpProtectedResourceMetadata(request);

  if (!metadata) {
    return new Response(JSON.stringify({ error: 'mcp_auth_not_configured' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(metadata, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const prerender = false;
