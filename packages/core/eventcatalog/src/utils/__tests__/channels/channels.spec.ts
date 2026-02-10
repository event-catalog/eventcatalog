import type { CollectionEntry, ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockCommands, mockEvents, mockQueries, mockServices, mockChannels } from './mocks';
import { getChannels, getChannelChain, isChannelsConnected } from '@utils/collections/channels';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: ContentCollectionKey) => {
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
});
