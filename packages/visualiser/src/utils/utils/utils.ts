// Can't use the CollectionEntry type from astro:content  because a client component is using this util

import { MarkerType, Position, type Edge, type Node } from "@xyflow/react";
import dagre from "dagre";
// TODO: versionMatchesUtil was imported from @utils/collections/util in core — need to verify this works in the standalone visualiser package
import { getItemsFromCollectionByIdAndSemverOrLatest, versionMatches as versionMatchesUtil } from '@utils/collections/util';
interface BaseCollectionData {
  id: string;
  version: string;
}

interface CollectionItem {
  collection: string;
  data: BaseCollectionData;
}

interface MessageCollectionItem extends CollectionItem {
  collection: "commands" | "events" | "queries";
}

/**
 * Helper function to match versions in message routing configuration.
 * Determines if a service's accepted version pattern matches an actual message version.
 *
 * Supports multiple matching strategies:
 * - 'latest' or undefined acceptedVersion matches any actual message version
 * - Exact version matching (1.0.0 === 1.0.0)
 * - Semver ranges (^1.0.0, ~1.2.0, >=1.0.0 <2.0.0)
 * - X-patterns (1.x, 1.2.x, 2.x)
 *
 * Matching is one-way: acceptedVersion can contain patterns (what a service declares
 * it works with), whilst actualMessageVersion must be a specific version (the actual
 * catalogued message version).
 *
 * @param acceptedVersion - The version pattern a service declares (in sends/receives config)
 * @param actualMessageVersion - The specific version of the actual catalogued message
 * @returns true if the actual message version satisfies the accepted version pattern
 */
export const versionMatches = (acceptedVersion: string | undefined, actualMessageVersion: string | undefined): boolean => {
  // If acceptedVersion is undefined or 'latest', it matches any message version
  if (!acceptedVersion || acceptedVersion === 'latest') return true;

  // If message has no version or 'latest', only match with acceptedVersion 'latest' or undefined
  if (!actualMessageVersion || actualMessageVersion === 'latest') {
    return !acceptedVersion || acceptedVersion === 'latest';
  }

  // Delegate to generic utility
  return versionMatchesUtil(actualMessageVersion, acceptedVersion);
};

export const generateIdForNode = (node: CollectionItem) => {
  return `${node.data.id}-${node.data.version}`;
};
export const generateIdForNodes = (nodes: any) => {
  return nodes
    .map((node: any) => `${node.data.id}-${node.data.version}`)
    .join("-");
};
export const generatedIdForEdge = (
  source: CollectionItem,
  target: CollectionItem,
) => {
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
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += value.toString(16).padStart(2, "0");
  }

  return color;
};

export const getEdgeLabelForServiceAsTarget = (data: MessageCollectionItem) => {
  const type = data.collection;
  switch (type) {
    case "commands":
      return "invokes";
    case "events":
      return "publishes \nevent";
    case "queries":
      return "requests";
    default:
      return "sends to";
  }
};
export const getEdgeLabelForMessageAsSource = (
  data: MessageCollectionItem,
  throughChannel = false,
) => {
  const type = data.collection;
  switch (type) {
    case "commands":
      return "accepts";
    case "events":
      return throughChannel ? "subscribed to" : "subscribed by";
    case "queries":
      return "accepts";
    default:
      return "sends to";
  }
};

export const calculatedNodes = (flow: dagre.graphlib.Graph, nodes: Node[]) => {
  return nodes.map((node: any) => {
    const { x, y } = flow.node(node.id);
    return { ...node, position: { x, y } };
  });
};

// Creates a new dagre graph
export const createDagreGraph = ({
  ranksep = 180,
  nodesep = 50,
  ...rest
}: any) => {
  const graph = new dagre.graphlib.Graph({ compound: true });
  graph.setGraph({ rankdir: "LR", ranksep, nodesep, ...rest });
  graph.setDefaultEdgeLabel(() => ({}));
  return graph;
};

export const createEdge = (edgeOptions: Edge): Edge => {
  return {
    label: "subscribed by",
    animated: false,
    // markerStart: {
    //   type: MarkerType.Arrow,
    //   width: 40,
    //   height: 40,
    // },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 40,
      height: 40,
      color: "rgb(var(--ec-page-text-muted))",
    },
    style: {
      strokeWidth: 1.5,
      stroke: "rgb(var(--ec-page-text-muted))",
      strokeDasharray: "5 5",
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
