import type { CollectionEntry } from 'astro:content';
import type { Edge, Node } from '@xyflow/react';
import type { CollectionMessageTypes } from '@types';
import type { MessageTrigger } from '@utils/collections/message-triggers';
import {
  createEdge,
  createNode,
  generateIdForNode,
  generatedIdForEdge,
  getColorFromString,
  getEdgeLabelForMessageAsSource,
  getEdgeLabelForServiceAsTarget,
} from './utils/utils';
import { createTriggerMessageNode, getTriggerReceiverNodeData } from './message-node-graph';

type Message = CollectionEntry<CollectionMessageTypes>;

export type MessageLineageDirection = 'triggeredBy' | 'triggers';

export interface MessageLineageGraph {
  direction: MessageLineageDirection;
  condition?: string;
  source: Message;
  receiver: MessageTrigger['receiver'];
  target: Message;
  relatedMessage: Message;
  nodes: Node[];
  edges: Edge[];
}

export interface MessageLineageScenario {
  condition?: string;
}

export interface MessageLineageGroup extends Omit<MessageLineageGraph, 'condition'> {
  scenarios: MessageLineageScenario[];
}

const createLineageEdge = (source: any, target: any, label: string, colorMessage: Message): Edge =>
  createEdge({
    id: generatedIdForEdge(source, target),
    source: generateIdForNode(source),
    target: generateIdForNode(target),
    label,
    animated: false,
    data: {
      animated: false,
      customColor: getColorFromString(colorMessage.data.id),
      rootSourceAndTarget: {
        source: { id: generateIdForNode(source), collection: source.collection },
        target: { id: generateIdForNode(target), collection: target.collection },
      },
    },
  });

export const buildMessageLineageGraph = ({
  currentMessage,
  relation,
  direction,
}: {
  currentMessage: Message;
  relation: MessageTrigger;
  direction: MessageLineageDirection;
}): MessageLineageGraph => {
  const source = direction === 'triggeredBy' ? relation.message : currentMessage;
  const target = direction === 'triggeredBy' ? currentMessage : relation.message;
  const mode = 'simple';

  const nodes: Node[] = [
    {
      ...createTriggerMessageNode(source, mode, source === currentMessage),
      position: { x: 0, y: 0 },
    },
    createNode({
      id: generateIdForNode(relation.receiver),
      type: relation.receiver.collection,
      data: getTriggerReceiverNodeData(relation.receiver, mode),
      position: { x: 320, y: 0 },
    }),
    {
      ...createTriggerMessageNode(target, mode, target === currentMessage),
      position: { x: 640, y: 0 },
    },
  ];

  return {
    direction,
    condition: relation.condition,
    source,
    receiver: relation.receiver,
    target,
    relatedMessage: relation.message,
    nodes,
    edges: [
      createLineageEdge(source, relation.receiver, getEdgeLabelForMessageAsSource(source), source),
      createLineageEdge(relation.receiver, target, getEdgeLabelForServiceAsTarget(target), target),
    ],
  };
};

const getResourceKey = (resource: Message | MessageTrigger['receiver']) =>
  `${resource.collection}:${resource.data.id}:${resource.data.version}`;

export const groupMessageLineageGraphs = (graphs: MessageLineageGraph[]): MessageLineageGroup[] => {
  const groups = new Map<string, MessageLineageGroup>();

  for (const graph of graphs) {
    const key = [
      graph.direction,
      getResourceKey(graph.source),
      getResourceKey(graph.receiver),
      getResourceKey(graph.target),
    ].join('>');
    const existingGroup = groups.get(key);

    if (existingGroup) {
      if (!existingGroup.scenarios.some((scenario) => scenario.condition === graph.condition)) {
        existingGroup.scenarios.push({ condition: graph.condition });
      }
      continue;
    }

    const { condition, ...lineage } = graph;
    groups.set(key, {
      ...lineage,
      scenarios: [{ condition }],
    });
  }

  return [...groups.values()];
};
