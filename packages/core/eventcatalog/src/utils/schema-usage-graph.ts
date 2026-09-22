import type { Edge, Node } from '@xyflow/react';
import config from '@config';
import {
  getNodesAndEdgesForCommands,
  getNodesAndEdgesForEvents,
  getNodesAndEdgesForQueries,
} from '@utils/node-graphs/message-node-graph';
import { getNodesAndEdges as getNodesAndEdgesForFlow } from '@utils/node-graphs/flows-node-graph';
import { compactVisualiserGraph } from '@utils/node-graphs/compact-visualiser-graph';

export interface MessageUsageGraph {
  nodes: Node[];
  edges: Edge[];
}

const graphBuilders = {
  events: getNodesAndEdgesForEvents,
  commands: getNodesAndEdgesForCommands,
  queries: getNodesAndEdgesForQueries,
} as const;

/**
 * The same producer → message → consumer graph the message docs page renders, reduced to the
 * fields the visualiser needs so it can be sent to the schema pages.
 */
export const getMessageUsageGraph = async ({
  collection,
  id,
  version,
}: {
  collection: string;
  id: string;
  version: string;
}): Promise<MessageUsageGraph | undefined> => {
  const build = graphBuilders[collection as keyof typeof graphBuilders];
  if (!build) return undefined;
  const { nodes, edges } = await build({
    id,
    version,
    mode: 'simple',
    channelRenderMode: config.visualiser?.channels?.renderMode === 'single' ? 'single' : 'flat',
  });
  return compactVisualiserGraph(nodes as Node[], edges as Edge[]);
};

/** Identifies the message a diagram is being viewed from, so its node can be highlighted. */
export interface FocusedMessage {
  id: string;
  version: string;
}

/**
 * The flow diagram the flow docs page renders, compacted for the schema pages. Steps that
 * send or receive the focused message get the visualiser's "Viewing" indicator.
 */
export const getFlowGraph = async ({
  id,
  version,
  focus,
}: {
  id: string;
  version: string;
  focus?: FocusedMessage;
}): Promise<MessageUsageGraph> => {
  const { nodes, edges } = await getNodesAndEdgesForFlow({ id, version, mode: 'simple' });
  const focused = (nodes as Node[]).map((node) => {
    const message = node.data?.message as { id?: string; version?: string } | undefined;
    return focus && message?.id === focus.id && message?.version === focus.version
      ? { ...node, data: { ...node.data, isFocused: true } }
      : node;
  });
  return compactVisualiserGraph(focused, edges as Edge[]);
};

/**
 * Adds each flow's diagram to the flow usages, highlighting the focused message's steps.
 * A flow whose diagram fails to build is kept without one.
 */
export const attachFlowGraphs = <T extends { id: string; version: string }>(
  flows: T[],
  focus?: FocusedMessage
): Promise<(T & { graph?: MessageUsageGraph })[]> =>
  Promise.all(
    flows.map(async (flow) => {
      try {
        return { ...flow, graph: await getFlowGraph({ ...flow, focus }) };
      } catch (error) {
        console.error(`Error building flow graph for ${flow.id}:`, error);
        return flow;
      }
    })
  );
