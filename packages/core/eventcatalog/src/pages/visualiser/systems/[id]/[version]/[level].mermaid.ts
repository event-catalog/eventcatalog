/**
 * API endpoint to return mermaid diagram code for a level of a system diagram
 * URL: /visualiser/systems/{id}/{version}/{overview|services}.mermaid
 *
 * `overview` is level 1 (domains, systems and their relationships) and `services` level 2
 * (services and data stores), as on the Diagram page. {version}.mermaid is the full diagram (level 3).
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { isAuthEnabled } from '@utils/feature';
import { createMermaidDiagramResponse, getMermaidLevelPaths } from '../../../_mermaid-route';

// Prerender static pages when auth is disabled, use SSR when auth is enabled
export const prerender = !isAuthEnabled();

export const getStaticPaths: GetStaticPaths = () => getMermaidLevelPaths('systems');

export const GET: APIRoute = async ({ params }) =>
  createMermaidDiagramResponse({ type: 'systems', id: params.id, version: params.version, detail: params.level });
