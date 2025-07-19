import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { mockDomains, mockServices, mockEvents, mockCommands, mockUbiquitousLanguages } from './mocks';
import {
  domainHasEntities,
  getDomains,
  getDomainsForService,
  getParentDomains,
  getUbiquitousLanguage,
  getUbiquitousLanguageWithSubdomains,
} from '../../collections/domains';
import type { Service } from '@utils/collections/services';
import type { Domain } from '@utils/collections/domains';
vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    // this will only affect "foo" outside of the original module
    getCollection: (key: ContentCollectionKey, filter?: any) => {
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
          let result = mockUbiquitousLanguages;
          if (filter) {
            result = mockUbiquitousLanguages.filter(filter);
          }
          return Promise.resolve(result);
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
      const shippingDomain = domains.find((d) => d.data.id === 'Shipping');
      const ubiquitousLanguages = await getUbiquitousLanguage(shippingDomain!);
      expect(ubiquitousLanguages).toEqual([
        {
          id: 'domains/Shipping/ubiquitous-language.mdx',
          slug: 'domains/Shipping/ubiquitous-language',
          collection: 'ubiquitousLanguages',
          filePath: 'domains/Shipping/ubiquitous-language.mdx',
          data: {
            id: 'Shipping',
            dictionary: [
              {
                id: 'Payment',
                name: 'Payment',
                summary: 'A financial transaction',
              },
              {
                id: 'Order',
                name: 'Order',
                summary: 'A customer purchase request',
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
      const checkoutDomain = mockDomains.find((d) => d.data.id === 'Checkout');
      const domains = await getParentDomains(checkoutDomain as unknown as Domain);
      const expectedDomain = mockDomains.find((d) => d.data.id === 'Shipping');
      expect(domains.length).toBeGreaterThan(0);
      expect(domains[0].data.id).toEqual(expectedDomain!.data.id);
      // The domains array will contain the processed subdomain objects, not the original mock
      //@ts-ignore
      expect(domains[0].data.domains.some((d: any) => d.data.id === 'Checkout')).toBe(true);
    });

    it('returns an empty array if the domain is not found', async () => {
      const notificationDomain = mockDomains.find((d) => d.data.id === 'Notification');
      const domains = await getParentDomains(notificationDomain as unknown as Domain);
      expect(domains).toEqual([]);
    });
  });

  describe('getUbiquitousLanguageWithSubdomains', () => {
    it('should return domain ubiquitous language with subdomain languages', async () => {
      const domains = await getDomains();
      const shippingDomain = domains.find((d) => d.data.id === 'Shipping');

      const result = await getUbiquitousLanguageWithSubdomains(shippingDomain as Domain);

      expect(result.domain).toEqual({
        id: 'domains/Shipping/ubiquitous-language.mdx',
        slug: 'domains/Shipping/ubiquitous-language',
        collection: 'ubiquitousLanguages',
        filePath: 'domains/Shipping/ubiquitous-language.mdx',
        data: {
          id: 'Shipping',
          dictionary: [
            { id: 'Payment', name: 'Payment', summary: 'A financial transaction' },
            { id: 'Order', name: 'Order', summary: 'A customer purchase request' },
          ],
        },
      });

      expect(result.subdomains).toHaveLength(1);
      expect(result.subdomains[0].subdomain.data.id).toBe('Checkout');
      expect(result.subdomains[0].ubiquitousLanguage).toEqual({
        id: 'domains/Checkout/ubiquitous-language.mdx',
        slug: 'domains/Checkout/ubiquitous-language',
        collection: 'ubiquitousLanguages',
        filePath: 'domains/Checkout/ubiquitous-language.mdx',
        data: {
          id: 'Checkout',
          dictionary: [
            { id: 'Payment', name: 'Payment', summary: 'Processing customer payment' },
            { id: 'Cart', name: 'Cart', summary: 'Shopping cart items' },
          ],
        },
      });
    });

    it('should detect duplicate terms across domain and subdomains', async () => {
      const domains = await getDomains();
      const shippingDomain = domains.find((d) => d.data.id === 'Shipping');

      const result = await getUbiquitousLanguageWithSubdomains(shippingDomain as Domain);

      // Payment appears in both Shipping domain and Checkout subdomain, so should be a duplicate
      expect(result.duplicateTerms).toContain('payment');
      // Order only appears in Shipping domain, Cart only in Checkout - neither should be duplicates
      expect(result.duplicateTerms).not.toContain('order');
      expect(result.duplicateTerms).not.toContain('cart');
    });

    it('should handle domain with no ubiquitous language', async () => {
      const domains = await getDomains();
      const notificationDomain = domains.find((d) => d.data.id === 'Notification');

      const result = await getUbiquitousLanguageWithSubdomains(notificationDomain as Domain);

      expect(result.domain).toEqual({
        id: 'domains/Notification/ubiquitous-language.mdx',
        slug: 'domains/Notification/ubiquitous-language',
        collection: 'ubiquitousLanguages',
        filePath: 'domains/Notification/ubiquitous-language.mdx',
        data: {
          id: 'Notification',
          dictionary: [{ id: 'Email', name: 'Email', summary: 'Electronic mail notification' }],
        },
      });
      expect(result.subdomains).toHaveLength(0);
      expect(result.duplicateTerms.size).toBe(0);
    });

    it('should handle domain with subdomains but no ubiquitous language for subdomains', async () => {
      const domains = await getDomains();
      const checkoutDomain = domains.find((d) => d.data.id === 'Checkout');

      const result = await getUbiquitousLanguageWithSubdomains(checkoutDomain as Domain);

      expect(result.domain).toEqual({
        id: 'domains/Checkout/ubiquitous-language.mdx',
        slug: 'domains/Checkout/ubiquitous-language',
        collection: 'ubiquitousLanguages',
        filePath: 'domains/Checkout/ubiquitous-language.mdx',
        data: {
          id: 'Checkout',
          dictionary: [
            { id: 'Payment', name: 'Payment', summary: 'Processing customer payment' },
            { id: 'Cart', name: 'Cart', summary: 'Shopping cart items' },
          ],
        },
      });
      expect(result.subdomains).toHaveLength(0);
      expect(result.duplicateTerms.size).toBe(0);
    });

    it('should return empty result when domain has no ubiquitous language and no subdomains', async () => {
      const mockDomainWithoutLanguage = {
        id: 'domains/Empty/index.mdx',
        filePath: 'domains/Empty/index.mdx',
        data: {
          id: 'Empty',
          name: 'Empty',
          version: '0.0.1',
          domains: [],
        },
      };

      //@ts-ignore
      const result = await getUbiquitousLanguageWithSubdomains(mockDomainWithoutLanguage as Domain);

      expect(result.domain).toBeNull();
      expect(result.subdomains).toHaveLength(0);
      expect(result.duplicateTerms.size).toBe(0);
    });
  });

  describe('domainHasEntities', () => {
    it('should return true if the domain has entities', async () => {
      const domains = await getDomains();
      domains[0].data.entities = [{ id: 'Order', version: '1.0.0' }];
      expect(domainHasEntities(domains[0])).toBe(true);
    });

    it('should return false if the domain has no entities', async () => {
      const domains = await getDomains();
      expect(domainHasEntities(domains[1])).toBe(false);
    });
  });
});
