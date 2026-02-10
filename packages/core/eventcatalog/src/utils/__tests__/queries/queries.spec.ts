import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockServices, mockQueries } from './mocks';
import { getQueries } from '@utils/collections/queries';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'services':
          return Promise.resolve(mockServices);
        case 'queries':
          return Promise.resolve(mockQueries);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('Queries', () => {
  describe('getQueries', () => {
    it('should returns an array of queries', async () => {
      const queries = await getQueries();

      const expectedQueries = [
        {
          id: 'GetLatestOrder',
          slug: 'GetLatestOrder',
          collection: 'queries',
          data: expect.objectContaining({
            id: 'GetLatestOrder',
            version: '0.0.1',
            producers: [mockServices[0]],
            consumers: [mockServices[1]],
          }),
        },
        {
          id: 'GetInventoryItem',
          slug: 'GetInventoryItem',
          collection: 'queries',
          data: expect.objectContaining({
            id: 'GetInventoryItem',
            version: '1.5.1',
            producers: [mockServices[2]],
            consumers: [mockServices[3]],
          }),
        },
        {
          id: 'GetStockStatus',
          slug: 'GetStockStatus',
          collection: 'queries',
          data: expect.objectContaining({
            id: 'GetStockStatus',
            version: '1.0.0',
            producers: [mockServices[2]],
          }),
        },
      ];

      expect(queries).toEqual(expect.arrayContaining(expectedQueries.map((e) => expect.objectContaining(e))));
    });

    it('should returns an array of queries with producers/consumers using semver or latest', async () => {
      const queries = await getQueries();

      expect(queries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'GetStockStatus',
            slug: 'GetStockStatus',
            collection: 'queries',
            data: expect.objectContaining({
              id: 'GetStockStatus',
              version: '1.0.0',
              producers: [mockServices[2]],
              consumers: [mockServices[3]],
            }),
          }),
        ])
      );
    });
  });
});
