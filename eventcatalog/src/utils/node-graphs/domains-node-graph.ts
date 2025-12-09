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
import { createVersionedMap, findInMap } from '@utils/collections/util';
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

  // 1. Parallel Fetching
  const [allDomains, services, events, commands, queries] = await Promise.all([
    getCollection('domains'),
    getCollection('services'),
    getCollection('events'),
    getCollection('commands'),
    getCollection('queries'),
  ]);

  const domains = allDomains.filter((domain) => !domain.id.includes('/versioned'));
  const messages = [...events, ...commands, ...queries];

  // 2. Build optimized maps
  const serviceMap = createVersionedMap(services);
  const messageMap = createVersionedMap(messages);

  domains.forEach((domain, index) => {
    const nodeId = generateIdForNode(domain);
    const rawServices = domain.data.services ?? [];

    // Optimized service resolution
    const domainServices = rawServices
      .map((service) => findInMap(serviceMap, service.id, service.version))
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

    nodes.push({
      id: nodeId,
      type: 'group',
      position: {
        x: colIndex * (domainWidth + 400),
        y: rowIndex * (domainHeight + 300),
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

        // Optimized message resolution
        const receives = rawReceives
          .map((receive) => findInMap(messageMap, receive.id, receive.version))
          .filter((msg): msg is any => !!msg); // Filter undefined

        // Note: 'sends' was defined but not used in the original loop logic for edges?
        // Based on original code, it iterates `receives`.

        for (const receive of receives) {
          const producers = getProducersOfMessage(services, receive);

          for (const producer of producers) {
            const isSameDomain = domainServices.some((domainService) => domainService.data.id === producer.data.id);

            if (!isSameDomain) {
              edges.push(
                createEdge({
                  id: generatedIdForEdge(producer, service),
                  source: generateIdForNode(producer),
                  target: generateIdForNode(service),
                  label: getEdgeLabelForServiceAsTarget(receive),
                  zIndex: 1000,
                })
              );
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

  // 1. Parallel Fetching
  const [domains, services] = await Promise.all([getCollection('domains'), getCollection('services')]);

  const domain = domains.find((service) => service.data.id === id && service.data.version === version);

  // Nothing found...
  if (!domain) {
    return {
      nodes: [],
      edges: [],
    };
  }

  // 2. Build optimized maps
  const serviceMap = createVersionedMap(services);
  const domainMap = createVersionedMap(domains);

  const rawServices = domain?.data.services || [];
  const rawSubDomains = domain?.data.domains || [];

  // Optimized hydration
  const domainServicesWithVersion = rawServices
    .map((service) => findInMap(serviceMap, service.id, service.version))
    .filter((s): s is any => !!s)
    .map((svc) => ({ id: svc.data.id, version: svc.data.version }));

  const domainSubDomainsWithVersion = rawSubDomains
    .map((subDomain) => findInMap(domainMap, subDomain.id, subDomain.version))
    .filter((d): d is any => !!d)
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
