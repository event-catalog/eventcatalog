import { getCollection, type CollectionEntry } from 'astro:content';
import dagre from 'dagre';
import {
  createDagreGraph,
  generateIdForNode,
  generatedIdForEdge,
  calculatedNodes,
  createEdge,
  buildContextMenuForService,
  buildContextMenuForResource,
  versionMatches,
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT,
  partitionMessagesByGroup,
  getOperationFields,
} from '@utils/node-graphs/utils/utils';

const sanitizeGroupId = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

import { findMatchingNodes, findInMap, createVersionedMap } from '@utils/collections/util';
import { MarkerType, type Node, type Edge } from '@xyflow/react';
import type { CollectionMessageTypes } from '@types';
import { getNodesAndEdgesForConsumedMessage, getNodesAndEdgesForProducedMessage } from './message-node-graph';

/**
 * Pre-compute the downstream nodes/edges that should appear when a message group
 * is expanded. Calls the standard message node-graph function for each grouped
 * message, then strips out the service and message nodes/edges that the client-side
 * expand logic handles separately.
 */
const precomputeGroupExpansion = (
  messages: any[],
  channelPointers: any[],
  direction: 'sends' | 'receives',
  opts: {
    serviceNodeId: string;
    services: any;
    service: any;
    mode: string;
    channels: any;
    channelMap: any;
    existingNodes: any[];
    existingEdges: any[];
  }
) => {
  const expandedNodes: Node[] = [];
  const expandedEdges: Edge[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const channelRefs = channelPointers[i] || [];

    // Call the same function used by the ungrouped path
    const args =
      direction === 'receives'
        ? {
            message: msg as any,
            targetChannels: channelRefs,
            services: opts.services,
            currentNodes: [...opts.existingNodes, ...expandedNodes],
            target: opts.service,
            mode: opts.mode,
            channels: opts.channels,
            channelMap: opts.channelMap,
          }
        : {
            message: msg as any,
            sourceChannels: channelRefs,
            services: opts.services,
            currentNodes: [...opts.existingNodes, ...expandedNodes],
            source: opts.service,
            currentEdges: [...opts.existingEdges, ...expandedEdges],
            mode: opts.mode,
            channels: opts.channels,
            channelMap: opts.channelMap,
          };

    const { nodes: msgNodes, edges: msgEdges } =
      direction === 'receives'
        ? getNodesAndEdgesForConsumedMessage(args as any)
        : getNodesAndEdgesForProducedMessage(args as any);

    // Strip the service node and message node — the client expand logic creates these.
    // Also strip the direct service↔message edge for the same reason.
    const msgId = `${msg.data.id}-${msg.data.version}`;
    const isServiceOrMessage = (id: string) => id === opts.serviceNodeId || id === msgId;
    const isDirectEdge = (e: any) =>
      (e.source === opts.serviceNodeId && e.target === msgId) || (e.source === msgId && e.target === opts.serviceNodeId);

    expandedNodes.push(...msgNodes.filter((n: any) => !isServiceOrMessage(n.id)));
    expandedEdges.push(...msgEdges.filter((e: any) => !isDirectEdge(e)));
  }

  return { expandedNodes, expandedEdges };
};

type DagreGraph = any;

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
  mode?: 'simple' | 'full';
  renderAllEdges?: boolean;
  channelRenderMode?: 'single' | 'flat';
  renderMessages?: boolean;
}

const getSendsMessageByMessageType = (messageType: string) => {
  switch (messageType) {
    case 'events':
      return 'publishes event';
    case 'commands':
      return 'invokes command';
    case 'queries':
      return 'requests';
    default:
      return 'invokes message';
  }
};

const getReceivesMessageByMessageType = (messageType: string) => {
  switch (messageType) {
    case 'events':
      return 'receives event';
    case 'commands':
    case 'queries':
      return 'accepts';
    default:
      return 'accepts message';
  }
};

export const getNodesAndEdges = async ({
  id,
  defaultFlow,
  version,
  mode = 'simple',
  renderAllEdges = false,
  channelRenderMode = 'flat',
  renderMessages = true,
}: Props) => {
  const flow = defaultFlow || createDagreGraph({ ranksep: 300, nodesep: 50 });
  let nodes = [] as any,
    edges = [] as any;

  // Fetch all collections in parallel
  const [services, events, commands, queries, channels, containers] = await Promise.all([
    getCollection('services'),
    getCollection('events'),
    getCollection('commands'),
    getCollection('queries'),
    getCollection('channels'),
    getCollection('containers'),
  ]);

  const service = services.find((service) => service.data.id === id && service.data.version === version);

  // Nothing found...
  if (!service) {
    return {
      nodes: [],
      edges: [],
    };
  }

  // Build maps for O(1) lookups
  const messages = [...events, ...commands, ...queries];
  const messageMap = createVersionedMap(messages);
  const containerMap = createVersionedMap(containers);
  const channelMap = createVersionedMap(channels);

  const receivesRaw = service?.data.receives || [];
  const sendsRaw = service?.data.sends || [];
  const writesToRaw = service?.data.writesTo || [];
  const readsFromRaw = service?.data.readsFrom || [];

  const receivesHydrated = receivesRaw
    .map((message) => findInMap(messageMap, message.id, message.version))
    .filter((e) => e !== undefined);

  const sendsHydrated = sendsRaw
    .map((message) => findInMap(messageMap, message.id, message.version))
    .filter((e) => e !== undefined);

  const writesToHydrated = writesToRaw
    .map((container) => findInMap(containerMap, container.id, container.version))
    .filter((e) => e !== undefined);

  const readsFromHydrated = readsFromRaw
    .map((container) => findInMap(containerMap, container.id, container.version))
    .filter((e) => e !== undefined);

  const receives = (receivesHydrated as CollectionEntry<CollectionMessageTypes>[]) || [];
  const sends = (sendsHydrated as CollectionEntry<CollectionMessageTypes>[]) || [];
  const writesTo = (writesToHydrated as CollectionEntry<'containers'>[]) || [];
  const readsFrom = (readsFromHydrated as CollectionEntry<'containers'>[]) || [];

  // Track messages that are both sent and received
  const bothSentAndReceived = findMatchingNodes(receives, sends);
  const bothReadsAndWrites = findMatchingNodes(readsFrom, writesTo);

  // Partition messages by group
  const receivesPartition = partitionMessagesByGroup(receivesRaw, receives);
  const sendsPartition = partitionMessagesByGroup(sendsRaw, sends);

  // Collect grouped message IDs to exclude from bothSentAndReceived
  const groupedMessageIds = new Set<string>();
  for (const [, groupData] of receivesPartition.grouped) {
    groupData.messages.forEach((m: any) => groupedMessageIds.add(`${m.data.id}-${m.data.version}`));
  }
  for (const [, groupData] of sendsPartition.grouped) {
    groupData.messages.forEach((m: any) => groupedMessageIds.add(`${m.data.id}-${m.data.version}`));
  }

  const filteredBothSentAndReceived = bothSentAndReceived.filter(
    (m: any) => m && !groupedMessageIds.has(`${m.data.id}-${m.data.version}`)
  );

  const serviceNodeId = `${service.data.id}-${service.data.version}`;

  if (renderMessages) {
    // Emit group nodes for grouped receives
    for (const [groupName, groupData] of receivesPartition.grouped) {
      const groupNodeId = `message-group-${service.data.id}-${service.data.version}-${sanitizeGroupId(groupName)}-receives`;

      // Match each message to its pointer by id/version (not index) to avoid
      // misalignment when a pointer fails hydration and is missing from messages.
      const findPointerForMessage = (msg: any) =>
        groupData.pointers.find((p: any) => p.id === msg.data.id && versionMatches(p.version, msg.data.version));

      const { expandedNodes, expandedEdges } = precomputeGroupExpansion(
        groupData.messages,
        groupData.messages.map((msg: any) => findPointerForMessage(msg)?.from || []),
        'receives',
        { serviceNodeId, services, service, mode, channels, channelMap, existingNodes: nodes, existingEdges: edges }
      );

      nodes.push({
        id: groupNodeId,
        sourcePosition: 'right',
        targetPosition: 'left',
        type: 'messageGroup',
        data: {
          mode,
          groupName,
          direction: 'receives' as const,
          messageCount: groupData.messages.length,
          messageTypes: [...new Set(groupData.messages.map((m: any) => m.collection))],
          messages: groupData.messages.map((msg: any) => ({
            message: { ...msg, data: { ...msg.data, ...getOperationFields(msg.data) } },
            channels: findPointerForMessage(msg)?.from || [],
          })),
          service: { id: service.data.id, version: service.data.version },
          expandedNodes,
          expandedEdges,
        },
      });

      edges.push(
        createEdge({
          id: `${groupNodeId}-to-${serviceNodeId}`,
          source: groupNodeId,
          target: serviceNodeId,
          label: `consumes ${groupData.messages.length}\nmessages`,
          type: 'multiline',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#666',
            width: 20,
            height: 20,
          },
        })
      );
    }

    // Ungrouped receives go through existing path
    receivesPartition.ungrouped.messages.forEach((receive) => {
      const receiveRaw = receivesRaw.find(
        (r) => r.id === (receive as any).data.id && versionMatches(r.version, (receive as any).data.version)
      );
      const targetChannels = receiveRaw?.from;

      const { nodes: consumedMessageNodes, edges: consumedMessageEdges } = getNodesAndEdgesForConsumedMessage({
        message: receive as any,
        targetChannels: targetChannels,
        services,
        currentNodes: nodes,
        target: service,
        mode,
        channels,
        channelMap,
      });

      nodes.push(...consumedMessageNodes);
      edges.push(...consumedMessageEdges);
    });
  }

  // The service itself
  nodes.push({
    id: generateIdForNode(service),
    sourcePosition: 'right',
    targetPosition: 'left',
    data: {
      mode,
      service: { ...service.data },
      contextMenu: buildContextMenuForService({
        id: service.data.id,
        version: service.data.version,
        specifications: service.data.specifications as { type: string; path: string }[],
        repository: service.data.repository as { url: string },
      }),
    },
    type: service.collection,
  });

  // Any containers the service writes to
  writesTo.forEach((writeTo) => {
    nodes.push({
      id: generateIdForNode(writeTo),
      sourcePosition: 'right',
      targetPosition: 'left',
      data: {
        mode,
        data: { ...writeTo.data },
        contextMenu: buildContextMenuForResource({ collection: 'entities', id: writeTo.data.id, version: writeTo.data.version }),
      },
      type: 'data',
    });

    // If its not in the reads/and writes to, we need to add the edge
    if (!bothReadsAndWrites.includes(writeTo)) {
      edges.push(
        createEdge({
          id: generatedIdForEdge(service, writeTo),
          source: generateIdForNode(service),
          target: generateIdForNode(writeTo),
          label: `writes to \n (${writeTo.data?.technology})`,
          type: 'multiline',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#666',
            width: 20,
            height: 20,
          },
        })
      );
    }
  });

  // Any containers the service reads from
  readsFrom.forEach((readFrom) => {
    nodes.push({
      id: generateIdForNode(readFrom),
      sourcePosition: 'right',
      targetPosition: 'left',
      data: {
        mode,
        data: { ...readFrom.data },
        contextMenu: buildContextMenuForResource({
          collection: 'entities',
          id: readFrom.data.id,
          version: readFrom.data.version,
        }),
      },
      type: 'data',
    });

    // If its not in the reads/and writes to, we need to add the edge
    if (!bothReadsAndWrites.includes(readFrom)) {
      edges.push(
        createEdge({
          id: generatedIdForEdge(service, readFrom),
          source: generateIdForNode(readFrom),
          target: generateIdForNode(service),
          label: `reads from \n (${readFrom.data?.technology})`,
          type: 'multiline',
          markerStart: {
            type: MarkerType.ArrowClosed,
            color: '#666',
            width: 20,
            height: 20,
          },
          markerEnd: undefined,
        })
      );
    }
  });

  if (renderMessages) {
    // Emit group nodes for grouped sends
    for (const [groupName, groupData] of sendsPartition.grouped) {
      const groupNodeId = `message-group-${service.data.id}-${service.data.version}-${sanitizeGroupId(groupName)}-sends`;

      // Match each message to its pointer by id/version (not index) — same reason as receives above
      const findPointerForMessage = (msg: any) =>
        groupData.pointers.find((p: any) => p.id === msg.data.id && versionMatches(p.version, msg.data.version));

      const { expandedNodes, expandedEdges } = precomputeGroupExpansion(
        groupData.messages,
        groupData.messages.map((msg: any) => findPointerForMessage(msg)?.to || []),
        'sends',
        { serviceNodeId, services, service, mode, channels, channelMap, existingNodes: nodes, existingEdges: edges }
      );

      nodes.push({
        id: groupNodeId,
        sourcePosition: 'right',
        targetPosition: 'left',
        type: 'messageGroup',
        data: {
          mode,
          groupName,
          direction: 'sends' as const,
          messageCount: groupData.messages.length,
          messageTypes: [...new Set(groupData.messages.map((m: any) => m.collection))],
          messages: groupData.messages.map((msg: any) => ({
            message: { ...msg, data: { ...msg.data, ...getOperationFields(msg.data) } },
            channels: findPointerForMessage(msg)?.to || [],
          })),
          service: { id: service.data.id, version: service.data.version },
          expandedNodes,
          expandedEdges,
        },
      });

      edges.push(
        createEdge({
          id: `${serviceNodeId}-to-${groupNodeId}`,
          source: serviceNodeId,
          target: groupNodeId,
          label: `publishes ${groupData.messages.length}\nmessages`,
          type: 'multiline',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#666',
            width: 20,
            height: 20,
          },
        })
      );
    }

    // Ungrouped sends through existing path
    sendsPartition.ungrouped.messages.forEach((send) => {
      const sendRaw = sendsRaw.find(
        (s) => s.id === (send as any).data.id && versionMatches(s.version, (send as any).data.version)
      );
      const sourceChannels = sendRaw?.to;

      const { nodes: producedMessageNodes, edges: producedMessageEdges } = getNodesAndEdgesForProducedMessage({
        message: send as any,
        sourceChannels: sourceChannels,
        services,
        currentNodes: nodes,
        source: service,
        currentEdges: edges,
        mode,
        channels,
        channelMap,
      });

      nodes.push(...producedMessageNodes);
      edges.push(...producedMessageEdges);
    });

    // Handle messages that are both sent and received (filtered to exclude grouped)
    filteredBothSentAndReceived.forEach((message) => {
      if (message) {
        edges.push({
          id: generatedIdForEdge(service, message) + '-both',
          source: generateIdForNode(service),
          target: generateIdForNode(message),
          label: `${getSendsMessageByMessageType(message?.collection)} & ${getReceivesMessageByMessageType(message?.collection)}`,
          animated: false,
          data: { message: { ...message.data } },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
          style: {
            strokeWidth: 1,
            stroke: 'var(--ec-edge-stroke, #6b7280)',
          },
        });
      }
    });
  }

  bothReadsAndWrites.forEach((container) => {
    edges.push({
      id: generatedIdForEdge(service, container) + '-both',
      source: generateIdForNode(service),
      target: generateIdForNode(container),
      type: 'multiline',
      // @ts-ignore
      label: `reads from \n and writes to \n (${container.data.technology})`,
      markerStart: {
        type: MarkerType.ArrowClosed,
        color: '#666',
        width: 20,
        height: 20,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#666',
        width: 20,
        height: 20,
      },
    });
  });

  nodes.forEach((node: any) => {
    flow.setNode(node.id, { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT });
  });

  edges.forEach((edge: any) => {
    flow.setEdge(edge.source, edge.target);
  });

  // Render the diagram in memory getting the X and Y
  dagre.layout(flow);

  // Find any duplicated edges, and merge them into one edge
  const uniqueEdges = edges.reduce((acc: any[], edge: any) => {
    const existingEdge = acc.find((e: any) => e.id === edge.id);
    if (existingEdge) {
      // existingEdge.label = `${existingEdge.label} & ${edge.label}`;
      // Add the custom colors to the existing edge which can be an array of strings
      const value = Array.isArray(edge.data.customColor) ? edge.data.customColor : [edge.data.customColor];
      const existingValue = Array.isArray(existingEdge.data.customColor)
        ? existingEdge.data.customColor
        : [existingEdge.data.customColor];
      existingEdge.data.customColor = [...value, ...existingValue];
    } else {
      acc.push(edge);
    }
    return acc;
  }, []);

  return {
    nodes: calculatedNodes(flow, nodes),
    edges: uniqueEdges,
  };
};
