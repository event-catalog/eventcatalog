/**
 * API endpoint to return mermaid diagram code for a visualiser page
 * URL: /visualiser/{type}/{id}/{version}.mermaid
 *
 * Returns plain text mermaid flowchart syntax that can be used by LLMs,
 * documentation tools, or pasted into mermaid-compatible renderers.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { isAuthEnabled, isVisualiserEnabled } from '@utils/feature';
import { pageDataLoader } from '@utils/page-loaders/page-data-loader';
import { getNodesAndEdges as getNodesAndEdgesForService } from '@utils/node-graphs/services-node-graph';
import {
  getNodesAndEdgesForCommands,
  getNodesAndEdgesForEvents,
  getNodesAndEdgesForQueries,
} from '@utils/node-graphs/message-node-graph';
import { getNodesAndEdges as getNodesAndEdgesForDomain } from '@utils/node-graphs/domains-node-graph';
import { getNodesAndEdges as getNodesAndEdgesForFlows } from '@utils/node-graphs/flows-node-graph';
import { getNodesAndEdges as getNodesAndEdgesForDataProduct } from '@utils/node-graphs/data-products-node-graph';
import { getNodesAndEdges as getNodesAndEdgesForContainer } from '@utils/node-graphs/container-node-graph';
import { convertToMermaid } from '@utils/node-graphs/export-mermaid';
import config from '@config';
import type { PageTypes } from '@types';

type PageTypesWithFlows = PageTypes | 'flows';

// Prerender static pages when auth is disabled, use SSR when auth is enabled
export const prerender = !isAuthEnabled();

const getNodesAndEdgesFunctions = {
  services: getNodesAndEdgesForService,
  events: getNodesAndEdgesForEvents,
  commands: getNodesAndEdgesForCommands,
  queries: getNodesAndEdgesForQueries,
  domains: getNodesAndEdgesForDomain,
  flows: getNodesAndEdgesForFlows,
  containers: getNodesAndEdgesForContainer,
  'data-products': getNodesAndEdgesForDataProduct,
};

export const getStaticPaths: GetStaticPaths = async () => {
  if (isAuthEnabled() || !isVisualiserEnabled()) {
    return [];
  }

  const { getFlows } = await import('@utils/collections/flows');

  const loaders = {
    ...pageDataLoader,
    flows: getFlows,
  };

  const itemTypes: PageTypesWithFlows[] = [
    'events',
    'commands',
    'queries',
    'services',
    'domains',
    'flows',
    'containers',
    'data-products',
  ];

  const allItems = await Promise.all(itemTypes.map((type) => loaders[type]()));

  return allItems.flatMap((items, index) =>
    items
      .filter((item) => item.data.visualiser !== false)
      .map((item) => ({
        params: {
          type: itemTypes[index],
          id: item.data.id,
          version: item.data.version,
        },
      }))
  );
};

export const GET: APIRoute = async ({ params }) => {
  const { type, id, version } = params;

  if (!type || !id || !version || !isVisualiserEnabled()) {
    return new Response('Not found', { status: 404 });
  }

  // Validate the type is supported
  if (!(type in getNodesAndEdgesFunctions)) {
    return new Response(`Unsupported type: ${type}`, { status: 400 });
  }

  try {
    // Get nodes and edges for this resource
    const { nodes, edges } = await getNodesAndEdgesFunctions[type as keyof typeof getNodesAndEdgesFunctions]({
      id,
      version,
      mode: 'full',
      channelRenderMode: config.visualiser?.channels?.renderMode === 'single' ? 'single' : 'flat',
    });

    if (!nodes || nodes.length === 0) {
      return new Response('No diagram data available', { status: 404 });
    }

    // Convert to mermaid
    const mermaidCode = convertToMermaid(nodes, edges, {
      includeStyles: true,
      direction: 'LR',
    });

    // Add header comment with metadata
    const header = `%% EventCatalog Mermaid Diagram
%% Resource: ${type}/${id} (v${version})
%% Generated: ${new Date().toISOString()}

`;

    return new Response(header + mermaidCode, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating mermaid diagram:', error);
    return new Response('Failed to generate diagram', { status: 500 });
  }
};
