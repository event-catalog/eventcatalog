import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockDomains, mockServices, mockEvents, mockCommands } from './mocks';
import { getDomains } from '../../domains/domains';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'domains':
          return Promise.resolve(mockDomains);
        case 'services':
          return Promise.resolve(mockServices);
        case 'events':
          return Promise.resolve(mockEvents);
        case 'commands':
          return Promise.resolve(mockCommands);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('Domains', () => {
  describe('getDomains', () => {
    it('should returns an array of domains with services using semver or latest', async () => {
      const domains = await getDomains();

      const expectedDomains = [
        // Shipping
        {
          ...mockDomains[0],
          data: expect.objectContaining({ services: [mockServices[0]] }),
        },
        // Checkout
        {
          ...mockDomains[1],
          data: expect.objectContaining({ services: [mockServices[2], mockServices[3]] }),
        },
        // Notification
        {
          ...mockDomains[2],
          data: expect.objectContaining({ services: [] }),
        },
      ];

      expect(domains).toEqual(expect.arrayContaining(expectedDomains.map((d) => expect.objectContaining(d))));
    });
  });
});
