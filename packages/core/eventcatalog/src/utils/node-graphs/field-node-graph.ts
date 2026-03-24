import type { Node, Edge } from '@xyflow/react';
import dagre from 'dagre';
import {
  createDagreGraph,
  calculatedNodes,
  createEdge,
  createNode,
  buildContextMenuForMessage,
  buildContextMenuForService,
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT,
} from './utils/utils';

export interface FieldOccurrence {
  messageId: string;
  messageVersion: string;
  messageType: string;
  messageName?: string;
  messageSummary?: string;
  messageOwners?: string[];
  fieldType?: string;
  producers: { id: string; version: string; name?: string; summary?: string; owners?: string[] }[];
  consumers: { id: string; version: string; name?: string; summary?: string; owners?: string[] }[];
}

interface Props {
  fieldPath: string;
  fieldType: string;
  occurrences: FieldOccurrence[];
  mode?: 'simple' | 'full';
}

export const getNodesAndEdges = ({
  fieldPath,
  fieldType,
  occurrences,
  mode = 'full',
}: Props): { nodes: Node[]; edges: Edge[] } => {
  const flow = createDagreGraph({ ranksep: 200, nodesep: 50 });
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const addedNodes = new Set<string>();

  // Detect distinct types across occurrences
  const typeCounts = new Map<string, number>();
  for (const occ of occurrences) {
    const t = occ.fieldType || fieldType;
    typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
  }
  const hasConflicts = typeCounts.size > 1;

  // Create field node(s) — one per type if conflicts, otherwise a single node
  const fieldNodeIds = new Map<string, string>();

  if (hasConflicts) {
    for (const [type] of typeCounts) {
      const nodeId = `field-${fieldPath}-${type}`;
      fieldNodeIds.set(type, nodeId);
      nodes.push(
        createNode({
          id: nodeId,
          type: 'field',
          position: { x: 0, y: 0 },
          data: { name: fieldPath, type, mode },
        })
      );
      addedNodes.add(nodeId);
    }
  } else {
    const nodeId = `field-${fieldPath}`;
    fieldNodeIds.set(fieldType, nodeId);
    nodes.push(
      createNode({
        id: nodeId,
        type: 'field',
        position: { x: 0, y: 0 },
        data: { name: fieldPath, type: fieldType, mode },
      })
    );
    addedNodes.add(nodeId);
  }

  for (const occ of occurrences) {
    const msgNodeId = `msg-${occ.messageId}-${occ.messageVersion}`;
    const occType = occ.fieldType || fieldType;
    const fieldNodeId = fieldNodeIds.get(occType) || fieldNodeIds.values().next().value!;

    if (!addedNodes.has(msgNodeId)) {
      nodes.push(
        createNode({
          id: msgNodeId,
          type: occ.messageType,
          position: { x: 0, y: 0 },
          data: {
            message: {
              name: occ.messageName || occ.messageId,
              version: occ.messageVersion,
              summary: occ.messageSummary || '',
              id: occ.messageId,
              owners: occ.messageOwners || [],
            },
            contextMenu: buildContextMenuForMessage({
              id: occ.messageId,
              version: occ.messageVersion,
              name: occ.messageName || occ.messageId,
              collection: occ.messageType === 'query' ? 'queries' : `${occ.messageType}s`,
            }),
            mode,
          },
        })
      );
      addedNodes.add(msgNodeId);
    }

    // Producer services
    for (const p of occ.producers) {
      const svcNodeId = `svc-producer-${p.id}-${p.version}`;
      if (!addedNodes.has(svcNodeId)) {
        nodes.push(
          createNode({
            id: svcNodeId,
            type: 'service',
            position: { x: 0, y: 0 },
            data: {
              service: { name: p.name || p.id, version: p.version, summary: p.summary || '', id: p.id, owners: p.owners || [] },
              contextMenu: buildContextMenuForService({ id: p.id, version: p.version }),
              mode,
            },
          })
        );
        addedNodes.add(svcNodeId);
      }

      const prodEdgeId = `e-${svcNodeId}-${msgNodeId}`;
      if (!edges.find((e) => e.id === prodEdgeId)) {
        edges.push(createEdge({ id: prodEdgeId, source: svcNodeId, target: msgNodeId, label: 'produces', type: 'smoothstep' }));
      }
    }

    // Message → Field (connects to the field node matching this occurrence's type)
    const msgFieldEdgeId = `e-${msgNodeId}-${fieldNodeId}`;
    if (!edges.find((e) => e.id === msgFieldEdgeId)) {
      edges.push(
        createEdge({
          id: msgFieldEdgeId,
          source: msgNodeId,
          target: fieldNodeId,
          label: hasConflicts ? `contains (${occType})` : 'contains',
          type: 'smoothstep',
        })
      );
    }

    // Field → Consumer services (from the specific field type node)
    for (const c of occ.consumers) {
      const svcNodeId = `svc-consumer-${c.id}-${c.version}`;
      if (!addedNodes.has(svcNodeId)) {
        nodes.push(
          createNode({
            id: svcNodeId,
            type: 'service',
            position: { x: 0, y: 0 },
            data: {
              service: { name: c.name || c.id, version: c.version, summary: c.summary || '', id: c.id, owners: c.owners || [] },
              contextMenu: buildContextMenuForService({ id: c.id, version: c.version }),
              mode,
            },
          })
        );
        addedNodes.add(svcNodeId);
      }

      const consEdgeId = `e-${fieldNodeId}-${svcNodeId}`;
      if (!edges.find((e) => e.id === consEdgeId)) {
        edges.push(
          createEdge({ id: consEdgeId, source: fieldNodeId, target: svcNodeId, label: 'consumed by', type: 'smoothstep' })
        );
      }
    }
  }

  // Apply layout
  for (const node of nodes) {
    flow.setNode(node.id, { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT });
  }
  for (const edge of edges) {
    flow.setEdge(edge.source, edge.target);
  }
  dagre.layout(flow);

  return { nodes: calculatedNodes(flow, nodes), edges };
};
