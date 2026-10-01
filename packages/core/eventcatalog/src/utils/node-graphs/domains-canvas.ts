import { getCollection, type CollectionEntry } from 'astro:content';
import {
  generateIdForNode,
  createDagreGraph,
  calculatedNodes,
  createEdge,
  getOperationFields,
  layoutDagreGraph,
} from '@utils/node-graphs/utils/utils';
import { findInMap, createVersionedMap } from '@utils/collections/util';
import type { Node, Edge } from '@xyflow/react';
import { getDomains } from '@utils/collections/domains';
import type { CollectionMessageTypes } from '@types';
import { getDistinctMessagePairs } from './utils/shared-channel-messages';

interface DomainCanvasData {
  domainNodes: Node[];
  messageNodes: Node[];
  edges: Edge[];
}

type MessageEntry = CollectionEntry<CollectionMessageTypes>;
type ChannelEntry = CollectionEntry<'channels'>;

type MessageEndpoint = {
  domainId: string;
  service: any;
  message: MessageEntry;
};

export const getDomainsCanvasData = async (): Promise<DomainCanvasData> => {
  let domains = await getDomains({ getAllVersions: false });

  // only interested in domains that are not parent domains (e.g domains that have subdoamins we dont want to display them here)
  domains = domains.filter((domain) => !domain.data.domains?.length);

  const domainNodes: Node[] = [];
  const messageNodes: Node[] = [];
  const edges: Edge[] = [];

  // Create dagre graph for layout
  const dagreGraph = createDagreGraph({ ranksep: 400, nodesep: 200 });

  // Create a map to store domain data for calculating relationships
  const domainDataMap = new Map();

  for (let index = 0; index < domains.length; index++) {
    const domain = domains[index];
    const domainNodeId = generateIdForNode(domain);
    const domainServices = domain.data.services as unknown as CollectionEntry<'services'>[];

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

  // Get all messages and channels for version resolution in parallel
  const [events, commands, queries, channels] = await Promise.all([
    getCollection('events'),
    getCollection('commands'),
    getCollection('queries'),
    getCollection('channels'),
  ]);
  const allMessages = [...events, ...commands, ...queries];
  const messageMap = createVersionedMap(allMessages);
  const channelMap = createVersionedMap(channels);

  // Map to track unique messages and their publishers/consumers across domains
  const messageRelationships = new Map<
    string,
    {
      message: any;
      publishers: Array<{ domainId: string; service: any }>;
      consumers: Array<{ domainId: string; service: any }>;
    }
  >();

  // Find all message relationships across domains
  domainDataMap.forEach((domainData, domainId) => {
    domainData.services.forEach((service: any) => {
      // Track messages this service sends
      const sendsRaw = service.data.sends ?? [];

      const sendsHydrated = sendsRaw
        .map((message: any) => findInMap(messageMap, message.id, message.version))
        .filter((e: any) => e !== undefined);

      sendsHydrated.forEach((sentMessage: any) => {
        const messageKey = `${sentMessage.data.id}-${sentMessage.data.version}`;

        if (!messageRelationships.has(messageKey)) {
          messageRelationships.set(messageKey, {
            message: sentMessage.data,
            publishers: [],
            consumers: [],
          });
        }

        const relationship = messageRelationships.get(messageKey)!;
        // Add publisher if not already added
        if (!relationship.publishers.some((p) => p.domainId === domainId && p.service.data.id === service.data.id)) {
          relationship.publishers.push({ domainId, service });
        }
      });

      // Track messages this service receives
      const receivesRaw = service.data.receives ?? [];
      const receivesHydrated = receivesRaw
        .map((message: any) => findInMap(messageMap, message.id, message.version))
        .filter((e: any) => e !== undefined);

      receivesHydrated.forEach((receivedMessage: any) => {
        const messageKey = `${receivedMessage.data.id}-${receivedMessage.data.version}`;

        if (!messageRelationships.has(messageKey)) {
          messageRelationships.set(messageKey, {
            message: receivedMessage.data,
            publishers: [],
            consumers: [],
          });
        }

        const relationship = messageRelationships.get(messageKey)!;
        // Add consumer if not already added
        if (!relationship.consumers.some((c) => c.domainId === domainId && c.service.data.id === service.data.id)) {
          relationship.consumers.push({ domainId, service });
        }
      });
    });
  });

  // Create message nodes and edges for cross-domain relationships

  // Only create message nodes for messages that cross domain boundaries
  messageRelationships.forEach(({ message, publishers, consumers }, messageKey) => {
    // Check if this message crosses domain boundaries
    const publisherDomains = new Set(publishers.map((p) => p.domainId));
    const consumerDomains = new Set(consumers.map((c) => c.domainId));

    // Only create a message node if it connects different domains
    const crossesDomainBoundary = [...publisherDomains].some((pubDomain) =>
      [...consumerDomains].some((conDomain) => pubDomain !== conDomain)
    );

    if (crossesDomainBoundary) {
      // Find the actual message object
      const messageObject = findInMap(messageMap, message.id, message.version) as CollectionEntry<CollectionMessageTypes>;

      if (messageObject) {
        const messageNodeId = `message-${messageKey}`;

        // Create a single message node for this unique message
        messageNodes.push({
          id: messageNodeId,
          type: messageObject.collection, // events, commands, or queries
          position: { x: 0, y: 0 }, // Temporary position, will be calculated by dagre
          data: {
            mode: 'simple',
            message: { ...messageObject.data, ...getOperationFields(messageObject.data) },
          },
          sourcePosition: 'right',
          targetPosition: 'left',
        } as Node);

        // Create edges from all publishers to the message node
        publishers.forEach(({ domainId, service }) => {
          // Only create edge if there's a consumer in a different domain
          const hasExternalConsumer = consumers.some((c) => c.domainId !== domainId);

          if (hasExternalConsumer) {
            edges.push(
              createEdge({
                id: `edge-${domainId}-${service.data.id}-${messageNodeId}`,
                source: domainId,
                sourceHandle: `${service.data.id}-source`,
                target: messageNodeId,
                type: 'animated',
                animated: true,
                label: 'publishes',
                data: {
                  message: { ...messageObject.data },
                  type: 'domain-to-message',
                  publisherService: service,
                },
              })
            );
          }
        });

        // Create edges from the message node to all consumers
        consumers.forEach(({ domainId, service }) => {
          // Only create edge if there's a publisher in a different domain
          const hasExternalPublisher = publishers.some((p) => p.domainId !== domainId);

          if (hasExternalPublisher) {
            edges.push(
              createEdge({
                id: `edge-${messageNodeId}-${domainId}-${service.data.id}`,
                source: messageNodeId,
                target: domainId,
                targetHandle: `${service.data.id}-target`,
                type: 'animated',
                animated: true,
                label: 'consumed by',
                data: {
                  message: { ...messageObject.data },
                  type: 'message-to-domain',
                  consumerService: service,
                },
              })
            );
          }
        });
      }
    }
  });

  // Services may use different local message ids while communicating over the
  // same channel. Keep the existing id-based relationships and add only the
  // distinct relationships that can be inferred without a many-to-many guess.
  const channelRelationships = new Map<
    string,
    { channel: ChannelEntry; publishers: MessageEndpoint[]; consumers: MessageEndpoint[] }
  >();

  const addChannelEndpoint = (
    pointer: { id: string; version?: string },
    type: 'publishers' | 'consumers',
    endpoint: MessageEndpoint
  ) => {
    const channel = findInMap(channelMap, pointer.id, pointer.version) as ChannelEntry | undefined;
    if (!channel) return;

    const channelKey = `${channel.data.id}-${channel.data.version}`;
    const relationship = channelRelationships.get(channelKey) ?? { channel, publishers: [], consumers: [] };
    relationship[type].push(endpoint);
    channelRelationships.set(channelKey, relationship);
  };

  domainDataMap.forEach((domainData, domainId) => {
    domainData.services.forEach((service: any) => {
      for (const sent of service.data.sends ?? []) {
        const message = findInMap(messageMap, sent.id, sent.version) as MessageEntry | undefined;
        if (!message) continue;
        for (const channel of sent.to ?? []) addChannelEndpoint(channel, 'publishers', { domainId, service, message });
      }

      for (const received of service.data.receives ?? []) {
        const message = findInMap(messageMap, received.id, received.version) as MessageEntry | undefined;
        if (!message) continue;
        for (const channel of received.from ?? []) addChannelEndpoint(channel, 'consumers', { domainId, service, message });
      }
    });
  });

  const messageNodeIds = new Set(messageNodes.map((node) => node.id));
  const edgeIds = new Set(edges.map((edge) => edge.id));

  const ensureMessageNode = (message: MessageEntry) => {
    const messageKey = `${message.data.id}-${message.data.version}`;
    const messageNodeId = `message-${messageKey}`;
    if (messageNodeIds.has(messageNodeId)) return messageNodeId;

    messageNodeIds.add(messageNodeId);
    messageNodes.push({
      id: messageNodeId,
      type: message.collection,
      position: { x: 0, y: 0 },
      data: {
        mode: 'simple',
        message: { ...message.data, ...getOperationFields(message.data) },
      },
      sourcePosition: 'right',
      targetPosition: 'left',
    } as Node);
    return messageNodeId;
  };

  const addEdge = (edge: Edge) => {
    if (edgeIds.has(edge.id)) return;
    edgeIds.add(edge.id);
    edges.push(edge);
  };

  for (const { channel, publishers, consumers } of channelRelationships.values()) {
    const publisherMessages = new Map(publishers.map(({ message }) => [`${message.data.id}-${message.data.version}`, message]));
    const consumerMessages = new Map(consumers.map(({ message }) => [`${message.data.id}-${message.data.version}`, message]));
    const distinctPairs = getDistinctMessagePairs(publisherMessages.keys(), consumerMessages.keys());

    for (const { producerMessageId, consumerMessageId } of distinctPairs) {
      const publisherMessage = publisherMessages.get(producerMessageId);
      const consumerMessage = consumerMessages.get(consumerMessageId);
      if (!publisherMessage || !consumerMessage) continue;

      const matchingPublishers = publishers.filter(
        ({ message }) => `${message.data.id}-${message.data.version}` === producerMessageId
      );
      const matchingConsumers = consumers.filter(
        ({ message }) => `${message.data.id}-${message.data.version}` === consumerMessageId
      );
      const crossesDomainBoundary = matchingPublishers.some(({ domainId }) =>
        matchingConsumers.some((consumer) => consumer.domainId !== domainId)
      );
      if (!crossesDomainBoundary) continue;

      const publisherNodeId = ensureMessageNode(publisherMessage);
      const consumerNodeId = ensureMessageNode(consumerMessage);

      for (const { domainId, service } of matchingPublishers) {
        if (!matchingConsumers.some((consumer) => consumer.domainId !== domainId)) continue;
        addEdge(
          createEdge({
            id: `edge-${domainId}-${service.data.id}-${publisherNodeId}`,
            source: domainId,
            sourceHandle: `${service.data.id}-source`,
            target: publisherNodeId,
            type: 'animated',
            animated: true,
            label: 'publishes',
            data: { message: { ...publisherMessage.data }, type: 'domain-to-message', publisherService: service },
          })
        );
      }

      addEdge(
        createEdge({
          id: `edge-${publisherNodeId}-channel-${channel.data.id}-${channel.data.version}-${consumerNodeId}`,
          source: publisherNodeId,
          target: consumerNodeId,
          type: 'animated',
          animated: true,
          label: `via ${channel.data.id}`,
          data: {
            type: 'message-to-message-via-channel',
            channels: [{ ...channel.data }],
            publisherMessage: { ...publisherMessage.data },
            consumerMessage: { ...consumerMessage.data },
          },
        })
      );

      for (const { domainId, service } of matchingConsumers) {
        if (!matchingPublishers.some((publisher) => publisher.domainId !== domainId)) continue;
        addEdge(
          createEdge({
            id: `edge-${consumerNodeId}-${domainId}-${service.data.id}`,
            source: consumerNodeId,
            target: domainId,
            targetHandle: `${service.data.id}-target`,
            type: 'animated',
            animated: true,
            label: 'consumed by',
            data: { message: { ...consumerMessage.data }, type: 'message-to-domain', consumerService: service },
          })
        );
      }
    }
  }

  // Add all nodes to dagre graph for layout calculation
  const allNodes = [...domainNodes, ...messageNodes];

  allNodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 250, height: 120 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout using dagre
  layoutDagreGraph(dagreGraph);

  // Apply calculated positions to nodes
  const layoutedDomainNodes = calculatedNodes(dagreGraph, domainNodes);
  const layoutedMessageNodes = calculatedNodes(dagreGraph, messageNodes);

  return {
    domainNodes: layoutedDomainNodes,
    messageNodes: layoutedMessageNodes,
    edges,
  };
};
