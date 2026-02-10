import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { GET } from '../../pages/docs/llm/schemas.txt.ts';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'events':
          return Promise.resolve([
            {
              data: {
                name: 'Order Placed',
                id: 'OrderPlaced',
                version: '1.0.0',
                summary: 'Order Placed summary',
                schemaPath: 'schema.json',
              },
            },
            // No schema, does not return
            { data: { name: 'Order Confirmed', id: 'OrderConfirmed', version: '1.0.0', summary: 'Order Confirmed summary' } },
          ]);
        case 'commands':
          return Promise.resolve([
            {
              data: {
                name: 'Create Order',
                id: 'CreateOrder',
                version: '1.0.0',
                summary: 'Create Order summary',
                schemaPath: 'schema.json',
              },
            },
          ]);
        case 'queries':
          return Promise.resolve([
            {
              data: {
                name: 'Get Order',
                id: 'GetOrder',
                version: '1.0.0',
                summary: 'Get Order summary',
                schemaPath: 'schema.json',
              },
            },
          ]);
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
    expect(responseBody).toEqual(`# FlowMart EventCatalog Schemas
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
