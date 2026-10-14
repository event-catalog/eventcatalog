import { getNodesAndEdges as getSystemContextNodesAndEdges } from './system-context-node-graph';
import { getNodesAndEdges as getSystemNodesAndEdges } from './systems-node-graph';
import { layoutLevels } from '@utils/node-graphs/layout-node-graph';

interface NodesAndEdgesProps {
  id: string;
  version: string;
  mode?: 'simple' | 'full';
  channelRenderMode?: 'single' | 'flat';
}

const CACHE_ENABLED = process.env.DISABLE_EVENTCATALOG_CACHE !== 'true';

// Built once for each system version and options
const levelsCache = new Map<string, ReturnType<typeof buildLevels>>();

export const getNodesAndEdges = (props: NodesAndEdgesProps) => {
  if (!CACHE_ENABLED) return buildLevels(props);
  const { id, version, mode = 'simple', channelRenderMode } = props;
  const key = [id, version, mode, channelRenderMode].join('/');
  if (!levelsCache.has(key)) levelsCache.set(key, buildLevels(props));
  return levelsCache.get(key)!;
};

/**
 * A system's resource diagram shown inside its context diagram: the system's node
 * is replaced by the expanded system group (services, data stores, messages...),
 * and the system's relationships and actors connect to the group instead.
 * Returns level 1 too (`overview`, the context diagram) and the graph without
 * its messages and channels (`hiddenMessages`).
 */
const buildLevels = async ({ id, version, mode = 'simple', channelRenderMode }: NodesAndEdgesProps) => {
  const [context, system] = await Promise.all([
    getSystemContextNodesAndEdges({ id, version, mode, layout: false }),
    getSystemNodesAndEdges({ id, version, mode, channelRenderMode, wrapInSystemGroup: true, layout: false }),
  ]);

  const group = system.nodes.find((node: any) => node.type === 'system-group');
  const rootSystemNode = context.nodes.find((node: any) => node.data?.isFocused);
  if (!group || !rootSystemNode) return layoutLevels(system, context);

  const systemNodeIds = new Set(system.nodes.map((node: any) => node.id));
  const contextNodes = context.nodes.filter((node: any) => node.id !== rootSystemNode.id && !systemNodeIds.has(node.id));
  const toGroup = (nodeId: string) => (nodeId === rootSystemNode.id ? group.id : nodeId);
  const contextEdges = context.edges.map((edge: any) => ({
    ...edge,
    id: `context-${edge.id}`,
    source: toGroup(edge.source),
    target: toGroup(edge.target),
  }));

  // Lay the context and the expanded system out together
  const detailed = {
    // Parent must come before its children in the array for React Flow
    nodes: [group, ...contextNodes, ...system.nodes.filter((node: any) => node.id !== group.id)],
    edges: [...system.edges, ...contextEdges],
  };
  return layoutLevels(detailed, context);
};
