import { describe, expect, it, vi } from 'vitest';
import type { CollectionKey } from 'astro:content';
import { getNodesAndEdges, SHARED_DOMAIN_LANE } from '../../node-graphs/catalog-entity-map';

const entity = (id: string, properties: any[] = [], extra: Record<string, any> = {}) => ({
  id: `${id}-1.0.0`,
  collection: 'entities',
  filePath: `domains/x/entities/${id}/index.mdx`,
  data: { id, name: id, version: '1.0.0', properties: [{ name: 'id', type: 'string' }, ...properties], ...extra },
});

const mockEntities = [
  entity('Order', [{ name: 'customerId', type: 'string', references: 'Customer' }]),
  entity('Customer', [], { owners: ['customers-team'] }),
  entity('Invoice', [{ name: 'orderId', type: 'string', references: 'Order' }]),
  entity('Address'),
  entity('Ledger'),
  entity('Orphan'),
];

const mockDomains = [
  {
    id: 'Orders-1.0.0',
    collection: 'domains',
    data: { id: 'Orders', name: 'Orders', version: '1.0.0', entities: [{ id: 'Order' }, { id: 'Address' }] },
  },
  {
    id: 'Customers-1.0.0',
    collection: 'domains',
    data: { id: 'Customers', name: 'Customers', version: '1.0.0', entities: [{ id: 'Customer' }, { id: 'Address' }] },
  },
  {
    id: 'Billing-1.0.0',
    collection: 'domains',
    data: { id: 'Billing', name: 'Billing', version: '1.0.0', systems: [{ id: 'BillingSystem' }], owners: ['billing-team'] },
  },
];

const mockSystems = [
  {
    id: 'BillingSystem-1.0.0',
    collection: 'systems',
    data: {
      id: 'BillingSystem',
      name: 'Billing System',
      version: '1.0.0',
      services: [{ id: 'InvoiceService' }],
      entities: [{ id: 'Ledger' }],
    },
  },
];

const mockServices = [
  {
    id: 'InvoiceService-1.0.0',
    collection: 'services',
    data: { id: 'InvoiceService', name: 'Invoice Service', version: '1.0.0', entities: [{ id: 'Invoice' }] },
  },
];

const mockTeams = [
  { id: 'customers-team', collection: 'teams', data: { id: 'customers-team', name: 'Customers Team' } },
  { id: 'billing-team', collection: 'teams', data: { id: 'billing-team', name: 'Billing Team' } },
];

vi.mock('astro:content', async (importOriginal) => ({
  ...(await importOriginal<typeof import('astro:content')>()),
  getCollection: (key: CollectionKey) => {
    const collections: Record<string, any[]> = {
      entities: mockEntities,
      domains: mockDomains,
      systems: mockSystems,
      services: mockServices,
      teams: mockTeams,
    };
    return Promise.resolve(collections[key] ?? []);
  },
}));

const lanesOf = (nodes: any[], id: string) => nodes.find((node) => node.data.entity.data.id === id)?.data.lanes;

describe('catalog entity map', () => {
  it('shows every entity in the catalog, whichever resource owns it', async () => {
    const { nodes } = await getNodesAndEdges();

    expect(nodes.map((node: any) => node.data.entity.data.id).sort()).toEqual([
      'Address',
      'Customer',
      'Invoice',
      'Ledger',
      'Order',
      'Orphan',
    ]);
  });

  it('puts an entity in the domain that lists it', async () => {
    const { nodes } = await getNodesAndEdges();

    expect(lanesOf(nodes, 'Order').domain).toEqual({ id: 'Orders', name: 'Orders' });
  });

  it('puts an entity listed by a service in the domain and system that service is in', async () => {
    const { nodes } = await getNodesAndEdges();

    expect(lanesOf(nodes, 'Invoice')).toMatchObject({
      domain: { id: 'Billing', name: 'Billing' },
      system: { id: 'BillingSystem', name: 'Billing System' },
    });
  });

  it('puts an entity listed by a system in that system and its domain', async () => {
    const { nodes } = await getNodesAndEdges();

    expect(lanesOf(nodes, 'Ledger')).toMatchObject({
      domain: { id: 'Billing', name: 'Billing' },
      system: { id: 'BillingSystem', name: 'Billing System' },
    });
  });

  it('puts an entity listed by more than one domain in the shared lane', async () => {
    const { nodes } = await getNodesAndEdges();

    expect(lanesOf(nodes, 'Address').domain).toEqual(SHARED_DOMAIN_LANE);
  });

  it("uses the entity's own owner as its team, and otherwise the owner of what lists it", async () => {
    const { nodes } = await getNodesAndEdges();

    expect(lanesOf(nodes, 'Customer').team).toEqual({ id: 'customers-team', name: 'Customers Team' });
    expect(lanesOf(nodes, 'Ledger').team).toBeUndefined();
  });

  it('gives an entity nothing lists no lanes, so it is not grouped with its neighbours', async () => {
    const { nodes } = await getNodesAndEdges();

    expect(lanesOf(nodes, 'Orphan')).toEqual({});
  });

  it('draws references between entities in different domains', async () => {
    const { edges } = await getNodesAndEdges();

    expect(edges.map((edge: any) => [edge.source, edge.target])).toEqual(
      expect.arrayContaining([
        ['Order-1.0.0', 'Customer-1.0.0'],
        ['Invoice-1.0.0', 'Order-1.0.0'],
      ])
    );
  });
});
