import type { CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import { calculatedNodes, createDagreGraph, createEdge, generatedIdForEdge, generateIdForNode } from './utils/utils';
import { MarkerType } from '@xyflow/react';
import { findMatchingNodes } from '@utils/collections/util';
import { getContainers } from '@utils/collections/containers';

type DagreGraph = any;

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  channelRenderMode?: 'flat' | 'single';
  collection?: CollectionEntry<'containers'>[];
}

export const getNodesAndEdges = async ({ id, version, defaultFlow, mode = 'simple', channelRenderMode = 'flat' }: Props) => {
  const containers = await getContainers();

  const flow = defaultFlow || createDagreGraph({ ranksep: 300, nodesep: 50 });
  const nodes = [] as any,
    edges = [] as any;

  const container = containers.find((container) => container.data.id === id && container.data.version === version);

  // Nothing found...
  if (!container) {
    return {
      nodes: [],
      edges: [],
    };
  }

  const servicesThatWriteToContainer = (container.data.servicesThatWriteToContainer as CollectionEntry<'services'>[]) || [];
  const servicesThatReadFromContainer = (container.data.servicesThatReadFromContainer as CollectionEntry<'services'>[]) || [];

  // Track nodes that are bth sent and received
  const bothSentAndReceived = findMatchingNodes(servicesThatWriteToContainer, servicesThatReadFromContainer);

  servicesThatWriteToContainer.forEach((service) => {
    nodes.push({
      id: generateIdForNode(service),
      type: service?.collection,
      sourcePosition: 'right',
      targetPosition: 'left',
      data: { mode, service: { ...service.data } },
      position: { x: 250, y: 0 },
    });

    if (!bothSentAndReceived.includes(service)) {
      edges.push({
        id: generatedIdForEdge(service, container),
        source: generateIdForNode(service),
        target: generateIdForNode(container),
        label: 'writes to',
        data: { service },
        animated: false,
        type: 'default',
        style: {
          strokeWidth: 1,
        },
      });
    }
  });

  // The message itself
  nodes.push({
    id: generateIdForNode(container),
    sourcePosition: 'right',
    targetPosition: 'left',
    data: {
      mode,
      data: {
        ...container.data,
      },
    },
    position: { x: 0, y: 0 },
    type: 'data',
  });

  //   // The messages the service sends
  servicesThatReadFromContainer.forEach((service) => {
    nodes.push({
      id: generateIdForNode(service),
      sourcePosition: 'left',
      targetPosition: 'right',
      data: { title: service?.data.id, mode, service: { ...service.data } },
      position: { x: 0, y: 0 },
      type: service?.collection,
    });

    if (!bothSentAndReceived.includes(service)) {
      edges.push(
        createEdge({
          id: generatedIdForEdge(service, container),
          source: generateIdForNode(container),
          target: generateIdForNode(service),
          label: `reads from \n (${container.data.technology})`,
          data: { service },
          type: 'multiline',
          // type: 'animatedData',
          markerStart: {
            type: MarkerType.ArrowClosed,
            width: 40,
            height: 40,
          },
          markerEnd: undefined,
        })
      );
    }
  });

  // Handle messages that are both sent and received
  bothSentAndReceived.forEach((_service) => {
    if (container) {
      edges.push(
        createEdge({
          id: generatedIdForEdge(container, _service) + '-both',
          source: generateIdForNode(_service),
          target: generateIdForNode(container),
          label: `read and writes to \n (${container.data.technology})`,
          type: 'multiline',
          markerStart: {
            type: MarkerType.ArrowClosed,
            width: 40,
            height: 40,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 40,
            height: 40,
          },
        })
      );
    }
  });

  nodes.forEach((node: any) => {
    flow.setNode(node.id, { width: 150, height: 100 });
  });

  edges.forEach((edge: any) => {
    flow.setEdge(edge.source, edge.target);
  });

  // Render the diagram in memory getting hte X and Y
  dagre.layout(flow);

  return {
    nodes: calculatedNodes(flow, nodes),
    edges,
  };
};
