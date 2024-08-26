import { getCollection, type CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import { createDagreGraph, calculatedNodes } from '@utils/node-graph-utils/utils';
import { MarkerType } from 'reactflow';
import type { Node as NodeType } from 'reactflow';
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
  const service = services.find(
    (service) => service.data.id === step.service.id && service.data.version === step.service.version
  );
  return {
    ...step,
    type: service ? service.collection : 'step',
    service,
  };
};

const getMessageNode = (step: any, messages: CollectionEntry<'events' | 'commands'>[]) => {
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
  const services = await getCollection('services');

  const messages = [...events, ...commands];

  const steps = flow?.data.steps || [];

  //  Hydrate the steps with information they may need.
  const hydratedSteps = steps.map((step: any) => {
    if (step.service) return getServiceNode(step, services);
    if (step.message) return getMessageNode(step, messages);
    if (step.actor) return { ...step, type: 'actor', actor: step.actor };
    if (step.externalSystem) return { ...step, type: 'externalSystem', externalSystem: step.externalSystem };
    return { ...step, type: 'step' };
  });

  // Create nodes
  hydratedSteps.forEach((step, index: number) => {
    const node = {
      id: `step-${step.id}`,
      sourcePosition: 'right',
      targetPosition: 'left',
      data: {
        mode,
        step: step,
        showTarget: true,
        showSource: true,
      },
      position: { x: 250, y: index * 150 },
      type: step.type,
    } as NodeType;

    if (step.service) node.data.service = step.service;
    if (step.message) node.data.message = step.message;
    if (step.actor) node.data.actor = step.actor;
    if (step.externalSystem) node.data.externalSystem = step.externalSystem;

    nodes.push(node);
  });

  // Create Edges
  hydratedSteps.forEach((step, index: number) => {
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
        type: 'smoothstep',
        label: path.label,
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#acacac',
        },
        style: {
          strokeWidth: 2,
          stroke: '#acacac',
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
