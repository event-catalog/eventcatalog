import { getCollection, type CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import {
  createDagreGraph,
  generateIdForNode,
  generatedIdForEdge,
  calculatedNodes,
  createEdge,
  getColorFromString,
} from '@utils/node-graphs/utils/utils';

import { findInMap, createVersionedMap, mergeMaps, collectionToResourceMap } from '@utils/collections/util';
import { MarkerType } from '@xyflow/react';
import { getMessages, isCollectionAMessage } from '@utils/collections/messages';
import { getProducersOfMessage } from '@utils/collections/services';
import type { CollectionMessageTypes } from '@types';
import { getNodesAndEdgesForProducedMessage } from './message-node-graph';

type DagreGraph = any;

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
}

const getNodePropertyFromCollectionType = (type: string) => {
  if (isCollectionAMessage(type)) return 'message';
  if (type === 'containers') return 'data';
  return collectionToResourceMap[type as keyof typeof collectionToResourceMap];
};

export const getNodesAndEdges = async ({ id, defaultFlow, version, mode = 'simple' }: Props) => {
  const flow = defaultFlow || createDagreGraph({ ranksep: 300, nodesep: 50 });
  let nodes = [] as any,
    edges = [] as any;

  const [dataProducts, containers, services, events, queries, commands, channels] = await Promise.all([
    getCollection('data-products'),
    getCollection('containers'),
    getCollection('services'),
    getCollection('events'),
    getCollection('queries'),
    getCollection('commands'),
    getCollection('channels'),
  ]);

  const dataProduct = dataProducts.find((dp) => dp.data.id === id && dp.data.version === version);

  // Nothing found...
  if (!dataProduct) {
    return {
      nodes: [],
      edges: [],
    };
  }

  // Build maps for O(1) lookups
  const messages = [...events, ...commands, ...queries];

  const messageMap = createVersionedMap(messages);
  const containerMap = createVersionedMap(containers);
  const serviceMap = createVersionedMap(services);

  const inputsRaw = dataProduct?.data.inputs || [];
  const outputsRaw = dataProduct?.data.outputs || [];

  const resourceMap = mergeMaps<
    CollectionEntry<CollectionMessageTypes> | CollectionEntry<'services'> | CollectionEntry<'containers'>
  >(messageMap, serviceMap, containerMap);

  // Process inputs - messages, containers, services (etc)
  inputsRaw.forEach((inputConfig) => {
    let inputResource = findInMap(resourceMap, inputConfig.id, inputConfig.version) as
      | CollectionEntry<CollectionMessageTypes>
      | CollectionEntry<'services'>;

    const existingNode = nodes.find((n: any) => n.id === generateIdForNode(inputResource));

    if (!existingNode) {
      const nodeDataKey = getNodePropertyFromCollectionType(inputResource?.collection);

      nodes.push({
        id: generateIdForNode(inputResource),
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode, [nodeDataKey]: { ...inputResource?.data } },
        type: (inputResource?.collection as any) === 'containers' ? 'data' : inputResource?.collection,
      });
    }

    // If collection is a message we render the producers of the message
    if (isCollectionAMessage(inputResource?.collection)) {
      const producersOfMessage = getProducersOfMessage(
        services as CollectionEntry<'services'>[],
        inputResource as CollectionEntry<CollectionMessageTypes>
      ) as CollectionEntry<'services'>[];
      for (const producer of producersOfMessage) {
        const { nodes: producerNodes, edges: producerEdges } = getNodesAndEdgesForProducedMessage({
          message: inputResource as CollectionEntry<CollectionMessageTypes>,
          // We dont render any other services that consume this event for now
          services: [],
          // We dont render channels on this view for now...
          channels: [],
          currentNodes: nodes,
          currentEdges: edges,
          source: producer,
          mode,
        });

        nodes.push(...producerNodes);
        edges.push(...producerEdges);
      }
    }

    // // Try to find in messages first, then containers (auto-detect type)
    // let isContainer = false;

    // if (!resource) {
    //   resource = findInMap(containerMap, inputConfig.id, inputConfig.version);
    //   isContainer = !!resource;
    // }

    // if (!resource) return;

    // // Add the node (message or container)
    // const existingNode = nodes.find((n: any) => n.id === generateIdForNode(resource));
    // if (!existingNode) {
    //   if (isContainer) {
    //     nodes.push({
    //       id: generateIdForNode(resource),
    //       sourcePosition: 'right',
    //       targetPosition: 'left',
    //       data: { mode, data: { ...resource.data } },
    //       type: 'data',
    //     });
    //   } else {
    //     nodes.push({
    //       id: generateIdForNode(resource),
    //       sourcePosition: 'right',
    //       targetPosition: 'left',
    //       data: { mode, message: { ...resource.data } },
    //       type: resource.collection,
    //     });
    //   }
    // }

    // Add edge from resource to data product
    edges.push(
      createEdge({
        id: generatedIdForEdge(inputResource, dataProduct),
        source: generateIdForNode(inputResource),
        target: generateIdForNode(dataProduct),
        label: 'input',
        type: 'animated',
        data: {
          customColor: getColorFromString(inputResource.data.id),
          rootSourceAndTarget: { source: inputResource, target: dataProduct },
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#666',
          width: 40,
          height: 40,
        },
      })
    );

    // // If there are source services specified in the config, add them
    // fromServices.forEach((fromService) => {
    //   const service = findInMap(serviceMap, fromService.id, fromService.version);
    //   if (service) {
    //     // Check if node already exists
    //     const existingServiceNode = nodes.find((n: any) => n.id === generateIdForNode(service));
    //     if (!existingServiceNode) {
    //       nodes.push({
    //         id: generateIdForNode(service),
    //         sourcePosition: 'right',
    //         targetPosition: 'left',
    //         data: { mode, service: { ...service.data } },
    //         type: 'services',
    //       });
    //     }

    //     // Add edge from service to resource
    //     edges.push(
    //       createEdge({
    //         id: generatedIdForEdge(service, resource),
    //         source: generateIdForNode(service),
    //         target: generateIdForNode(resource),
    //         label: 'publishes',
    //         type: 'multiline',
    //         markerEnd: {
    //           type: MarkerType.ArrowClosed,
    //           color: '#666',
    //           width: 40,
    //           height: 40,
    //         },
    //       })
    //     );
    //   }
    // });

    // // For messages, use the hydrated producers field
    // if (!isContainer) {
    //   const producers = (resource.data as any).producers || [];
    //   producers.forEach((producer: any) => {
    //     const existingServiceNode = nodes.find((n: any) => n.id === generateIdForNode(producer));
    //     if (!existingServiceNode) {
    //       nodes.push({
    //         id: generateIdForNode(producer),
    //         sourcePosition: 'right',
    //         targetPosition: 'left',
    //         data: { mode, service: { ...producer.data } },
    //         type: 'services',
    //       });
    //     }

    //     edges.push(
    //       createEdge({
    //         id: generatedIdForEdge(producer, resource),
    //         source: generateIdForNode(producer),
    //         target: generateIdForNode(resource),
    //         label: 'publishes',
    //         type: 'multiline',
    //         markerEnd: {
    //           type: MarkerType.ArrowClosed,
    //           color: '#666',
    //           width: 40,
    //           height: 40,
    //         },
    //       })
    //     );
    //   });
    // }
  });

  // The data product itself
  nodes.push({
    id: generateIdForNode(dataProduct),
    sourcePosition: 'right',
    targetPosition: 'left',
    data: { mode, dataProduct: { ...dataProduct.data } },
    type: 'data-products',
  });

  // Process outputs - messages, services, containers that the data product produces
  outputsRaw.forEach((outputConfig) => {
    // Find the output resource (can be message, service, or container)
    const outputResource = findInMap(resourceMap, outputConfig.id, outputConfig.version) as
      | CollectionEntry<CollectionMessageTypes>
      | CollectionEntry<'services'>
      | CollectionEntry<'containers'>;

    if (!outputResource) return;

    // Add the node if it doesn't exist
    const existingNode = nodes.find((n: any) => n.id === generateIdForNode(outputResource));
    if (!existingNode) {
      const nodeDataKey = getNodePropertyFromCollectionType(outputResource?.collection);

      nodes.push({
        id: generateIdForNode(outputResource),
        sourcePosition: 'right',
        targetPosition: 'left',
        data: { mode, [nodeDataKey]: { ...outputResource?.data } },
        type: (outputResource?.collection as any) === 'containers' ? 'data' : outputResource?.collection,
      });
    }

    // Add edge from data product to the output resource
    edges.push(
      createEdge({
        id: generatedIdForEdge(dataProduct, outputResource),
        source: generateIdForNode(dataProduct),
        target: generateIdForNode(outputResource),
        label: 'output',
        type: 'animated',
        data: {
          customColor: getColorFromString(outputResource.data.id),
          rootSourceAndTarget: { source: dataProduct, target: outputResource },
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#666',
          width: 40,
          height: 40,
        },
      })
    );
  });

  nodes.forEach((node: any) => {
    flow.setNode(node.id, { width: 150, height: 100 });
  });

  edges.forEach((edge: any) => {
    flow.setEdge(edge.source, edge.target);
  });

  // Render the diagram in memory getting the X and Y
  dagre.layout(flow);

  // Find any duplicated edges, and merge them into one edge
  const uniqueEdges = edges.reduce((acc: any[], edge: any) => {
    const existingEdge = acc.find((e: any) => e.id === edge.id);
    if (!existingEdge) {
      acc.push(edge);
    }
    return acc;
  }, []);

  return {
    nodes: calculatedNodes(flow, nodes),
    edges: uniqueEdges,
  };
};
