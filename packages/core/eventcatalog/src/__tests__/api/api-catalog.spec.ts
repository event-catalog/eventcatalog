import type { CollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { GET, HEAD } from '../../pages/.well-known/api-catalog.ts';
import { GET as GETSpecification } from '../../pages/.well-known/api-catalog/specifications/[collection]/[id]/[version]/[specification].ts';

const mockIsEventCatalogMCPEnabled = vi.hoisted(() => vi.fn(() => true));

const mockServices = [
  {
    collection: 'services',
    filePath: '/catalog/services/OrderService/index.mdx',
    data: {
      name: 'Order Service',
      id: 'OrderService',
      version: '1.0.0',
      summary: 'Order Service summary',
      specifications: [
        { type: 'openapi', path: 'openapi.yml' },
        { type: 'openapi', path: 'admin-openapi.yml', name: 'Admin OpenAPI' },
        { type: 'graphql', path: 'schema.graphql', name: 'GraphQL schema' },
      ],
    },
  },
  {
    collection: 'services',
    filePath: '/catalog/services/InventoryService/index.mdx',
    data: {
      name: 'Inventory Service',
      id: 'InventoryService',
      version: '2.0.0',
      summary: 'Inventory Service summary',
      specifications: [{ type: 'asyncapi', path: 'asyncapi.json' }],
    },
  },
  {
    collection: 'services',
    filePath: '/catalog/services/CustomerService/index.mdx',
    data: {
      name: 'Customer Service',
      id: 'CustomerService',
      version: '1.0.0',
      summary: 'Customer Service summary',
    },
  },
  {
    collection: 'services',
    filePath: '/catalog/services/HiddenService/index.mdx',
    data: {
      name: 'Hidden Service',
      id: 'HiddenService',
      version: '1.0.0',
      hidden: true,
      specifications: [{ type: 'openapi', path: 'hidden-openapi.yml' }],
    },
  },
];

const mockDomains = [
  {
    collection: 'domains',
    filePath: '/catalog/domains/Billing/index.mdx',
    data: {
      name: 'Billing',
      id: 'Billing',
      version: '1.0.0',
      summary: 'Billing domain summary',
      specifications: [{ type: 'openapi', path: 'billing-openapi.yml' }],
    },
  },
];

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: CollectionKey) => {
      switch (key) {
        case 'services':
          return Promise.resolve(mockServices);
        case 'domains':
          return Promise.resolve(mockDomains);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

vi.mock('@utils/resource-files', () => {
  return {
    readResourceFile: (_service: unknown, path: string) => {
      switch (path) {
        case 'openapi.yml':
          return 'openapi: 3.1.0\nservers:\n  - url: https://api.example.com/orders\n';
        case 'admin-openapi.yml':
          return 'openapi: 3.1.0\nservers:\n  - url: https://admin-api.example.com/orders\n';
        case 'billing-openapi.yml':
          return 'openapi: 3.1.0\nservers:\n  - url: https://api.example.com/billing\n';
        case 'asyncapi.json':
          return JSON.stringify({
            asyncapi: '3.0.0',
            servers: {
              production: {
                host: 'unused.example.com',
                url: 'https://events.example.com/inventory',
              },
            },
          });
        case 'schema.graphql':
          return 'type Query { order(id: ID!): Order }';
        default:
          return null;
      }
    },
  };
});

vi.mock('@utils/feature', () => {
  return {
    isEventCatalogMCPEnabled: () => mockIsEventCatalogMCPEnabled(),
  };
});

describe('/.well-known/api-catalog', () => {
  it('returns an RFC 9727 Linkset for services with specifications', async () => {
    const response = await GET({ request: new Request('https://catalog.example.com/.well-known/api-catalog') } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"'
    );

    expect(await response.json()).toEqual({
      linkset: [
        {
          anchor: 'https://events.example.com/inventory',
          'service-desc': [
            {
              href: 'https://catalog.example.com/.well-known/api-catalog/specifications/services/InventoryService/2.0.0/asyncapi-YXN5bmNhcGkuanNvbg',
              type: 'application/json',
              title: 'Inventory Service AsyncAPI',
            },
          ],
          'service-doc': [
            {
              href: 'https://catalog.example.com/docs/services/InventoryService/2.0.0.md',
              type: 'text/markdown',
              title: 'Inventory Service documentation',
            },
            {
              href: 'https://catalog.example.com/docs/services/InventoryService/2.0.0',
              type: 'text/html',
              title: 'Inventory Service documentation',
            },
          ],
        },
        {
          anchor: 'https://api.example.com/orders',
          'service-desc': [
            {
              href: 'https://catalog.example.com/.well-known/api-catalog/specifications/services/OrderService/1.0.0/openapi-b3BlbmFwaS55bWw',
              type: 'application/yaml',
              title: 'Order Service OpenAPI',
            },
            {
              href: 'https://catalog.example.com/.well-known/api-catalog/specifications/services/OrderService/1.0.0/openapi-YWRtaW4tb3BlbmFwaS55bWw',
              type: 'application/yaml',
              title: 'Order Service Admin OpenAPI',
            },
            {
              href: 'https://catalog.example.com/.well-known/api-catalog/specifications/services/OrderService/1.0.0/graphql-c2NoZW1hLmdyYXBocWw',
              type: 'application/graphql',
              title: 'Order Service GraphQL schema',
            },
          ],
          'service-doc': [
            {
              href: 'https://catalog.example.com/docs/services/OrderService/1.0.0.md',
              type: 'text/markdown',
              title: 'Order Service documentation',
            },
            {
              href: 'https://catalog.example.com/docs/services/OrderService/1.0.0',
              type: 'text/html',
              title: 'Order Service documentation',
            },
          ],
        },
        {
          anchor: 'https://api.example.com/billing',
          'service-desc': [
            {
              href: 'https://catalog.example.com/.well-known/api-catalog/specifications/domains/Billing/1.0.0/openapi-YmlsbGluZy1vcGVuYXBpLnltbA',
              type: 'application/yaml',
              title: 'Billing OpenAPI',
            },
          ],
          'service-doc': [
            {
              href: 'https://catalog.example.com/docs/domains/Billing/1.0.0.md',
              type: 'text/markdown',
              title: 'Billing documentation',
            },
            {
              href: 'https://catalog.example.com/docs/domains/Billing/1.0.0',
              type: 'text/html',
              title: 'Billing documentation',
            },
          ],
        },
        {
          anchor: 'https://catalog.example.com/docs/mcp',
          'service-desc': [
            {
              href: 'https://catalog.example.com/docs/mcp',
              type: 'application/json',
              title: 'EventCatalog MCP Server',
            },
          ],
        },
      ],
    });
  });

  it('returns a Link header for HEAD requests', async () => {
    const response = await HEAD({ request: new Request('https://catalog.example.com/.well-known/api-catalog') } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"'
    );
    expect(response.headers.get('Link')).toBe('<https://catalog.example.com/.well-known/api-catalog>; rel="api-catalog"');
    expect(await response.text()).toBe('');
  });

  it('serves raw service and domain specifications referenced by the API catalog', async () => {
    const response = await GETSpecification({
      request: new Request(
        'https://catalog.example.com/.well-known/api-catalog/specifications/domains/Billing/1.0.0/openapi-YmlsbGluZy1vcGVuYXBpLnltbA'
      ),
      props: {},
      params: { collection: 'domains', id: 'Billing', version: '1.0.0', specification: 'openapi-YmlsbGluZy1vcGVuYXBpLnltbA' },
    } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/yaml');
    expect(await response.text()).toBe('openapi: 3.1.0\nservers:\n  - url: https://api.example.com/billing\n');
  });

  it('serves the exact matching specification when a resource has multiple specs of the same type', async () => {
    const response = await GETSpecification({
      request: new Request(
        'https://catalog.example.com/.well-known/api-catalog/specifications/services/OrderService/1.0.0/openapi-YWRtaW4tb3BlbmFwaS55bWw'
      ),
      props: {},
      params: {
        collection: 'services',
        id: 'OrderService',
        version: '1.0.0',
        specification: 'openapi-YWRtaW4tb3BlbmFwaS55bWw',
      },
    } as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/yaml');
    expect(await response.text()).toBe('openapi: 3.1.0\nservers:\n  - url: https://admin-api.example.com/orders\n');
  });
});
