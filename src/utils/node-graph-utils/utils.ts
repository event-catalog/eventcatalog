import { getCollection, type CollectionEntry } from 'astro:content';
import { MarkerType, Position, type Edge, type Node } from 'reactflow';
import dagre from 'dagre';
import { getItemsFromCollectionByIdAndSemverOrLatest } from '@utils/collections/util';
import type { CollectionTypes } from '@types';

export const generateIdForNode = (node: CollectionEntry<CollectionTypes>) => {
  return `${node.data.id}-${node.data.version}`;
};
export const generateIdForNodes = (nodes: any) => {
  return nodes.map((node: any) => `${node.data.id}-${node.data.version}`).join('-');
};
export const generatedIdForEdge = (
  source: CollectionEntry<CollectionTypes>,
  target: CollectionEntry<CollectionTypes>
) => {
  return `${source.data.id}-${source.data.version}-${target.data.id}-${target.data.version}`;
};

export const calculatedNodes = (flow: dagre.graphlib.Graph, nodes: Node[]) => {
  return nodes.map((node: any) => {
    const { x, y } = flow.node(node.id);
    return { ...node, position: { x, y } };
  });
};

// Creates a new dagre graph
export const createDagreGraph = ({ ranksep = 180, nodesep = 50, ...rest }: any) => {
  const graph = new dagre.graphlib.Graph({ compound: true });
  graph.setGraph({ rankdir: 'LR', ranksep, nodesep, ...rest });
  graph.setDefaultEdgeLabel(() => ({}));
  return graph;
};

export const createEdge = (edgeOptions: Edge) => {
  return {
    type: 'smoothstep',
    label: 'subscribed by',
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 40,
      height: 40,
    },
    style: {
      strokeWidth: 1,
    },
    ...edgeOptions,
  };
};

export const createNode = (values: Node): Node => {
  return {
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    ...values,
  };
};

export const getChannelNodesAndEdges = ({
  channels: channelsCollection,
  channelsToRender,
  source,
  target,
  channelToTargetLabel = 'sends from channel',
  sourceToChannelLabel = 'sends to channel',
}: {
  channels: CollectionEntry<'channels'>[];
  channelsToRender: { id: string; version: string }[];
  source: CollectionEntry<CollectionTypes>;
  target: CollectionEntry<CollectionTypes>;
  channelToTargetLabel?: string
  sourceToChannelLabel?: string
}) => {

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Get the channels from the collection
  const channels = channelsToRender
    .map((channel) => getItemsFromCollectionByIdAndSemverOrLatest(channelsCollection, channel.id, channel.version)[0])
    .filter((channel) => channel !== undefined);

  channels.forEach((channel) => {
    const channelId = generateIdForNodes([source, channel]);
    nodes.push(
      createNode({
        id: channelId,
        data: { title: channel?.data.id, mode: 'full', channel, showSource: false },
        position: { x: 0, y: 0 },
        type: channel?.collection,
      })
    );

    // Link from left to channel
    edges.push(
      createEdge({
        id: generatedIdForEdge(source, channel),
        source: generateIdForNode(source),
        target: channelId,
        label: sourceToChannelLabel
      })
    );

    // Link channel to service
    edges.push(
      createEdge({
        id: generatedIdForEdge(channel, target),
        source: channelId,
        target: generateIdForNode(target),
        label: channelToTargetLabel
      })
    );

  });

  return { nodes, edges };
};
