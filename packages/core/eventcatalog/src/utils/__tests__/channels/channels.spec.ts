import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockCommands, mockEvents, mockQueries, mockServices, mockChannels } from './mocks';
import { getChannels } from '@utils/channels';

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
});
