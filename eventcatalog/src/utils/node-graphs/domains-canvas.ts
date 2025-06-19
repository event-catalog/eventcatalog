import { getCollection } from 'astro:content';
import dagre from 'dagre';
import { generateIdForNode, createDagreGraph, calculatedNodes, createEdge } from '@utils/node-graphs/utils/utils';
import type { Node, Edge } from '@xyflow/react';
import { getDomains } from '@utils/collections/domains';

export interface DomainCanvasData {
  domainNodes: Node[];
  messageNodes: Node[];
  edges: Edge[];
}

export const ZOOM_LEVELS = {
  DOMAIN_OVERVIEW: { min: 0, max: 1.0, level: 1 },
  SERVICE_DETAILS: { min: 1.0, max: 4.0, level: 2 },
} as const;

export const getDomainsCanvasData = async (): Promise<DomainCanvasData> => {
  const allDomains = await getDomains({ getAllVersions: false });
  let domains = allDomains.filter((domain) => !domain.id.includes('/versioned'));
  // const services = await getCollection('services');

  // only interested in domains that are not parent domains (e.g doamins that have subdoamins we dont want to display them here)
  domains = domains.filter((domain) => !domain.data.domains?.length);

  const domainNodes: Node[] = [];
  const messageNodes: Node[] = [];
  const edges: Edge[] = [];
  const domainRelationships = new Map<
    string,
    { message: any; sourceId: string; targetId: string; publisherService?: any; consumerServices?: any[] }
  >();

  // Create dagre graph for layout
  const dagreGraph = createDagreGraph({ ranksep: 400, nodesep: 200 });

  // Create a map to store domain data for calculating relationships
  const domainDataMap = new Map();

  for (let index = 0; index < domains.length; index++) {
    const domain = domains[index];
    const domainNodeId = generateIdForNode(domain);
    const domainServices = domain.data.services ?? [];

    // Count total messages for this domain
    let totalMessages = 0;
    for (const service of domainServices) {
      const receives = service.data.receives ?? [];
      const sends = service.data.sends ?? [];
      totalMessages += receives.length + sends.length;
    }

    domainDataMap.set(domainNodeId, {
      domain,
      services: domainServices,
      servicesCount: domainServices.length,
      messagesCount: totalMessages,
    });

    // Domain Overview Node (position will be calculated by dagre)
    domainNodes.push({
      id: domainNodeId,
      type: 'domains',
      position: { x: 0, y: 0 }, // Temporary position, will be calculated by dagre
      data: {
        mode: 'full',
        domain: {
          ...domain,
          data: {
            ...domain.data,
            services: domainServices,
          },
        },
        servicesCount: domainServices.length,
        messagesCount: totalMessages,
      },
      sourcePosition: 'right',
      targetPosition: 'left',
    } as Node);
  }

  // Add domain-to-domain edges if their services communicate
  const allServices = await getCollection('services');

  // Find domain relationships and create message nodes between domains
  domainDataMap.forEach((domainData, domainId) => {
    domainData.services.forEach((service: any) => {
      const sends = service.data.sends ?? [];

      sends.forEach((sentMessage: any) => {
        // Find which services consume this message
        allServices.forEach((consumerService) => {
          const receives = consumerService.data.receives ?? [];
          const consumesThisMessage = receives.some((recv: any) => recv.id === sentMessage.id);

          if (consumesThisMessage) {
            // Find which domain this consumer service belongs to
            domainDataMap.forEach((otherDomainData, otherDomainId) => {
              if (domainId !== otherDomainId) {
                const hasConsumerService = otherDomainData.services.some((s: any) => s.data.id === consumerService.data.id);

                if (hasConsumerService) {
                  const relationshipKey = `${domainId}-${otherDomainId}-${sentMessage.id}`;

                  if (!domainRelationships.has(relationshipKey)) {
                    domainRelationships.set(relationshipKey, {
                      message: sentMessage,
                      sourceId: domainId,
                      targetId: otherDomainId,
                      publisherService: service,
                      consumerServices: [consumerService],
                    });
                  } else {
                    // Add to existing consumer services if not already there
                    const existing = domainRelationships.get(relationshipKey)!;
                    if (!existing.consumerServices?.some((s: any) => s.data.id === consumerService.data.id)) {
                      existing.consumerServices = [...(existing.consumerServices || []), consumerService];
                    }
                  }
                }
              }
            });
          }
        });
      });
    });
  });

  // Create message nodes and edges for domain relationships
  const allMessages = await getCollection('events')
    .then((events) => Promise.all([events, getCollection('commands'), getCollection('queries')]))
    .then(([events, commands, queries]) => [...events, ...commands, ...queries]);

  domainRelationships.forEach(({ message, sourceId, targetId, publisherService, consumerServices }, relationshipKey) => {
    // Find the actual message object
    const messageObject = allMessages.find((m) => m.data.id === message.id && m.data.version === message.version);

    if (messageObject) {
      const sourceDomainNode = domainNodes.find((d) => d.id === sourceId);
      const targetDomainNode = domainNodes.find((d) => d.id === targetId);

      if (sourceDomainNode && targetDomainNode) {
        const messageNodeId = `message-${relationshipKey}`;

        // Create message node (position will be calculated by dagre)
        messageNodes.push({
          id: messageNodeId,
          type: messageObject.collection, // events, commands, or queries
          position: { x: 0, y: 0 }, // Temporary position, will be calculated by dagre
          data: {
            mode: 'simple',
            message: messageObject,
          },
          sourcePosition: 'right',
          targetPosition: 'left',
        } as Node);

        // Create edge from specific publisher service to message
        edges.push(
          createEdge({
            id: `edge-${sourceId}-${messageNodeId}`,
            source: sourceId,
            sourceHandle: `${publisherService.data.id}-source`,
            target: messageNodeId,
            type: 'animated',
            animated: true,
            label: 'publishes',
            data: {
              message: messageObject,
              type: 'domain-to-message',
              publisherService,
            },
          })
        );

        // Create edge from message to specific consumer service(s)
        consumerServices?.forEach((consumerService: any) => {
          edges.push(
            createEdge({
              id: `edge-${messageNodeId}-${targetId}-${consumerService.data.id}`,
              source: messageNodeId,
              target: targetId,
              targetHandle: `${consumerService.data.id}-target`,
              type: 'animated',
              animated: true,
              label: 'consumed by',
              data: {
                message: messageObject,
                type: 'message-to-domain',
                consumerService,
              },
            })
          );
        });
      }
    }
  });

  // Add all nodes to dagre graph for layout calculation
  const allNodes = [...domainNodes, ...messageNodes];

  allNodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 250, height: 120 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout using dagre
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
  const layoutedDomainNodes = calculatedNodes(dagreGraph, domainNodes);
  const layoutedMessageNodes = calculatedNodes(dagreGraph, messageNodes);

  return {
    domainNodes: layoutedDomainNodes,
    messageNodes: layoutedMessageNodes,
    edges,
  };
};
