import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../pages/docs/llm/ubiquitous-language.txt.ts';

const { collections, isLLMSTxtEnabled } = vi.hoisted(() => ({
  collections: { domains: [] as any[], ubiquitousLanguages: [] as any[] },
  isLLMSTxtEnabled: vi.fn(() => true),
}));

vi.mock('astro:content', async (importOriginal) => ({
  ...(await importOriginal<typeof import('astro:content')>()),
  getCollection: (key: keyof typeof collections, filter?: (entry: any) => boolean) => {
    const entries: any[] = collections[key] ?? [];
    return Promise.resolve(filter ? entries.filter(filter) : entries);
  },
}));

vi.mock('@utils/feature', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@utils/feature')>()),
  isLLMSTxtEnabled,
}));

const request = { request: new Request('http://localhost:4321/docs/llm/ubiquitous-language.txt') } as any;

const domains = [
  {
    id: 'order-management-1.0.0',
    collection: 'domains',
    filePath: 'domains/order-management/index.mdx',
    data: {
      id: 'order-management',
      name: 'Order Management',
      version: '1.0.0',
      domains: [{ id: 'fulfilment', version: '1.0.0' }],
    },
  },
  {
    id: 'fulfilment-1.0.0',
    collection: 'domains',
    filePath: 'domains/order-management/subdomains/fulfilment/index.mdx',
    data: { id: 'fulfilment', name: 'Fulfilment', version: '1.0.0' },
  },
  {
    id: 'payments-1.0.0',
    collection: 'domains',
    filePath: 'domains/payments/index.mdx',
    data: { id: 'payments', name: 'Payments', version: '1.0.0' },
  },
];

const ubiquitousLanguage = (folder: string, dictionary: any[]) => ({
  id: `${folder}-language`,
  collection: 'ubiquitousLanguages',
  filePath: `domains/${folder}/ubiquitous-language.mdx`,
  data: { dictionary },
});

describe('docs/llm/ubiquitous-language.txt', () => {
  beforeEach(() => {
    isLLMSTxtEnabled.mockReturnValue(true);
    collections.domains = domains;
    collections.ubiquitousLanguages = [
      ubiquitousLanguage('order-management/subdomains/fulfilment', [
        { id: 'shipment', name: 'Shipment', summary: 'A package on its way.' },
        { id: 'customer', name: 'Customer', summary: 'The person receiving a delivery.' },
      ]),
      ubiquitousLanguage('payments', [
        { id: 'customer', name: 'customer', summary: 'The party being charged.' },
        {
          id: 'refund',
          name: 'Refund',
          description: `Money returned
to a customer.
`,
        },
        { id: 'chargeback', name: 'Chargeback' },
      ]),
    ];
  });

  it('lists the terms by domain, with terms defined in more than one domain listed together', async () => {
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(await response.text()).toEqual(`# Acme Inc Ubiquitous Language
> The business terms used across this organization, grouped by domain. A term only applies within its domain: the same word can mean something different in another domain.

## Terms defined in more than one domain
- Customer
  - Fulfilment: The person receiving a delivery.
  - Payments: The party being charged.

## Order Management

### Fulfilment
Full definitions: http://localhost:4321/docs/domains/fulfilment/language.mdx
- Shipment: A package on its way.
- Customer: The person receiving a delivery.

## Payments
Full definitions: http://localhost:4321/docs/domains/payments/language.mdx
- customer: The party being charged.
- Refund: Money returned to a customer.
- Chargeback`);
  });

  it('says so when the catalog has no terms', async () => {
    collections.ubiquitousLanguages = [];

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('No ubiquitous language terms are defined in this catalog.');
  });

  it('returns a 404 when llms.txt is disabled', async () => {
    isLLMSTxtEnabled.mockReturnValue(false);

    const response = await GET(request);

    expect(response.status).toBe(404);
  });
});
