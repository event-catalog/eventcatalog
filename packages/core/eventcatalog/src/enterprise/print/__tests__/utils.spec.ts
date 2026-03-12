import { describe, it, expect, vi } from 'vitest';
import { hydrateParticipants } from '../utils';

vi.mock('astro:content', () => ({
  getCollection: vi.fn((name: string) => {
    if (name === 'users') return Promise.resolve([]);
    if (name === 'teams') return Promise.resolve([]);
    return Promise.resolve([]);
  }),
}));

vi.mock('@utils/collections/domains', () => ({
  getDomains: vi.fn(() =>
    Promise.resolve([
      {
        data: { id: 'orders', name: 'Orders', version: '1.0.0', services: [{ data: { id: 'OrderService' } }] },
        collection: 'domains',
      },
      {
        data: { id: 'payments', name: 'Payments', version: '1.0.0', services: [{ data: { id: 'PaymentService' } }] },
        collection: 'domains',
      },
    ])
  ),
  getDomainsForService: vi.fn((service: any) => {
    const domainMap: Record<string, any[]> = {
      OrderService: [{ data: { id: 'orders', name: 'Orders' } }],
      PaymentService: [{ data: { id: 'payments', name: 'Payments' } }],
    };
    return Promise.resolve(domainMap[service.data.id] || []);
  }),
}));

const makeService = (id: string, name: string, version: string, sends: any[] = [], receives: any[] = []) => ({
  id: `${id}-${version}`,
  collection: 'services',
  data: { id, name, version, sends, receives, owners: [] },
});

const makeDataProduct = (id: string, name: string, version: string, outputs: any[] = [], inputs: any[] = []) => ({
  id: `${id}-${version}`,
  collection: 'data-products',
  data: { id, name, version, outputs, inputs, owners: [] },
});

const makeDomain = (id: string, name: string, version: string, sends: any[] = [], receives: any[] = []) => ({
  id: `${id}-${version}`,
  collection: 'domains',
  data: { id, name, version, sends, receives, owners: [] },
});

describe('hydrateParticipants', () => {
  describe('extracting the message version from the pointer', () => {
    it('uses the version from the matching pointer in the sends field', async () => {
      const service = makeService('OrderService', 'Order Service', '1.0.0', [{ id: 'OrderPlaced', version: '2.0.0' }]);
      const [result] = await hydrateParticipants([service], 'sends', 'OrderPlaced', '2.0.0');
      expect(result.messageVersion).toBe('2.0.0');
    });

    it('defaults to "latest" when the pointer has no version', async () => {
      const service = makeService('OrderService', 'Order Service', '1.0.0', [{ id: 'OrderPlaced' }]);
      const [result] = await hydrateParticipants([service], 'sends', 'OrderPlaced', '2.0.0');
      expect(result.messageVersion).toBe('latest');
    });

    it('defaults to "latest" when no matching pointer is found', async () => {
      const service = makeService('OrderService', 'Order Service', '1.0.0', [{ id: 'OtherEvent', version: '1.0.0' }]);
      const [result] = await hydrateParticipants([service], 'sends', 'OrderPlaced', '2.0.0');
      expect(result.messageVersion).toBe('latest');
    });
  });

  describe('determining whether the message version is the latest', () => {
    it('marks as latest when the pointer version matches the latest version exactly', async () => {
      const service = makeService('OrderService', 'Order Service', '1.0.0', [{ id: 'OrderPlaced', version: '2.0.0' }]);
      const [result] = await hydrateParticipants([service], 'sends', 'OrderPlaced', '2.0.0');
      expect(result.isLatest).toBe(true);
    });

    it('marks as latest when the pointer version is "latest"', async () => {
      const service = makeService('OrderService', 'Order Service', '1.0.0', [{ id: 'OrderPlaced', version: 'latest' }]);
      const [result] = await hydrateParticipants([service], 'sends', 'OrderPlaced', '2.0.0');
      expect(result.isLatest).toBe(true);
    });

    it('marks as latest when the pointer has no version', async () => {
      const service = makeService('OrderService', 'Order Service', '1.0.0', [{ id: 'OrderPlaced' }]);
      const [result] = await hydrateParticipants([service], 'sends', 'OrderPlaced', '2.0.0');
      expect(result.isLatest).toBe(true);
    });

    it('marks as latest when a semver range satisfies the latest version', async () => {
      const service = makeService('OrderService', 'Order Service', '1.0.0', [{ id: 'OrderPlaced', version: '^2.0.0' }]);
      const [result] = await hydrateParticipants([service], 'sends', 'OrderPlaced', '2.1.0');
      expect(result.isLatest).toBe(true);
    });

    it('marks as not latest when the pointer version does not satisfy the latest', async () => {
      const service = makeService('OrderService', 'Order Service', '1.0.0', [{ id: 'OrderPlaced', version: '1.0.0' }]);
      const [result] = await hydrateParticipants([service], 'sends', 'OrderPlaced', '2.0.0');
      expect(result.isLatest).toBe(false);
    });
  });

  describe('using the correct pointer field per collection type', () => {
    it('reads "sends" for service producers', async () => {
      const service = makeService('OrderService', 'Order Service', '1.0.0', [{ id: 'OrderPlaced', version: '1.0.0' }]);
      const [result] = await hydrateParticipants([service], 'sends', 'OrderPlaced', '1.0.0');
      expect(result.messageVersion).toBe('1.0.0');
    });

    it('reads "receives" for service consumers', async () => {
      const service = makeService('OrderService', 'Order Service', '1.0.0', [], [{ id: 'OrderPlaced', version: '1.0.0' }]);
      const [result] = await hydrateParticipants([service], 'receives', 'OrderPlaced', '1.0.0');
      expect(result.messageVersion).toBe('1.0.0');
    });

    it('reads "outputs" for data-product producers instead of "sends"', async () => {
      const dp = makeDataProduct('Analytics', 'Analytics', '1.0.0', [{ id: 'OrderPlaced', version: '1.0.0' }]);
      const [result] = await hydrateParticipants([dp], 'sends', 'OrderPlaced', '1.0.0');
      expect(result.messageVersion).toBe('1.0.0');
    });

    it('reads "inputs" for data-product consumers instead of "receives"', async () => {
      const dp = makeDataProduct('Analytics', 'Analytics', '1.0.0', [], [{ id: 'OrderPlaced', version: '1.0.0' }]);
      const [result] = await hydrateParticipants([dp], 'receives', 'OrderPlaced', '1.0.0');
      expect(result.messageVersion).toBe('1.0.0');
    });

    it('reads "sends" for domain producers', async () => {
      const domain = makeDomain('orders', 'Orders', '1.0.0', [{ id: 'OrderPlaced', version: '1.0.0' }]);
      const [result] = await hydrateParticipants([domain], 'sends', 'OrderPlaced', '1.0.0');
      expect(result.messageVersion).toBe('1.0.0');
    });
  });

  describe('resolving the domain name for service participants', () => {
    it('includes the domain name for a service that belongs to a domain', async () => {
      const service = makeService('OrderService', 'Order Service', '1.0.0', [{ id: 'OrderPlaced' }]);
      const [result] = await hydrateParticipants([service], 'sends', 'OrderPlaced', '1.0.0');
      expect(result.domain).toBe('Orders');
    });

    it('sets domain to undefined for a service not in any domain', async () => {
      const service = makeService('StandaloneService', 'Standalone', '1.0.0', [{ id: 'OrderPlaced' }]);
      const [result] = await hydrateParticipants([service], 'sends', 'OrderPlaced', '1.0.0');
      expect(result.domain).toBeUndefined();
    });

    it('does not attempt domain lookup for non-service participants', async () => {
      const dp = makeDataProduct('Analytics', 'Analytics', '1.0.0', [], [{ id: 'OrderPlaced' }]);
      const [result] = await hydrateParticipants([dp], 'receives', 'OrderPlaced', '1.0.0');
      expect(result.domain).toBeUndefined();
    });
  });

  describe('populating the resource type label from the collection name', () => {
    it('labels a service participant as "Service"', async () => {
      const service = makeService('OrderService', 'Order Service', '1.0.0', [{ id: 'OrderPlaced' }]);
      const [result] = await hydrateParticipants([service], 'sends', 'OrderPlaced', '1.0.0');
      expect(result.resourceType).toBe('Service');
    });

    it('labels a data-product participant as "Data Product"', async () => {
      const dp = makeDataProduct('Analytics', 'Analytics', '1.0.0', [], [{ id: 'OrderPlaced' }]);
      const [result] = await hydrateParticipants([dp], 'receives', 'OrderPlaced', '1.0.0');
      expect(result.resourceType).toBe('Data Product');
    });

    it('labels a domain participant as "Domain"', async () => {
      const domain = makeDomain('orders', 'Orders', '1.0.0', [{ id: 'OrderPlaced' }]);
      const [result] = await hydrateParticipants([domain], 'sends', 'OrderPlaced', '1.0.0');
      expect(result.resourceType).toBe('Domain');
    });
  });

  describe('returning basic resource metadata', () => {
    it('includes the resource name and version from the collection entry', async () => {
      const service = makeService('OrderService', 'Order Service', '3.2.1', [{ id: 'OrderPlaced' }]);
      const [result] = await hydrateParticipants([service], 'sends', 'OrderPlaced', '1.0.0');
      expect(result.name).toBe('Order Service');
      expect(result.resourceVersion).toBe('3.2.1');
    });
  });

  it('returns an empty array when given an empty list', async () => {
    const results = await hydrateParticipants([], 'sends', 'OrderPlaced', '1.0.0');
    expect(results).toEqual([]);
  });
});
