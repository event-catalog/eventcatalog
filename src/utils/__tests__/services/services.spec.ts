import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockCommands, mockEvents, mockQueries, mockServices } from './mocks';
import { getServices } from '@utils/collections/services';

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
        case 'queries':
          return Promise.resolve(mockQueries);
      }
    },
  };
});

describe('Services', () => {
  describe('getServices', () => {
    it('should returns an array of services', async () => {
      const services = await getServices();

      expect(services).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            collection: 'services',
            data: expect.objectContaining({
              id: 'OrderService',
              version: '1.0.0',
              receives: expect.any(Array),
              sends: expect.any(Array),
            }),
          }),
          expect.objectContaining({
            collection: 'services',
            data: expect.objectContaining({
              id: 'InventoryService',
              version: '1.0.0',
              receives: expect.any(Array),
              sends: expect.any(Array),
            }),
          }),
        ])
      );
    });

    it('should returns an array of services with messages (sends/receives)', async () => {
      const services = await getServices();

      expect(services).toEqual(
        expect.arrayContaining([
          /** OrderService */
          expect.objectContaining({
            id: 'services/Order/OrderService/index.mdx',
            slug: 'services/Order/OrderService',
            collection: 'services',
            data: expect.objectContaining({
              id: 'OrderService',
              version: '1.0.0',
              receives: [mockCommands[0]],
              sends: [mockEvents[0]],
            }),
          }),
        ])
      );
    });

    it('should returns an array of services with messages (sends/receives) when version is specified as semver range', async () => {
      const services = await getServices();

      expect(services).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'services/Inventory/InventoryService/index.mdx',
            slug: 'services/Inventory/InventoryService',
            collection: 'services',
            data: expect.objectContaining({
              id: 'InventoryService',
              version: '1.0.0',
              receives: [mockEvents[2]],
              sends: [mockEvents[7]],
            }),
          }),
        ])
      );
    });

    it('should returns an array of services with messages (sends/receives) when version is specified as latest or undefined', async () => {
      const services = await getServices();

      expect(services).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'services/Payment/PaymentService/index.mdx',
            slug: 'services/Payment/PaymentService',
            collection: 'services',
            data: expect.objectContaining({
              id: 'PaymentService',
              version: '1.0.0',
              receives: [mockEvents[3], mockEvents[4]],
              sends: [mockEvents[9], mockEvents[11], mockEvents[12]],
            }),
          }),
        ])
      );
    });
  });
});
