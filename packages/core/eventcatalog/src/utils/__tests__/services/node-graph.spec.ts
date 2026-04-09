import { MarkerType } from '@xyflow/react';
import { getNodesAndEdges } from '../../node-graphs/services-node-graph';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import {
  mockCommands,
  mockEvents,
  mockQueries,
  mockServices,
  mockChannels,
  mockContainers,
  mockGroupedService,
  mockGroupedEvents,
  mockGroupedCommands,
  mockGroupedServiceWithChannels,
  mockGroupedChannelEvents,
  mockGroupedChannels,
  mockShipmentConsumerService,
  mockPickProducerService,
} from './mocks';
import type { CollectionKey } from 'astro:content';
import { getCollection } from 'astro:content';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: vi.fn(),
  };
});

describe('Services NodeGraph', () => {
  beforeEach(() => {
    vi.mocked(getCollection).mockImplementation(((key: CollectionKey) => {
      switch (key) {
        case 'services':
          return Promise.resolve(mockServices);
        case 'channels':
          return Promise.resolve(mockChannels);
        case 'events':
          return Promise.resolve(mockEvents);
        case 'commands':
          return Promise.resolve(mockCommands);
        case 'queries':
          return Promise.resolve(mockQueries);
        case 'containers':
          return Promise.resolve(mockContainers);
        default:
          return Promise.resolve([]);
      }
    }) as any);
  });

  describe('getNodesAndEdges', () => {
    it('should return nodes and edges for a given service', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'OrderService', version: '1.0.0' });

      // The middle node itself, the service
      const expectedServiceNode = {
        id: 'OrderService-1.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', service: { ...mockServices[0].data } }),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      // Nodes coming into the service (left)
      const expectedRecivesNode = {
        id: 'PaymentProcessed-0.0.1',
        type: 'commands',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', message: { ...mockCommands[0].data } }),
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      // Nodes going out of the service (right)
      const expectedSendsNode = {
        id: 'OrderCreatedEvent-0.0.1',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', message: { ...mockEvents[0].data } }),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
      };

      const expectedOrderDatabaseNode = {
        id: 'OrderDatabase-1.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', data: { ...mockContainers[0].data } }),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'data',
      };

      const expectedPaymentDatabaseNode = {
        id: 'PaymentDatabase-1.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', data: { ...mockContainers[1].data } }),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'data',
      };

      const expectedEdges = expect.arrayContaining([
        expect.objectContaining({
          label: 'accepts',
          animated: false,
          id: 'PaymentProcessed-0.0.1-OrderService-1.0.0-warning',
          source: 'PaymentProcessed-0.0.1',
          target: 'OrderService-1.0.0',
        }),
        expect.objectContaining({
          id: 'OrderService-1.0.0-OrderDatabase-1.0.0',
          source: 'OrderService-1.0.0',
          target: 'OrderDatabase-1.0.0',
          type: 'multiline',
        }),
        expect.objectContaining({
          label: 'reads from \n (undefined)',
          id: 'OrderService-1.0.0-PaymentDatabase-1.0.0',
          source: 'PaymentDatabase-1.0.0',
          target: 'OrderService-1.0.0',
          type: 'multiline',
        }),
        expect.objectContaining({
          label: 'publishes \nevent',
          animated: false,
          id: 'OrderService-1.0.0-OrderCreatedEvent-0.0.1',
          source: 'OrderService-1.0.0',
          target: 'OrderCreatedEvent-0.0.1',
        }),
      ]);

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedRecivesNode),

          // The data node
          expect.objectContaining(expectedOrderDatabaseNode),
          expect.objectContaining(expectedPaymentDatabaseNode),

          // The service node itself
          expect.objectContaining(expectedServiceNode),

          // Nodes on the right
          expect.objectContaining(expectedSendsNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('if a message is sent and received by the same service it will render a custom edge', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'NotificationsService', version: '1.0.0' });

      // The middle node itself, the service
      const expectedServiceNode = {
        id: 'NotificationsService-1.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', service: { ...mockServices[3].data } }),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      // Nodes coming into the service (left)
      const expectedRecivesNode = {
        id: 'OrderCreatedEvent-2.0.0',
        type: 'events',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', message: { ...mockEvents[3].data } }),
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      // Nodes going out of the service (right)
      const expectedSendsNode = {
        id: 'OrderCreatedEvent-2.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', message: { ...mockEvents[3].data } }),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
      };

      const expectedEdges = expect.arrayContaining([
        expect.objectContaining({
          id: 'OrderCreatedEvent-2.0.0-NotificationsService-1.0.0',
          source: 'OrderCreatedEvent-2.0.0',
          target: 'NotificationsService-1.0.0',
        }),
        expect.objectContaining({
          id: 'NotificationsService-1.0.0-OrderCreatedEvent-2.0.0',
          source: 'NotificationsService-1.0.0',
          target: 'OrderCreatedEvent-2.0.0',
        }),
        expect.objectContaining({
          id: 'NotificationsService-1.0.0-OrderCreatedEvent-2.0.0-both',
          source: 'NotificationsService-1.0.0',
          target: 'OrderCreatedEvent-2.0.0',
        }),
      ]);

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedRecivesNode),

          // The service node itself
          expect.objectContaining(expectedServiceNode),

          // Nodes on the right
          expect.objectContaining(expectedSendsNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('returns empty nodes and edges if no service is found', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'UnknownService', version: '1.0.0' });

      expect(nodes).toEqual([]);
      expect(edges).toEqual([]);
    });

    it('should return nodes and edges for a given service using semver range', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'InventoryService', version: '1.0.0' });

      // The middle node itself, the service
      const expectedServiceNode = {
        id: 'InventoryService-1.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', service: { ...mockServices[1].data } }),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      // Nodes coming into the service (left)
      const expectedRecivesNode = {
        id: 'OrderCreatedEvent-1.3.9',
        type: 'events',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', message: { ...mockEvents[2].data } }),
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      // Nodes going out of the service (right)
      const expectedSendsNode = {
        id: 'InventoryAdjusted-2.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', message: { ...mockEvents[7].data } }),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'events',
      };

      const expectedEdges = expect.arrayContaining([
        expect.objectContaining({
          id: 'OrderCreatedEvent-1.3.9-InventoryService-1.0.0',
          source: 'OrderCreatedEvent-1.3.9',
          target: 'InventoryService-1.0.0',
        }),
        expect.objectContaining({
          id: 'InventoryService-1.0.0-InventoryAdjusted-2.0.0',
          source: 'InventoryService-1.0.0',
          target: 'InventoryAdjusted-2.0.0',
        }),
      ]);

      expect(nodes).toEqual(
        expect.arrayContaining([
          // Nodes on the left
          expect.objectContaining(expectedRecivesNode),

          // The service node itself
          expect.objectContaining(expectedServiceNode),

          // Nodes on the right
          expect.objectContaining(expectedSendsNode),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('creates a channel node between the service and message if the service defined a channel', async () => {
      const { nodes, edges } = await getNodesAndEdges({ id: 'PaymentService', version: '1.0.0' });

      // The middle node itself, the service
      const expectedServiceNode = {
        id: 'PaymentService-1.0.0',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', service: { ...mockServices[2].data } }),
        position: { x: expect.any(Number), y: expect.any(Number) },
        type: 'services',
      };

      const expectedConsumedMessageWithoutChannel = {
        id: 'OrderCreatedEvent-2.0.0',
        type: 'events',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', message: expect.anything() }),
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedConsumedMessageWithChannel = {
        id: 'OrderDeletedEvent-2.0.0',
        type: 'events',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', message: expect.anything() }),
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedChannelNode = {
        id: 'EmailChannel-1.0.0',
        type: 'channels',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', channel: expect.anything() }),
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      // Message coming into the service with a channel
      const expectedProducedMessage = {
        id: 'PaymentPaid-2.0.0',
        type: 'events',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', message: expect.anything() }),
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      // Message coming into the service with a channel
      const expectedChannelAfterProducedMessage = {
        id: 'EmailChannel-1.0.0',
        type: 'channels',
        sourcePosition: 'right',
        targetPosition: 'left',
        data: expect.objectContaining({ mode: 'simple', channel: expect.anything() }),
        position: { x: expect.any(Number), y: expect.any(Number) },
      };

      const expectedEdges = expect.arrayContaining([
        // The service to the message (it publishes)
        expect.objectContaining({
          id: 'PaymentService-1.0.0-PaymentPaid-2.0.0',
          source: 'PaymentService-1.0.0',
          target: 'PaymentPaid-2.0.0',
        }),
        // The Message to the channel defined by the producing service
        expect.objectContaining({
          id: 'PaymentPaid-2.0.0-EmailChannel-1.0.0',
          source: 'PaymentPaid-2.0.0',
          target: 'EmailChannel-1.0.0',
        }),

        // The consumed message with no channel defined
        // We expect to to connect to the service
        expect.objectContaining({
          id: 'OrderCreatedEvent-2.0.0-PaymentService-1.0.0',
          source: 'OrderCreatedEvent-2.0.0',
          target: 'PaymentService-1.0.0',
        }),

        // The consume message with a channel defined
        expect.objectContaining({
          id: 'OrderDeletedEvent-2.0.0-EmailChannel-1.0.0',
          source: 'OrderDeletedEvent-2.0.0',
          target: 'EmailChannel-1.0.0',
        }),
      ]);

      expect(nodes).toEqual(
        expect.arrayContaining([
          // message the service consumes
          expect.objectContaining(expectedConsumedMessageWithoutChannel),

          // message the service consumes with a channel
          expect.objectContaining(expectedConsumedMessageWithChannel),

          // The channel node
          expect.objectContaining(expectedChannelNode),

          // The service node itself
          expect.objectContaining(expectedServiceNode),

          // message on the right of the service
          expect.objectContaining(expectedProducedMessage),

          expect.objectContaining(expectedChannelAfterProducedMessage),
        ])
      );

      expect(edges).toEqual(expectedEdges);
    });

    it('when `renderMessages` is false it should not render any messages or channels', async () => {
      const { nodes } = await getNodesAndEdges({ id: 'PaymentService', version: '1.0.0', renderMessages: false });

      const hasMessages = nodes.some((node) => node.type === 'events' || node.type === 'commands' || node.type === 'queries');
      const hasChannels = nodes.some((node) => node.type === 'channels');

      expect(hasMessages).toBe(false);
      expect(hasChannels).toBe(false);
    });

    it('will render any container (data) that the service writes to or reads from', async () => {
      const { nodes } = await getNodesAndEdges({ id: 'OrderService', version: '1.0.0' });

      const hasContainers = nodes.some((node) => node.type === 'data');
      expect(hasContainers).toBe(true);
    });

    describe('message grouping', () => {
      it('should collapse grouped sends into messageGroup nodes', async () => {
        vi.mocked(getCollection).mockImplementation(((key: any) => {
          switch (key) {
            case 'services':
              return Promise.resolve([mockGroupedService]);
            case 'events':
              return Promise.resolve([...mockGroupedEvents]);
            case 'commands':
              return Promise.resolve([...mockGroupedCommands]);
            default:
              return Promise.resolve([]);
          }
        }) as any);

        const { nodes } = await getNodesAndEdges({ id: 'StudentInfoService', version: '1.0.0' });

        const groupNodes = nodes.filter((n: any) => n.type === 'messageGroup');
        expect(groupNodes).toHaveLength(3); // 'Academic Structure' sends, 'Student Lifecycle' sends, 'Student Lifecycle' receives

        const academicGroup = groupNodes.find((n: any) => n.data.groupName === 'Academic Structure');
        expect(academicGroup).toBeDefined();
        expect(academicGroup.data.messageCount).toBe(2);
        expect(academicGroup.data.direction).toBe('sends');

        // GradeRecorded should still be an individual event node (ungrouped)
        const gradeNode = nodes.find((n: any) => n.id === 'GradeRecorded-1.0.0');
        expect(gradeNode).toBeDefined();
        expect(gradeNode.type).toBe('events');
      });

      it('should create edges from service to group nodes', async () => {
        vi.mocked(getCollection).mockImplementation(((key: any) => {
          switch (key) {
            case 'services':
              return Promise.resolve([mockGroupedService]);
            case 'events':
              return Promise.resolve([...mockGroupedEvents]);
            case 'commands':
              return Promise.resolve([...mockGroupedCommands]);
            default:
              return Promise.resolve([]);
          }
        }) as any);

        const { edges } = await getNodesAndEdges({ id: 'StudentInfoService', version: '1.0.0' });

        const serviceId = 'StudentInfoService-1.0.0';
        const groupEdges = edges.filter(
          (e: any) =>
            (e.source === serviceId || e.target === serviceId) &&
            (e.source.startsWith('message-group-') || e.target.startsWith('message-group-'))
        );
        expect(groupEdges.length).toBeGreaterThanOrEqual(2);
      });

      it('should skip bothSentAndReceived edge for grouped messages', async () => {
        const bothWayService = {
          ...mockGroupedService,
          data: {
            ...mockGroupedService.data,
            id: 'BothWayService',
            version: '1.0.0',
            sends: [{ id: 'SharedEvent', version: '1.0.0', group: 'Shared' }],
            receives: [{ id: 'SharedEvent', version: '1.0.0', group: 'Shared' }],
          },
        };
        const sharedEvent = { data: { id: 'SharedEvent', version: '1.0.0', name: 'SharedEvent' }, collection: 'events' };

        vi.mocked(getCollection).mockImplementation(((key: any) => {
          switch (key) {
            case 'services':
              return Promise.resolve([bothWayService]);
            case 'events':
              return Promise.resolve([sharedEvent]);
            default:
              return Promise.resolve([]);
          }
        }) as any);

        const { edges } = await getNodesAndEdges({ id: 'BothWayService', version: '1.0.0' });

        const bothEdges = edges.filter((e: any) => e.id?.includes('-both'));
        expect(bothEdges).toHaveLength(0);
      });

      describe('group node expansion data (downstream channels, producers, consumers)', () => {
        beforeEach(() => {
          vi.mocked(getCollection).mockImplementation(((key: any) => {
            switch (key) {
              case 'services':
                return Promise.resolve([mockGroupedServiceWithChannels, mockShipmentConsumerService, mockPickProducerService]);
              case 'events':
                return Promise.resolve(mockGroupedChannelEvents.filter((e) => e.collection === 'events'));
              case 'commands':
                return Promise.resolve(mockGroupedChannelEvents.filter((e) => e.collection === 'commands'));
              case 'channels':
                return Promise.resolve(mockGroupedChannels);
              default:
                return Promise.resolve([]);
            }
          }) as any);
        });

        it('group node data should include pre-computed expandedNodes and expandedEdges arrays', async () => {
          const { nodes } = await getNodesAndEdges({ id: 'WarehouseService', version: '1.0.0' });

          const groupNodes = nodes.filter((n: any) => n.type === 'messageGroup');
          expect(groupNodes.length).toBeGreaterThanOrEqual(1);

          for (const groupNode of groupNodes) {
            expect(Array.isArray(groupNode.data.expandedNodes)).toBe(true);
            expect(Array.isArray(groupNode.data.expandedEdges)).toBe(true);
          }
        });

        it('sends group expandedNodes should include the channel node when a message routes to a channel', async () => {
          const { nodes } = await getNodesAndEdges({ id: 'WarehouseService', version: '1.0.0' });

          const shippingGroup = nodes.find(
            (n: any) => n.type === 'messageGroup' && n.data.direction === 'sends' && n.data.groupName === 'Shipping'
          );

          const expandedNodeIds = shippingGroup.data.expandedNodes.map((n: any) => n.id);
          expect(expandedNodeIds).toContain('ShippingChannel-1.0.0');
        });

        it('sends group expandedNodes should include consumer services downstream of the grouped messages', async () => {
          const { nodes } = await getNodesAndEdges({ id: 'WarehouseService', version: '1.0.0' });

          const shippingGroup = nodes.find(
            (n: any) => n.type === 'messageGroup' && n.data.direction === 'sends' && n.data.groupName === 'Shipping'
          );

          const expandedNodeIds = shippingGroup.data.expandedNodes.map((n: any) => n.id);
          expect(expandedNodeIds).toContain('DeliveryService-1.0.0');
        });

        it('receives group expandedNodes should include the channel node when a message comes from a channel', async () => {
          const { nodes } = await getNodesAndEdges({ id: 'WarehouseService', version: '1.0.0' });

          const pickingGroup = nodes.find(
            (n: any) => n.type === 'messageGroup' && n.data.direction === 'receives' && n.data.groupName === 'Picking'
          );

          const expandedNodeIds = pickingGroup.data.expandedNodes.map((n: any) => n.id);
          expect(expandedNodeIds).toContain('PickChannel-1.0.0');
        });

        it('receives group expandedNodes should include producer services upstream of the grouped messages', async () => {
          const { nodes } = await getNodesAndEdges({ id: 'WarehouseService', version: '1.0.0' });

          const pickingGroup = nodes.find(
            (n: any) => n.type === 'messageGroup' && n.data.direction === 'receives' && n.data.groupName === 'Picking'
          );

          const expandedNodeIds = pickingGroup.data.expandedNodes.map((n: any) => n.id);
          expect(expandedNodeIds).toContain('WMSService-1.0.0');
        });

        it('sends group expandedEdges should include the edge from message to channel', async () => {
          const { nodes } = await getNodesAndEdges({ id: 'WarehouseService', version: '1.0.0' });

          const shippingGroup = nodes.find(
            (n: any) => n.type === 'messageGroup' && n.data.direction === 'sends' && n.data.groupName === 'Shipping'
          );

          expect(shippingGroup.data.expandedEdges).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                source: 'ShipmentDispatched-1.0.0',
                target: 'ShippingChannel-1.0.0',
              }),
            ])
          );
        });

        it('expandedNodes should never contain the service node itself', async () => {
          const { nodes } = await getNodesAndEdges({ id: 'WarehouseService', version: '1.0.0' });

          const groupNodes = nodes.filter((n: any) => n.type === 'messageGroup');
          for (const groupNode of groupNodes) {
            const expandedNodeIds = groupNode.data.expandedNodes.map((n: any) => n.id);
            expect(expandedNodeIds).not.toContain('WarehouseService-1.0.0');
          }
        });

        it('expandedNodes should never contain the grouped message nodes themselves', async () => {
          const { nodes } = await getNodesAndEdges({ id: 'WarehouseService', version: '1.0.0' });

          const shippingGroup = nodes.find(
            (n: any) => n.type === 'messageGroup' && n.data.direction === 'sends' && n.data.groupName === 'Shipping'
          );

          const expandedNodeIds = shippingGroup.data.expandedNodes.map((n: any) => n.id);
          expect(expandedNodeIds).not.toContain('ShipmentDispatched-1.0.0');
          expect(expandedNodeIds).not.toContain('ShipmentFailed-1.0.0');
        });

        it('expandedEdges should never contain direct service-to-message edges', async () => {
          const { nodes } = await getNodesAndEdges({ id: 'WarehouseService', version: '1.0.0' });

          const groupNodes = nodes.filter((n: any) => n.type === 'messageGroup');
          for (const groupNode of groupNodes) {
            const messageIds = groupNode.data.messages.map((m: any) => `${m.message.data.id}-${m.message.data.version}`);
            const directEdges = groupNode.data.expandedEdges.filter(
              (e: any) =>
                (e.source === 'WarehouseService-1.0.0' && messageIds.includes(e.target)) ||
                (e.target === 'WarehouseService-1.0.0' && messageIds.includes(e.source))
            );
            expect(directEdges).toHaveLength(0);
          }
        });
      });

      it('group node message data should include pre-computed operation fields (method, path)', async () => {
        const serviceWithOps = {
          ...mockGroupedServiceWithChannels,
          data: {
            ...mockGroupedServiceWithChannels.data,
            id: 'OpService',
            version: '1.0.0',
            sends: [{ id: 'ShipmentDispatched', version: '1.0.0', group: 'Ops' }],
            receives: [],
          },
        };
        const eventWithOps = {
          data: {
            id: 'ShipmentDispatched',
            version: '1.0.0',
            name: 'ShipmentDispatched',
            operation: { method: 'POST', path: '/shipments' },
          },
          collection: 'events',
        };

        vi.mocked(getCollection).mockImplementation(((key: any) => {
          switch (key) {
            case 'services':
              return Promise.resolve([serviceWithOps]);
            case 'events':
              return Promise.resolve([eventWithOps]);
            default:
              return Promise.resolve([]);
          }
        }) as any);

        const { nodes } = await getNodesAndEdges({ id: 'OpService', version: '1.0.0' });
        const groupNode = nodes.find((n: any) => n.type === 'messageGroup');

        const msgData = groupNode.data.messages[0].message.data;
        expect(msgData.method).toBe('POST');
        expect(msgData.path).toBe('/shipments');
      });

      it('should render a group node even for a single-message group', async () => {
        const singleGroupService = {
          ...mockGroupedService,
          data: {
            ...mockGroupedService.data,
            id: 'SingleGroupService',
            version: '1.0.0',
            sends: [{ id: 'ProgramCreated', version: '1.0.0', group: 'Lonely Group' }],
            receives: [],
          },
        };

        vi.mocked(getCollection).mockImplementation(((key: any) => {
          switch (key) {
            case 'services':
              return Promise.resolve([singleGroupService]);
            case 'events':
              return Promise.resolve([mockGroupedEvents[0]]);
            default:
              return Promise.resolve([]);
          }
        }) as any);

        const { nodes } = await getNodesAndEdges({ id: 'SingleGroupService', version: '1.0.0' });
        const groupNodes = nodes.filter((n: any) => n.type === 'messageGroup');
        expect(groupNodes).toHaveLength(1);
        expect(groupNodes[0].data.messageCount).toBe(1);
      });
    });
  });
});
