// import { getColor } from '@utils/colors';
import { getCollection } from 'astro:content';
import dagre from 'dagre';
import { getVersion } from '../services/services';
import { createDagreGraph, calculatedNodes } from '@utils/node-graph-utils/utils';
import { MarkerType } from 'reactflow';

type DagreGraph = any;

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  renderAllEdges?: boolean;
}

export const getNodesAndEdges = async ({ id, defaultFlow, version, mode = 'simple', renderAllEdges = false }: Props) => {
  const graph = defaultFlow || createDagreGraph({ ranksep: 300, nodesep: 200 });
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
  const hydratedSteps = steps.map((step: any) => {
    const type = step.type || 'step';

    

    if (step.service) {
      const service = services.find(
        (service) => service.data.id === step.service.id && service.data.version === step.service.version
      );
      return {
        ...step,
        type: service ? service.collection : type,
        service,
      };
    }

    if (step.message) {
      const message = getVersion(messages, step.message.id, step.message.version);
      return {
        ...step,
        type: message ? message.collection : type,
        message,
      };
    }

    if (step.actor) {
      return {
        ...step,
        type: 'actor',
        actor: step.actor,
      };
    }

    if (step.externalSystem) {
      return {
        ...step,
        type: 'externalSystem',
        externalSystem: step.externalSystem,
      };
    }

    return { ...step, type: 'step' };
  });

  // Create nodes
  hydratedSteps.forEach((step, index: number) => {
    nodes.push({
      id: `step-${step.id}`,
      sourcePosition: 'right',
      targetPosition: 'left',
      data: {
        mode,
        step: step,
        message: step.message,
        service: step.service,
        actor: step.actor,
        externalSystem: step.externalSystem,
        showTarget: true,
        showSource: true,
      },
      position: { x: 250, y: index * 150 },
      type: step.type,
    });
  });


  // Create Edges
  hydratedSteps.forEach((step, index: number) => {
    const paths = step.paths || [];
    paths.forEach((path: any) => {
      edges.push({
        id: `step-${step.id}-step-${path.step}`,
        source: `step-${step.id}`,
        target: `step-${path.step}`,
        type: 'smoothstep',
        label: path.label,
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#742fca75',
        },
        style: {
          strokeWidth: 2,
          stroke: '#742fca75',
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
