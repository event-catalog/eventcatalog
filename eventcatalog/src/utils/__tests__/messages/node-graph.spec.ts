import {
  getNodesAndEdgesForConsumedMessage,
  getNodesAndEdgesForProducedMessage,
  getNodesAndEdgesForEvents,
} from '../../node-graphs/message-node-graph';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import {
  mockEvents,
  mockServices,
  mockChannels,
  mockEntities,
  mockEventWithEntityProducer,
  mockEventWithEntityConsumer,
} from './mocks';
import type { CollectionMessageTypes } from '@types';
import type { CollectionEntry } from 'astro:content';
import utils from '@eventcatalog/sdk';
import path from 'path';
import fs from 'fs';

const CATALOG_FOLDER = path.join(__dirname, 'catalog');

const toAstroCollection = (item: any, collection: string) => {
  return {
    id: item.id,
    collection: collection,
    data: item,
  };
};

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: string) => {
      if (key === 'services') {
        return Promise.resolve(mockServices);
      }
      if (key === 'channels') {
        return Promise.resolve(mockChannels);
      }
      if (key === 'events') {
        // Include events with hydrated entity producers/consumers for testing
        return Promise.resolve([...mockEvents, mockEventWithEntityProducer, mockEventWithEntityConsumer]);
      }
      if (key === 'entities') {
        return Promise.resolve(mockEntities);
      }
      return Promise.resolve([]);
    },
  };
});

describe('Message NodeGraph', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Clear the catalog folder but not the folder itself
    fs.rmSync(CATALOG_FOLDER, { recursive: true, force: true });
    fs.mkdirSync(CATALOG_FOLDER, { recursive: true });
  });

  describe('getNodesAndEdgesForConsumedMessage', () => {
    describe('when the message is consumed by the consumer and the producer and consumer have no channels defined', () => {
      it('takes a given message, renders the producer and connects the message to the consumer directly', async () => {
        const message = mockEvents[0] as unknown as CollectionEntry<CollectionMessageTypes>;

        const { nodes, edges } = await getNodesAndEdgesForConsumedMessage({
          message,
          services: mockServices as any,
          channels: mockChannels as any,
          currentNodes: [],
          target: mockServices[0] as any,
          targetChannels: [],
        });

        // The message node itself
        const expectedEventNode = {
          id: 'PaymentProcessed-0.0.1',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: expect.anything(),
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'events',
        };

        // The producer node itself
        const expectedProducerNode = {
          id: 'ServiceThatProducesMessages-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          data: expect.anything(),
          position: { x: expect.any(Number), y: expect.any(Number) },
          type: 'services',
        };

        // The message should be connected to the given target directly
        const expectedEdges = expect.arrayContaining([
          expect.objectContaining({
            id: 'PaymentProcessed-0.0.1-OrdersService-1.0.0',
            source: 'PaymentProcessed-0.0.1',
            target: 'OrdersService-1.0.0',
          }),
          expect.objectContaining({
            id: 'ServiceThatProducesMessages-1.0.0-PaymentProcessed-0.0.1',
            source: 'ServiceThatProducesMessages-1.0.0',
            target: 'PaymentProcessed-0.0.1',
          }),
        ]);

        expect(nodes).toEqual(
          expect.arrayContaining([
            // The producer that produces the message
            expect.objectContaining(expectedProducerNode),
            // The message node itself
            expect.objectContaining(expectedEventNode),
          ])
        );
        expect(edges).toEqual(expectedEdges);
      });
    });

    describe('producer with a channel defined', () => {
      it('when the producer sends a message over a channel but the consumer does not read from that channel, no channel nodes are created, and the message is connected to the consumer directly', async () => {
        const { writeService, writeEvent, getServices, writeChannel, getEvent, getChannels, getService } = utils(CATALOG_FOLDER);

        // The message itself
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: '## Payment Processed',
        });

        // Email Channel
        await writeChannel({
          id: 'SQSChannel',
          name: 'SQS Channel',
          version: '1.0.0',
          markdown: '## SQS Channel',
        });

        // The Producer
        await writeService({
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          markdown: '## Order Service',
          sends: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
              to: [{ id: 'SQSChannel', version: '1.0.0' }],
            },
          ],
        });

        // The Consumer
        await writeService({
          id: 'PaymentService',
          name: 'Service That Receives Messages Without Channels',
          version: '1.0.0',
          markdown: '## Service That Receives Messages Without Channels',
          receives: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
            },
          ],
        });

        const message = toAstroCollection(
          await getEvent('PaymentProcessed'),
          'events'
        ) as unknown as CollectionEntry<CollectionMessageTypes>;
        const services = await getServices().then(
          (services) =>
            services.map((service) => toAstroCollection(service, 'services')) as unknown as CollectionEntry<'services'>[]
        );
        const channels = await getChannels().then(
          (channels) =>
            channels.map((channel) => toAstroCollection(channel, 'channels')) as unknown as CollectionEntry<'channels'>[]
        );

        const target = toAstroCollection(
          await getService('PaymentService'),
          'services'
        ) as unknown as CollectionEntry<'services'>;

        const { nodes, edges } = await getNodesAndEdgesForConsumedMessage({
          message,
          services: services,
          channels: channels,
          currentNodes: [],
          target,
        });

        const channelNodes = nodes.filter((node) => node.type === 'channels');

        expect(channelNodes).toEqual([]);

        const expectedEdges = expect.arrayContaining([
          expect.objectContaining({
            id: 'OrderService-1.0.0-PaymentProcessed-0.0.1',
            source: 'OrderService-1.0.0',
            target: 'PaymentProcessed-0.0.1',
          }),
          expect.objectContaining({
            id: 'PaymentProcessed-0.0.1-PaymentService-1.0.0',
            source: 'PaymentProcessed-0.0.1',
            target: 'PaymentService-1.0.0',
          }),
        ]);

        expect(edges).toEqual(expectedEdges);
      });

      it('when the producer sends a message over many channels only the matching channels are rendered', async () => {
        const { writeService, writeEvent, getServices, writeChannel, getEvent, getChannels, getService } = utils(CATALOG_FOLDER);

        // The message itself
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: '## Payment Processed',
        });

        // SQS Channel
        await writeChannel({
          id: 'SQSChannel',
          name: 'SQS Channel',
          version: '1.0.0',
          markdown: '## SQS Channel',
        });

        // SNS Channel
        await writeChannel({
          id: 'SNSChannel',
          name: 'SNS Channel',
          version: '1.0.0',
          markdown: '## SNS Channel',
        });

        // The Producer
        await writeService({
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          markdown: '## Order Service',
          sends: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
              to: [
                { id: 'SQSChannel', version: '1.0.0' },
                { id: 'SNSChannel', version: '1.0.0' },
              ],
            },
          ],
        });

        // The Consumer
        await writeService({
          id: 'PaymentService',
          name: 'Service That Receives Messages Without Channels',
          version: '1.0.0',
          markdown: '## Service That Receives Messages Without Channels',
          receives: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
              from: [{ id: 'SQSChannel', version: '1.0.0' }],
            },
          ],
        });

        const message = toAstroCollection(
          await getEvent('PaymentProcessed'),
          'events'
        ) as unknown as CollectionEntry<CollectionMessageTypes>;
        const services = await getServices().then(
          (services) =>
            services.map((service) => toAstroCollection(service, 'services')) as unknown as CollectionEntry<'services'>[]
        );
        const channels = await getChannels().then(
          (channels) =>
            channels.map((channel) => toAstroCollection(channel, 'channels')) as unknown as CollectionEntry<'channels'>[]
        );

        const target = toAstroCollection(
          await getService('PaymentService'),
          'services'
        ) as unknown as CollectionEntry<'services'>;

        const { nodes, edges } = await getNodesAndEdgesForConsumedMessage({
          message,
          services: services,
          channels: channels,
          currentNodes: [],
          target,
        });

        const expectedChannelNode = expect.objectContaining({
          id: 'SQSChannel-1.0.0',
          type: 'channels',
          position: { x: expect.any(Number), y: expect.any(Number) },
          data: expect.anything(),
          sourcePosition: 'right',
          targetPosition: 'left',
        });

        const expectedEdges = expect.arrayContaining([
          // Producer to the message
          expect.objectContaining({
            id: 'OrderService-1.0.0-PaymentProcessed-0.0.1',
            source: 'OrderService-1.0.0',
            target: 'PaymentProcessed-0.0.1',
          }),
          // Message to the channel
          expect.objectContaining({
            id: 'PaymentProcessed-0.0.1-SQSChannel-1.0.0',
            source: 'PaymentProcessed-0.0.1',
            target: 'SQSChannel-1.0.0',
          }),
          // Channel to the consumer
          expect.objectContaining({
            id: 'SQSChannel-1.0.0-PaymentService-1.0.0',
            source: 'SQSChannel-1.0.0',
            target: 'PaymentService-1.0.0',
          }),
        ]);

        expect(nodes).toEqual(expect.arrayContaining([expectedChannelNode]));

        const allChannelNodes = nodes.filter((node) => node.type === 'channels');
        expect(allChannelNodes).toHaveLength(1);

        expect(edges).toEqual(expectedEdges);
      });

      it('when the producer sends a message over a channel and the channel chains to the target channel, the channel chain is rendered', async () => {
        const { writeService, writeEvent, getServices, writeChannel, getEvent, getChannels, getService } = utils(CATALOG_FOLDER);

        // The message itself
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: '## Payment Processed',
        });

        // EventBridge Channel
        await writeChannel({
          id: 'EventBridgeChannel',
          name: 'EventBridge Channel',
          version: '1.0.0',
          markdown: '## EventBridge Channel',
          routes: [
            {
              id: 'SNSChannel',
              version: '1.0.0',
            },
          ],
        });

        // SNS Channel
        await writeChannel({
          id: 'SNSChannel',
          name: 'SNS Channel',
          version: '1.0.0',
          markdown: '## SNS Channel',
          routes: [
            {
              id: 'SQSChannel',
              version: '1.0.0',
            },
          ],
        });

        // SQS Channel
        await writeChannel({
          id: 'SQSChannel',
          name: 'SQS Channel',
          version: '1.0.0',
          markdown: '## SQS Channel',
        });

        // The Producer
        await writeService({
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          markdown: '## Order Service',
          sends: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
              to: [{ id: 'EventBridgeChannel', version: '1.0.0' }],
            },
          ],
        });

        // The Consumer
        await writeService({
          id: 'PaymentService',
          name: 'Service That Receives Messages Without Channels',
          version: '1.0.0',
          markdown: '## Service That Receives Messages Without Channels',
          receives: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
              from: [{ id: 'SQSChannel', version: '1.0.0' }],
            },
          ],
        });

        const message = toAstroCollection(
          await getEvent('PaymentProcessed'),
          'events'
        ) as unknown as CollectionEntry<CollectionMessageTypes>;
        const services = await getServices().then(
          (services) =>
            services.map((service) => toAstroCollection(service, 'services')) as unknown as CollectionEntry<'services'>[]
        );
        const channels = await getChannels().then(
          (channels) =>
            channels.map((channel) => toAstroCollection(channel, 'channels')) as unknown as CollectionEntry<'channels'>[]
        );

        const target = toAstroCollection(
          await getService('PaymentService'),
          'services'
        ) as unknown as CollectionEntry<'services'>;

        const { nodes, edges } = await getNodesAndEdgesForConsumedMessage({
          message,
          services: services,
          channels: channels,
          currentNodes: [],
          target,
        });

        const channelNodes = nodes.filter((node) => node.type === 'channels');
        expect(channelNodes).toHaveLength(3);

        const expectedEventBusChannelNode = expect.objectContaining({
          id: 'EventBridgeChannel-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'channels',
        });

        const expectedSNSChannelNode = expect.objectContaining({
          id: 'SNSChannel-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'channels',
        });

        const expectedSQSChannelNode = expect.objectContaining({
          id: 'SQSChannel-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'channels',
        });

        const expectedEdges = expect.arrayContaining([
          // Producer to the event first....
          expect.objectContaining({
            id: 'OrderService-1.0.0-PaymentProcessed-0.0.1',
            source: 'OrderService-1.0.0',
            target: 'PaymentProcessed-0.0.1',
          }),
          // The message to the first channel
          expect.objectContaining({
            id: 'PaymentProcessed-0.0.1-EventBridgeChannel-1.0.0',
            source: 'PaymentProcessed-0.0.1',
            target: 'EventBridgeChannel-1.0.0',
          }),
          // // The next channel in the chain
          expect.objectContaining({
            id: 'EventBridgeChannel-1.0.0-SNSChannel-1.0.0',
            source: 'EventBridgeChannel-1.0.0',
            target: 'SNSChannel-1.0.0',
          }),
          // The next channel in the chain
          expect.objectContaining({
            id: 'SNSChannel-1.0.0-SQSChannel-1.0.0',
            source: 'SNSChannel-1.0.0',
            target: 'SQSChannel-1.0.0',
          }),
          // Final channel to the consumer
          expect.objectContaining({
            id: 'SQSChannel-1.0.0-PaymentService-1.0.0',
            source: 'SQSChannel-1.0.0',
            target: 'PaymentService-1.0.0',
          }),
        ]);

        expect(nodes).toEqual(
          expect.arrayContaining([
            // Expected channel nodes
            expectedEventBusChannelNode,
            expectedSNSChannelNode,
            expectedSQSChannelNode,
          ])
        );

        expect(edges).toEqual(expectedEdges);
      });
    });

    describe('target with channel defined', () => {
      it('when the producer does not send the message to a channel, but the target has a channel defined, the message is connected to the channel node and the channel node to the target directly', async () => {
        const { writeService, writeEvent, getServices, writeChannel, getEvent, getChannels, getService } = utils(CATALOG_FOLDER);

        // The message itself
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: '## Payment Processed',
        });

        // Producer
        await writeService({
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          markdown: '## Order Service',
          sends: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
            },
          ],
        });

        // Target
        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '1.0.0',
          markdown: '## Payment Service',
          receives: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
              from: [{ id: 'SQSChannel', version: '1.0.0' }],
            },
          ],
        });

        await writeChannel({
          id: 'SQSChannel',
          name: 'SQS Channel',
          version: '1.0.0',
          markdown: '## SQS Channel',
        });

        const message = toAstroCollection(
          await getEvent('PaymentProcessed'),
          'events'
        ) as unknown as CollectionEntry<CollectionMessageTypes>;
        const services = await getServices().then(
          (services) =>
            services.map((service) => toAstroCollection(service, 'services')) as unknown as CollectionEntry<'services'>[]
        );
        const channels = await getChannels().then(
          (channels) =>
            channels.map((channel) => toAstroCollection(channel, 'channels')) as unknown as CollectionEntry<'channels'>[]
        );

        const target = toAstroCollection(
          await getService('PaymentService'),
          'services'
        ) as unknown as CollectionEntry<'services'>;

        const { nodes, edges } = await getNodesAndEdgesForConsumedMessage({
          message,
          services: services,
          channels: channels,
          currentNodes: [],
          target,
          targetChannels: [{ id: 'SQSChannel', version: '1.0.0' }],
        });

        const expectedChannelNode = expect.objectContaining({
          id: 'SQSChannel-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'channels',
        });

        const expectedEdges = expect.arrayContaining([
          // Producer to the message
          expect.objectContaining({
            id: 'OrderService-1.0.0-PaymentProcessed-0.0.1',
            source: 'OrderService-1.0.0',
            target: 'PaymentProcessed-0.0.1',
          }),
          // Message to the channel
          expect.objectContaining({
            id: 'PaymentProcessed-0.0.1-SQSChannel-1.0.0',
            source: 'PaymentProcessed-0.0.1',
            target: 'SQSChannel-1.0.0',
          }),
          // // Channel to the target
          // expect.objectContaining({
          //     id: 'SQSChannel-1.0.0-PaymentService-1.0.0',
          //     source: 'SQSChannel-1.0.0',
          //     target: 'PaymentService-1.0.0',
          // }),
        ]);

        expect(nodes).toEqual(expect.arrayContaining([expectedChannelNode]));

        expect(edges).toEqual(expectedEdges);
      });
    });
  });

  describe('getNodesAndEdgesForProducedMessage', () => {
    describe('when the message is produced by the producer and the producer and consumer have no channels defined', () => {
      it('renders the producer publishing the message directly to the consumer', async () => {
        const { writeService, writeEvent, getServices, writeChannel, getEvent, getChannels, getService } = utils(CATALOG_FOLDER);

        // The message itself
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: '## Payment Processed',
        });

        // The producer
        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '1.0.0',
          markdown: '## Payment Service',
          sends: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
            },
          ],
        });

        // The Consumer
        await writeService({
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          markdown: '## Order Service',
          receives: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
            },
          ],
        });

        const message = toAstroCollection(
          await getEvent('PaymentProcessed'),
          'events'
        ) as unknown as CollectionEntry<CollectionMessageTypes>;
        const services = await getServices().then(
          (services) =>
            services.map((service) => toAstroCollection(service, 'services')) as unknown as CollectionEntry<'services'>[]
        );

        const source = toAstroCollection(
          await getService('PaymentService'),
          'services'
        ) as unknown as CollectionEntry<'services'>;

        const { nodes, edges } = await getNodesAndEdgesForProducedMessage({
          message,
          services: services,
          channels: [],
          currentNodes: [],
          source,
          currentEdges: [],
        });

        const expectedProducerNode = expect.objectContaining({
          id: 'PaymentService-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'services',
        });

        const expectedMessageNode = expect.objectContaining({
          id: 'PaymentProcessed-0.0.1',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'events',
        });

        const expectedConsumerNode = expect.objectContaining({
          id: 'OrderService-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'services',
        });

        const expectedEdges = expect.arrayContaining([
          // Producer to the message
          expect.objectContaining({
            id: 'PaymentService-1.0.0-PaymentProcessed-0.0.1',
            source: 'PaymentService-1.0.0',
            target: 'PaymentProcessed-0.0.1',
          }),
          // Message to the consumer
          expect.objectContaining({
            id: 'PaymentProcessed-0.0.1-OrderService-1.0.0',
            source: 'PaymentProcessed-0.0.1',
            target: 'OrderService-1.0.0',
          }),
        ]);

        expect(edges).toEqual(expectedEdges);

        expect(nodes).toEqual(expect.arrayContaining([expectedProducerNode, expectedMessageNode, expectedConsumerNode]));

        expect(edges).toEqual(expectedEdges);
      });
    });

    describe('when the message is produced by the producer and the producer defines a channel', () => {
      it('renders the producer publishing the message to the channel', async () => {
        const { writeService, writeEvent, getServices, writeChannel, getEvent, getChannels, getService } = utils(CATALOG_FOLDER);

        // The message itself
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: '## Payment Processed',
        });

        // The producer
        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '1.0.0',
          markdown: '## Payment Service',
          sends: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
              to: [{ id: 'SQSChannel', version: '1.0.0' }],
            },
          ],
        });

        // The channel
        await writeChannel({
          id: 'SQSChannel',
          name: 'SQS Channel',
          version: '1.0.0',
          markdown: '## SQS Channel',
        });

        const message = toAstroCollection(
          await getEvent('PaymentProcessed'),
          'events'
        ) as unknown as CollectionEntry<CollectionMessageTypes>;
        const services = await getServices().then(
          (services) =>
            services.map((service) => toAstroCollection(service, 'services')) as unknown as CollectionEntry<'services'>[]
        );
        const channels = await getChannels().then(
          (channels) =>
            channels.map((channel) => toAstroCollection(channel, 'channels')) as unknown as CollectionEntry<'channels'>[]
        );

        const source = toAstroCollection(
          await getService('PaymentService'),
          'services'
        ) as unknown as CollectionEntry<'services'>;

        const { nodes, edges } = await getNodesAndEdgesForProducedMessage({
          message,
          services: services,
          channels: channels,
          currentNodes: [],
          sourceChannels: [{ id: 'SQSChannel', version: '1.0.0' }],
          source,
          currentEdges: [],
        });

        const expectedProducerNode = expect.objectContaining({
          id: 'PaymentService-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'services',
        });

        const expectedMessageNode = expect.objectContaining({
          id: 'PaymentProcessed-0.0.1',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'events',
        });

        const expectedChannelNode = expect.objectContaining({
          id: 'SQSChannel-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'channels',
        });

        const expectedEdges = expect.arrayContaining([
          // Producer to the message
          expect.objectContaining({
            id: 'PaymentService-1.0.0-PaymentProcessed-0.0.1',
            source: 'PaymentService-1.0.0',
            target: 'PaymentProcessed-0.0.1',
          }),
          // Message to the channel
          expect.objectContaining({
            id: 'PaymentProcessed-0.0.1-SQSChannel-1.0.0',
            source: 'PaymentProcessed-0.0.1',
            target: 'SQSChannel-1.0.0',
          }),
        ]);

        expect(nodes).toEqual(expect.arrayContaining([expectedProducerNode, expectedMessageNode, expectedChannelNode]));

        expect(edges).toEqual(expectedEdges);
      });

      it('when the producer defines a channel version that does not exist, the message is connected directly from the producer to the message (not reversed)', async () => {
        const { writeService, writeEvent, getServices, writeChannel, getEvent, getChannels, getService } = utils(CATALOG_FOLDER);

        // The message itself
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: '## Payment Processed',
        });

        // The producer with a channel version that doesn't exist
        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '1.0.0',
          markdown: '## Payment Service',
          sends: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
              to: [{ id: 'SQSChannel', version: '99.0.0' }], // Version 99.0.0 does not exist
            },
          ],
        });

        // The channel exists but with a different version
        await writeChannel({
          id: 'SQSChannel',
          name: 'SQS Channel',
          version: '1.0.0',
          markdown: '## SQS Channel',
        });

        const message = toAstroCollection(
          await getEvent('PaymentProcessed'),
          'events'
        ) as unknown as CollectionEntry<CollectionMessageTypes>;
        const services = await getServices().then(
          (services) =>
            services.map((service) => toAstroCollection(service, 'services')) as unknown as CollectionEntry<'services'>[]
        );
        const channels = await getChannels().then(
          (channels) =>
            channels.map((channel) => toAstroCollection(channel, 'channels')) as unknown as CollectionEntry<'channels'>[]
        );

        const source = toAstroCollection(
          await getService('PaymentService'),
          'services'
        ) as unknown as CollectionEntry<'services'>;

        const { nodes, edges } = await getNodesAndEdgesForProducedMessage({
          message,
          services: services,
          channels: channels,
          currentNodes: [],
          sourceChannels: [{ id: 'SQSChannel', version: '99.0.0' }], // Non-existent version
          source,
          currentEdges: [],
        });

        const expectedProducerNode = expect.objectContaining({
          id: 'PaymentService-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'services',
        });

        const expectedMessageNode = expect.objectContaining({
          id: 'PaymentProcessed-0.0.1',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'events',
        });

        // The edge should go from producer to message (not reversed)
        const expectedEdges = expect.arrayContaining([
          expect.objectContaining({
            id: 'PaymentService-1.0.0-PaymentProcessed-0.0.1',
            source: 'PaymentService-1.0.0',
            target: 'PaymentProcessed-0.0.1',
            label: 'publishes \nevent',
          }),
        ]);

        // Should NOT contain a reversed edge (message -> producer)
        const reversedEdge = edges.find(
          (edge: any) => edge.source === 'PaymentProcessed-0.0.1' && edge.target === 'PaymentService-1.0.0'
        );
        expect(reversedEdge).toBeUndefined();

        // No channel nodes should be created since the version doesn't exist
        const channelNodes = nodes.filter((node: any) => node.type === 'channels');
        expect(channelNodes).toHaveLength(0);

        expect(nodes).toEqual(expect.arrayContaining([expectedProducerNode, expectedMessageNode]));
        expect(edges).toEqual(expectedEdges);
      });
    });

    describe('when the message is produced by the producer without a channel, but the consumer defines a channel', () => {
      it('renders the producer publishing the message to the consumers channel', async () => {
        const { writeService, writeEvent, getServices, writeChannel, getEvent, getChannels, getService } = utils(CATALOG_FOLDER);

        // The message itself
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: '## Payment Processed',
        });

        // The producer
        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '1.0.0',
          markdown: '## Payment Service',
        });

        // The channel
        await writeChannel({
          id: 'SQSChannel',
          name: 'SQS Channel',
          version: '1.0.0',
          markdown: '## SQS Channel',
        });

        // The consumer
        await writeService({
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          markdown: '## Order Service',
          receives: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
              from: [{ id: 'SQSChannel', version: '1.0.0' }],
            },
          ],
        });

        const message = toAstroCollection(
          await getEvent('PaymentProcessed'),
          'events'
        ) as unknown as CollectionEntry<CollectionMessageTypes>;
        const services = await getServices().then(
          (services) =>
            services.map((service) => toAstroCollection(service, 'services')) as unknown as CollectionEntry<'services'>[]
        );
        const channels = await getChannels().then(
          (channels) =>
            channels.map((channel) => toAstroCollection(channel, 'channels')) as unknown as CollectionEntry<'channels'>[]
        );

        const source = toAstroCollection(
          await getService('PaymentService'),
          'services'
        ) as unknown as CollectionEntry<'services'>;

        const { nodes, edges } = await getNodesAndEdgesForProducedMessage({
          message,
          services: services,
          channels: channels,
          currentNodes: [],
          sourceChannels: [{ id: 'SQSChannel', version: '1.0.0' }],
          source,
          currentEdges: [],
        });

        const expectedProducerNode = expect.objectContaining({
          id: 'PaymentService-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'services',
        });

        const expectedMessageNode = expect.objectContaining({
          id: 'PaymentProcessed-0.0.1',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'events',
        });

        const expectedChannelNode = expect.objectContaining({
          id: 'SQSChannel-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'channels',
        });

        const expectedConsumerNode = expect.objectContaining({
          id: 'OrderService-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'services',
        });

        const expectedEdges = expect.arrayContaining([
          // Producer to the message
          expect.objectContaining({
            id: 'PaymentService-1.0.0-PaymentProcessed-0.0.1',
            source: 'PaymentService-1.0.0',
            target: 'PaymentProcessed-0.0.1',
          }),
          // Message to the channel
          expect.objectContaining({
            id: 'PaymentProcessed-0.0.1-SQSChannel-1.0.0',
            source: 'PaymentProcessed-0.0.1',
            target: 'SQSChannel-1.0.0',
          }),
          // Channel to the consumer
          expect.objectContaining({
            id: 'SQSChannel-1.0.0-OrderService-1.0.0',
            source: 'SQSChannel-1.0.0',
            target: 'OrderService-1.0.0',
          }),
        ]);

        expect(nodes).toEqual(
          expect.arrayContaining([expectedProducerNode, expectedMessageNode, expectedChannelNode, expectedConsumerNode])
        );

        expect(edges).toEqual(expectedEdges);
      });

      it('if the consumer defines a channel that does not exist in EventCatalog, the message is connected to the consumer directly', async () => {
        const { writeService, writeEvent, getServices, writeChannel, getEvent, getChannels, getService } = utils(CATALOG_FOLDER);

        // The message itself
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: '## Payment Processed',
        });

        // The producer
        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '1.0.0',
          markdown: '## Payment Service',
        });

        // The consumer
        await writeService({
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          markdown: '## Order Service',
          receives: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
              from: [{ id: 'NonExistentChannel', version: '1.0.0' }],
            },
          ],
        });

        const message = toAstroCollection(
          await getEvent('PaymentProcessed'),
          'events'
        ) as unknown as CollectionEntry<CollectionMessageTypes>;
        const services = await getServices().then(
          (services) =>
            services.map((service) => toAstroCollection(service, 'services')) as unknown as CollectionEntry<'services'>[]
        );

        const source = toAstroCollection(
          await getService('PaymentService'),
          'services'
        ) as unknown as CollectionEntry<'services'>;

        const { nodes, edges } = await getNodesAndEdgesForProducedMessage({
          message,
          services: services,
          channels: [],
          currentNodes: [],
          sourceChannels: [{ id: 'SQSChannel', version: '1.0.0' }],
          source,
          currentEdges: [],
        });

        const expectedProducerNode = expect.objectContaining({
          id: 'PaymentService-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'services',
        });

        const expectedMessageNode = expect.objectContaining({
          id: 'PaymentProcessed-0.0.1',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'events',
        });

        const expectedConsumerNode = expect.objectContaining({
          id: 'OrderService-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'services',
        });

        const expectedEdges = expect.arrayContaining([
          // Producer to the message
          expect.objectContaining({
            id: 'PaymentService-1.0.0-PaymentProcessed-0.0.1',
            source: 'PaymentService-1.0.0',
            target: 'PaymentProcessed-0.0.1',
          }),
          // Message to the consumer directly
          expect.objectContaining({
            id: 'PaymentProcessed-0.0.1-OrderService-1.0.0',
            source: 'PaymentProcessed-0.0.1',
            target: 'OrderService-1.0.0',
          }),
        ]);

        expect(nodes).toEqual(expect.arrayContaining([expectedProducerNode, expectedMessageNode, expectedConsumerNode]));

        expect(edges).toEqual(expectedEdges);
      });
    });

    describe('When the message is produced with a channel, but the consumer does not define a channel?', () => {
      it('renders the producer publishing the message to the channel, but the consumer consumes the message directly from the producer', async () => {
        const { writeService, writeEvent, getServices, writeChannel, getEvent, getChannels, getService } = utils(CATALOG_FOLDER);

        // The message itself
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: '## Payment Processed',
        });

        // The producer
        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '1.0.0',
          markdown: '## Payment Service',
        });

        // The channel
        await writeChannel({
          id: 'SQSChannel',
          name: 'SQS Channel',
          version: '1.0.0',
          markdown: '## SQS Channel',
        });

        // The consumer
        await writeService({
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          markdown: '## Order Service',
          receives: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
            },
          ],
        });

        const message = toAstroCollection(
          await getEvent('PaymentProcessed'),
          'events'
        ) as unknown as CollectionEntry<CollectionMessageTypes>;
        const services = await getServices().then(
          (services) =>
            services.map((service) => toAstroCollection(service, 'services')) as unknown as CollectionEntry<'services'>[]
        );
        const channels = await getChannels().then(
          (channels) =>
            channels.map((channel) => toAstroCollection(channel, 'channels')) as unknown as CollectionEntry<'channels'>[]
        );

        const source = toAstroCollection(
          await getService('PaymentService'),
          'services'
        ) as unknown as CollectionEntry<'services'>;

        const { nodes, edges } = await getNodesAndEdgesForProducedMessage({
          message,
          services: services,
          channels: channels,
          currentNodes: [],
          sourceChannels: [{ id: 'SQSChannel', version: '1.0.0' }],
          source,
          currentEdges: [],
        });

        const expectedProducerNode = expect.objectContaining({
          id: 'PaymentService-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'services',
        });

        const expectedMessageNode = expect.objectContaining({
          id: 'PaymentProcessed-0.0.1',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'events',
        });

        const expectedChannelNode = expect.objectContaining({
          id: 'SQSChannel-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'channels',
        });

        const expectedConsumerNode = expect.objectContaining({
          id: 'OrderService-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'services',
        });

        const expectedEdges = expect.arrayContaining([
          // Producer to the message
          expect.objectContaining({
            id: 'PaymentService-1.0.0-PaymentProcessed-0.0.1',
            source: 'PaymentService-1.0.0',
            target: 'PaymentProcessed-0.0.1',
          }),
          // Message to the channel
          expect.objectContaining({
            id: 'PaymentProcessed-0.0.1-SQSChannel-1.0.0',
            source: 'PaymentProcessed-0.0.1',
            target: 'SQSChannel-1.0.0',
          }),
          // Message to the consumer directly
          expect.objectContaining({
            id: 'PaymentProcessed-0.0.1-OrderService-1.0.0',
            source: 'PaymentProcessed-0.0.1',
            target: 'OrderService-1.0.0',
          }),
        ]);

        expect(nodes).toEqual(
          expect.arrayContaining([expectedProducerNode, expectedMessageNode, expectedChannelNode, expectedConsumerNode])
        );

        expect(edges).toEqual(expectedEdges);
      });
    });

    describe('when the message is produced by the producer and the producer defines a channel and the consumer also defines the same channel (consuming from the channel)', () => {
      it('renders the producer publishing the message to the channel and the consumer consuming the message from the channel', async () => {
        const { writeService, writeEvent, getServices, writeChannel, getEvent, getChannels, getService } = utils(CATALOG_FOLDER);

        // The message itself
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: '## Payment Processed',
        });

        // The producer
        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '1.0.0',
          markdown: '## Payment Service',
          sends: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
              to: [{ id: 'SQSChannel', version: '1.0.0' }],
            },
          ],
        });

        // The channel
        await writeChannel({
          id: 'SQSChannel',
          name: 'SQS Channel',
          version: '1.0.0',
          markdown: '## SQS Channel',
        });

        // The consumer
        await writeService({
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          markdown: '## Order Service',
          receives: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
              from: [{ id: 'SQSChannel', version: '1.0.0' }],
            },
          ],
        });

        const message = toAstroCollection(
          await getEvent('PaymentProcessed'),
          'events'
        ) as unknown as CollectionEntry<CollectionMessageTypes>;
        const services = await getServices().then(
          (services) =>
            services.map((service) => toAstroCollection(service, 'services')) as unknown as CollectionEntry<'services'>[]
        );
        const channels = await getChannels().then(
          (channels) =>
            channels.map((channel) => toAstroCollection(channel, 'channels')) as unknown as CollectionEntry<'channels'>[]
        );

        const source = toAstroCollection(
          await getService('PaymentService'),
          'services'
        ) as unknown as CollectionEntry<'services'>;

        const { nodes, edges } = await getNodesAndEdgesForProducedMessage({
          message,
          services: services,
          channels: channels,
          currentNodes: [],
          sourceChannels: [{ id: 'SQSChannel', version: '1.0.0' }],
          source,
          currentEdges: [],
        });

        const expectedProducerNode = expect.objectContaining({
          id: 'PaymentService-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'services',
        });

        const expectedMessageNode = expect.objectContaining({
          id: 'PaymentProcessed-0.0.1',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'events',
        });

        const expectedChannelNode = expect.objectContaining({
          id: 'SQSChannel-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'channels',
        });

        const expectedConsumerNode = expect.objectContaining({
          id: 'OrderService-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'services',
        });

        const expectedEdges = expect.arrayContaining([
          // Producer to the message
          expect.objectContaining({
            id: 'PaymentService-1.0.0-PaymentProcessed-0.0.1',
            source: 'PaymentService-1.0.0',
            target: 'PaymentProcessed-0.0.1',
          }),
          // Message to the channel
          expect.objectContaining({
            id: 'PaymentProcessed-0.0.1-SQSChannel-1.0.0',
            source: 'PaymentProcessed-0.0.1',
            target: 'SQSChannel-1.0.0',
          }),
          // Channel to the consumer
          expect.objectContaining({
            id: 'SQSChannel-1.0.0-OrderService-1.0.0',
            source: 'SQSChannel-1.0.0',
            target: 'OrderService-1.0.0',
          }),
        ]);

        expect(nodes).toEqual(
          expect.arrayContaining([expectedProducerNode, expectedMessageNode, expectedChannelNode, expectedConsumerNode])
        );

        expect(edges).toEqual(expectedEdges);
      });
    });

    describe('when the message is produced by the producer and the producer defines a channel and the consumer also defines a channel but its a chain of channels', () => {
      it('renders the producer publishing the message to the channel and the consumer consuming the message from the channel chain', async () => {
        const { writeService, writeEvent, getServices, writeChannel, getEvent, getChannels, getService } = utils(CATALOG_FOLDER);

        // The message itself
        await writeEvent({
          id: 'PaymentProcessed',
          name: 'Payment Processed',
          version: '0.0.1',
          markdown: '## Payment Processed',
        });

        // The producer
        await writeService({
          id: 'PaymentService',
          name: 'Payment Service',
          version: '1.0.0',
          markdown: '## Payment Service',
          sends: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
              to: [{ id: 'EventBridgeChannel', version: '1.0.0' }],
            },
          ],
        });

        // The first channel
        await writeChannel({
          id: 'EventBridgeChannel',
          name: 'EventBridge Channel',
          version: '1.0.0',
          markdown: '## EventBridge Channel',
          routes: [{ id: 'SQSChannel', version: '1.0.0' }],
        });

        // The second channel
        await writeChannel({
          id: 'SQSChannel',
          name: 'SQS Channel',
          version: '1.0.0',
          markdown: '## SQS Channel',
          routes: [{ id: 'SNSChannel', version: '1.0.0' }],
        });

        // The third channel
        await writeChannel({
          id: 'SNSChannel',
          name: 'SNS Channel',
          version: '1.0.0',
          markdown: '## SNS Channel',
        });

        // The consumer
        await writeService({
          id: 'OrderService',
          name: 'Order Service',
          version: '1.0.0',
          markdown: '## Order Service',
          receives: [
            {
              id: 'PaymentProcessed',
              version: '0.0.1',
              from: [{ id: 'SNSChannel', version: '1.0.0' }],
            },
          ],
        });

        const message = toAstroCollection(
          await getEvent('PaymentProcessed'),
          'events'
        ) as unknown as CollectionEntry<CollectionMessageTypes>;
        const services = await getServices().then(
          (services) =>
            services.map((service) => toAstroCollection(service, 'services')) as unknown as CollectionEntry<'services'>[]
        );
        const channels = await getChannels().then(
          (channels) =>
            channels.map((channel) => toAstroCollection(channel, 'channels')) as unknown as CollectionEntry<'channels'>[]
        );

        const source = toAstroCollection(
          await getService('PaymentService'),
          'services'
        ) as unknown as CollectionEntry<'services'>;

        const { nodes, edges } = await getNodesAndEdgesForProducedMessage({
          message,
          services: services,
          channels: channels,
          currentNodes: [],
          sourceChannels: [{ id: 'SQSChannel', version: '1.0.0' }],
          source,
          currentEdges: [],
        });

        const expectedProducerNode = expect.objectContaining({
          id: 'PaymentService-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'services',
        });

        const expectedMessageNode = expect.objectContaining({
          id: 'PaymentProcessed-0.0.1',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'events',
        });

        const expectedChannelNode = expect.objectContaining({
          id: 'SQSChannel-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'channels',
        });

        const expectedConsumerNode = expect.objectContaining({
          id: 'OrderService-1.0.0',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'services',
        });

        const expectedEdges = expect.arrayContaining([
          // Producer to the message
          expect.objectContaining({
            id: 'PaymentService-1.0.0-PaymentProcessed-0.0.1',
            source: 'PaymentService-1.0.0',
            target: 'PaymentProcessed-0.0.1',
          }),
          // Message to the first channel
          expect.objectContaining({
            id: 'PaymentProcessed-0.0.1-EventBridgeChannel-1.0.0',
            source: 'PaymentProcessed-0.0.1',
            target: 'EventBridgeChannel-1.0.0',
          }),
          // First channel to the second channel
          expect.objectContaining({
            id: 'EventBridgeChannel-1.0.0-SQSChannel-1.0.0',
            source: 'EventBridgeChannel-1.0.0',
            target: 'SQSChannel-1.0.0',
          }),
          // Second channel to the third channel
          expect.objectContaining({
            id: 'SQSChannel-1.0.0-SNSChannel-1.0.0',
            source: 'SQSChannel-1.0.0',
            target: 'SNSChannel-1.0.0',
          }),
          // Third channel to the consumer
          expect.objectContaining({
            id: 'SNSChannel-1.0.0-OrderService-1.0.0',
            source: 'SNSChannel-1.0.0',
            target: 'OrderService-1.0.0',
          }),
        ]);

        expect(nodes).toEqual(
          expect.arrayContaining([expectedProducerNode, expectedMessageNode, expectedChannelNode, expectedConsumerNode])
        );

        expect(edges).toEqual(expectedEdges);
      });
    });
  });

  describe('Entity integration', () => {
    describe('when an entity is a producer of a message', () => {
      it('renders the entity node with type "entities" and edge label "emits"', async () => {
        // PaymentAggregate entity has sends: [{ id: 'PaymentProcessed', version: '0.0.1' }]
        // So it should appear as a producer of the PaymentProcessed event
        const { nodes, edges } = await getNodesAndEdgesForEvents({
          id: 'PaymentProcessed',
          version: '0.0.1',
        });

        // Verify the entity node is created with correct type
        const entityNode = nodes.find((node: any) => node.type === 'entities');
        expect(entityNode).toBeDefined();
        expect(entityNode?.id).toBe('PaymentAggregate-1.0.0');
        expect(entityNode?.data.entity).toBeDefined();

        // Verify the edge has the correct "emits" label for entity producers
        const entityEdge = edges.find((edge: any) => edge.source === 'PaymentAggregate-1.0.0');
        expect(entityEdge).toBeDefined();
        expect(entityEdge?.label).toBe('emits');
        expect(entityEdge?.target).toBe('PaymentProcessed-0.0.1');
      });
    });

    describe('when an entity is a consumer of a message', () => {
      it('renders the entity node with type "entities" and edge label "handled by"', async () => {
        // OrderAggregate entity has receives: [{ id: 'PaymentProcessed', version: '0.0.1' }]
        // So it should appear as a consumer of the PaymentProcessed event
        const { nodes, edges } = await getNodesAndEdgesForEvents({
          id: 'PaymentProcessed',
          version: '0.0.1',
        });

        // Verify the entity consumer node is created with correct type
        const entityNode = nodes.find((node: any) => node.id === 'OrderAggregate-1.0.0');
        expect(entityNode).toBeDefined();
        expect(entityNode?.type).toBe('entities');
        expect(entityNode?.data.entity).toBeDefined();

        // Verify the edge has the correct "handled by" label for entity consumers
        const entityEdge = edges.find((edge: any) => edge.target === 'OrderAggregate-1.0.0');
        expect(entityEdge).toBeDefined();
        expect(entityEdge?.label).toBe('handled by');
        expect(entityEdge?.source).toBe('PaymentProcessed-0.0.1');
      });
    });
  });
});
