import type { CollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { GET } from '../../pages/docs/llm/schemas.txt.ts';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: CollectionKey) => {
      switch (key) {
        case 'services':
          return Promise.resolve([
            {
              data: {
                name: 'Order Service',
                id: 'OrderService',
                version: '1.0.0',
                summary: 'Order Service summary',
                specifications: [
                  { type: 'openapi', path: 'schema.json' },
                  { type: 'asyncapi', path: 'schema.asyncapi.json' },
                  { type: 'graphql', path: 'schema.graphql' },
                ],
              },
            },
            // No schema, does not return
            {
              data: { name: 'Inventory Service', id: 'InventoryService', version: '1.0.0', summary: 'Inventory Service summary' },
            },
          ]);
        case 'schemas':
          return Promise.resolve([
            {
              data: {
                id: 'schema:events:OrderPlaced:1.0.0:schema.json',
                message: {
                  collection: 'events',
                  id: 'OrderPlaced',
                  name: 'Order Placed',
                  version: '1.0.0',
                  summary: 'Order Placed summary',
                  owners: ['orders-team'],
                },
              },
            },
            {
              data: {
                id: 'schema:commands:CreateOrder:1.0.0:schema.json',
                message: {
                  collection: 'commands',
                  id: 'CreateOrder',
                  name: 'Create Order',
                  version: '1.0.0',
                  summary: 'Create Order summary',
                  owners: ['orders-team'],
                },
              },
            },
            {
              data: {
                id: 'schema:queries:GetOrder:1.0.0:schema.json',
                message: {
                  collection: 'queries',
                  id: 'GetOrder',
                  name: 'Get Order',
                  version: '1.0.0',
                  summary: 'Get Order summary',
                  owners: ['orders-team'],
                },
              },
            },
          ]);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('api/schemas.txt', () => {
  it('returns a list of schemas for events, commands, queries, and services when EventCatalog Scale is enabled', async () => {
    process.env.EVENTCATALOG_SCALE = 'true';
    const response = await GET({ request: new Request('http://localhost:4321/api/schemas.txt') } as any);
    expect(response.status).toBe(200);

    const responseBody = await response.text();
    expect(responseBody).toEqual(`# Acme Inc EventCatalog Schemas
List of schemas for events, commands, queries, and services in EventCatalog.

## Events
- [Order Placed - OrderPlaced - 1.0.0](http://localhost:4321/api/schemas/events/OrderPlaced/1.0.0)} - Order Placed summary

## Commands
- [Create Order - CreateOrder - 1.0.0](http://localhost:4321/api/schemas/commands/CreateOrder/1.0.0)} - Create Order summary

## Queries
- [Get Order - GetOrder - 1.0.0](http://localhost:4321/api/schemas/queries/GetOrder/1.0.0)} - Get Order summary

## Services
- [OrderService - 1.0.0 - openapi specification](http://localhost:4321/api/schemas/services/OrderService/1.0.0/openapi) - Specification for Order Service summary
- [OrderService - 1.0.0 - asyncapi specification](http://localhost:4321/api/schemas/services/OrderService/1.0.0/asyncapi) - Specification for Order Service summary
- [OrderService - 1.0.0 - graphql specification](http://localhost:4321/api/schemas/services/OrderService/1.0.0/graphql) - Specification for Order Service summary`);
  });
  it('returns an error when EventCatalog Scale is disabled', async () => {
    process.env.EVENTCATALOG_SCALE = 'false';
    const response = await GET({ request: new Request('http://localhost:4321/api/schemas.txt') } as any);
    expect(response.status).toBe(501);
    expect(await response.text()).toEqual(
      '{"error":"feature_not_available_on_server","message":"Schema API is not enabled for this deployment and supported in EventCatalog Scale."}'
    );
  });
});
