import type { ReactFlowInstance, Node, ReactFlowJsonObject, Edge } from '@xyflow/react';

// Define the structure of resource data that can be found in nodes
interface ResourceData {
  id?: string;
  name?: string;
  summary?: string;
  version?: string;
}

// Define the possible node data structure
interface NodeDataWithResources {
  [key: string]: any;
  channel?: ResourceData;
  custom?: ResourceData;
  data?: ResourceData;
  domain?: ResourceData;
  entity?: ResourceData;
  message?: ResourceData;
  flow?: ResourceData;
  service?: ResourceData;
  step?: ResourceData;
  user?: ResourceData;
}

export const exportNodeGraphForStudio = (data: ReactFlowJsonObject) => {
  const dataTypes: (keyof NodeDataWithResources)[] = [
    'channel',
    'custom',
    'data',
    'domain',
    'entity',
    'message',
    'flow',
    'service',
    'step',
    'user',
  ];

  // try and remove unwanted data for studio
  const nodes = data.nodes.map((node: Node) => {
    let nodeData = node.data as NodeDataWithResources;
    const dataProperties = Object.keys(nodeData) as (keyof NodeDataWithResources)[];

    // If we find a match.....
    const hasCustomDataType = dataProperties.find((property) => dataTypes.includes(property));

    if (hasCustomDataType && nodeData[hasCustomDataType]) {
      const resourceData = nodeData[hasCustomDataType] as ResourceData;
      nodeData = {
        ...nodeData,
        [hasCustomDataType]: {
          id: resourceData?.id,
          name: resourceData?.name,
          summary: resourceData?.summary,
          version: resourceData?.version,
        },
      };
    }

    return {
      ...node,
      data: {
        ...nodeData,
        // We dont need these for studio
        source: undefined,
        target: undefined,
        // Studio wants all nodes in full mode
        mode: 'full',
      },
    };
  });

  const edges = data.edges.map((edge: Edge) => {
    return {
      ...edge,
      data: undefined,
      type: 'animatedMessage',
    };
  });

  return {
    ...data,
    nodes,
    edges,
  };
};
