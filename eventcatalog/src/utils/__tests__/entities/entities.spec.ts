import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockServices, mockEntities, mockDomains, mockEvents, mockCommands, mockQueries } from './mocks';
import { getEntities } from '@utils/collections/entities';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'services':
          return Promise.resolve(mockServices);
        case 'entities':
          return Promise.resolve(mockEntities);
        case 'domains':
          return Promise.resolve(mockDomains);
        case 'events':
          return Promise.resolve(mockEvents);
        case 'commands':
          return Promise.resolve(mockCommands);
        case 'queries':
          return Promise.resolve(mockQueries);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('Entities', () => {
  describe('getEntities', () => {
    it('should returns an array of entities', async () => {
      const entities = await getEntities();

      const expectedEntities = [
        {
          id: 'Supplier',
          slug: 'Supplier',
          collection: 'entities',
          data: expect.objectContaining({
            id: 'Supplier',
            version: '0.0.1',
            services: [mockServices[0]],
            domains: [mockDomains[0]],
          }),
        },
      ];

      expect(entities).toEqual(expect.arrayContaining(expectedEntities.map((e) => expect.objectContaining(e))));
    });

    it('should hydrate sends with resolved message entries', async () => {
      const entities = await getEntities();
      const orderEntity = entities.find((e) => e.data.id === 'Order');

      expect(orderEntity).toBeDefined();
      expect(orderEntity!.data.sends).toHaveLength(2);
      expect(orderEntity!.data.sends).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ data: expect.objectContaining({ id: 'OrderCreated', version: '1.0.0' }) }),
          expect.objectContaining({ data: expect.objectContaining({ id: 'OrderShipped', version: '1.0.0' }) }),
        ])
      );
    });

    it('should hydrate receives with resolved message entries', async () => {
      const entities = await getEntities();
      const orderEntity = entities.find((e) => e.data.id === 'Order');

      expect(orderEntity).toBeDefined();
      expect(orderEntity!.data.receives).toHaveLength(2);
      expect(orderEntity!.data.receives).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ data: expect.objectContaining({ id: 'CreateOrder', version: '1.0.0' }) }),
          expect.objectContaining({ data: expect.objectContaining({ id: 'ShipOrder', version: '1.0.0' }) }),
        ])
      );
    });

    it('should include sendsRaw and receivesRaw for graph building', async () => {
      const entities = await getEntities();
      const orderEntity = entities.find((e) => e.data.id === 'Order') as any;

      expect(orderEntity).toBeDefined();
      expect(orderEntity.data.sendsRaw).toEqual([
        { id: 'OrderCreated', version: '1.0.0' },
        { id: 'OrderShipped', version: '1.0.0' },
      ]);
      expect(orderEntity.data.receivesRaw).toEqual([
        { id: 'CreateOrder', version: '1.0.0' },
        { id: 'ShipOrder', version: '1.0.0' },
      ]);
    });

    it('should return empty arrays for entity without sends/receives', async () => {
      const entities = await getEntities();
      const simpleEntity = entities.find((e) => e.data.id === 'SimpleEntity') as any;

      expect(simpleEntity).toBeDefined();
      expect(simpleEntity.data.sends).toEqual([]);
      expect(simpleEntity.data.receives).toEqual([]);
      expect(simpleEntity.data.sendsRaw).toEqual([]);
      expect(simpleEntity.data.receivesRaw).toEqual([]);
    });
  });
});
