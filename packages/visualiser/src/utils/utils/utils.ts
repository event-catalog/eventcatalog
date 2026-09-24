// Can't use the CollectionEntry type from astro:content  because a client component is using this util

import { MarkerType, Position, type Edge, type Node } from "@xyflow/react";

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

/**
 * Rough size of an edge label, so the layout can leave room for it on its edge
 */
export const getEdgeLabelSize = (label: unknown) => {
  if (typeof label !== "string" || !label.trim())
    return { width: 0, height: 0 };
  const lines = label.split("\n");
  const longestLine = Math.max(...lines.map((line) => line.trim().length));
  return { width: longestLine * 6 + 20, height: lines.length * 14 + 12 };
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
