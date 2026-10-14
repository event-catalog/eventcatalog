/**
 * Serves a resource's architecture diagram as Mermaid at /visualiser/{type}/{id}/{version}.mermaid,
 * as plain text that can be used by LLMs, documentation tools, or pasted into Mermaid renderers.
 *
 * Domains and systems have their own routes next to their Diagram pages
 * (visualiser/domains/[id]/[version]), which would otherwise handle these requests first.
 */
import { isAuthEnabled, isVisualiserEnabled } from '@utils/feature';
import { pageDataLoader } from '@utils/page-loaders/page-data-loader';
import { getArchitectureDiagramGraph } from '@utils/node-graphs/architecture-diagram';
import { isArchitectureDiagramCollection } from '@utils/node-graphs/architecture-diagram-types';
import { convertToMermaid } from '@utils/node-graphs/export-mermaid';
import type { PageTypes } from '@types';

export type MermaidDiagramType =
  | Extract<PageTypes, 'events' | 'commands' | 'queries' | 'services' | 'domains' | 'containers' | 'data-products' | 'systems'>
  | 'flows';

/** Every version of each type that has a diagram, for building the Mermaid files in static builds */
export async function getMermaidDiagramPaths(types: MermaidDiagramType[]) {
  if (isAuthEnabled() || !isVisualiserEnabled()) {
    return [];
  }

  const { getFlows } = await import('@utils/collections/flows');
  const loaders = { ...pageDataLoader, flows: getFlows };

  const allItems = await Promise.all(types.map((type) => loaders[type]()));

  return allItems.flatMap((items, index) =>
    items
      .filter((item: any) => item.data.visualiser !== false)
      .map((item: any) => ({ type: types[index], id: item.data.id as string, version: item.data.version as string }))
  );
}

export async function createMermaidDiagramResponse({ type, id, version }: { type?: string; id?: string; version?: string }) {
  if (!type || !id || !version || !isVisualiserEnabled()) {
    return new Response('Not found', { status: 404 });
  }

  // Validate the type is supported
  if (!isArchitectureDiagramCollection(type)) {
    return new Response(`Unsupported type: ${type}`, { status: 400 });
  }

  try {
    // Built the same way as the resource's Diagram page
    const { nodes, edges } = await getArchitectureDiagramGraph({ collection: type, id, version });

    if (!nodes || nodes.length === 0) {
      return new Response('No diagram data available', { status: 404 });
    }

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
}
