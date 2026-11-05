import type { CollectionKey } from 'astro:content';
import { describe, expect, it, vi } from 'vitest';
import { GET } from '../../pages/docs/llm/llms.txt.ts';

vi.mock('astro:content', async (importOriginal) => ({
  ...(await importOriginal<typeof import('astro:content')>()),
  getCollection: (key: CollectionKey, filter?: (entry: any) => boolean) => {
    const collections: Partial<Record<CollectionKey, any[]>> = {
      events: [
        { data: { id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', summary: 'One line summary' } },
        { data: { id: 'OrderShipped', name: 'Order Shipped', version: '1.0.0', summary: 'Block summary\n' } },
        { data: { id: 'OrderCancelled', name: 'Order Cancelled', version: '1.0.0', summary: 'Last summary' } },
      ],
      domains: [
        {
          id: 'order-management-1.0.0',
          filePath: 'domains/order-management/index.mdx',
          data: { id: 'order-management', name: 'Order Management', version: '1.0.0', summary: 'Orders' },
        },
      ],
      ubiquitousLanguages: [
        {
          filePath: 'domains/order-management/ubiquitous-language.mdx',
          data: {
            dictionary: [
              { id: 'order', name: 'Order', summary: 'A request to buy goods.' },
              { id: 'refund', name: 'Refund', description: 'Money returned to a customer.' },
              { id: 'chargeback', name: 'Chargeback' },
            ],
          },
        },
      ],
    };
    const entries = collections[key] ?? [];
    return Promise.resolve(filter ? entries.filter(filter) : entries);
  },
}));

vi.mock('@utils/collections/resource-docs', () => ({
  getResourceDocs: () => Promise.resolve([]),
}));

const getBody = async () => {
  const response = await GET({ request: new Request('http://localhost:4321/docs/llm/llms.txt') } as any);
  return response.text();
};

describe('docs/llm/llms.txt', () => {
  it('lists each resource on its own line, however its summary was written', async () => {
    const body = await getBody();

    expect(body).toContain(`## Events
- [Order Placed - OrderPlaced - 1.0.0 ](http://localhost:4321/docs/events/OrderPlaced/1.0.0.mdx) - One line summary
- [Order Shipped - OrderShipped - 1.0.0 ](http://localhost:4321/docs/events/OrderShipped/1.0.0.mdx) - Block summary
- [Order Cancelled - OrderCancelled - 1.0.0 ](http://localhost:4321/docs/events/OrderCancelled/1.0.0.mdx) - Last summary

## Commands`);
  });

  it('links ubiquitous language terms to a domain whose id has a hyphen', async () => {
    const body = await getBody();

    expect(body).toContain(
      '    - [Order: - A request to buy goods.](http://localhost:4321/docs/domains/order-management/language.mdx)'
    );
  });

  it('uses the domain name as the heading of its terms', async () => {
    expect(await getBody()).toContain('- Order Management Domain\n');
  });

  it('falls back to the description of a term with no summary, and never prints undefined', async () => {
    const body = await getBody();

    expect(body).toContain(
      '    - [Refund: - Money returned to a customer.](http://localhost:4321/docs/domains/order-management/language.mdx)'
    );
    expect(body).toContain('    - [Chargeback](http://localhost:4321/docs/domains/order-management/language.mdx)');
    expect(body).not.toContain('undefined');
  });

  it('points to the whole ubiquitous language glossary', async () => {
    expect(await getBody()).toContain('http://localhost:4321/docs/llm/ubiquitous-language.txt');
  });
});
