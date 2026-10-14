import { describe, expect, it } from 'vitest';
import { getVersionedMap, resourceKey, uniqueResources } from '@utils/collections/util';

const entry = (collection: string, id: string, version = '1.0.0') => ({ collection, data: { id, version } });

describe('resourceKey', () => {
  it('identifies a resource by collection, id and version', () => {
    expect(resourceKey(entry('services', 'Payments'))).toBe('services:Payments:1.0.0');
  });
});

describe('uniqueResources', () => {
  it('keeps the first of each resource, in order', () => {
    const payments = entry('services', 'Payments');
    const orders = entry('services', 'Orders');

    expect(uniqueResources([payments, orders, entry('services', 'Payments')])).toEqual([payments, orders]);
  });

  it('keeps resources that share an id and version but not a collection', () => {
    const service = entry('services', 'Payments');
    const agent = entry('agents', 'Payments');

    expect(uniqueResources([service, agent])).toEqual([service, agent]);
  });
});

describe('getVersionedMap', () => {
  it('builds the versioned map once per list, latest version first', () => {
    const services = [entry('services', 'Payments', '1.0.0'), entry('services', 'Payments', '2.0.0')];

    const map = getVersionedMap(services);

    expect(getVersionedMap(services)).toBe(map);
    expect(map.get('Payments')?.map((service) => service.data.version)).toEqual(['2.0.0', '1.0.0']);
  });
});
