import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockServices, mockEntities, mockDomains } from './mocks';
import { getEntities } from '@utils/collections/entities';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'services':
          return Promise.resolve(mockServices);
        case 'entities':
          return Promise.resolve(mockEntities);
        case 'domains':
          return Promise.resolve(mockDomains);
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
  });
});
