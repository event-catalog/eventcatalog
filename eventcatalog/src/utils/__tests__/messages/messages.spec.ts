import type { CollectionEntry, ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockCommands, mockEvents, mockQueries, mockServices, mockChannels } from './mocks';
import { getMessages } from '@utils/collections/messages';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    async getCollection<T extends ContentCollectionKey>(key: T, filterFn: (entry: CollectionEntry<T>) => boolean = () => true) {
      switch (key) {
        case 'services':
          return mockServices.filter(filterFn as any);
        case 'events':
          return mockEvents.filter(filterFn as any);
        case 'commands':
          return mockCommands.filter(filterFn as any);
        case 'channels':
          return mockChannels.filter(filterFn as any);
        case 'queries':
          return mockQueries.filter(filterFn);
      }
    },
  };
});

describe('getMessages', () => {
  it('should return all versions of messages', async () => {
    await expect(getMessages({ getAllVersions: true })).resolves.toEqual(
      expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({
            collection: 'events',
            data: expect.objectContaining({
              id: 'PaymentProcessed',
              version: '0.0.1',
            }),
          }),
          expect.objectContaining({
            collection: 'events',
            data: expect.objectContaining({
              id: 'PaymentProcessed',
              version: '0.0.2',
            }),
          }),
          expect.objectContaining({
            collection: 'events',
            data: expect.objectContaining({
              id: 'PaymentProcessed',
              version: '0.1.0',
            }),
          }),
        ]),
      })
    );
  });

  it('should return current versions of messages', async () => {
    await expect(getMessages({ getAllVersions: false })).resolves.toEqual(
      expect.objectContaining({
        commands: expect.arrayContaining([
          expect.objectContaining({
            collection: 'commands',
            data: expect.objectContaining({
              id: 'ProcessPayment',
              version: '0.1.0',
            }),
          }),
        ]),
        events: expect.arrayContaining([
          expect.objectContaining({
            collection: 'events',
            data: expect.objectContaining({
              id: 'PaymentProcessed',
              version: '0.1.0',
            }),
          }),
        ]),
      })
    );
  });

  it('should return current versions even if the first call is to get all versions', async () => {
    await getMessages({ getAllVersions: true });

    const messages = await getMessages({ getAllVersions: false });

    expect(messages).toEqual(
      expect.objectContaining({
        queries: [],
        commands: expect.arrayContaining([
          expect.objectContaining({
            collection: 'commands',
            data: expect.objectContaining({
              id: 'ProcessPayment',
              version: '0.1.0',
            }),
          }),
        ]),
        events: expect.arrayContaining([
          expect.objectContaining({
            collection: 'events',
            data: expect.objectContaining({
              id: 'PaymentProcessed',
              version: '0.1.0',
            }),
          }),
        ]),
      })
    );
  });

  it('should return all version even if the first call is to get current versions', async () => {
    await getMessages({ getAllVersions: false });

    const messages = await getMessages({ getAllVersions: true });

    expect(messages).toEqual(
      expect.objectContaining({
        commands: expect.arrayContaining([
          expect.objectContaining({
            collection: 'commands',
            data: expect.objectContaining({
              id: 'ProcessPayment',
              version: '0.0.1',
            }),
          }),
          expect.objectContaining({
            collection: 'commands',
            data: expect.objectContaining({
              id: 'ProcessPayment',
              version: '0.0.2',
            }),
          }),
          expect.objectContaining({
            collection: 'commands',
            data: expect.objectContaining({
              id: 'ProcessPayment',
              version: '0.1.0',
            }),
          }),
        ]),
      })
    );
  });
});
