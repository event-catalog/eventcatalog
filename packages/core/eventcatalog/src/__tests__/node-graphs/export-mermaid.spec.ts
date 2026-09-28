import { describe, it, expect } from 'vitest';
import { sanitizeMermaidId, getMermaidNodeShape, getNodeLabel, convertToMermaid } from '../../utils/node-graphs/export-mermaid';
import type { Node, Edge } from '@xyflow/react';

describe('export-mermaid', () => {
  describe('sanitizeMermaidId', () => {
    it('should replace dots with underscores', () => {
      expect(sanitizeMermaidId('order-1.0.0')).toBe('order_1_0_0');
    });

    it('should replace hyphens with underscores', () => {
      expect(sanitizeMermaidId('order-service')).toBe('order_service');
    });

    it('should handle mixed special characters', () => {
      expect(sanitizeMermaidId('my.service-v1.2.3')).toBe('my_service_v1_2_3');
    });

    it('should preserve alphanumeric characters', () => {
      expect(sanitizeMermaidId('OrderService123')).toBe('OrderService123');
    });

    it('should handle already valid IDs', () => {
      expect(sanitizeMermaidId('order_service_v1')).toBe('order_service_v1');
    });
  });

  describe('getMermaidNodeShape', () => {
    it('should return stadium shape for services', () => {
      expect(getMermaidNodeShape('services')).toEqual(['[[', ']]']);
      expect(getMermaidNodeShape('service')).toEqual(['[[', ']]']);
    });

    it('should return flag shape for events (message-like)', () => {
      expect(getMermaidNodeShape('events')).toEqual(['>', ']']);
      expect(getMermaidNodeShape('event')).toEqual(['>', ']']);
    });

    it('should return flag shape for commands (message-like)', () => {
      expect(getMermaidNodeShape('commands')).toEqual(['>', ']']);
      expect(getMermaidNodeShape('command')).toEqual(['>', ']']);
    });

    it('should return hexagon shape for queries', () => {
      expect(getMermaidNodeShape('queries')).toEqual(['{{', '}}']);
      expect(getMermaidNodeShape('query')).toEqual(['{{', '}}']);
    });

    it('should return cylinder shape for channels', () => {
      expect(getMermaidNodeShape('channels')).toEqual(['[(', ')]']);
      expect(getMermaidNodeShape('channel')).toEqual(['[(', ')]']);
    });

    it('should return rectangle shape for domains', () => {
      expect(getMermaidNodeShape('domains')).toEqual(['[', ']']);
      expect(getMermaidNodeShape('domain')).toEqual(['[', ']']);
    });

    it('should return rectangle for unknown types', () => {
      expect(getMermaidNodeShape('unknown')).toEqual(['[', ']']);
    });
  });

  describe('getNodeLabel', () => {
    it('should extract label from a system node', () => {
      const node: Node = {
        id: 'step-thrivemap',
        type: 'systems',
        position: { x: 0, y: 0 },
        data: {
          system: {
            id: 'thrivemap',
            name: 'Thrivemap',
            version: '0.0.1',
          },
        },
      };
      expect(getNodeLabel(node)).toBe('Thrivemap (0.0.1)');
      expect(getMermaidNodeShape('systems')).toEqual(['[[', ']]']);
    });

    it('should extract label from service node', () => {
      const node: Node = {
        id: 'order-service-1.0.0',
        type: 'services',
        position: { x: 0, y: 0 },
        data: {
          service: {
            id: 'order-service',
            name: 'Order Service',
            version: '1.0.0',
          },
        },
      };
      expect(getNodeLabel(node)).toBe('Order Service (1.0.0)');
    });

    it('should fallback to id if name is missing for service', () => {
      const node: Node = {
        id: 'order-service-1.0.0',
        type: 'services',
        position: { x: 0, y: 0 },
        data: {
          service: {
            id: 'order-service',
            version: '1.0.0',
          },
        },
      };
      expect(getNodeLabel(node)).toBe('order-service (1.0.0)');
    });

    it('should extract label from event node', () => {
      const node: Node = {
        id: 'order-created-1.0.0',
        type: 'events',
        position: { x: 0, y: 0 },
        data: {
          message: {
            id: 'order-created',
            name: 'OrderCreated',
            version: '1.0.0',
          },
        },
      };
      expect(getNodeLabel(node)).toBe('OrderCreated (1.0.0)');
    });

    it('should extract label from command node', () => {
      const node: Node = {
        id: 'create-order-1.0.0',
        type: 'commands',
        position: { x: 0, y: 0 },
        data: {
          message: {
            id: 'create-order',
            name: 'CreateOrder',
            version: '1.0.0',
          },
        },
      };
      expect(getNodeLabel(node)).toBe('CreateOrder (1.0.0)');
    });

    it('should extract label from channel node', () => {
      const node: Node = {
        id: 'order-channel-1.0.0',
        type: 'channels',
        position: { x: 0, y: 0 },
        data: {
          channel: {
            id: 'order-channel',
            name: 'Order Channel',
            version: '1.0.0',
          },
        },
      };
      expect(getNodeLabel(node)).toBe('Order Channel (1.0.0)');
    });

    it('should extract label from domain node with nested data', () => {
      const node: Node = {
        id: 'orders-domain-1.0.0',
        type: 'domains',
        position: { x: 0, y: 0 },
        data: {
          domain: {
            data: {
              id: 'orders-domain',
              name: 'Orders Domain',
              version: '1.0.0',
            },
          },
        },
      };
      expect(getNodeLabel(node)).toBe('Orders Domain (1.0.0)');
    });

    it('should fallback to node id when no data', () => {
      const node: Node = {
        id: 'fallback-node',
        type: 'services',
        position: { x: 0, y: 0 },
        data: {},
      };
      expect(getNodeLabel(node)).toBe('fallback-node');
    });
  });

  describe('convertToMermaid', () => {
    it('should generate valid mermaid flowchart syntax', () => {
      const nodes: Node[] = [
        {
          id: 'order-service-1.0.0',
          type: 'services',
          position: { x: 0, y: 0 },
          data: {
            service: {
              id: 'order-service',
              name: 'Order Service',
              version: '1.0.0',
            },
          },
        },
        {
          id: 'order-created-1.0.0',
          type: 'events',
          position: { x: 100, y: 0 },
          data: {
            message: {
              id: 'order-created',
              name: 'OrderCreated',
              version: '1.0.0',
            },
          },
        },
      ];

      const edges: Edge[] = [
        {
          id: 'edge-1',
          source: 'order-service-1.0.0',
          target: 'order-created-1.0.0',
          label: 'publishes',
        },
      ];

      const result = convertToMermaid(nodes, edges);

      expect(result).toContain('flowchart LR');
      expect(result).toContain('order_service_1_0_0[["Order Service (1.0.0)"]]');
      expect(result).toContain('order_created_1_0_0>"OrderCreated (1.0.0)"]');
      expect(result).toContain('order_service_1_0_0 -->|"publishes"| order_created_1_0_0');
    });

    it('should include style class definitions when includeStyles is true', () => {
      const nodes: Node[] = [
        {
          id: 'service-1',
          type: 'services',
          position: { x: 0, y: 0 },
          data: { service: { id: 'service-1', name: 'Service 1' } },
        },
      ];

      const result = convertToMermaid(nodes, [], { includeStyles: true });

      expect(result).toContain('classDef services');
      expect(result).toContain(':::services');
    });

    it('should not include style classes when includeStyles is false', () => {
      const nodes: Node[] = [
        {
          id: 'service-1',
          type: 'services',
          position: { x: 0, y: 0 },
          data: { service: { id: 'service-1', name: 'Service 1' } },
        },
      ];

      const result = convertToMermaid(nodes, [], { includeStyles: false });

      expect(result).not.toContain('classDef');
      expect(result).not.toContain(':::');
    });

    it('should support different flowchart directions', () => {
      const nodes: Node[] = [
        {
          id: 'service-1',
          type: 'services',
          position: { x: 0, y: 0 },
          data: { service: { id: 'service-1', name: 'Service 1' } },
        },
      ];

      expect(convertToMermaid(nodes, [], { direction: 'TB' })).toContain('flowchart TB');
      expect(convertToMermaid(nodes, [], { direction: 'RL' })).toContain('flowchart RL');
      expect(convertToMermaid(nodes, [], { direction: 'BT' })).toContain('flowchart BT');
    });

    it('should handle edges without labels', () => {
      const nodes: Node[] = [
        {
          id: 'a',
          type: 'services',
          position: { x: 0, y: 0 },
          data: { service: { id: 'a', name: 'A' } },
        },
        {
          id: 'b',
          type: 'events',
          position: { x: 100, y: 0 },
          data: { message: { id: 'b', name: 'B' } },
        },
      ];

      const edges: Edge[] = [
        {
          id: 'edge-1',
          source: 'a',
          target: 'b',
        },
      ];

      const result = convertToMermaid(nodes, edges);

      expect(result).toContain('a --> b');
      expect(result).not.toContain('-->|');
    });

    it('should escape special characters in labels', () => {
      const nodes: Node[] = [
        {
          id: 'service-1',
          type: 'services',
          position: { x: 0, y: 0 },
          data: { service: { id: 'service-1', name: 'Service "One"' } },
        },
      ];

      const result = convertToMermaid(nodes, []);

      expect(result).toContain('Service #quot;One#quot;');
    });

    it('should handle multiline edge labels', () => {
      const nodes: Node[] = [
        {
          id: 'a',
          type: 'services',
          position: { x: 0, y: 0 },
          data: { service: { id: 'a', name: 'A' } },
        },
        {
          id: 'b',
          type: 'events',
          position: { x: 100, y: 0 },
          data: { message: { id: 'b', name: 'B' } },
        },
      ];

      const edges: Edge[] = [
        {
          id: 'edge-1',
          source: 'a',
          target: 'b',
          label: 'publishes\nevent',
        },
      ];

      const result = convertToMermaid(nodes, edges);

      // Multiline labels should be converted to single line
      expect(result).toContain('publishes event');
    });

    it('should handle various node types correctly', () => {
      const nodes: Node[] = [
        {
          id: 'svc',
          type: 'services',
          position: { x: 0, y: 0 },
          data: { service: { id: 'svc', name: 'Service' } },
        },
        {
          id: 'evt',
          type: 'events',
          position: { x: 100, y: 0 },
          data: { message: { id: 'evt', name: 'Event' } },
        },
        {
          id: 'cmd',
          type: 'commands',
          position: { x: 200, y: 0 },
          data: { message: { id: 'cmd', name: 'Command' } },
        },
        {
          id: 'qry',
          type: 'queries',
          position: { x: 300, y: 0 },
          data: { message: { id: 'qry', name: 'Query' } },
        },
        {
          id: 'chn',
          type: 'channels',
          position: { x: 400, y: 0 },
          data: { channel: { id: 'chn', name: 'Channel' } },
        },
      ];

      const result = convertToMermaid(nodes, [], { includeStyles: false });

      expect(result).toContain('svc[["Service"]]');
      expect(result).toContain('evt>"Event"]');
      expect(result).toContain('cmd>"Command"]');
      expect(result).toContain('qry{{"Query"}}');
      expect(result).toContain('chn[("Channel")]');
    });
  });

  describe('system and domain boundaries', () => {
    const nodes = [
      {
        id: 'domain-group-ordering-1.0.0',
        type: 'domain-group',
        position: { x: 0, y: 0 },
        data: { domain: { name: 'Ordering', version: '1.0.0' } },
      },
      {
        id: 'system-group-checkout-system-1.0.0',
        type: 'system-group',
        parentId: 'domain-group-ordering-1.0.0',
        position: { x: 0, y: 0 },
        data: { system: { name: 'Checkout System', version: '1.0.0' } },
      },
      {
        id: 'checkout-api-1.0.0',
        type: 'services',
        parentId: 'system-group-checkout-system-1.0.0',
        position: { x: 0, y: 0 },
        data: { service: { id: 'checkout-api', name: 'Checkout API', version: '1.0.0' } },
      },
      {
        id: 'domain-payments-1.0.0',
        type: 'context-domain',
        position: { x: 0, y: 0 },
        data: { domain: { id: 'payments', name: 'Payments', version: '1.0.0' } },
      },
      {
        id: 'fulfilment-system-1.0.0',
        type: 'systems',
        position: { x: 0, y: 0 },
        data: { system: { id: 'fulfilment-system', name: 'Fulfilment System', version: '1.0.0' } },
      },
      {
        id: 'actor-customer',
        type: 'context-actor',
        position: { x: 0, y: 0 },
        data: { name: 'Customer' },
      },
    ] as Node[];
    const edges = [
      {
        id: 'e1',
        source: 'system-group-checkout-system-1.0.0',
        target: 'domain-payments-1.0.0',
        label: 'authorizes payment with',
      },
    ] as Edge[];

    it('renders system and domain groups as nested subgraphs so containment is kept', () => {
      const result = convertToMermaid(nodes, edges, { includeStyles: false });

      expect(result).toContain(
        [
          '    subgraph domain_group_ordering_1_0_0["Ordering (1.0.0)"]',
          '        subgraph system_group_checkout_system_1_0_0["Checkout System (1.0.0)"]',
          '            checkout_api_1_0_0[["Checkout API (1.0.0)"]]',
          '        end',
          '    end',
        ].join('\n')
      );
    });

    it('lets edges connect to a group, e.g. a system talking to another domain', () => {
      const result = convertToMermaid(nodes, edges, { includeStyles: false });

      expect(result).toContain('    system_group_checkout_system_1_0_0 -->|"authorizes payment with"| domain_payments_1_0_0');
    });

    it('labels collapsed systems, other domains and actors by name', () => {
      const result = convertToMermaid(nodes, edges, { includeStyles: false });

      expect(result).toContain('domain_payments_1_0_0["Payments (1.0.0)"]');
      expect(result).toContain('fulfilment_system_1_0_0[["Fulfilment System (1.0.0)"]]');
      expect(result).toContain('actor_customer(("Customer"))');
    });

    it('renders a child whose parent is not in the graph at the top level', () => {
      const result = convertToMermaid(
        [
          {
            id: 'orphan-1.0.0',
            type: 'services',
            parentId: 'missing-group',
            position: { x: 0, y: 0 },
            data: { service: { name: 'Orphan', version: '1.0.0' } },
          },
        ] as Node[],
        [],
        { includeStyles: false }
      );

      expect(result).toContain('    orphan_1_0_0[["Orphan (1.0.0)"]]');
    });
  });

  describe('flows', () => {
    it('labels custom flow steps by their title', () => {
      const result = convertToMermaid(
        [
          {
            id: 'step-order_confirmed',
            type: 'custom',
            position: { x: 0, y: 0 },
            data: { custom: { title: 'Order Confirmed' }, step: { title: 'Order Confirmed' } },
          },
        ] as Node[],
        [],
        { includeStyles: false }
      );

      expect(result).toContain('step_order_confirmed["Order Confirmed"]');
    });
  });
});
