import type { CollectionEntry } from 'astro:content';
import { createEdge, createNode, generatedIdForEdge, generateIdForNode, getColorFromString } from './utils/utils';
import { type Node, type Edge } from '@xyflow/react';

interface CollectionItem {
  collection: string;
  data: any;
}

export const getNodesAndEdgesForChannelChain = ({
  source,
  target,
  channelChain = [],
  mode = 'simple',
}: {
  source: CollectionItem;
  target: CollectionItem;
  channelChain: CollectionEntry<'channels'>[];
  mode?: 'simple' | 'full';
}) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // We found a channel chain, we need to render all the channels in the chain
  for (const channel of channelChain) {
    nodes.push(
      createNode({
        id: generateIdForNode(channel),
        type: channel.collection,
        data: { mode, channel: { ...channel.data, ...channel } },
        position: { x: 0, y: 0 },
      })
    );
  }

  // Connect the source to the first channel in the chain
  edges.push(
    createEdge({
      id: generatedIdForEdge(source, channelChain[0]),
      source: generateIdForNode(source),
      target: generateIdForNode(channelChain[0]),
      label: 'routes to',
      data: { customColor: getColorFromString(source.data.id) },
    })
  );

  // Make sure all the channels in the chain are connected together
  for (const channel of channelChain) {
    const index = channelChain.findIndex((c) => c.id === channel.id);
    if (channelChain[index + 1]) {
      edges.push(
        createEdge({
          id: generatedIdForEdge(channel, channelChain[index + 1]),
          source: generateIdForNode(channel),
          target: generateIdForNode(channelChain[index + 1]),
          label: `routes to`,
          data: { customColor: getColorFromString(source.data.id) },
        })
      );
    }
  }

  // Connect the last channel to the target
  edges.push(
    createEdge({
      id: generatedIdForEdge(channelChain[channelChain.length - 1], target),
      source: generateIdForNode(channelChain[channelChain.length - 1]),
      target: generateIdForNode(target),
      label: 'consumes',
      data: { customColor: getColorFromString(source.data.id) },
    })
  );

  return { nodes, edges };
};
