/**
 * Serves a resource's architecture diagram as Mermaid at /visualiser/{type}/{id}/{version}.mermaid,
 * as plain text that can be used by LLMs, documentation tools, or pasted into Mermaid renderers.
 *
 * Domains and systems have their own routes next to their Diagram pages
 * (visualiser/domains/[id]/[version]), which would otherwise handle these requests first.
 * Their levels are served at /visualiser/{domains|systems}/{id}/{version}/{overview|services}.mermaid.
 */
import { isAuthEnabled, isVisualiserEnabled } from '@utils/feature';
import { pageDataLoader } from '@utils/page-loaders/page-data-loader';
import { getArchitectureDiagramGraph } from '@utils/node-graphs/architecture-diagram';
import {
  ARCHITECTURE_DIAGRAM_DETAILS,
  isArchitectureDiagramCollection,
  type ArchitectureDiagramDetail,
} from '@utils/node-graphs/architecture-diagram-types';
import { convertToMermaid } from '@eventcatalog/visualiser/layout';
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

/** Levels served at /visualiser/{domains|systems}/{id}/{version}/{level}.mermaid ({version}.mermaid is the full diagram) */
export const MERMAID_LEVELS = ['overview', 'services'] as const satisfies ArchitectureDiagramDetail[];

const LEVEL_DESCRIPTIONS: Record<ArchitectureDiagramDetail, string> = {
  overview: 'L1 overview (domains, systems and their relationships)',
  services: 'L2 services and data stores',
  full: 'L3 full (services, messages and channels)',
};

/** Every version of each domain or system with each level, for building their Mermaid files in static builds */
export async function getMermaidLevelPaths(type: 'domains' | 'systems') {
  const paths = await getMermaidDiagramPaths([type]);
  return paths.flatMap(({ id, version }) => MERMAID_LEVELS.map((level) => ({ params: { id, version, level } })));
}

const isMermaidDetail = (detail: string): detail is ArchitectureDiagramDetail =>
  (ARCHITECTURE_DIAGRAM_DETAILS as readonly string[]).includes(detail);

export async function createMermaidDiagramResponse({
  type,
  id,
  version,
  detail = 'full',
}: {
  type?: string;
  id?: string;
  version?: string;
  detail?: string;
}) {
  if (!type || !id || !version || !isVisualiserEnabled()) {
    return new Response('Not found', { status: 404 });
  }

  // Validate the type is supported
  if (!isArchitectureDiagramCollection(type)) {
    return new Response(`Unsupported type: ${type}`, { status: 400 });
  }

  if (!isMermaidDetail(detail)) {
    return new Response('Not found', { status: 404 });
  }

  try {
    // Built the same way as the resource's Diagram page, at the level asked for
    const { nodes, edges } = await getArchitectureDiagramGraph({
      collection: type,
      id,
      version,
      ...(detail !== 'full' && { detail }),
    });

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
%% Level: ${LEVEL_DESCRIPTIONS[detail]}
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
