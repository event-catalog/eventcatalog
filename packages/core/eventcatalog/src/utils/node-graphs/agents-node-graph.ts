import { getNodesAndEdges as getServiceLikeNodesAndEdges } from './services-node-graph';

export const getNodesAndEdges = (props: Parameters<typeof getServiceLikeNodesAndEdges>[0]) =>
  getServiceLikeNodesAndEdges({ ...props, collection: 'agents' });
