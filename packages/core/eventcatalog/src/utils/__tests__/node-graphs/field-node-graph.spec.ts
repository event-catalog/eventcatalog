import { describe, expect, it } from 'vitest';
import { getNodesAndEdges, type FieldOccurrence } from '@utils/node-graphs/field-node-graph';

const occurrences: FieldOccurrence[] = [
  {
    messageId: 'OrderCreated',
    messageVersion: '1.0.0',
    messageType: 'event',
    fieldType: 'string',
    producers: [{ id: 'OrderService', version: '1.0.0' }],
    consumers: [{ id: 'PaymentService', version: '1.0.0' }],
  },
  {
    messageId: 'OrderAmended',
    messageVersion: '1.0.0',
    messageType: 'event',
    fieldType: 'number',
    producers: [{ id: 'OrderService', version: '1.0.0' }],
    consumers: [],
  },
];

describe('field node graph', () => {
  it('renders producers, messages, the field and consumers, laid out with routed edges', async () => {
    const { nodes, edges } = await getNodesAndEdges({ fieldPath: 'orderId', fieldType: 'string', occurrences: [occurrences[0]] });

    expect(nodes.map((node) => node.id)).toEqual([
      'field-orderId',
      'msg-OrderCreated-1.0.0',
      'svc-producer-OrderService-1.0.0',
      'svc-consumer-PaymentService-1.0.0',
    ]);
    expect(edges.map((edge) => `${edge.source} -> ${edge.target} (${edge.label})`)).toEqual([
      'svc-producer-OrderService-1.0.0 -> msg-OrderCreated-1.0.0 (produces)',
      'msg-OrderCreated-1.0.0 -> field-orderId (contains)',
      'field-orderId -> svc-consumer-PaymentService-1.0.0 (consumed by)',
    ]);
    for (const edge of edges) {
      expect(edge.data?.route).toBeDefined();
    }
  });

  it('renders one field node per type when the field type conflicts across messages', async () => {
    const { nodes, edges } = await getNodesAndEdges({ fieldPath: 'orderId', fieldType: 'string', occurrences });

    expect(nodes.filter((node) => node.type === 'field').map((node) => node.id)).toEqual([
      'field-orderId-string',
      'field-orderId-number',
    ]);
    expect(edges.map((edge) => edge.label)).toEqual(expect.arrayContaining(['contains (string)', 'contains (number)']));
  });

  it('returns the graph without laying it out when layout is false', async () => {
    const { nodes, edges } = await getNodesAndEdges({ fieldPath: 'orderId', fieldType: 'string', occurrences, layout: false });

    for (const node of nodes) {
      expect(node.position).toEqual({ x: 0, y: 0 });
    }
    for (const edge of edges) {
      expect(edge.data?.route).toBeUndefined();
    }
  });
});
