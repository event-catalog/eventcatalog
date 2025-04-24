import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockDomains, mockServices, mockEvents, mockCommands, mockUbiquitousLanguages } from './mocks';
import { getDomains, getDomainsForService, getParentDomains, getUbiquitousLanguage } from '../../collections/domains';
import type { Service } from '@utils/collections/services';
import type { Domain } from '@utils/collections/domains';
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
        case 'ubiquitousLanguages':
          return Promise.resolve(mockUbiquitousLanguages);
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

  describe('ubiquitous-language', () => {
    it('should return the ubiquitous-language for a domain', async () => {
      const domains = await getDomains();
      const ubiquitousLanguages = await getUbiquitousLanguage(domains[0]);
      expect(ubiquitousLanguages).toEqual([
        {
          id: 'domains/Shipping/ubiquitous-language.mdx',
          slug: 'domains/Shipping/ubiquitous-language',
          collection: 'ubiquitousLanguages',
          data: {
            id: 'Shipping',
            dictionary: [
              {
                id: 'Payment',
                name: 'Payment',
              },
            ],
          },
        },
      ]);
    });
  });

  describe('getDomainsForService', () => {
    it('should return the domains for a service', async () => {
      const domains = await getDomainsForService(mockServices[0] as unknown as Service);
      const expectedDomain = mockDomains[0];
      expect(domains[0].data.id).toEqual(expectedDomain.data.id);
      expect(domains[0].data.services).toEqual(expect.arrayContaining([mockServices[0]]));
    });

    it('returns an empty array if the service is not found', async () => {
      const domains = await getDomainsForService(mockServices[4] as unknown as Service);
      expect(domains).toEqual([]);
    });
  });

  describe('getParentDomains', () => {
    it('should return the parent domains for a domain', async () => {
      const domains = await getParentDomains(mockDomains[1] as unknown as Domain);
      const expectedDomain = mockDomains[0];
      expect(domains[0].data.id).toEqual(expectedDomain.data.id);
      expect(domains[0].data.domains).toEqual(expect.arrayContaining([mockDomains[1]]));
    });

    it('returns an empty array if the domain is not found', async () => {
      const domains = await getParentDomains(mockDomains[2] as unknown as Domain);
      expect(domains).toEqual([]);
    });
  });
});
