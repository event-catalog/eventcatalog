// Can't use the CollectionEntry type from astro:content  because a client component is using this util

import { MarkerType, Position, type Edge, type Node } from '@xyflow/react';
import dagre from 'dagre';
import { getItemsFromCollectionByIdAndSemverOrLatest } from '@utils/collections/util';
import { buildUrl } from '@utils/url-builder';
interface BaseCollectionData {
  id: string;
  version: string;
}

interface CollectionItem {
  collection: string;
  data: BaseCollectionData;
}

interface MessageCollectionItem extends CollectionItem {
  collection: 'commands' | 'events' | 'queries';
}

export const generateIdForNode = (node: CollectionItem) => {
  return `${node.data.id}-${node.data.version}`;
};
export const generateIdForNodes = (nodes: any) => {
  return nodes.map((node: any) => `${node.data.id}-${node.data.version}`).join('-');
};
export const generatedIdForEdge = (source: CollectionItem, target: CollectionItem) => {
  return `${source.data.id}-${source.data.version}-${target.data.id}-${target.data.version}`;
};

export const getColorFromString = (id: string) => {
  // Takes the given id (string) and returns a custom hex color based on the id
  // Create a hash from the string
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert the hash into a hex color
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += value.toString(16).padStart(2, '0');
  }

  return color;
};

export const getEdgeLabelForServiceAsTarget = (data: MessageCollectionItem) => {
  const type = data.collection;
  switch (type) {
    case 'commands':
      return 'invokes';
    case 'events':
      return 'publishes \nevent';
    case 'queries':
      return 'requests';
    default:
      return 'sends to';
  }
};
export const getEdgeLabelForMessageAsSource = (data: MessageCollectionItem, throughChannel = false) => {
  const type = data.collection;
  switch (type) {
    case 'commands':
      return 'accepts';
    case 'events':
      return throughChannel ? 'subscribed to' : 'subscribed by';
    case 'queries':
      return 'accepts';
    default:
      return 'sends to';
  }
};

export const calculatedNodes = (flow: dagre.graphlib.Graph, nodes: Node[]) => {
  return nodes.map((node: any) => {
    const { x, y } = flow.node(node.id);
    return { ...node, position: { x, y } };
  });
};

// Creates a new dagre graph
export const createDagreGraph = ({ ranksep = 180, nodesep = 50, ...rest }: any) => {
  const graph = new dagre.graphlib.Graph({ compound: true });
  graph.setGraph({ rankdir: 'LR', ranksep, nodesep, ...rest });
  graph.setDefaultEdgeLabel(() => ({}));
  return graph;
};

export const createEdge = (edgeOptions: Edge) => {
  return {
    label: 'subscribed by',
    animated: false,
    // markerStart: {
    //   type: MarkerType.Arrow,
    //   width: 20,
    //   height: 20,
    // },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
    },
    style: {
      strokeWidth: 1,
    },
    ...edgeOptions,
  };
};

export const createNode = (values: Node): Node => {
  return {
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    ...values,
  };
};

type DagreGraph = any;

type ContextMenuItem = {
  label: string;
  href: string;
  download?: string;
  external?: boolean;
  separator?: boolean;
};

export const buildContextMenuForMessage = ({
  id,
  version,
  name,
  collection,
  schemaPath,
}: {
  id: string;
  version: string;
  name: string;
  collection: string;
  schemaPath?: string;
}): ContextMenuItem[] => {
  const items: ContextMenuItem[] = [{ label: 'Read documentation', href: buildUrl(`/docs/${collection}/${id}/${version}`) }];

  if (schemaPath) {
    items.push({
      label: 'Download schema',
      href: buildUrl(`/generated/${collection}/${id}/${schemaPath}`, true),
      download: `${name}(${version})-${schemaPath}`,
      external: true,
      separator: true,
    });
  }

  items.push({
    label: 'Read changelog',
    href: buildUrl(`/docs/${collection}/${id}/${version}/changelog`),
    external: true,
    separator: !schemaPath,
  });

  return items;
};

export const buildContextMenuForService = ({
  id,
  version,
  specifications,
  repository,
}: {
  id: string;
  version: string;
  specifications?: { type: string; path: string }[];
  repository?: { url: string };
}): ContextMenuItem[] => {
  const items: ContextMenuItem[] = [{ label: 'Read documentation', href: buildUrl(`/docs/services/${id}/${version}`) }];

  if (specifications && Array.isArray(specifications)) {
    for (const spec of specifications) {
      const specType = spec.type?.toLowerCase() || '';
      let label = 'View specification';
      if (specType.includes('asyncapi')) label = 'View AsyncAPI spec';
      else if (specType.includes('openapi')) label = 'View OpenAPI spec';

      items.push({
        label,
        href: buildUrl(`/docs/services/${id}/${version}/spec/${spec.type}`),
        separator: items.length === 1,
      });
    }
  }

  if (repository?.url) {
    items.push({
      label: 'View code repository',
      href: repository.url,
      external: true,
      separator: true,
    });
  }

  items.push({
    label: 'Read changelog',
    href: buildUrl(`/docs/services/${id}/${version}/changelog`),
    external: true,
    separator: !repository?.url && (!specifications || specifications.length === 0),
  });

  return items;
};

export const buildContextMenuForResource = ({
  collection,
  id,
  version,
}: {
  collection: string;
  id: string;
  version: string;
}): ContextMenuItem[] => {
  return [
    { label: 'Read documentation', href: buildUrl(`/docs/${collection}/${id}/${version}`) },
    {
      label: 'Read changelog',
      href: buildUrl(`/docs/${collection}/${id}/${version}/changelog`),
      external: true,
      separator: true,
    },
  ];
};

export const getNodesAndEdgesFromDagre = ({
  nodes,
  edges,
  defaultFlow,
}: {
  nodes: Node[];
  edges: Edge[];
  defaultFlow?: DagreGraph;
}) => {
  const flow = defaultFlow || createDagreGraph({ ranksep: 300, nodesep: 50 });

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
