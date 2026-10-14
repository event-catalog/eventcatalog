/**
 * API endpoint to return mermaid diagram code for a visualiser page
 * URL: /visualiser/{type}/{id}/{version}.mermaid
 *
 * Returns plain text mermaid flowchart syntax that can be used by LLMs,
 * documentation tools, or pasted into mermaid-compatible renderers.
 * Domains and systems are served by their own routes (visualiser/domains and visualiser/systems).
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { isAuthEnabled } from '@utils/feature';
import { createMermaidDiagramResponse, getMermaidDiagramPaths } from '../../_mermaid-route';

// Prerender static pages when auth is disabled, use SSR when auth is enabled
export const prerender = !isAuthEnabled();

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = await getMermaidDiagramPaths([
    'events',
    'commands',
    'queries',
    'services',
    'flows',
    'containers',
    'data-products',
  ]);
  return paths.map((params) => ({ params }));
};

export const GET: APIRoute = async ({ params }) => createMermaidDiagramResponse(params);
