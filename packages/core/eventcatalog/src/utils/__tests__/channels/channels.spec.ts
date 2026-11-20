import type { CollectionEntry, CollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockCommands, mockEvents, mockQueries, mockServices, mockChannels } from './mocks';
import { getChannels, getChannelChain, getDeadLetterChannel, isChannelsConnected } from '@utils/collections/channels';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: CollectionKey) => {
      switch (key) {
        case 'services':
          return Promise.resolve(mockServices);
        case 'events':
          return Promise.resolve(mockEvents);
        case 'commands':
          return Promise.resolve(mockCommands);
        case 'channels':
          return Promise.resolve(mockChannels);
        case 'queries':
          return Promise.resolve(mockQueries);
      }
    },
  };
});

describe('channels', () => {
  describe('getChannels', () => {
    it('returns an array of channels', async () => {
      const channels = await getChannels();

      expect(channels).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            collection: 'channels',
            data: expect.objectContaining({
              id: 'orders.{env}.events',
              version: '1.0.0',
            }),
          }),
          expect.objectContaining({
            collection: 'channels',
            data: expect.objectContaining({
              id: 'inventory.{env}.events',
              version: '1.0.0',
            }),
          }),
        ])
      );
    });

    it('should returns an array of channels with messages', async () => {
      const channels = await getChannels();

      expect(channels).toEqual(
        expect.arrayContaining([
          /** OrderService */
          expect.objectContaining({
            id: 'orders.{env}.events',
            slug: 'orders.{env}.events',
            collection: 'channels',
            data: expect.objectContaining({
              messages: [
                {
                  id: 'OrderCreatedEvent',
                  name: 'Order Created',
                  version: '0.0.1',
                  collection: 'events',
                },
                {
                  id: 'GetOrder',
                  name: 'Get Order',
                  version: '0.0.1',
                  collection: 'queries',
                },
              ],
            }),
          }),
        ])
      );
    });
  });

  describe('getChannelChain', () => {
    it('returns all the channels from the source to the target if there is a route between them', () => {
      const sourceChannel = {
        id: 'EventBridgeChannel',
        version: '1.0.0',
        collection: 'channels',
        data: {
          id: 'EventBridgeChannel',
          version: '1.0.0',
          routes: [{ id: 'SNSChannel', version: '1.0.0' }],
        },
      } as unknown as CollectionEntry<'channels'>;

      const firstRouteChannel = {
        id: 'SNSChannel',
        version: '1.0.0',
        collection: 'channels',
        data: {
          id: 'SNSChannel',
          version: '1.0.0',
          routes: [{ id: 'SQSChannel', version: '1.0.0' }],
        },
      } as unknown as CollectionEntry<'channels'>;

      const secondRouteChannel = {
        id: 'SQSChannel',
        version: '1.0.0',
        collection: 'channels',
        data: {
          id: 'SQSChannel',
          version: '1.0.0',
          routes: [{ id: 'FinalChannel', version: '1.0.0' }],
        },
      } as unknown as CollectionEntry<'channels'>;

      const targetChannel = {
        id: 'FinalChannel',
        version: '1.0.0',
        collection: 'channels',
        data: {
          id: 'FinalChannel',
          version: '1.0.0',
        },
      } as unknown as CollectionEntry<'channels'>;

      const channels = [sourceChannel, firstRouteChannel, secondRouteChannel, targetChannel];

      const connectedChannels = getChannelChain(sourceChannel, targetChannel, channels);

      expect(connectedChannels).toEqual([sourceChannel, firstRouteChannel, secondRouteChannel, targetChannel]);
    });

    it('returns an empty array if the source or target channel is missing', () => {
      const targetChannel = {
        id: 'SNSChannel',
        version: '1.0.0',
        collection: 'channels',
        data: {
          id: 'SNSChannel',
          version: '1.0.0',
        },
      } as unknown as CollectionEntry<'channels'>;

      expect(getChannelChain(undefined, targetChannel, [targetChannel])).toEqual([]);
      expect(getChannelChain(targetChannel, undefined, [targetChannel])).toEqual([]);
      expect(getChannelChain(undefined, undefined, [])).toEqual([]);
    });

    it('returns an empty array if the channels are not connected', () => {
      const sourceChannel = {
        id: 'EventBridgeChannel',
        version: '1.0.0',
        collection: 'channels',
        data: {
          id: 'EventBridgeChannel',
          version: '1.0.0',
        },
      } as unknown as CollectionEntry<'channels'>;
      const targetChannel = {
        id: 'SNSChannel',
        version: '1.0.0',
        collection: 'channels',
        data: {
          id: 'SNSChannel',
          version: '1.0.0',
        },
      } as unknown as CollectionEntry<'channels'>;

      const connectedChannels = getChannelChain(sourceChannel, targetChannel, [sourceChannel, targetChannel]);

      expect(connectedChannels).toEqual([]);
    });
  });

  describe('isChannelsConnected', () => {
    it('returns false if the source or target channel is missing', () => {
      const targetChannel = {
        id: 'SNSChannel',
        version: '1.0.0',
        collection: 'channels',
        data: {
          id: 'SNSChannel',
          version: '1.0.0',
        },
      } as unknown as CollectionEntry<'channels'>;

      expect(isChannelsConnected(undefined, targetChannel, [targetChannel])).toBe(false);
      expect(isChannelsConnected(targetChannel, undefined, [targetChannel])).toBe(false);
      expect(isChannelsConnected(undefined, undefined, [])).toBe(false);
    });

    it('returns true if the channels are connected through a route', () => {
      const sourceChannel = {
        id: 'EventBridgeChannel',
        version: '1.0.0',
        collection: 'channels',
        data: {
          id: 'EventBridgeChannel',
          version: '1.0.0',
          routes: [{ id: 'SNSChannel', version: '1.0.0' }],
        },
      } as unknown as CollectionEntry<'channels'>;
      const targetChannel = {
        id: 'SNSChannel',
        version: '1.0.0',
        collection: 'channels',
        data: {
          id: 'SNSChannel',
          version: '1.0.0',
        },
      } as unknown as CollectionEntry<'channels'>;

      const isConnected = isChannelsConnected(sourceChannel, targetChannel, [sourceChannel, targetChannel]);

      expect(isConnected).toBe(true);
    });

    it('returns false if the channels are not connected through a route', () => {
      const sourceChannel = {
        id: 'EventBridgeChannel',
        version: '1.0.0',
        collection: 'channels',
        data: {
          id: 'EventBridgeChannel',
          version: '1.0.0',
        },
      } as unknown as CollectionEntry<'channels'>;
      const targetChannel = {
        id: 'SNSChannel',
        version: '1.0.0',
        collection: 'channels',
        data: {
          id: 'SNSChannel',
          version: '1.0.0',
        },
      } as unknown as CollectionEntry<'channels'>;

      const isConnected = isChannelsConnected(sourceChannel, targetChannel, [sourceChannel, targetChannel]);

      expect(isConnected).toBe(false);
    });

    it('returns false if the channels are not connected through any route', () => {
      const sourceChannel = {
        id: 'EventBridgeChannel',
        version: '1.0.0',
        collection: 'channels',
        data: {
          id: 'EventBridgeChannel',
          version: '1.0.0',
          routes: [{ id: 'SNSChannel', version: '1.0.0' }],
        },
      } as unknown as CollectionEntry<'channels'>;

      const firstRouteChannel = {
        id: 'SNSChannel',
        version: '1.0.0',
        collection: 'channels',
        data: {
          id: 'SNSChannel',
          version: '1.0.0',
        },
      } as unknown as CollectionEntry<'channels'>;

      const targetChannel = {
        id: 'FinalChannel',
        version: '1.0.0',
        collection: 'channels',
        data: {
          id: 'FinalChannel',
          version: '1.0.0',
        },
      } as unknown as CollectionEntry<'channels'>;

      const isConnected = isChannelsConnected(sourceChannel, targetChannel, [sourceChannel, firstRouteChannel, targetChannel]);

      expect(isConnected).toBe(false);
    });
  });

  describe('dead letter channels', () => {
    const channel = (id: string, version: string, data: Record<string, unknown> = {}) =>
      ({
        id: `${id}-${version}`,
        collection: 'channels',
        data: { id, name: id, version, ...data },
      }) as unknown as CollectionEntry<'channels'>;

    const dlqV1 = channel('orders.dlq', '1.0.0');
    const dlqV2 = channel('orders.dlq', '2.0.0');
    const ordersQueue = channel('orders.queue', '1.0.0', { deadLetterChannel: { id: 'orders.dlq' } });
    const paymentsQueue = channel('payments.queue', '1.0.0', { deadLetterChannel: { id: 'orders.dlq', version: '1.0.0' } });
    const selfReferencing = channel('loop.queue', '1.0.0', { deadLetterChannel: { id: 'loop.queue' } });
    const missing = channel('missing.queue', '1.0.0', { deadLetterChannel: { id: 'does-not-exist' } });
    const channels = [dlqV1, dlqV2, ordersQueue, paymentsQueue, selfReferencing, missing];

    it('getDeadLetterChannel returns the latest version of the dead letter channel when no version is given', () => {
      expect(getDeadLetterChannel(ordersQueue, channels)).toBe(dlqV2);
    });

    it('getDeadLetterChannel returns the version of the dead letter channel it points to', () => {
      expect(getDeadLetterChannel(paymentsQueue, channels)).toBe(dlqV1);
    });

    it('getDeadLetterChannel returns undefined when there is no dead letter channel, it is missing, or it is the channel itself', () => {
      expect(getDeadLetterChannel(dlqV1, channels)).toBeUndefined();
      expect(getDeadLetterChannel(missing, channels)).toBeUndefined();
      expect(getDeadLetterChannel(selfReferencing, channels)).toBeUndefined();
    });

    it("getChannels marks a dead letter channel with the channels that send it their dead letters, and resolves each channel's", async () => {
      const all = await getChannels();
      const find = (id: string, version = '1.0.0') => all.find((c) => c.data.id === id && c.data.version === version)!;

      expect(find('orders.dlq').data).toMatchObject({
        isDeadLetterChannel: true,
        deadLetterFor: [{ id: 'orders.queue', version: '1.0.0', name: 'Orders Queue' }],
      });
      expect(find('orders.queue').data.deadLetterChannelResolved).toEqual({
        id: 'orders.dlq',
        version: '1.0.0',
        name: 'Orders DLQ',
      });
      expect(find('orders.queue').data.isDeadLetterChannel).toBe(false);
    });

    it("getChannels only counts a channel's latest version: an older version's dead letter channel isn't one now", async () => {
      const all = await getChannels();
      const legacy = all.find((c) => c.data.id === 'legacy.dlq')!;

      expect(legacy.data.isDeadLetterChannel).toBe(false);
      expect(legacy.data.deadLetterFor).toEqual([]);
    });
  });
});
