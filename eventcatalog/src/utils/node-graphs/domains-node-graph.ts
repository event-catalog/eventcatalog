import { getCollection } from 'astro:content';
import {
  createDagreGraph,
  calculatedNodes,
  generateIdForNode,
  createNode,
  getEdgeLabelForServiceAsTarget,
  generatedIdForEdge,
  createEdge,
} from '@utils/node-graphs/utils/utils';
import { getNodesAndEdges as getServicesNodeAndEdges } from './services-node-graph';
import merge from 'lodash.merge';
import { getItemsFromCollectionByIdAndSemverOrLatest } from '@utils/collections/util';
import type { Node, Edge } from '@xyflow/react';
import { getProducersOfMessage } from '@utils/collections/services';

type DagreGraph = any;

interface Props {
  defaultFlow?: DagreGraph;
}

export const getNodesAndEdgesForDomainContextMap = async ({ defaultFlow = null }: Props) => {
  const flow = defaultFlow ?? createDagreGraph({ ranksep: 500, nodesep: 100, edgesep: 80 });
  let nodes = [] as any,
    edges = [] as any;
    
  // Get all collections
  const allDomains = await getCollection('domains');
  const domains = allDomains.filter((domain) => !domain.id.includes('/versioned'));
  const services = await getCollection('services');

  const events = await getCollection('events');
  const commands = await getCollection('commands');
  const queries = await getCollection('queries');

  const messages = [...events, ...commands, ...queries];
  
  // Track domain connections for better layout
  const domainConnections = new Map<string, Set<string>>();
  
  // First pass: Analyze domain connections through services and messages
  domains.forEach((domain) => {
    const rawServices = domain.data.services ?? [];
    const domainServices = rawServices
      .map((service) => getItemsFromCollectionByIdAndSemverOrLatest(services, service.id, service.version))
      .flat()
      .filter((e) => e !== undefined);
      
    domainConnections.set(domain.data.id, new Set());
    
    domainServices.forEach((service) => {
      const rawReceives = service.data.receives ?? [];
      const receives = rawReceives
        .map((receive) => getItemsFromCollectionByIdAndSemverOrLatest(messages, receive.id, receive.version))
        .flat();
        
      for (const receive of receives) {
        const producers = getProducersOfMessage(services, receive);
        
        for (const producer of producers) {
          // Find the domain of this producer
          for (const otherDomain of domains) {
            const otherRawServices = otherDomain.data.services ?? [];
            const otherDomainServices = otherRawServices
              .map((svc) => getItemsFromCollectionByIdAndSemverOrLatest(services, svc.id, svc.version))
              .flat()
              .filter((e) => e !== undefined);
              
            if (otherDomainServices.some(svc => svc.data.id === producer.data.id) && 
                otherDomain.data.id !== domain.data.id) {
              domainConnections.get(domain.data.id)?.add(otherDomain.data.id);
              if (!domainConnections.has(otherDomain.data.id)) {
                domainConnections.set(otherDomain.data.id, new Set());
              }
              domainConnections.get(otherDomain.data.id)?.add(domain.data.id);
            }
          }
        }
      }
    });
  });
  
  // Calculate optimal layout for domains based on connections
  const domainsWithConnectionCount = domains.map(domain => ({
    domain,
    connectionCount: domainConnections.get(domain.data.id)?.size || 0
  }));
  
  // Sort domains by number of connections (most connected first)
  domainsWithConnectionCount.sort((a, b) => b.connectionCount - a.connectionCount);
  
  // Set up a grid layout with more optimized spacing
  const DOMAINS_PER_ROW = Math.ceil(Math.sqrt(domains.length));
  const MAX_SERVICE_WIDTH = 350;
  const MAX_SERVICE_HEIGHT = 120;
  const DOMAIN_PADDING = 50;
  const DOMAIN_MARGIN_X = 500;
  const DOMAIN_MARGIN_Y = 400;

  // Second pass: Create nodes for domains and services
  domainsWithConnectionCount.forEach(({ domain }, index) => {
    const nodeId = generateIdForNode(domain);
    const rawServices = domain.data.services ?? [];
    const domainServices = rawServices
      .map((service) => getItemsFromCollectionByIdAndSemverOrLatest(services, service.id, service.version))
      .flat()
      .filter((e) => e !== undefined);

    // Calculate domain node size based on services
    const servicesCount = domainServices.length || 1; // At least 1 to show empty domains
    const SERVICES_PER_ROW = Math.min(2, servicesCount); // Max 2 services per row
    const SERVICE_WIDTH = MAX_SERVICE_WIDTH;
    const SERVICE_HEIGHT = MAX_SERVICE_HEIGHT;
    const PADDING = DOMAIN_PADDING;

    const cols = Math.min(SERVICES_PER_ROW, servicesCount);
    const rows = Math.ceil(servicesCount / SERVICES_PER_ROW);
    
    const domainWidth = SERVICE_WIDTH * cols + PADDING * 2;
    const domainHeight = SERVICE_HEIGHT * rows + PADDING * 2;

    // Position domains in a grid layout
    const rowIndex = Math.floor(index / DOMAINS_PER_ROW);
    const colIndex = index % DOMAINS_PER_ROW;

    nodes.push({
      id: nodeId,
      type: 'group',
      position: {
        x: colIndex * (domainWidth + DOMAIN_MARGIN_X),
        y: rowIndex * (domainHeight + DOMAIN_MARGIN_Y),
      },
      style: {
        width: domainWidth,
        height: domainHeight,
        backgroundColor: 'rgba(248, 250, 252, 0.8)',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
        'box-shadow': '0 4px 12px 0 rgba(0, 0, 0, 0.1)',
      },
      data: {
        label: domain.data.name,
        domain,
      },
    });

    // Add domain title
    nodes.push({
      id: `domain-context-map-title-${domain.data.name}`,
      data: { 
        label: `${domain.data.name}`, 
        description: domain.data.summary || '',
        domain,
      },
      position: { x: 0, y: 0 },
      style: {
        height: 40,
        backgroundColor: 'transparent',
        border: 'none',
        color: '#1a202c',
        fontWeight: 'bold',
        fontSize: '1.25rem',
        width: domainWidth,
        textAlign: 'center',
        padding: '10px',
      },
      extent: 'parent',
      parentId: nodeId,
      connectable: false,
      sourcePosition: 'right',
      targetPosition: 'left',
      draggable: false,
      type: 'group',
    } as Node);

    // Position services in a grid within the domain
    if (domainServices) {
      domainServices.forEach((service, serviceIndex) => {
        const row = Math.floor(serviceIndex / SERVICES_PER_ROW);
        const col = serviceIndex % SERVICES_PER_ROW;

        // Add spacing between services
        const xPosition = PADDING + col * SERVICE_WIDTH;
        const yPosition = PADDING + row * SERVICE_HEIGHT + 40; // Add space for domain title

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
      });
    }
  });

  // Third pass: Create edges for inter-domain communication
  domains.forEach((domain) => {
    const rawServices = domain.data.services ?? [];
    const domainServices = rawServices
      .map((service) => getItemsFromCollectionByIdAndSemverOrLatest(services, service.id, service.version))
      .flat()
      .filter((e) => e !== undefined);

    domainServices.forEach((service) => {
      // Handle receives - creating edges from other services that produce messages
      const rawReceives = service.data.receives ?? [];
      const receives = rawReceives
        .map((receive) => getItemsFromCollectionByIdAndSemverOrLatest(messages, receive.id, receive.version))
        .flat();

      for (const receive of receives) {
        const producers = getProducersOfMessage(services, receive);

        for (const producer of producers) {
          // Skip self-connections within the same service
          if (producer.data.id === service.data.id) {
            continue;
          }
          
          // Check if producer is in a different domain
          let producerDomain = null;
          let isExternalDomain = false;
          
          for (const otherDomain of domains) {
            const otherRawServices = otherDomain.data.services ?? [];
            const otherDomainServices = otherRawServices
              .map((svc) => getItemsFromCollectionByIdAndSemverOrLatest(services, svc.id, svc.version))
              .flat()
              .filter((e) => e !== undefined);
              
            if (otherDomainServices.some(svc => svc.data.id === producer.data.id)) {
              producerDomain = otherDomain;
              isExternalDomain = otherDomain.data.id !== domain.data.id;
              break;
            }
          }
          
          if (isExternalDomain) {
            // Create edge between services in different domains
            edges.push(
              createEdge({
                id: generatedIdForEdge(producer, service) + '-' + receive.data.id,
                source: generateIdForNode(producer),
                target: generateIdForNode(service),
                label: `${receive.data.name} (${receive.collection})`,
                type: 'animated', // Make inter-domain edges animated by default
                style: {
                  strokeWidth: 2,
                  stroke: receive.collection === 'events' 
                    ? '#ed8936' // orange for events
                    : receive.collection === 'commands' 
                      ? '#4299e1' // blue for commands
                      : '#48bb78', // green for queries
                },
                zIndex: 1000,
                data: {
                  message: receive,
                  animated: true,
                  source: producer,
                  target: service,
                }
              })
            );
          }
        }
      }
    });
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
}

export const getNodesAndEdges = async ({ id, version, defaultFlow, mode = 'simple' }: NodesAndEdgesProps) => {
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

  const servicesCollection = await getCollection('services');

  const domainServicesWithVersion = rawServices
    .map((service) => getItemsFromCollectionByIdAndSemverOrLatest(servicesCollection, service.id, service.version))
    .flat()
    .map((svc) => ({ id: svc.data.id, version: svc.data.version }));

  // Get all the nodes for everyhing

  for (const service of domainServicesWithVersion) {
    const { nodes: serviceNodes, edges: serviceEdges } = await getServicesNodeAndEdges({
      id: service.id,
      version: service.version,
      defaultFlow: flow,
      mode,
    });

    for (const node of serviceNodes) {
      nodes.set(node.id, node);
    }

    for (const edge of serviceEdges) {
      edges.set(edge.id, edge);
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
  };
};
