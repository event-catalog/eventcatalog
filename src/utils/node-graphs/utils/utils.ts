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
export const generatedIdForEdge = (source: CollectionEntry<CollectionTypes>, target: CollectionEntry<CollectionTypes>) => {
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
  mode = 'full',
  currentNodes = [],
}: {
  channels: CollectionEntry<'channels'>[];
  channelsToRender: { id: string; version: string }[];
  source: CollectionEntry<CollectionTypes>;
  target: CollectionEntry<CollectionTypes>;
  channelToTargetLabel?: string;
  sourceToChannelLabel?: string;
  mode?: 'simple' | 'full';
  currentNodes?: Node[];
}) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Get the channels from the collection
  const channels = channelsToRender
    .map((channel) => getItemsFromCollectionByIdAndSemverOrLatest(channelsCollection, channel.id, channel.version)[0])
    .filter((channel) => channel !== undefined);

  channels.forEach((channel) => {
    const channelId = generateIdForNodes([source, channel, target]);

    // Need to check if the channel node is already in the graph
    // if (!currentNodes.find((node) => node.id === channelId)) {
    nodes.push(
      createNode({
        id: channelId,
        data: { title: channel?.data.id, mode, channel, source, target },
        position: { x: 0, y: 0 },
        type: channel?.collection,
      })
    );
    // }

    // if the source (left node) is a service, use the target as the edge message
    const edgeMessage = source.collection === 'services' ? target : source;

    // Link from left to channel
    edges.push(
      createEdge({
        // id: generatedIdForEdge(source, channel),
        id: generateIdForNodes([source, channel, target]),
        source: generateIdForNode(source),
        target: channelId,
        label: '',
        // label: sourceToChannelLabel,
        data: { message: edgeMessage },
      })
    );

    // Link channel to service
    edges.push(
      createEdge({
        // id: generatedIdForEdge(channel, target),
        id: generateIdForNodes([channel, target, source]),
        source: channelId,
        target: generateIdForNode(target),
        label: channelToTargetLabel,
        data: { message: edgeMessage },
      })
    );
  });

  return { nodes, edges };
};
