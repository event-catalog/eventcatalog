import { getCollection, type CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import { type Node, type Edge, Position } from '@xyflow/react';
import {
  createDagreGraph,
  generateIdForNode,
  generatedIdForEdge,
  calculatedNodes,
  createEdge,
} from '@utils/node-graphs/utils/utils';

import { findInMap, createVersionedMap } from '@utils/collections/util';
import type { CollectionMessageTypes } from '@types';

interface Props {
  id: string;
  version: string;
  mode?: 'simple' | 'full';
}

const getSendsLabelByMessageType = (messageType: string) => {
  switch (messageType) {
    case 'events':
      return 'emits';
    case 'commands':
      return 'invokes command';
    case 'queries':
      return 'requests';
    default:
      return 'sends';
  }
};

const getReceivesLabelByMessageType = (messageType: string) => {
  switch (messageType) {
    case 'events':
      return 'subscribes to';
    case 'commands':
      return 'handles';
    case 'queries':
      return 'handles';
    default:
      return 'receives';
  }
};

export const getNodesAndEdges = async ({ id, version, mode = 'simple' }: Props) => {
  const flow = createDagreGraph({ ranksep: 300, nodesep: 50 });
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Fetch all collections in parallel
  const [entities, events, commands, queries] = await Promise.all([
    getCollection('entities'),
    getCollection('events'),
    getCollection('commands'),
    getCollection('queries'),
  ]);

  const allMessages = [...events, ...commands, ...queries];
  const entityMap = createVersionedMap(entities);
  const messageMap = createVersionedMap(allMessages);

  // Find the entity
  const entity = findInMap(entityMap, id, version);
  if (!entity) {
    return { nodes: [], edges: [] };
  }

  // Hydrate sends/receives
  const sendsRaw = entity.data.sends || [];
  const receivesRaw = entity.data.receives || [];

  const sends = sendsRaw
    .map((m: { id: string; version?: string }) => findInMap(messageMap, m.id, m.version))
    .filter((e): e is CollectionEntry<CollectionMessageTypes> => !!e);

  const receives = receivesRaw
    .map((m: { id: string; version?: string }) => findInMap(messageMap, m.id, m.version))
    .filter((e): e is CollectionEntry<CollectionMessageTypes> => !!e);

  // Add entity node first (center) - always show even if isolated
  nodes.push({
    id: generateIdForNode(entity),
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      mode,
      entity,
    },
    position: { x: 0, y: 0 },
    type: 'entities',
  });

  // If no messaging, return just the entity node
  if (sends.length === 0 && receives.length === 0) {
    return { nodes, edges: [] };
  }

  // Add received messages (left side - incoming)
  receives.forEach((message) => {
    nodes.push({
      id: generateIdForNode(message),
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: { mode, message: { ...message.data } },
      position: { x: 0, y: 0 },
      type: message.collection,
    });
    edges.push(
      createEdge({
        id: generatedIdForEdge(message, entity),
        source: generateIdForNode(message),
        target: generateIdForNode(entity),
        label: getReceivesLabelByMessageType(message.collection),
        animated: true,
      })
    );
  });

  // Add sent messages (right side - outgoing)
  sends.forEach((message) => {
    nodes.push({
      id: generateIdForNode(message),
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: { mode, message: { ...message.data } },
      position: { x: 0, y: 0 },
      type: message.collection,
    });
    edges.push(
      createEdge({
        id: generatedIdForEdge(entity, message),
        source: generateIdForNode(entity),
        target: generateIdForNode(message),
        label: getSendsLabelByMessageType(message.collection),
        animated: true,
      })
    );
  });

  // Apply dagre layout
  nodes.forEach((node) => {
    flow.setNode(node.id, { width: 150, height: 100 });
  });
  edges.forEach((edge) => {
    flow.setEdge(edge.source, edge.target);
  });
  dagre.layout(flow);

  const finalNodes = calculatedNodes(flow, nodes);
  return {
    nodes: finalNodes,
    edges,
  };
};
