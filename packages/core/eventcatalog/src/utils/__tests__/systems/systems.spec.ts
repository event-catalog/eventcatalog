import type { CollectionKey } from 'astro:content';
import { describe, expect, it, vi } from 'vitest';
import { mockCommands, mockContainers, mockEvents, mockQueries, mockServices, mockSystems } from './mocks';
import { getSystems } from '@utils/collections/systems';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: CollectionKey) => {
      switch (key) {
        case 'systems':
          return Promise.resolve(mockSystems);
        case 'services':
          return Promise.resolve(mockServices);
        case 'events':
          return Promise.resolve(mockEvents);
        case 'commands':
          return Promise.resolve(mockCommands);
        case 'queries':
          return Promise.resolve(mockQueries);
        case 'containers':
          return Promise.resolve(mockContainers);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('getSystems', () => {
  it('leaves service sends and receives as id/version pointers when services are not enriched', async () => {
    const systems = await getSystems();
    const core = systems.find((system) => system.data.id === 'CoreMonolith');
    const orderService = (core?.data.services as any[])?.find((service) => service.data.id === 'OrderService');

    expect(orderService.data.sends).toEqual([{ id: 'OrderPlaced', version: '1.0.0' }]);
  });

  it('hydrates service sends with collection entries when enrichServices is true', async () => {
    const systems = await getSystems({ enrichServices: true });
    const core = systems.find((system) => system.data.id === 'CoreMonolith');
    const orderService = (core?.data.services as any[])?.find((service) => service.data.id === 'OrderService');
    const paymentService = (core?.data.services as any[])?.find((service) => service.data.id === 'PaymentService');

    expect(orderService.data.sends).toEqual([
      expect.objectContaining({
        collection: 'events',
        data: expect.objectContaining({ id: 'OrderPlaced', version: '1.0.0' }),
      }),
    ]);
    expect(paymentService.data.receives).toEqual([
      expect.objectContaining({
        collection: 'events',
        data: expect.objectContaining({ id: 'OrderPlaced', version: '1.0.0' }),
      }),
    ]);
  });
});
