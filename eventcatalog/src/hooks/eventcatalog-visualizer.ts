import { useCallback, useMemo, useState, useEffect } from 'react';
import { type Edge, type Node } from '@xyflow/react';
import {
  createEdge,
  generatedIdForEdge,
  generateIdForNode,
  getEdgeLabelForMessageAsSource,
  getEdgeLabelForServiceAsTarget,
  getNodesAndEdgesFromDagre,
} from '@utils/node-graphs/utils/utils';
import type { CollectionEntry } from 'astro:content';
import type { CollectionMessageTypes, CollectionTypes } from '@types';

interface EventCatalogVisualizerProps {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
}

export const useEventCatalogVisualiser = ({ nodes, edges, setNodes, setEdges }: EventCatalogVisualizerProps) => {
  const [hideChannels, setHideChannels] = useState(false);
  const [initialNodes] = useState(nodes);
  const [initialEdges] = useState(edges);

  // Initialize hideChannels from localStorage
  useEffect(() => {
    const storedHideChannels = localStorage.getItem('EventCatalog:hideChannels');
    if (storedHideChannels !== null) {
      setHideChannels(storedHideChannels === 'true');
    }
  }, []);

  const toggleChannelsVisibility = useCallback(() => {
    setHideChannels((prev) => {
      const newValue = !prev;
      localStorage.setItem('EventCatalog:hideChannels', JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  const channels = useMemo(() => nodes.filter((node) => node.type === 'channels'), [nodes]);
  const updatedNodes = useMemo(() => nodes.filter((node) => node.type !== 'channels'), [nodes]);

  const updatedEdges = useMemo(() => {
    return edges.reduce<Edge[]>((acc, edge) => {
      const { source, target, data } = edge;
      const targetIsChannel = channels.some((channel) => channel.id === target);
      const sourceIsChannel = channels.some((channel) => channel.id === source);

      if (!sourceIsChannel && !targetIsChannel) {
        return [...acc, edge];
      }

      const dataTarget = data?.target as CollectionEntry<CollectionTypes>;
      const dataSource = data?.source as CollectionEntry<CollectionTypes>;

      if (sourceIsChannel) {
        const edgeLabel =
          dataTarget?.collection === 'services'
            ? getEdgeLabelForMessageAsSource(dataSource as CollectionEntry<CollectionMessageTypes>)
            : getEdgeLabelForServiceAsTarget(dataTarget as CollectionEntry<CollectionMessageTypes>);

        return [
          ...acc,
          createEdge({
            id: generatedIdForEdge(dataSource, dataTarget),
            source: generateIdForNode(dataSource),
            target: generateIdForNode(dataTarget),
            label: edgeLabel,
          }),
        ];
      }

      return [...acc, edge];
    }, []);
  }, [edges, channels]);

  useEffect(() => {
    if (hideChannels) {
      const { nodes: newNodes, edges: newEdges } = getNodesAndEdgesFromDagre({ nodes: updatedNodes, edges: updatedEdges });
      setNodes(newNodes);
      setEdges(newEdges);
    } else {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [hideChannels]);

  return {
    hideChannels,
    toggleChannelsVisibility,
  };
};
