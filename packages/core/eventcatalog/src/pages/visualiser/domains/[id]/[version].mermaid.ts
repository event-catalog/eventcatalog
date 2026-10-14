/**
 * API endpoint to return mermaid diagram code for a domains visualiser page
 * URL: /visualiser/domains/{id}/{version}.mermaid
 *
 * Lives next to the domains Diagram page, which would otherwise handle these requests
 * before the generic visualiser/[type]/[id]/[version].mermaid route.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { isAuthEnabled } from '@utils/feature';
import { createMermaidDiagramResponse, getMermaidDiagramPaths } from '../../_mermaid-route';

// Prerender static pages when auth is disabled, use SSR when auth is enabled
export const prerender = !isAuthEnabled();

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = await getMermaidDiagramPaths(['domains']);
  return paths.map(({ id, version }) => ({ params: { id, version } }));
};

export const GET: APIRoute = async ({ params }) => createMermaidDiagramResponse({ ...params, type: 'domains' });
