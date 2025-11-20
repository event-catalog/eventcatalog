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
  skipProcessing?: boolean;
}

export const useEventCatalogVisualiser = ({
  nodes,
  edges,
  setNodes,
  setEdges,
  skipProcessing = false,
}: EventCatalogVisualizerProps) => {
  const [hideChannels, setHideChannels] = useState(false);
  const [initialNodes, setInitialNodes] = useState(nodes);
  const [initialEdges, setInitialEdges] = useState(edges);

  // Initialize hideChannels from localStorage
  useEffect(() => {
    const storedHideChannels = localStorage.getItem('EventCatalog:hideChannels');
    if (storedHideChannels !== null) {
      setHideChannels(storedHideChannels === 'true');
    }
  }, []);

  useEffect(() => {
    const hasChannels = nodes.some((node) => node.type === 'channels');
    if (!hideChannels || hasChannels) {
      setInitialNodes(nodes);
      setInitialEdges(edges);
    }
  }, [nodes, edges, hideChannels]);

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
    const newEdges = edges.reduce<Edge[]>((acc, edge) => {
      const { source, target, data } = edge;
      const targetIsChannel = channels.some((channel) => channel.id === target);
      const sourceIsChannel = channels.some((channel) => channel.id === source);

      if (!sourceIsChannel && !targetIsChannel) {
        return [...acc, edge];
      }

      if (sourceIsChannel || targetIsChannel) {
        const rootSourceAndTarget = data?.rootSourceAndTarget as {
          source: { id: string; collection: string };
          target: { id: string; collection: string };
        };

        if (!rootSourceAndTarget) {
          return [...acc, edge];
        }

        // is target services?
        const targetIsService = rootSourceAndTarget?.target?.collection === 'services';
        const edgeLabel = targetIsService
          ? getEdgeLabelForMessageAsSource(rootSourceAndTarget.source as any)
          : getEdgeLabelForServiceAsTarget(rootSourceAndTarget.target as any);

        const newEdgeId = `${rootSourceAndTarget.source.id}-${rootSourceAndTarget.target.id}`;

        return [
          ...acc,
          createEdge({
            id: newEdgeId,
            source: rootSourceAndTarget.source.id,
            target: rootSourceAndTarget.target.id,
            label: edgeLabel,
          }),
        ];
      }
      return acc;
    }, []);

    return newEdges.filter((edge, index, self) => index === self.findIndex((t) => t.id === edge.id));
  }, [edges, channels]);

  // console.log('UPDATED EDGES', JSON.stringify(updatedEdges, null, 2));

  useEffect(() => {
    // Skip processing if there are no channels to manage
    if (skipProcessing) {
      return;
    }

    if (hideChannels) {
      const { nodes: newNodes, edges: newEdges } = getNodesAndEdgesFromDagre({ nodes: updatedNodes, edges: updatedEdges });
      setNodes(newNodes);
      setEdges(newEdges);
    } else {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [hideChannels, skipProcessing]);

  return {
    hideChannels,
    toggleChannelsVisibility,
  };
};
