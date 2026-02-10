import { MarkerType } from '@xyflow/react';
import { getNodesAndEdges } from '../../node-graphs/data-products-node-graph';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import { mockCommands, mockEvents, mockQueries, mockServices, mockChannels, mockContainers, mockDataProducts } from './mocks';
import type { ContentCollectionKey } from 'astro:content';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'data-products':
          return Promise.resolve(mockDataProducts);
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
      }
    },
  };
});

describe('Data Products NodeGraph', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getNodesAndEdges', () => {
    describe('input (input ports)', () => {
      it('should return nodes and edges for messages and their producers when they are a data products inputs', async () => {
        const { nodes, edges } = await getNodesAndEdges({ id: 'OrderDataProduct', version: '1.0.0' });

        // The middle node itself, the data product
        const expectedDataProductNode = {
          id: 'OrderDataProduct-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', dataProduct: { ...mockDataProducts[0].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'data-products',
        };

        // An Event as an input to the data store
        const expectedInputNode = {
          id: 'OrderCreatedEvent-0.0.1',
          type: 'events',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', message: { ...mockEvents[0].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
        };

        const expectedProducerOfInputNode = {
          id: 'OrderService-1.0.0',
          type: 'services',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', service: { ...mockServices[0].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
        };

        const expectedEdges = expect.arrayContaining([
          // The message directly to the data product
          expect.objectContaining({
            label: 'input',
            animated: false,
            id: 'OrderCreatedEvent-0.0.1-OrderDataProduct-1.0.0',
            source: 'OrderCreatedEvent-0.0.1',
            target: 'OrderDataProduct-1.0.0',
          }),
          // The producer of the message to the data product
          expect.objectContaining({
            id: 'OrderService-1.0.0-OrderCreatedEvent-0.0.1',
            source: 'OrderService-1.0.0',
            target: 'OrderCreatedEvent-0.0.1',
            label: 'publishes \nevent',
            animated: false,
          }),
        ]);

        expect(nodes).toEqual(
          expect.arrayContaining([
            // Nodes on the left (inputs)
            expect.objectContaining(expectedInputNode),
            expect.objectContaining(expectedProducerOfInputNode),

            // The data product node itself
            expect.objectContaining(expectedDataProductNode),
          ])
        );

        expect(edges).toEqual(expectedEdges);
      });

      it('should return nodes and edges for services that are a direct input to the data product', async () => {
        const { nodes, edges } = await getNodesAndEdges({ id: 'OrderDataProduct', version: '1.0.0' });

        // The middle node itself, the data product
        const expectedDataProductNode = {
          id: 'OrderDataProduct-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', dataProduct: { ...mockDataProducts[0].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'data-products',
        };

        // The Service as an input to the data product (InventoryService is in mockDataProducts inputs)
        const expectedInputNode = {
          id: 'InventoryService-1.0.0',
          type: 'services',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', service: { ...mockServices[1].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
        };

        const expectedEdges = expect.arrayContaining([
          // The service directly to the data product
          expect.objectContaining({
            label: 'input',
            id: 'InventoryService-1.0.0-OrderDataProduct-1.0.0',
            source: 'InventoryService-1.0.0',
            target: 'OrderDataProduct-1.0.0',
          }),
        ]);

        expect(nodes).toEqual(
          expect.arrayContaining([
            // Nodes on the left (inputs)
            expect.objectContaining(expectedInputNode),

            // The data product node itself
            expect.objectContaining(expectedDataProductNode),
          ])
        );

        expect(edges).toEqual(expectedEdges);
      });

      it('should return nodes and edges for containers that are a direct input to the data product', async () => {
        const { nodes, edges } = await getNodesAndEdges({ id: 'OrderDataProduct', version: '1.0.0' });

        // The middle node itself, the data product
        const expectedDataProductNode = {
          id: 'OrderDataProduct-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', dataProduct: { ...mockDataProducts[0].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'data-products',
        };

        // The Service as an input to the data product
        const expectedInputNode = {
          id: 'OrderDatabase-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', data: { ...mockContainers[0].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
          // @ts-ignore
          type: 'data' as any,
        };

        const expectedEdges = expect.arrayContaining([
          // The service directly to the data product
          expect.objectContaining({
            label: 'input',
            animated: false,
            id: 'OrderDatabase-1.0.0-OrderDataProduct-1.0.0',
            source: 'OrderDatabase-1.0.0',
            target: 'OrderDataProduct-1.0.0',
          }),
        ]);

        expect(nodes).toEqual(
          expect.arrayContaining([
            // Nodes on the left (inputs)
            expect.objectContaining(expectedInputNode),

            // The data product node itself
            expect.objectContaining(expectedDataProductNode),
          ])
        );

        expect(edges).toEqual(expectedEdges);
      });

      it('should return nodes and edges for channels that are a direct input to the data product', async () => {
        const { nodes, edges } = await getNodesAndEdges({ id: 'OrderDataProduct', version: '1.0.0' });

        // The middle node itself, the data product
        const expectedDataProductNode = {
          id: 'OrderDataProduct-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', dataProduct: { ...mockDataProducts[0].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'data-products',
        };

        // The Channel as an input to the data product (EmailChannel is mockChannels[0])
        const expectedInputNode = {
          id: 'EmailChannel-1.0.0',
          type: 'channels',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', channel: { ...mockChannels[0].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
        };

        const expectedEdges = expect.arrayContaining([
          // The channel directly to the data product
          expect.objectContaining({
            label: 'input',
            id: 'EmailChannel-1.0.0-OrderDataProduct-1.0.0',
            source: 'EmailChannel-1.0.0',
            target: 'OrderDataProduct-1.0.0',
          }),
        ]);

        expect(nodes).toEqual(
          expect.arrayContaining([
            // Nodes on the left (inputs)
            expect.objectContaining(expectedInputNode),

            // The data product node itself
            expect.objectContaining(expectedDataProductNode),
          ])
        );

        expect(edges).toEqual(expectedEdges);
      });
    });

    describe('output (output ports)', () => {
      it('should return nodes and edges for output messages from the data product', async () => {
        const { nodes, edges } = await getNodesAndEdges({ id: 'OrderDataProduct', version: '1.0.0' });

        // The middle node itself, the data product
        const expectedDataProductNode = {
          id: 'OrderDataProduct-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', dataProduct: { ...mockDataProducts[0].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'data-products',
        };

        // An Event as an output from the data product
        const expectedOutputNode = {
          id: 'OrderAnalyticsEvent-1.0.0',
          type: 'events',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', message: { ...mockEvents[13].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
        };

        const expectedEdges = expect.arrayContaining([
          // The data product to the output message
          expect.objectContaining({
            label: 'output',
            animated: false,
            id: 'OrderDataProduct-1.0.0-OrderAnalyticsEvent-1.0.0',
            source: 'OrderDataProduct-1.0.0',
            target: 'OrderAnalyticsEvent-1.0.0',
          }),
        ]);

        expect(nodes).toEqual(
          expect.arrayContaining([
            // The data product node itself
            expect.objectContaining(expectedDataProductNode),

            // Nodes on the right (outputs)
            expect.objectContaining(expectedOutputNode),
          ])
        );

        expect(edges).toEqual(expectedEdges);
      });

      it('should return nodes and edges for services that are a direct output from the data product', async () => {
        const { nodes, edges } = await getNodesAndEdges({ id: 'OrderDataProduct', version: '1.0.0' });

        // The middle node itself, the data product
        const expectedDataProductNode = {
          id: 'OrderDataProduct-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', dataProduct: { ...mockDataProducts[0].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'data-products',
        };

        // The Service as an output from the data product (ReportingService is mockServices[5])
        const expectedOutputNode = {
          id: 'ReportingService-1.0.0',
          type: 'services',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', service: { ...mockServices[5].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
        };

        const expectedEdges = expect.arrayContaining([
          // The data product directly to the service
          expect.objectContaining({
            label: 'output',
            id: 'OrderDataProduct-1.0.0-ReportingService-1.0.0',
            source: 'OrderDataProduct-1.0.0',
            target: 'ReportingService-1.0.0',
          }),
        ]);

        expect(nodes).toEqual(
          expect.arrayContaining([
            // Nodes on the right (outputs)
            expect.objectContaining(expectedOutputNode),

            // The data product node itself
            expect.objectContaining(expectedDataProductNode),
          ])
        );

        expect(edges).toEqual(expectedEdges);
      });

      it('should return nodes and edges for containers that are a direct output from the data product', async () => {
        const { nodes, edges } = await getNodesAndEdges({ id: 'OrderDataProduct', version: '1.0.0' });

        // The middle node itself, the data product
        const expectedDataProductNode = {
          id: 'OrderDataProduct-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', dataProduct: { ...mockDataProducts[0].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'data-products',
        };

        // The Container as an output from the data product (PaymentDatabase is mockContainers[1])
        const expectedOutputNode = {
          id: 'PaymentDatabase-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', data: { ...mockContainers[1].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'data' as any,
        };

        const expectedEdges = expect.arrayContaining([
          // The data product directly to the container
          expect.objectContaining({
            label: 'output',
            id: 'OrderDataProduct-1.0.0-PaymentDatabase-1.0.0',
            source: 'OrderDataProduct-1.0.0',
            target: 'PaymentDatabase-1.0.0',
          }),
        ]);

        expect(nodes).toEqual(
          expect.arrayContaining([
            // Nodes on the right (outputs)
            expect.objectContaining(expectedOutputNode),

            // The data product node itself
            expect.objectContaining(expectedDataProductNode),
          ])
        );

        expect(edges).toEqual(expectedEdges);
      });

      it('should return nodes and edges for channels that are a direct output from the data product', async () => {
        const { nodes, edges } = await getNodesAndEdges({ id: 'OrderDataProduct', version: '1.0.0' });

        // The middle node itself, the data product
        const expectedDataProductNode = {
          id: 'OrderDataProduct-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', dataProduct: { ...mockDataProducts[0].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'data-products',
        };

        // The Channel as an output from the data product (OrderChannel is mockChannels[1])
        const expectedOutputNode = {
          id: 'OrderChannel-1.0.0',
          type: 'channels',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: { mode: 'simple', channel: { ...mockChannels[1].data } },
          position: { x: expect.any(Number), y: expect.any(Number) },
        };

        const expectedEdges = expect.arrayContaining([
          // The data product directly to the channel
          expect.objectContaining({
            label: 'output',
            id: 'OrderDataProduct-1.0.0-OrderChannel-1.0.0',
            source: 'OrderDataProduct-1.0.0',
            target: 'OrderChannel-1.0.0',
          }),
        ]);

        expect(nodes).toEqual(
          expect.arrayContaining([
            // Nodes on the right (outputs)
            expect.objectContaining(expectedOutputNode),

            // The data product node itself
            expect.objectContaining(expectedDataProductNode),
          ])
        );

        expect(edges).toEqual(expectedEdges);
      });
    });

    // it('if a message is sent and received by the same service it will render a custom edge', async () => {
    //   const { nodes, edges } = await getNodesAndEdges({ id: 'NotificationsService', version: '1.0.0' });

    //   // The middle node itself, the service
    //   const expectedServiceNode = {
    //     id: 'NotificationsService-1.0.0',
    //     sourcePosition: 'right',
    //     targetPosition: 'left',
    //     data: { mode: 'simple', service: { ...mockServices[3].data } },
    //     position: { x: expect.any(Number), y: expect.any(Number) },
    //     type: 'services',
    //   };

    //   // Nodes coming into the service (left)
    //   const expectedRecivesNode = {
    //     id: 'OrderCreatedEvent-2.0.0',
    //     type: 'events',
    //     sourcePosition: 'right',
    //     targetPosition: 'left',
    //     data: { mode: 'simple', message: { ...mockEvents[3].data } },
    //     position: { x: expect.any(Number), y: expect.any(Number) },
    //   };

    //   // Nodes going out of the service (right)
    //   const expectedSendsNode = {
    //     id: 'OrderCreatedEvent-2.0.0',
    //     sourcePosition: 'right',
    //     targetPosition: 'left',
    //     data: { mode: 'simple', message: { ...mockEvents[3].data } },
    //     position: { x: expect.any(Number), y: expect.any(Number) },
    //     type: 'events',
    //   };

    //   const expectedEdges = expect.arrayContaining([
    //     expect.objectContaining({
    //       id: 'OrderCreatedEvent-2.0.0-NotificationsService-1.0.0',
    //       source: 'OrderCreatedEvent-2.0.0',
    //       target: 'NotificationsService-1.0.0',
    //     }),
    //     expect.objectContaining({
    //       id: 'NotificationsService-1.0.0-OrderCreatedEvent-2.0.0',
    //       source: 'NotificationsService-1.0.0',
    //       target: 'OrderCreatedEvent-2.0.0',
    //     }),
    //     expect.objectContaining({
    //       id: 'NotificationsService-1.0.0-OrderCreatedEvent-2.0.0-both',
    //       source: 'NotificationsService-1.0.0',
    //       target: 'OrderCreatedEvent-2.0.0',
    //     }),
    //   ]);

    //   expect(nodes).toEqual(
    //     expect.arrayContaining([
    //       // Nodes on the left
    //       expect.objectContaining(expectedRecivesNode),

    //       // The service node itself
    //       expect.objectContaining(expectedServiceNode),

    //       // Nodes on the right
    //       expect.objectContaining(expectedSendsNode),
    //     ])
    //   );

    //   expect(edges).toEqual(expectedEdges);
    // });

    // it('returns empty nodes and edges if no service is found', async () => {
    //   const { nodes, edges } = await getNodesAndEdges({ id: 'UnknownService', version: '1.0.0' });

    //   expect(nodes).toEqual([]);
    //   expect(edges).toEqual([]);
    // });

    // it('should return nodes and edges for a given service using semver range', async () => {
    //   const { nodes, edges } = await getNodesAndEdges({ id: 'InventoryService', version: '1.0.0' });

    //   // The middle node itself, the service
    //   const expectedServiceNode = {
    //     id: 'InventoryService-1.0.0',
    //     sourcePosition: 'right',
    //     targetPosition: 'left',
    //     data: { mode: 'simple', service: { ...mockServices[1].data } },
    //     position: { x: expect.any(Number), y: expect.any(Number) },
    //     type: 'services',
    //   };

    //   // Nodes coming into the service (left)
    //   const expectedRecivesNode = {
    //     id: 'OrderCreatedEvent-1.3.9',
    //     type: 'events',
    //     sourcePosition: 'right',
    //     targetPosition: 'left',
    //     data: { mode: 'simple', message: { ...mockEvents[2].data } },
    //     position: { x: expect.any(Number), y: expect.any(Number) },
    //   };

    //   // Nodes going out of the service (right)
    //   const expectedSendsNode = {
    //     id: 'InventoryAdjusted-2.0.0',
    //     sourcePosition: 'right',
    //     targetPosition: 'left',
    //     data: { mode: 'simple', message: { ...mockEvents[7].data } },
    //     position: { x: expect.any(Number), y: expect.any(Number) },
    //     type: 'events',
    //   };

    //   const expectedEdges = expect.arrayContaining([
    //     expect.objectContaining({
    //       id: 'OrderCreatedEvent-1.3.9-InventoryService-1.0.0',
    //       source: 'OrderCreatedEvent-1.3.9',
    //       target: 'InventoryService-1.0.0',
    //     }),
    //     expect.objectContaining({
    //       id: 'InventoryService-1.0.0-InventoryAdjusted-2.0.0',
    //       source: 'InventoryService-1.0.0',
    //       target: 'InventoryAdjusted-2.0.0',
    //     }),
    //   ]);

    //   expect(nodes).toEqual(
    //     expect.arrayContaining([
    //       // Nodes on the left
    //       expect.objectContaining(expectedRecivesNode),

    //       // The service node itself
    //       expect.objectContaining(expectedServiceNode),

    //       // Nodes on the right
    //       expect.objectContaining(expectedSendsNode),
    //     ])
    //   );

    //   expect(edges).toEqual(expectedEdges);
    // });

    // it('creates a channel node between the service and message if the service defined a channel', async () => {
    //   const { nodes, edges } = await getNodesAndEdges({ id: 'PaymentService', version: '1.0.0' });

    //   // The middle node itself, the service
    //   const expectedServiceNode = {
    //     id: 'PaymentService-1.0.0',
    //     sourcePosition: 'right',
    //     targetPosition: 'left',
    //     data: { mode: 'simple', service: { ...mockServices[2].data } },
    //     position: { x: expect.any(Number), y: expect.any(Number) },
    //     type: 'services',
    //   };

    //   const expectedConsumedMessageWithoutChannel = {
    //     id: 'OrderCreatedEvent-2.0.0',
    //     type: 'events',
    //     sourcePosition: 'right',
    //     targetPosition: 'left',
    //     data: { mode: 'simple', message: expect.anything() },
    //     position: { x: expect.any(Number), y: expect.any(Number) },
    //   };

    //   const expectedConsumedMessageWithChannel = {
    //     id: 'OrderDeletedEvent-2.0.0',
    //     type: 'events',
    //     sourcePosition: 'right',
    //     targetPosition: 'left',
    //     data: { mode: 'simple', message: expect.anything() },
    //     position: { x: expect.any(Number), y: expect.any(Number) },
    //   };

    //   const expectedChannelNode = {
    //     id: 'EmailChannel-1.0.0',
    //     type: 'channels',
    //     sourcePosition: 'right',
    //     targetPosition: 'left',
    //     data: { mode: 'simple', channel: expect.anything() },
    //     position: { x: expect.any(Number), y: expect.any(Number) },
    //   };

    //   // Message coming into the service with a channel
    //   const expectedProducedMessage = {
    //     id: 'PaymentPaid-2.0.0',
    //     type: 'events',
    //     sourcePosition: 'right',
    //     targetPosition: 'left',
    //     data: { mode: 'simple', message: expect.anything() },
    //     position: { x: expect.any(Number), y: expect.any(Number) },
    //   };

    //   // Message coming into the service with a channel
    //   const expectedChannelAfterProducedMessage = {
    //     id: 'EmailChannel-1.0.0',
    //     type: 'channels',
    //     sourcePosition: 'right',
    //     targetPosition: 'left',
    //     data: { mode: 'simple', channel: expect.anything() },
    //     position: { x: expect.any(Number), y: expect.any(Number) },
    //   };

    //   const expectedEdges = expect.arrayContaining([
    //     // The service to the message (it publishes)
    //     expect.objectContaining({
    //       id: 'PaymentService-1.0.0-PaymentPaid-2.0.0',
    //       source: 'PaymentService-1.0.0',
    //       target: 'PaymentPaid-2.0.0',
    //     }),
    //     // The Message to the channel defined by the producing service
    //     expect.objectContaining({
    //       id: 'PaymentPaid-2.0.0-EmailChannel-1.0.0',
    //       source: 'PaymentPaid-2.0.0',
    //       target: 'EmailChannel-1.0.0',
    //     }),

    //     // The consumed message with no channel defined
    //     // We expect to to connect to the service
    //     expect.objectContaining({
    //       id: 'OrderCreatedEvent-2.0.0-PaymentService-1.0.0',
    //       source: 'OrderCreatedEvent-2.0.0',
    //       target: 'PaymentService-1.0.0',
    //     }),

    //     // The consume message with a channel defined
    //     expect.objectContaining({
    //       id: 'OrderDeletedEvent-2.0.0-EmailChannel-1.0.0',
    //       source: 'OrderDeletedEvent-2.0.0',
    //       target: 'EmailChannel-1.0.0',
    //     }),
    //   ]);

    //   expect(nodes).toEqual(
    //     expect.arrayContaining([
    //       // message the service consumes
    //       expect.objectContaining(expectedConsumedMessageWithoutChannel),

    //       // message the service consumes with a channel
    //       expect.objectContaining(expectedConsumedMessageWithChannel),

    //       // The channel node
    //       expect.objectContaining(expectedChannelNode),

    //       // The service node itself
    //       expect.objectContaining(expectedServiceNode),

    //       // message on the right of the service
    //       expect.objectContaining(expectedProducedMessage),

    //       expect.objectContaining(expectedChannelAfterProducedMessage),
    //     ])
    //   );

    //   expect(edges).toEqual(expectedEdges);
    // });

    // it('when `renderMessages` is false it should not render any messages or channels', async () => {
    //   const { nodes } = await getNodesAndEdges({ id: 'PaymentService', version: '1.0.0', renderMessages: false });

    //   const hasMessages = nodes.some((node) => node.type === 'events' || node.type === 'commands' || node.type === 'queries');
    //   const hasChannels = nodes.some((node) => node.type === 'channels');

    //   expect(hasMessages).toBe(false);
    //   expect(hasChannels).toBe(false);
    // });

    // it('will render any container (data) that the service writes to or reads from', async () => {
    //   const { nodes } = await getNodesAndEdges({ id: 'OrderService', version: '1.0.0' });

    //   const hasContainers = nodes.some((node) => node.type === 'data');
    //   expect(hasContainers).toBe(true);
    // });
  });
});
