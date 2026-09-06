import { describe, expect, it, vi } from 'vitest';
import { collectMessageIdsWithFieldUsage, getMessageIdsWithFieldUsage } from '@utils/collections/field-usage';

vi.mock('astro:content', () => ({
  getCollection: async (key: string) => {
    if (key === 'services') {
      return [
        {
          data: {
            sends: [{ id: 'OrderCreated', version: '1.0.0', fields: ['orderId'] }],
            receives: [{ id: 'PlaceOrder', version: '1.0.0' }],
          },
        },
      ];
    }
    if (key === 'agents') {
      return [
        {
          data: {
            receives: [{ id: 'InventoryAdjusted', version: '1.0.0', fields: ['sku', 'qty'] }],
          },
        },
      ];
    }
    if (key === 'domains') {
      return [
        {
          data: {
            sends: [{ id: 'DomainAnnounced', version: '1.0.0', fields: ['name'] }],
          },
        },
      ];
    }
    return [];
  },
}));

describe('collectMessageIdsWithFieldUsage', () => {
  it('returns only message ids whose send or receive pointers declare fields', () => {
    const ids = collectMessageIdsWithFieldUsage(
      [{ data: { receives: [{ id: 'AgentPing', fields: ['traceId'] }] } }],
      [
        {
          data: {
            sends: [{ id: 'OrderCreated', fields: ['orderId'] }],
            receives: [{ id: 'PlaceOrder' }],
          },
        },
      ],
      [{ data: { sends: [{ id: 'DomainAnnounced' }] } }]
    );

    expect([...ids].sort()).toEqual(['AgentPing', 'OrderCreated']);
  });

  it('ignores empty fields arrays', () => {
    const ids = collectMessageIdsWithFieldUsage([], [{ data: { sends: [{ id: 'EmptyFields', fields: [] }] } }], []);
    expect(ids.size).toBe(0);
  });
});

describe('getMessageIdsWithFieldUsage', () => {
  it('reads raw agents, services, and domains', async () => {
    const ids = await getMessageIdsWithFieldUsage();
    expect([...ids].sort()).toEqual(['DomainAnnounced', 'InventoryAdjusted', 'OrderCreated']);
  });
});
