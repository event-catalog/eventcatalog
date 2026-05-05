export type GraphNode = {
  id: string;
  type?: string;
  parentId?: string;
  position: {
    x: number;
    y: number;
  };
  style?: {
    width?: number | string;
    height?: number | string;
  };
  [key: string]: unknown;
};

export const getExpandedMessageGroupNode = (
  nodes: GraphNode[],
  groupNodeId: string,
) =>
  nodes.find(
    (node) => node.id === groupNodeId && node.type === "messageGroupExpanded",
  );

export const buildMessageGroupExpansionNodes = ({
  currentNodes,
  groupNodeId,
  expandedContainerNode,
  childNodes,
  downstreamNodes,
  getDownstreamPosition,
}: {
  currentNodes: GraphNode[];
  groupNodeId: string;
  expandedContainerNode: GraphNode;
  childNodes: GraphNode[];
  downstreamNodes: GraphNode[];
  getDownstreamPosition: (
    node: GraphNode,
    index: number,
  ) => GraphNode["position"];
}) => {
  const withoutExistingGroup = currentNodes.filter(
    (node) => node.id !== groupNodeId && node.parentId !== groupNodeId,
  );
  const existingIds = new Set(withoutExistingGroup.map((node) => node.id));
  const newDownstream = downstreamNodes
    .filter((node) => !existingIds.has(node.id))
    .map((node, index) => ({
      ...node,
      position: getDownstreamPosition(node, index),
    }));

  return [
    ...withoutExistingGroup,
    expandedContainerNode,
    ...childNodes,
    ...newDownstream,
  ];
};
