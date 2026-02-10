import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockServices, mockEvents } from './mocks';
import { getEvents } from '@utils/collections/events';

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
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('Events', () => {
  describe('getEvents', () => {
    it('should returns an array of events', async () => {
      const events = await getEvents();

      const expectedEvents = [
        {
          id: 'OrderCreatedEvent',
          slug: 'OrderCreatedEvent',
          collection: 'events',
          data: expect.objectContaining({
            id: 'OrderCreatedEvent',
            version: '0.0.1',
            producers: [mockServices[0]],
            consumers: [mockServices[1]],
          }),
        },
        {
          id: 'InventoryAdjusted',
          slug: 'InventoryAdjusted',
          collection: 'events',
          data: expect.objectContaining({
            id: 'InventoryAdjusted',
            version: '1.5.1',
            producers: [mockServices[2]],
            consumers: [mockServices[3]],
          }),
        },
        {
          id: 'ProductOutOfStock',
          slug: 'ProductOutOfStock',
          collection: 'events',
          data: expect.objectContaining({
            id: 'ProductOutOfStock',
            version: '1.0.0',
            producers: [mockServices[2]],
          }),
        },
      ];

      expect(events).toEqual(expect.arrayContaining(expectedEvents.map((e) => expect.objectContaining(e))));
    });

    it('should returns an arry of events with producers/consumers using semver or latest', async () => {
      const events = await getEvents();

      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'ProductDiscontinued',
            slug: 'ProductDiscontinued',
            collection: 'events',
            data: expect.objectContaining({
              id: 'ProductDiscontinued',
              version: '0.0.1',
              producers: [],
              consumers: [mockServices[3]],
            }),
          }),
          expect.objectContaining({
            id: 'ProductDiscontinued',
            slug: 'ProductDiscontinued',
            collection: 'events',
            data: expect.objectContaining({
              id: 'ProductDiscontinued',
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
