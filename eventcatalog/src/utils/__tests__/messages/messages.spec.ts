import type { CollectionEntry, ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockCommands, mockEvents, mockQueries, mockServices, mockChannels, mockDataProducts, mockEntities } from './mocks';
import { getMessages, hydrateProducersAndConsumers } from '@utils/collections/messages';

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
        case 'entities':
          return mockEntities.filter(filterFn as any);
        case 'data-products':
          return mockDataProducts.filter(filterFn as any);
        default:
          return [];
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

describe('hydrateProducersAndConsumers', () => {
  describe('service producers', () => {
    it('should find services that send a message', () => {
      const message = { data: { id: 'PaymentProcessed', version: '0.0.1', latestVersion: '0.1.0' } };

      const { producers } = hydrateProducersAndConsumers({
        message,
        services: mockServices as any,
        dataProducts: [],
      });

      expect(producers).toHaveLength(2);
      expect(producers.map((p: any) => p.data.id)).toContain('ServiceThatProducesMessages');
      expect(producers.map((p: any) => p.data.id)).toContain('ServiceThatProducesMessagesOverManyChannels');
    });
  });

  describe('service consumers', () => {
    it('should find services that receive a message', () => {
      const message = { data: { id: 'PaymentProcessed', version: '0.0.1', latestVersion: '0.1.0' } };

      const { consumers } = hydrateProducersAndConsumers({
        message,
        services: mockServices as any,
        dataProducts: [],
      });

      expect(consumers).toHaveLength(2);
      expect(consumers.map((c: any) => c.data.id)).toContain('OrdersService');
      expect(consumers.map((c: any) => c.data.id)).toContain('ServiceThatReceivesMessagesFromAChannel');
    });
  });

  describe('data product producers', () => {
    it('should find data products that output a message', () => {
      const message = { data: { id: 'PaymentProcessed', version: '0.0.1', latestVersion: '0.1.0' } };

      const { producers } = hydrateProducersAndConsumers({
        message,
        services: [],
        dataProducts: mockDataProducts as any,
      });

      expect(producers).toHaveLength(1);
      expect(producers[0]).toMatchObject({
        data: { id: 'OrderDataPipeline' },
      });
    });
  });

  describe('data product consumers', () => {
    it('should find data products that input a message', () => {
      const message = { data: { id: 'PaymentProcessed', version: '0.0.1', latestVersion: '0.1.0' } };

      const { consumers } = hydrateProducersAndConsumers({
        message,
        services: [],
        dataProducts: mockDataProducts as any,
      });

      expect(consumers).toHaveLength(1);
      expect(consumers[0]).toMatchObject({
        data: { id: 'PaymentAnalytics' },
      });
    });
  });

  describe('combined services and data products', () => {
    it('should find both services and data products as producers and consumers', () => {
      const message = { data: { id: 'PaymentProcessed', version: '0.0.1', latestVersion: '0.1.0' } };

      const { producers, consumers } = hydrateProducersAndConsumers({
        message,
        services: mockServices as any,
        dataProducts: mockDataProducts as any,
      });

      // 2 services + 1 data product = 3 producers
      expect(producers).toHaveLength(3);

      // 2 services + 1 data product = 3 consumers
      expect(consumers).toHaveLength(3);
    });
  });

  describe('entity producers', () => {
    it('should find entities that send a message', () => {
      const message = { data: { id: 'PaymentProcessed', version: '0.0.1', latestVersion: '0.1.0' } };

      const { producers } = hydrateProducersAndConsumers({
        message,
        services: [],
        dataProducts: [],
        entities: mockEntities as any,
      });

      expect(producers).toHaveLength(1);
      expect(producers[0]).toMatchObject({
        data: { id: 'PaymentAggregate' },
      });
    });
  });

  describe('entity consumers', () => {
    it('should find entities that receive a message', () => {
      const message = { data: { id: 'PaymentProcessed', version: '0.0.1', latestVersion: '0.1.0' } };

      const { consumers } = hydrateProducersAndConsumers({
        message,
        services: [],
        dataProducts: [],
        entities: mockEntities as any,
      });

      expect(consumers).toHaveLength(1);
      expect(consumers[0]).toMatchObject({
        data: { id: 'OrderAggregate' },
      });
    });
  });

  describe('combined services, data products, and entities', () => {
    it('should find services, data products, and entities as producers and consumers', () => {
      const message = { data: { id: 'PaymentProcessed', version: '0.0.1', latestVersion: '0.1.0' } };

      const { producers, consumers } = hydrateProducersAndConsumers({
        message,
        services: mockServices as any,
        dataProducts: mockDataProducts as any,
        entities: mockEntities as any,
      });

      // 2 services + 1 data product + 1 entity = 4 producers
      expect(producers).toHaveLength(4);
      expect(producers.map((p: any) => p.data.id)).toContain('PaymentAggregate');

      // 2 services + 1 data product + 1 entity = 4 consumers
      expect(consumers).toHaveLength(4);
      expect(consumers.map((c: any) => c.data.id)).toContain('OrderAggregate');
    });
  });

  describe('entity version matching', () => {
    it('should match "latest" version pointer to the latest version of the message', () => {
      // The message IS the latest version (0.1.0)
      const message = { data: { id: 'PaymentProcessed', version: '0.1.0', latestVersion: '0.1.0' } };

      const { producers, consumers } = hydrateProducersAndConsumers({
        message,
        services: [],
        dataProducts: [],
        entities: mockEntities as any,
      });

      // EntityWithLatestVersion should match since it points to 'latest'
      expect(producers.map((p: any) => p.data.id)).toContain('EntityWithLatestVersion');
      expect(consumers.map((c: any) => c.data.id)).toContain('EntityWithLatestVersion');
    });

    it('should not match "latest" version pointer to non-latest versions', () => {
      // The message is NOT the latest version
      const message = { data: { id: 'PaymentProcessed', version: '0.0.1', latestVersion: '0.1.0' } };

      const { producers, consumers } = hydrateProducersAndConsumers({
        message,
        services: [],
        dataProducts: [],
        entities: mockEntities as any,
      });

      // EntityWithLatestVersion should NOT match since 0.0.1 is not latest
      expect(producers.map((p: any) => p.data.id)).not.toContain('EntityWithLatestVersion');
      expect(consumers.map((c: any) => c.data.id)).not.toContain('EntityWithLatestVersion');
    });
  });

  describe('version matching', () => {
    it('should match "latest" version pointer to the latest version of the message', () => {
      // The message IS the latest version (0.1.0)
      const message = { data: { id: 'PaymentProcessed', version: '0.1.0', latestVersion: '0.1.0' } };

      const { producers, consumers } = hydrateProducersAndConsumers({
        message,
        services: [],
        dataProducts: mockDataProducts as any,
      });

      // DataProductWithLatestVersion should match since it points to 'latest'
      expect(producers.map((p: any) => p.data.id)).toContain('DataProductWithLatestVersion');
      expect(consumers.map((c: any) => c.data.id)).toContain('DataProductWithLatestVersion');
    });

    it('should not match "latest" version pointer to non-latest versions', () => {
      // The message is NOT the latest version
      const message = { data: { id: 'PaymentProcessed', version: '0.0.1', latestVersion: '0.1.0' } };

      const { producers, consumers } = hydrateProducersAndConsumers({
        message,
        services: [],
        dataProducts: mockDataProducts as any,
      });

      // DataProductWithLatestVersion should NOT match since 0.0.1 is not latest
      expect(producers.map((p: any) => p.data.id)).not.toContain('DataProductWithLatestVersion');
      expect(consumers.map((c: any) => c.data.id)).not.toContain('DataProductWithLatestVersion');
    });
  });

  describe('hydration', () => {
    it('should return full objects when hydrate is true (default)', () => {
      const message = { data: { id: 'PaymentProcessed', version: '0.0.1', latestVersion: '0.1.0' } };

      const { producers } = hydrateProducersAndConsumers({
        message,
        services: mockServices as any,
        dataProducts: [],
        hydrate: true,
      });

      // Should have full service object with all properties
      expect(producers[0]).toHaveProperty('collection');
      expect(producers[0]).toHaveProperty('data.pathToFile');
    });

    it('should return minimal objects when hydrate is false', () => {
      const message = { data: { id: 'PaymentProcessed', version: '0.0.1', latestVersion: '0.1.0' } };

      const { producers } = hydrateProducersAndConsumers({
        message,
        services: mockServices as any,
        dataProducts: [],
        hydrate: false,
      });

      // Should only have id and version
      expect(producers[0]).toEqual({ id: 'ServiceThatProducesMessages', version: '1.0.0' });
      expect(producers[0]).not.toHaveProperty('collection');
    });
  });

  describe('empty collections', () => {
    it('should return empty arrays when no services or data products are provided', () => {
      const message = { data: { id: 'PaymentProcessed', version: '0.0.1', latestVersion: '0.1.0' } };

      const { producers, consumers } = hydrateProducersAndConsumers({
        message,
        services: [],
        dataProducts: [],
      });

      expect(producers).toEqual([]);
      expect(consumers).toEqual([]);
    });

    it('should return empty arrays when message has no matching producers or consumers', () => {
      const message = { data: { id: 'NonExistentMessage', version: '1.0.0', latestVersion: '1.0.0' } };

      const { producers, consumers } = hydrateProducersAndConsumers({
        message,
        services: mockServices as any,
        dataProducts: mockDataProducts as any,
      });

      expect(producers).toEqual([]);
      expect(consumers).toEqual([]);
    });
  });
});
