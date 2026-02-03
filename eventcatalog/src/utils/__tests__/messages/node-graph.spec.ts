import { getNodesAndEdgesForConsumedMessage, getNodesAndEdgesForProducedMessage } from '../../node-graphs/message-node-graph';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import { mockEvents, mockServices, mockChannels } from './mocks';
import type { CollectionMessageTypes } from '@types';
import type { CollectionEntry } from 'astro:content';
import utils from '@eventcatalog/sdk';
import path from 'path';
import fs from 'fs';
import { getProducersOfMessage, getConsumersOfMessage } from '@utils/collections/services';

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
    // this will only affect "foo" outside of the original module
    getCollection: (key: string) => {
      if (key === 'services') {
        return Promise.resolve(mockServices);
      }
      if (key === 'channels') {
        return Promise.resolve(mockChannels);
      }
      if (key === 'events') {
        return Promise.resolve(mockEvents);
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

    describe('when a service sends multiple versions of the same message to different version-specific channels', () => {
      it('renders the correct version-specific channel for each message version', async () => {
        const { writeService, writeEvent, getServices, writeChannel, getEvent, getChannels, getService } = utils(CATALOG_FOLDER);

        // Create two versions of the same event
        await writeEvent({
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '0.0.1',
          markdown: '## Inventory Adjusted v0.0.1',
        });

        await writeEvent({
          id: 'InventoryAdjusted',
          name: 'Inventory Adjusted',
          version: '1.0.1',
          markdown: '## Inventory Adjusted v1.0.1',
        });

        // Create two versions of the same channel (same ID, different versions)
        await writeChannel({
          id: 'inventory-adjusted-channel',
          name: 'Inventory Adjusted Channel',
          version: '0.0.1',
          markdown: '## Channel v0.0.1',
        });

        await writeChannel({
          id: 'inventory-adjusted-channel',
          name: 'Inventory Adjusted Channel',
          version: '1.0.1',
          markdown: '## Channel v1.0.1',
        });

        // The producer sends v0.0.1 to channel v0.0.1, and v1.0.1 to channel v1.0.1
        await writeService({
          id: 'InventoryService',
          name: 'Inventory Service',
          version: '1.0.0',
          markdown: '## Inventory Service',
          sends: [
            {
              id: 'InventoryAdjusted',
              version: '0.0.1',
              to: [{ id: 'inventory-adjusted-channel', version: '0.0.1' }],
            },
            {
              id: 'InventoryAdjusted',
              version: '1.0.1',
              to: [{ id: 'inventory-adjusted-channel', version: '1.0.1' }],
            },
          ],
        });

        const messageV101 = toAstroCollection(
          await getEvent('InventoryAdjusted', '1.0.1'),
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
          await getService('InventoryService'),
          'services'
        ) as unknown as CollectionEntry<'services'>;

        const { nodes, edges } = await getNodesAndEdgesForProducedMessage({
          message: messageV101,
          services: services,
          channels: channels,
          currentNodes: [],
          sourceChannels: [{ id: 'inventory-adjusted-channel', version: '1.0.1' }],
          source,
          currentEdges: [],
        });

        // The v1.0.1 message should route to v1.0.1 channel, NOT v0.0.1 channel
        const expectedChannelNode = expect.objectContaining({
          id: 'inventory-adjusted-channel-1.0.1',
          sourcePosition: 'right',
          targetPosition: 'left',
          type: 'channels',
        });

        const expectedEdges = expect.arrayContaining([
          // Producer to the message
          expect.objectContaining({
            id: 'InventoryService-1.0.0-InventoryAdjusted-1.0.1',
            source: 'InventoryService-1.0.0',
            target: 'InventoryAdjusted-1.0.1',
          }),
          // Message to the correct version-specific channel (v1.0.1, NOT v0.0.1)
          expect.objectContaining({
            id: 'InventoryAdjusted-1.0.1-inventory-adjusted-channel-1.0.1',
            source: 'InventoryAdjusted-1.0.1',
            target: 'inventory-adjusted-channel-1.0.1',
          }),
        ]);

        expect(nodes).toEqual(expect.arrayContaining([expectedChannelNode]));
        expect(edges).toEqual(expectedEdges);

        // Verify the wrong channel version is NOT connected
        const wrongChannelEdge = edges.find(
          (edge: any) => edge.source === 'InventoryAdjusted-1.0.1' && edge.target === 'inventory-adjusted-channel-0.0.1'
        );
        expect(wrongChannelEdge).toBeUndefined();
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

  describe('Semver Pattern Matching in Graph Generation', () => {
    describe('should_match_service_with_caret_range_to_compatible_message_versions_when_producing', () => {
      it('getProducersOfMessage returns service for messages matching ^1.0.0 pattern but not 2.0.0', async () => {
        // Service that uses caret range pattern (^1.0.0) in sends configuration
        const mockServiceWithCaretRangeSends = {
          id: 'OrderProcessingService',
          collection: 'services',
          data: {
            id: 'OrderProcessingService',
            version: '1.0.0',
            pathToFile: 'services/OrderProcessingService/index.md',
            sends: [{ id: 'PaymentProcessed', version: '^1.0.0' }],
          },
        };

        // Get PaymentProcessed events at versions 1.0.0, 1.2.3, 1.9.9, 2.0.0
        const events = mockEvents.filter((e) => e.data.id === 'PaymentProcessed');
        const v100 = events.find((e) => e.data.version === '1.0.0') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v123 = events.find((e) => e.data.version === '1.2.3') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v199 = events.find((e) => e.data.version === '1.9.9') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v200 = events.find((e) => e.data.version === '2.0.0') as unknown as CollectionEntry<CollectionMessageTypes>;

        const service = mockServiceWithCaretRangeSends as unknown as CollectionEntry<'services'>;
        const allServices = [service];

        // ^1.0.0 should match 1.0.0, 1.2.3, and 1.9.9
        const producersV100 = getProducersOfMessage(allServices as any, v100);
        const producersV123 = getProducersOfMessage(allServices as any, v123);
        const producersV199 = getProducersOfMessage(allServices as any, v199);
        const producersV200 = getProducersOfMessage(allServices as any, v200);

        expect(producersV100).toHaveLength(1);
        expect(producersV100[0].data.id).toBe('OrderProcessingService');

        expect(producersV123).toHaveLength(1);
        expect(producersV123[0].data.id).toBe('OrderProcessingService');

        expect(producersV199).toHaveLength(1);
        expect(producersV199[0].data.id).toBe('OrderProcessingService');

        // ^1.0.0 should NOT match 2.0.0
        expect(producersV200).toHaveLength(0);
      });
    });

    describe('should_match_service_with_caret_range_when_receiving_messages', () => {
      it('getConsumersOfMessage returns service for messages matching ^1.0.0 pattern but not 2.0.0', async () => {
        // Service that uses caret range pattern (^1.0.0) in receives configuration
        const mockServiceWithCaretRangeReceives = {
          id: 'InventoryService',
          collection: 'services',
          data: {
            id: 'InventoryService',
            version: '1.0.0',
            pathToFile: 'services/InventoryService/index.md',
            receives: [{ id: 'PaymentProcessed', version: '^1.0.0' }],
          },
        };

        // Get PaymentProcessed events at versions 1.0.0, 1.2.3, 1.9.9, 2.0.0
        const events = mockEvents.filter((e) => e.data.id === 'PaymentProcessed');
        const v100 = events.find((e) => e.data.version === '1.0.0') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v123 = events.find((e) => e.data.version === '1.2.3') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v199 = events.find((e) => e.data.version === '1.9.9') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v200 = events.find((e) => e.data.version === '2.0.0') as unknown as CollectionEntry<CollectionMessageTypes>;

        const service = mockServiceWithCaretRangeReceives as unknown as CollectionEntry<'services'>;
        const allServices = [service];

        // ^1.0.0 should match 1.0.0, 1.2.3, and 1.9.9
        const consumersV100 = getConsumersOfMessage(allServices as any, v100);
        const consumersV123 = getConsumersOfMessage(allServices as any, v123);
        const consumersV199 = getConsumersOfMessage(allServices as any, v199);
        const consumersV200 = getConsumersOfMessage(allServices as any, v200);

        expect(consumersV100).toHaveLength(1);
        expect(consumersV100[0].data.id).toBe('InventoryService');

        expect(consumersV123).toHaveLength(1);
        expect(consumersV123[0].data.id).toBe('InventoryService');

        expect(consumersV199).toHaveLength(1);
        expect(consumersV199[0].data.id).toBe('InventoryService');

        // ^1.0.0 should NOT match 2.0.0
        expect(consumersV200).toHaveLength(0);
      });
    });

    describe('should_match_service_with_tilde_range_to_compatible_message_versions', () => {
      it('getConsumersOfMessage returns service for messages matching ~1.2.0 pattern', async () => {
        // Service that uses tilde range pattern (~1.2.0) in receives configuration
        const mockServiceWithTildeRange = {
          id: 'NotificationService',
          collection: 'services',
          data: {
            id: 'NotificationService',
            version: '1.0.0',
            pathToFile: 'services/NotificationService/index.md',
            receives: [{ id: 'PaymentProcessed', version: '~1.2.0' }],
          },
        };

        // Get PaymentProcessed events at versions 1.2.3, 1.2.5, 1.9.9
        const events = mockEvents.filter((e) => e.data.id === 'PaymentProcessed');
        const v123 = events.find((e) => e.data.version === '1.2.3') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v125 = events.find((e) => e.data.version === '1.2.5') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v199 = events.find((e) => e.data.version === '1.9.9') as unknown as CollectionEntry<CollectionMessageTypes>;

        const service = mockServiceWithTildeRange as unknown as CollectionEntry<'services'>;
        const allServices = [service];

        // ~1.2.0 should match 1.2.3 and 1.2.5
        const consumersV123 = getConsumersOfMessage(allServices as any, v123);
        const consumersV125 = getConsumersOfMessage(allServices as any, v125);
        const consumersV199 = getConsumersOfMessage(allServices as any, v199);

        expect(consumersV123).toHaveLength(1);
        expect(consumersV123[0].data.id).toBe('NotificationService');

        expect(consumersV125).toHaveLength(1);
        expect(consumersV125[0].data.id).toBe('NotificationService');

        // ~1.2.0 should NOT match 1.9.9 (different minor version)
        expect(consumersV199).toHaveLength(0);
      });
    });

    describe('should_match_service_with_x_pattern_to_compatible_message_versions', () => {
      it('getConsumersOfMessage returns service for messages matching 1.x pattern', async () => {
        // Service that uses x-pattern (1.x) in receives configuration
        const mockServiceWithXPattern = {
          id: 'AnalyticsService',
          collection: 'services',
          data: {
            id: 'AnalyticsService',
            version: '1.0.0',
            pathToFile: 'services/AnalyticsService/index.md',
            receives: [{ id: 'PaymentProcessed', version: '1.x' }],
          },
        };

        // Get PaymentProcessed events
        const events = mockEvents.filter((e) => e.data.id === 'PaymentProcessed');
        const v100 = events.find((e) => e.data.version === '1.0.0') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v123 = events.find((e) => e.data.version === '1.2.3') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v199 = events.find((e) => e.data.version === '1.9.9') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v200 = events.find((e) => e.data.version === '2.0.0') as unknown as CollectionEntry<CollectionMessageTypes>;

        const service = mockServiceWithXPattern as unknown as CollectionEntry<'services'>;
        const allServices = [service];

        // 1.x should match 1.0.0, 1.2.3, and 1.9.9
        const consumersV100 = getConsumersOfMessage(allServices as any, v100);
        const consumersV123 = getConsumersOfMessage(allServices as any, v123);
        const consumersV199 = getConsumersOfMessage(allServices as any, v199);
        const consumersV200 = getConsumersOfMessage(allServices as any, v200);

        expect(consumersV100).toHaveLength(1);
        expect(consumersV100[0].data.id).toBe('AnalyticsService');

        expect(consumersV123).toHaveLength(1);
        expect(consumersV123[0].data.id).toBe('AnalyticsService');

        expect(consumersV199).toHaveLength(1);
        expect(consumersV199[0].data.id).toBe('AnalyticsService');

        // 1.x should NOT match 2.0.0
        expect(consumersV200).toHaveLength(0);
      });

      it('getProducersOfMessage returns service for messages matching 1.2.x pattern with correct boundaries', async () => {
        // Service that uses x-pattern (1.2.x) in sends configuration
        const mockServiceWithXPatternMinor = {
          id: 'AuditService',
          collection: 'services',
          data: {
            id: 'AuditService',
            version: '1.0.0',
            pathToFile: 'services/AuditService/index.md',
            sends: [{ id: 'PaymentProcessed', version: '1.2.x' }],
          },
        };

        // Get PaymentProcessed events
        const events = mockEvents.filter((e) => e.data.id === 'PaymentProcessed');
        const v123 = events.find((e) => e.data.version === '1.2.3') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v125 = events.find((e) => e.data.version === '1.2.5') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v199 = events.find((e) => e.data.version === '1.9.9') as unknown as CollectionEntry<CollectionMessageTypes>;

        const service = mockServiceWithXPatternMinor as unknown as CollectionEntry<'services'>;
        const allServices = [service];

        // 1.2.x should match 1.2.3 and 1.2.5
        const producersV123 = getProducersOfMessage(allServices as any, v123);
        const producersV125 = getProducersOfMessage(allServices as any, v125);
        const producersV199 = getProducersOfMessage(allServices as any, v199);

        expect(producersV123).toHaveLength(1);
        expect(producersV123[0].data.id).toBe('AuditService');

        expect(producersV125).toHaveLength(1);
        expect(producersV125[0].data.id).toBe('AuditService');

        // 1.2.x should NOT match 1.9.9 (different minor version)
        expect(producersV199).toHaveLength(0);
      });
    });

    describe('should_match_service_with_semver_pattern_and_channel_configuration', () => {
      it('getProducersOfMessage returns service with ^1.0.0 and channel when message matches pattern', async () => {
        // Service with caret range and channel configuration
        const mockServiceWithCaretRangeAndChannel = {
          id: 'OrderServiceWithChannel',
          collection: 'services',
          data: {
            id: 'OrderServiceWithChannel',
            version: '1.0.0',
            pathToFile: 'services/OrderServiceWithChannel/index.md',
            sends: [{ id: 'PaymentProcessed', version: '^1.0.0', to: [{ id: 'SNSChannel', version: '1.0.0' }] }],
          },
        };

        // Get PaymentProcessed events
        const events = mockEvents.filter((e) => e.data.id === 'PaymentProcessed');
        const v123 = events.find((e) => e.data.version === '1.2.3') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v200 = events.find((e) => e.data.version === '2.0.0') as unknown as CollectionEntry<CollectionMessageTypes>;

        const service = mockServiceWithCaretRangeAndChannel as unknown as CollectionEntry<'services'>;
        const allServices = [service];

        // Service with ^1.0.0 + channel should match 1.2.3
        const producersV123 = getProducersOfMessage(allServices as any, v123);
        expect(producersV123).toHaveLength(1);
        expect(producersV123[0].data.id).toBe('OrderServiceWithChannel');
        expect(producersV123[0].data.sends?.[0].to).toEqual([{ id: 'SNSChannel', version: '1.0.0' }]);

        // Service with ^1.0.0 + channel should NOT match 2.0.0
        const producersV200 = getProducersOfMessage(allServices as any, v200);
        expect(producersV200).toHaveLength(0);
      });

      it('getConsumersOfMessage returns service with 1.x and channel when message matches pattern', async () => {
        // Service with x-pattern and channel configuration
        const mockServiceWithXPatternAndChannel = {
          id: 'ConsumerServiceWithChannel',
          collection: 'services',
          data: {
            id: 'ConsumerServiceWithChannel',
            version: '1.0.0',
            pathToFile: 'services/ConsumerServiceWithChannel/index.md',
            receives: [{ id: 'PaymentProcessed', version: '1.x', from: [{ id: 'SQSChannel', version: '1.0.0' }] }],
          },
        };

        // Get PaymentProcessed events
        const events = mockEvents.filter((e) => e.data.id === 'PaymentProcessed');
        const v100 = events.find((e) => e.data.version === '1.0.0') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v199 = events.find((e) => e.data.version === '1.9.9') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v200 = events.find((e) => e.data.version === '2.0.0') as unknown as CollectionEntry<CollectionMessageTypes>;

        const service = mockServiceWithXPatternAndChannel as unknown as CollectionEntry<'services'>;
        const allServices = [service];

        // Service with 1.x + channel should match 1.0.0 and 1.9.9
        const consumersV100 = getConsumersOfMessage(allServices as any, v100);
        expect(consumersV100).toHaveLength(1);
        expect(consumersV100[0].data.id).toBe('ConsumerServiceWithChannel');
        expect(consumersV100[0].data.receives?.[0].from).toEqual([{ id: 'SQSChannel', version: '1.0.0' }]);

        const consumersV199 = getConsumersOfMessage(allServices as any, v199);
        expect(consumersV199).toHaveLength(1);
        expect(consumersV199[0].data.id).toBe('ConsumerServiceWithChannel');

        // Service with 1.x + channel should NOT match 2.0.0
        const consumersV200 = getConsumersOfMessage(allServices as any, v200);
        expect(consumersV200).toHaveLength(0);
      });
    });

    describe('should_match_service_receiving_multiple_versions_of_same_message', () => {
      it('getConsumersOfMessage returns service for each version it explicitly receives', async () => {
        // Create a service that receives two specific versions of the same message
        const multiVersionConsumerService = {
          collection: 'services',
          id: 'MultiVersionConsumer',
          data: {
            id: 'MultiVersionConsumer',
            name: 'Multi-Version Consumer Service',
            version: '1.0.0',
            receives: [
              { id: 'PaymentProcessed', version: '1.0.0' },
              { id: 'PaymentProcessed', version: '1.2.3' },
            ],
          },
        };

        // Get PaymentProcessed events
        const events = mockEvents.filter((e) => e.data.id === 'PaymentProcessed');
        const v100 = events.find((e) => e.data.version === '1.0.0') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v123 = events.find((e) => e.data.version === '1.2.3') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v125 = events.find((e) => e.data.version === '1.2.5') as unknown as CollectionEntry<CollectionMessageTypes>;
        const v200 = events.find((e) => e.data.version === '2.0.0') as unknown as CollectionEntry<CollectionMessageTypes>;

        const allServices = [multiVersionConsumerService as unknown as CollectionEntry<'services'>];

        // Should match both explicitly listed versions
        const consumersV100 = getConsumersOfMessage(allServices as any, v100);
        expect(consumersV100).toHaveLength(1);
        expect(consumersV100[0].data.id).toBe('MultiVersionConsumer');

        const consumersV123 = getConsumersOfMessage(allServices as any, v123);
        expect(consumersV123).toHaveLength(1);
        expect(consumersV123[0].data.id).toBe('MultiVersionConsumer');

        // Should NOT match versions that aren't explicitly listed
        const consumersV125 = getConsumersOfMessage(allServices as any, v125);
        expect(consumersV125).toHaveLength(0);

        const consumersV200 = getConsumersOfMessage(allServices as any, v200);
        expect(consumersV200).toHaveLength(0);
      });
    });
  });
});
