import { getCollection, type CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import { createDagreGraph, calculatedNodes } from '@utils/node-graphs/utils/utils';
import { MarkerType } from '@xyflow/react';
import type { Node as NodeType } from '@xyflow/react';
import { getItemsFromCollectionByIdAndSemverOrLatest } from '@utils/collections/util';

type DagreGraph = any;

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  renderAllEdges?: boolean;
}

const getServiceNode = (step: any, services: CollectionEntry<'services'>[]) => {
  const servicesForVersion = getItemsFromCollectionByIdAndSemverOrLatest(services, step.service.id, step.service.version);
  const service = servicesForVersion?.[0];
  return {
    ...step,
    type: service ? service.collection : 'step',
    service,
  };
};

const getFlowNode = (step: any, flows: CollectionEntry<'flows'>[]) => {
  const flowsForVersion = getItemsFromCollectionByIdAndSemverOrLatest(flows, step.flow.id, step.flow.version);
  const flow = flowsForVersion?.[0];
  return {
    ...step,
    type: flow ? flow.collection : 'step',
    flow,
  };
};

const getMessageNode = (step: any, messages: CollectionEntry<'events' | 'commands' | 'queries'>[]) => {
  const messagesForVersion = getItemsFromCollectionByIdAndSemverOrLatest(messages, step.message.id, step.message.version);
  const message = messagesForVersion[0];
  return {
    ...step,
    type: message ? message.collection : 'step',
    message,
  };
};

export const getNodesAndEdges = async ({ id, defaultFlow, version, mode = 'simple', renderAllEdges = false }: Props) => {
  const graph = defaultFlow || createDagreGraph({ ranksep: 360, nodesep: 200 });
  const nodes = [] as any,
    edges = [] as any;

  const flows = await getCollection('flows');
  const flow = flows.find((flow) => flow.data.id === id && flow.data.version === version);

  // Nothing found...
  if (!flow) {
    return {
      nodes: [],
      edges: [],
    };
  }

  const events = await getCollection('events');
  const commands = await getCollection('commands');
  const queries = await getCollection('queries');
  const services = await getCollection('services');

  const messages = [...events, ...commands, ...queries];

  const steps = flow?.data.steps || [];

  //  Hydrate the steps with information they may need.
  const hydratedSteps = steps.map((step: any) => {
    if (step.service) return getServiceNode(step, services);
    if (step.flow) return getFlowNode(step, flows);
    if (step.message) return getMessageNode(step, messages);
    if (step.actor) return { ...step, type: 'actor', actor: step.actor };
    if (step.custom) return { ...step, type: 'custom', custom: step.custom };
    if (step.externalSystem) return { ...step, type: 'externalSystem', externalSystem: step.externalSystem };
    return { ...step, type: 'step' };
  });

  // Create nodes
  hydratedSteps.forEach((step: any, index: number) => {
    const node = {
      id: `step-${step.id}`,
      sourcePosition: 'right',
      targetPosition: 'left',
      data: {
        mode,
        step: { ...step, ...step.data },
        showTarget: true,
        showSource: true,
      },
      position: { x: 250, y: index * 150 },
      type: step.type,
    } as NodeType;

    if (step.service) node.data.service = { ...step.service, ...step.service.data };
    if (step.flow) node.data.flow = { ...step.flow, ...step.flow.data };
    if (step.message) node.data.message = { ...step.message, ...step.message.data };
    if (step.actor) node.data.actor = { ...step.actor, ...step.actor.data };
    if (step.externalSystem) node.data.externalSystem = { ...step.externalSystem, ...step.externalSystem.data };
    if (step.custom) node.data.custom = { ...step.custom, ...step.custom.data };
    nodes.push(node);
  });

  // Create Edges
  hydratedSteps.forEach((step: any, index: number) => {
    let paths = step.next_steps || [];

    if (step.next_step) {
      // If its a string or number
      if (!step.next_step?.id) {
        paths = [{ id: step.next_step }];
      } else {
        paths = [step.next_step];
      }
    }

    paths = paths.map((path: any) => {
      if (typeof path === 'string') {
        return { id: path };
      }
      return path;
    });

    paths.forEach((path: any) => {
      edges.push({
        id: `step-${step.id}-step-${path.id}`,
        source: `step-${step.id}`,
        target: `step-${path.id}`,
        type: 'flow-edge',
        label: path.label,
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#666',
        },
        style: {
          strokeWidth: 2,
          stroke: '#ccc',
        },
      });
    });
  });

  nodes.forEach((node: any) => {
    graph.setNode(node.id, { width: 150, height: 100 });
  });

  edges.forEach((edge: any) => {
    graph.setEdge(edge.source, edge.target);
  });

  // Render the diagram in memory getting hte X and Y
  dagre.layout(graph);

  return {
    nodes: calculatedNodes(graph, nodes),
    edges: edges,
  };
};
