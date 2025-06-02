import { getCollection } from 'astro:content';
import {
  createDagreGraph,
  calculatedNodes,
  generateIdForNode,
  getEdgeLabelForServiceAsTarget,
  generatedIdForEdge,
  createEdge,
} from '@utils/node-graphs/utils/utils';
import { getNodesAndEdges as getServicesNodeAndEdges } from './services-node-graph';
import merge from 'lodash.merge';
import { getItemsFromCollectionByIdAndSemverOrLatest } from '@utils/collections/util';
import type { Node } from '@xyflow/react';
import { getProducersOfMessage } from '@utils/collections/services';

type DagreGraph = any;

interface Props {
  defaultFlow?: DagreGraph;
  channelRenderMode?: 'single' | 'flat';
}

export const getNodesAndEdgesForDomainContextMap = async ({ defaultFlow = null }: Props) => {
  const flow = defaultFlow ?? createDagreGraph({ ranksep: 360, nodesep: 50, edgesep: 50 });
  let nodes = [] as any,
    edges = [] as any;

  const allDomains = await getCollection('domains');
  const domains = allDomains.filter((domain) => !domain.id.includes('/versioned'));
  const services = await getCollection('services');

  const events = await getCollection('events');
  const commands = await getCollection('commands');
  const queries = await getCollection('queries');

  const messages = [...events, ...commands, ...queries];

  domains.forEach((domain, index) => {
    const nodeId = generateIdForNode(domain);
    const rawServices = domain.data.services ?? [];
    const domainServices = rawServices
      .map((service) => getItemsFromCollectionByIdAndSemverOrLatest(services, service.id, service.version))
      .flat()
      .filter((e) => e !== undefined);

    // Calculate domain node size based on services
    const servicesCount = domainServices.length;
    const SERVICES_PER_ROW = 1;
    const SERVICE_WIDTH = 330;
    const SERVICE_HEIGHT = 100;
    const PADDING = 40;
    const TITLE_HEIGHT = 20;

    const rows = Math.ceil(servicesCount / SERVICES_PER_ROW);
    const domainWidth = SERVICE_WIDTH * SERVICES_PER_ROW;
    const domainHeight = SERVICE_HEIGHT * rows + PADDING * 4;

    // Position domains in a grid layout
    const DOMAINS_PER_ROW = 2;
    const rowIndex = Math.floor(index / DOMAINS_PER_ROW);
    const colIndex = index % DOMAINS_PER_ROW;

    const test = servicesCount * SERVICE_HEIGHT + PADDING * 2;

    nodes.push({
      id: nodeId,
      type: 'group',
      position: {
        x: colIndex * (domainWidth + 400), // Increased from 100 to 400px gap between domains
        y: rowIndex * (domainHeight + 300), // Increased from 100 to 300px gap between rows
      },
      style: {
        width: domainWidth,
        height: domainHeight,
        backgroundColor: 'transparent',
        borderRadius: '8px',
        border: '1px solid #ddd',
        'box-shadow': '0 0 10px 0 rgba(0, 0, 0, 0.1)',
      },
      data: {
        label: domain.data.name,
        domain,
      },
    });

    nodes.push({
      id: `domain-context-map-title-${domain.data.name}`,
      data: { label: `Bounded Context: ${domain.data.name}` },
      position: { x: 0, y: 0 },
      style: {
        height: 40,
        backgroundColor: 'transparent',
        border: 'none',
        color: 'black',
        width: domainWidth,
      },
      extent: 'parent',
      parentId: nodeId,
      connectable: false,
      sourcePosition: 'left',
      targetPosition: 'right',
      draggable: false,
    } as Node);

    // Position services in a grid within the domain
    if (domainServices) {
      domainServices.forEach((service, serviceIndex) => {
        const row = Math.floor(serviceIndex / SERVICES_PER_ROW);
        const col = serviceIndex % SERVICES_PER_ROW;
        const serviceNodeId = `service-${domain.id}-${service.id}`;

        // Add spacing between services
        const SERVICE_MARGIN = 25;
        const xPosition = PADDING + col * (SERVICE_WIDTH + SERVICE_MARGIN) + 20;
        const yPosition = PADDING + row * (SERVICE_HEIGHT + SERVICE_MARGIN) + TITLE_HEIGHT;

        nodes.push({
          id: generateIdForNode(service),
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'services',
          position: {
            x: xPosition,
            y: yPosition,
          },
          parentId: nodeId,
          extent: 'parent',
          draggable: false,
          data: {
            mode: 'full',
            service,
          },
        });

        // Edges
        const rawReceives = service.data.receives ?? [];
        const rawSends = service.data.sends ?? [];

        const receives = rawReceives
          .map((receive) => getItemsFromCollectionByIdAndSemverOrLatest(messages, receive.id, receive.version))
          .flat();
        const sends = rawSends.map((send) => getItemsFromCollectionByIdAndSemverOrLatest(messages, send.id, send.version)).flat();

        for (const receive of receives) {
          const producers = getProducersOfMessage(services, receive);

          for (const producer of producers) {
            const isSameDomain = domainServices.some((domainService) => domainService.data.id === producer.data.id);

            if (!isSameDomain) {
              // WIP... adding messages?
              // edges.push(createEdge({
              //   id: generatedIdForEdge(receive, service),
              //   source: generateIdForNode(receive),
              //   target: generateIdForNode(service),
              //   label: getEdgeLabelForServiceAsTarget(receive),
              //   zIndex: 1000,
              // }));

              // Find the producer and consumer nodes to get their positions
              // const producerNode = nodes.find(n => n.id === generateIdForNode(producer));
              // const consumerNode = nodes.find(n => n.id === generateIdForNode(service));

              edges.push(
                createEdge({
                  id: generatedIdForEdge(producer, service),
                  source: generateIdForNode(producer),
                  target: generateIdForNode(service),
                  label: getEdgeLabelForServiceAsTarget(receive),
                  zIndex: 1000,
                })
              );

              // // Calculate middle position between producer and consumer
              // const messageX = (producerNode?.position?.x ?? 0) +
              //   ((consumerNode?.position?.x ?? 0) - (producerNode?.position?.x ?? 0)) / 2;
              // const messageY = (producerNode?.position?.y ?? 0) +
              //   ((consumerNode?.position?.y ?? 0) - (producerNode?.position?.y ?? 0)) / 2;

              // nodes.push({
              //   id: generateIdForNode(receive),
              //   type: receive.collection,
              //   sourcePosition: 'right',
              //   targetPosition: 'left',
              //   data: {
              //     message: receive,
              //     mode: 'full',
              //   },
              //   position: { x: messageX, y: messageY },
              // });

              // edges.push(createEdge({
              //   id: generatedIdForEdge(producer, receive),
              //   source: generateIdForNode(producer),
              //   target: generateIdForNode(receive),
              //   label: getEdgeLabelForServiceAsTarget(receive),
              //   zIndex: 1000,
              // }));
            }
          }
        }
      });
    }
  });

  return {
    nodes,
    edges,
  };
};

interface NodesAndEdgesProps {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode: 'simple' | 'full';
  group?: boolean;
  channelRenderMode?: 'single' | 'flat';
}

export const getNodesAndEdges = async ({
  id,
  version,
  defaultFlow,
  mode = 'simple',
  group = false,
  channelRenderMode = 'flat',
}: NodesAndEdgesProps) => {
  const flow = defaultFlow || createDagreGraph({ ranksep: 360, nodesep: 50, edgesep: 50 });
  let nodes = new Map(),
    edges = new Map();

  const domains = await getCollection('domains');

  const domain = domains.find((service) => service.data.id === id && service.data.version === version);

  // Nothing found...
  if (!domain) {
    return {
      nodes: [],
      edges: [],
    };
  }

  const rawServices = domain?.data.services || [];
  const rawSubDomains = domain?.data.domains || [];

  const servicesCollection = await getCollection('services');

  const domainServicesWithVersion = rawServices
    .map((service) => getItemsFromCollectionByIdAndSemverOrLatest(servicesCollection, service.id, service.version))
    .flat()
    .map((svc) => ({ id: svc.data.id, version: svc.data.version }));

  const domainSubDomainsWithVersion = rawSubDomains
    .map((subDomain) => getItemsFromCollectionByIdAndSemverOrLatest(domains, subDomain.id, subDomain.version))
    .flat()
    .map((svc) => ({ id: svc.data.id, version: svc.data.version }));

  // Get all the nodes for everyhing

  for (const service of domainServicesWithVersion) {
    const { nodes: serviceNodes, edges: serviceEdges } = await getServicesNodeAndEdges({
      id: service.id,
      version: service.version,
      defaultFlow: flow,
      mode,
      renderAllEdges: true,
      channelRenderMode,
    });
    serviceNodes.forEach((n) => {
      /**
       * A message could be sent by one service and received by another service on the same domain.
       * So, we need deep merge the message to keep the `showSource` and `showTarget` as true.
       *
       * Let's see an example:
       *  Take an `OrderPlaced` event sent by the `OrderService` `{ showSource: true }` and
       *  received by `PaymentService` `{ showTarget: true }`.
       */
      nodes.set(n.id, nodes.has(n.id) ? merge(nodes.get(n.id), n) : n);
    });
    // @ts-ignore
    serviceEdges.forEach((e) => edges.set(e.id, e));
  }

  for (const subDomain of domainSubDomainsWithVersion) {
    const { nodes: subDomainNodes, edges: subDomainEdges } = await getNodesAndEdges({
      id: subDomain.id,
      version: subDomain.version,
      defaultFlow: flow,
      mode,
      group: true,
      channelRenderMode,
    });
    subDomainNodes.forEach((n) => {
      nodes.set(n.id, nodes.has(n.id) ? merge(nodes.get(n.id), n) : n);
    });

    subDomainEdges.forEach((e) => edges.set(e.id, e));
  }

  // Add group node to the graph first before calculating positions
  if (group) {
    // Update the data of the node to add the group name and color
    nodes.forEach((n) => {
      nodes.set(n.id, { ...n, data: { ...n.data, group: { type: 'Domain', value: domain?.data.name, id: domain?.data.id } } });
    });
  }

  return {
    nodes: calculatedNodes(flow, Array.from(nodes.values())),
    edges: [...edges.values()],
  };
};
