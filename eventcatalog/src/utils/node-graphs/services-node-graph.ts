import { getCollection, type CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import {
  createDagreGraph,
  generateIdForNode,
  generatedIdForEdge,
  calculatedNodes,
  createEdge,
} from '@utils/node-graphs/utils/utils';

import { findMatchingNodes, getItemsFromCollectionByIdAndSemverOrLatest } from '@utils/collections/util';
import { MarkerType } from '@xyflow/react';
import type { CollectionMessageTypes } from '@types';
import { getNodesAndEdgesForConsumedMessage, getNodesAndEdgesForProducedMessage } from './message-node-graph';

type DagreGraph = any;

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  renderAllEdges?: boolean;
  channelRenderMode?: 'single' | 'flat';
  renderMessages?: boolean;
}

const getSendsMessageByMessageType = (messageType: string) => {
  switch (messageType) {
    case 'events':
      return 'publishes event';
    case 'commands':
      return 'invokes command';
    case 'queries':
      return 'requests';
    default:
      return 'invokes message';
  }
};

const getReceivesMessageByMessageType = (messageType: string) => {
  switch (messageType) {
    case 'events':
      return 'receives event';
    case 'commands':
    case 'queries':
      return 'accepts';
    default:
      return 'accepts message';
  }
};

export const getNodesAndEdges = async ({
  id,
  defaultFlow,
  version,
  mode = 'simple',
  renderAllEdges = false,
  channelRenderMode = 'flat',
  renderMessages = true,
}: Props) => {
  const flow = defaultFlow || createDagreGraph({ ranksep: 300, nodesep: 50 });
  let nodes = [] as any,
    edges = [] as any;

  const services = await getCollection('services');

  const service = services.find((service) => service.data.id === id && service.data.version === version);

  // Nothing found...
  if (!service) {
    return {
      nodes: [],
      edges: [],
    };
  }

  const receivesRaw = service?.data.receives || [];
  const sendsRaw = service?.data.sends || [];
  const writesToRaw = service?.data.writesTo || [];
  const readsFromRaw = service?.data.readsFrom || [];

  const events = await getCollection('events');
  const commands = await getCollection('commands');
  const queries = await getCollection('queries');
  const channels = await getCollection('channels');
  const containers = await getCollection('containers');

  const messages = [...events, ...commands, ...queries];

  const receivesHydrated = receivesRaw
    .map((message) => getItemsFromCollectionByIdAndSemverOrLatest(messages, message.id, message.version))
    .flat()
    .filter((e) => e !== undefined);

  const sendsHydrated = sendsRaw
    .map((message) => getItemsFromCollectionByIdAndSemverOrLatest(messages, message.id, message.version))
    .flat()
    .filter((e) => e !== undefined);

  const writesToHydrated = writesToRaw
    .map((container) => getItemsFromCollectionByIdAndSemverOrLatest(containers, container.id, container.version))
    .flat()
    .filter((e) => e !== undefined);

  const readsFromHydrated = readsFromRaw
    .map((container) => getItemsFromCollectionByIdAndSemverOrLatest(containers, container.id, container.version))
    .flat()
    .filter((e) => e !== undefined);

  const receives = (receivesHydrated as CollectionEntry<CollectionMessageTypes>[]) || [];
  const sends = (sendsHydrated as CollectionEntry<CollectionMessageTypes>[]) || [];
  const writesTo = (writesToHydrated as CollectionEntry<'containers'>[]) || [];
  const readsFrom = (readsFromHydrated as CollectionEntry<'containers'>[]) || [];

  // Track messages that are both sent and received
  const bothSentAndReceived = findMatchingNodes(receives, sends);
  const bothReadsAndWrites = findMatchingNodes(readsFrom, writesTo);

  if (renderMessages) {
    // All the messages the service receives
    receives.forEach((receive) => {
      const targetChannels = receivesRaw.find((receiveRaw) => receiveRaw.id === receive.data.id)?.from;

      const { nodes: consumedMessageNodes, edges: consumedMessageEdges } = getNodesAndEdgesForConsumedMessage({
        message: receive,
        targetChannels: targetChannels,
        services,
        currentNodes: nodes,
        target: service,
        mode,
        channels,
      });

      nodes.push(...consumedMessageNodes);
      edges.push(...consumedMessageEdges);
    });
  }

  // The service itself
  nodes.push({
    id: generateIdForNode(service),
    sourcePosition: 'right',
    targetPosition: 'left',
    // data: { mode, service: { ...service, ...service.data } },
    data: { mode, service: { ...service.data } },
    type: service.collection,
  });

  // Any containers the service writes to
  writesTo.forEach((writeTo) => {
    nodes.push({
      id: generateIdForNode(writeTo),
      sourcePosition: 'right',
      targetPosition: 'left',
      data: { mode, data: { ...writeTo.data } },
      type: 'data',
    });

    // If its not in the reads/and writes to, we need to add the edge
    if (!bothReadsAndWrites.includes(writeTo)) {
      edges.push(
        createEdge({
          id: generatedIdForEdge(service, writeTo),
          source: generateIdForNode(service),
          target: generateIdForNode(writeTo),
          label: `writes to \n (${writeTo.data?.technology})`,
          type: 'multiline',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#666',
            width: 40,
            height: 40,
          },
        })
      );
    }
  });

  // Any containers the service reads from
  readsFrom.forEach((readFrom) => {
    nodes.push({
      id: generateIdForNode(readFrom),
      sourcePosition: 'right',
      targetPosition: 'left',
      data: { mode, data: { ...readFrom.data } },
      type: 'data',
    });

    // If its not in the reads/and writes to, we need to add the edge
    if (!bothReadsAndWrites.includes(readFrom)) {
      edges.push(
        createEdge({
          id: generatedIdForEdge(service, readFrom),
          source: generateIdForNode(readFrom),
          target: generateIdForNode(service),
          label: `reads from \n (${readFrom.data?.technology})`,
          type: 'multiline',
          markerStart: {
            type: MarkerType.ArrowClosed,
            color: '#666',
            width: 40,
            height: 40,
          },
          markerEnd: undefined,
        })
      );
    }
  });

  if (renderMessages) {
    sends.forEach((send) => {
      const sourceChannels = sendsRaw.find((sendRaw) => sendRaw.id === send.data.id)?.to;

      const { nodes: producedMessageNodes, edges: producedMessageEdges } = getNodesAndEdgesForProducedMessage({
        message: send,
        sourceChannels: sourceChannels,
        services,
        currentNodes: nodes,
        source: service,
        currentEdges: edges,
        mode,
        channels,
      });

      nodes.push(...producedMessageNodes);
      edges.push(...producedMessageEdges);
    });

    // Handle messages that are both sent and received
    bothSentAndReceived.forEach((message) => {
      if (message) {
        edges.push({
          id: generatedIdForEdge(service, message) + '-both',
          source: generateIdForNode(service),
          target: generateIdForNode(message),
          label: `${getSendsMessageByMessageType(message?.collection)} & ${getReceivesMessageByMessageType(message?.collection)}`,
          animated: false,
          data: { message: { ...message.data } },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 40,
            height: 40,
          },
          style: {
            strokeWidth: 1,
          },
        });
      }
    });
  }

  bothReadsAndWrites.forEach((container) => {
    edges.push({
      id: generatedIdForEdge(service, container) + '-both',
      source: generateIdForNode(service),
      target: generateIdForNode(container),
      type: 'multiline',
      // @ts-ignore
      label: `reads from \n and writes to \n (${container.data.technology})`,
      markerStart: {
        type: MarkerType.ArrowClosed,
        color: '#666',
        width: 40,
        height: 40,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#666',
        width: 40,
        height: 40,
      },
    });
  });

  nodes.forEach((node: any) => {
    flow.setNode(node.id, { width: 150, height: 100 });
  });

  edges.forEach((edge: any) => {
    flow.setEdge(edge.source, edge.target);
  });

  // Render the diagram in memory getting the X and Y
  dagre.layout(flow);

  // Find any duplicated edges, and merge them into one edge
  const uniqueEdges = edges.reduce((acc: any[], edge: any) => {
    const existingEdge = acc.find((e: any) => e.id === edge.id);
    if (existingEdge) {
      // existingEdge.label = `${existingEdge.label} & ${edge.label}`;
      // Add the custom colors to the existing edge which can be an array of strings
      const value = Array.isArray(edge.data.customColor) ? edge.data.customColor : [edge.data.customColor];
      const existingValue = Array.isArray(existingEdge.data.customColor)
        ? existingEdge.data.customColor
        : [existingEdge.data.customColor];
      existingEdge.data.customColor = [...value, ...existingValue];
    } else {
      acc.push(edge);
    }
    return acc;
  }, []);

  return {
    nodes: calculatedNodes(flow, nodes),
    edges: uniqueEdges,
  };
};
