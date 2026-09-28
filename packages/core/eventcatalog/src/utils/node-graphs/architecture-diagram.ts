/**
 * The architecture diagram for a resource, built the same way as its Diagram page
 * in the visualiser. Shared by the `.mermaid` visualiser route and the architecture
 * diagram tool used by AI Chat and the MCP server, so they show the same thing.
 */
import config from '@config';
import { getNodesAndEdges as getNodesAndEdgesForService } from '@utils/node-graphs/services-node-graph';
import { getNodesAndEdges as getNodesAndEdgesForAgent } from '@utils/node-graphs/agents-node-graph';
import {
  getNodesAndEdgesForCommands,
  getNodesAndEdgesForEvents,
  getNodesAndEdgesForQueries,
} from '@utils/node-graphs/message-node-graph';
import { getNodesAndEdges as getNodesAndEdgesForFlows } from '@utils/node-graphs/flows-node-graph';
import { getNodesAndEdges as getNodesAndEdgesForDataProduct } from '@utils/node-graphs/data-products-node-graph';
import { getNodesAndEdges as getNodesAndEdgesForContainer } from '@utils/node-graphs/container-node-graph';
import { getNodesAndEdges as getNodesAndEdgesForDomainLevels } from '@utils/node-graphs/domain-levels-node-graph';
import { getNodesAndEdges as getNodesAndEdgesForSystemLevels } from '@utils/node-graphs/system-levels-node-graph';
import type {
  ArchitectureDiagramCollection,
  ArchitectureDiagramDetail,
  ArchitectureDiagramView,
  Graph,
} from '@utils/node-graphs/architecture-diagram-types';

// Domains and systems are shown in levels: level 1 (`overview`) is the domains and
// systems and how they relate, and the detailed graph expands systems into their
// services, messages and channels
const getLevelsFunctions = {
  domains: getNodesAndEdgesForDomainLevels,
  systems: getNodesAndEdgesForSystemLevels,
};

// A graph builder for every other collection with a diagram
const getNodesAndEdgesFunctions = {
  agents: getNodesAndEdgesForAgent,
  services: getNodesAndEdgesForService,
  events: getNodesAndEdgesForEvents,
  commands: getNodesAndEdgesForCommands,
  queries: getNodesAndEdgesForQueries,
  flows: getNodesAndEdgesForFlows,
  containers: getNodesAndEdgesForContainer,
  'data-products': getNodesAndEdgesForDataProduct,
} satisfies Record<Exclude<ArchitectureDiagramCollection, keyof typeof getLevelsFunctions>, unknown>;

export async function getArchitectureDiagramView({
  collection,
  id,
  version,
}: {
  collection: ArchitectureDiagramCollection;
  id: string;
  version: string;
}): Promise<ArchitectureDiagramView> {
  const options = {
    id,
    version,
    mode: 'full' as const,
    channelRenderMode: config.visualiser?.channels?.renderMode === 'single' ? ('single' as const) : ('flat' as const),
  };

  if (collection === 'domains' || collection === 'systems') {
    const { nodes, edges, overview, hiddenMessages } = await getLevelsFunctions[collection](options);
    return { nodes, edges, overview, hiddenMessages };
  }

  const { nodes, edges } = await getNodesAndEdgesFunctions[collection](options);
  return { nodes, edges };
}

export async function getArchitectureDiagramGraph({
  detail = 'full',
  ...resource
}: {
  collection: ArchitectureDiagramCollection;
  id: string;
  version: string;
  detail?: ArchitectureDiagramDetail;
}): Promise<Graph> {
  const view = await getArchitectureDiagramView(resource);
  // A domain without systems or subdomains has no level 1, so it shows the full diagram
  const graph = detail === 'overview' && view.overview ? view.overview : view;
  return { nodes: graph.nodes, edges: graph.edges };
}
