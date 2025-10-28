import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { getStaticPaths, GET } from '../../pages/api/schemas/[collection]/[id]/[version]/index.ts';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'events':
          return Promise.resolve([
            {
              collection: 'events',
              filePath: path.join(__dirname, 'schemas', 'test-schema.json'),
              data: {
                name: 'Order Placed',
                id: 'OrderPlaced',
                version: '1.0.0',
                summary: 'Order Placed summary',
                schemaPath: 'test-schema.json',
              },
            },
          ]);
        case 'commands':
          return Promise.resolve([
            {
              collection: 'commands',
              filePath: path.join(__dirname, 'schemas', 'test-schema.avro'),
              data: {
                name: 'Create Order',
                id: 'CreateOrder',
                version: '1.0.0',
                summary: 'Create Order summary',
                schemaPath: 'test-schema.avro',
              },
            },
          ]);
        case 'queries':
          return Promise.resolve([
            {
              collection: 'queries',
              filePath: path.join(__dirname, 'schemas', 'test-schema.avro'),
              data: {
                name: 'Get Order',
                id: 'GetOrder',
                version: '1.0.0',
                summary: 'Get Order summary',
                schemaPath: 'test-schema.avro',
              },
            },
          ]);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('api/schemas/[collection]/[id]/[version]/index.ts', () => {
  describe('getStaticPaths', () => {
    it('returns static paths for messages (events, commands, queries) that have a schema', async () => {
      const staticPaths = await getStaticPaths();
      expect(staticPaths).toHaveLength(3);

      // Check all the params
      expect(staticPaths.map((path) => path.params.collection)).toEqual(['events', 'commands', 'queries']);
      expect(staticPaths.map((path) => path.params.id)).toEqual(['OrderPlaced', 'CreateOrder', 'GetOrder']);
      expect(staticPaths.map((path) => path.params.version)).toEqual(['1.0.0', '1.0.0', '1.0.0']);

      // Check all the props
      expect(staticPaths.map((path) => path.props.pathToSchema)).toEqual([
        path.join(__dirname, 'schemas', 'test-schema.json'),
        path.join(__dirname, 'schemas', 'test-schema.avro'),
        path.join(__dirname, 'schemas', 'test-schema.avro'),
      ]);
      expect(staticPaths.map((path) => path.props.extension)).toEqual(['json', 'avro', 'avro']);
    });
  });

  describe('GET', () => {
    it('returns the given schema when EventCatalog Scale is enabled', async () => {
      process.env.EVENTCATALOG_SCALE = 'true';
      const response = await GET({
        request: new Request('http://localhost:4321/api/schemas/events/OrderPlaced/1.0.0'),
        props: { schema: 'test-schema.json' },
      } as any);
      expect(response.status).toBe(200);
      expect(await response.text()).toEqual('test-schema.json');
    });
    it('returns an error when EventCatalog Scale is disabled', async () => {
      process.env.EVENTCATALOG_SCALE = 'false';
      const response = await GET({
        request: new Request('http://localhost:4321/api/schemas/events/OrderPlaced/1.0.0'),
        props: { schema: 'test-schema.json' },
      } as any);
      expect(response.status).toBe(501);
      expect(await response.text()).toEqual(
        '{"error":"feature_not_available_on_server","message":"Schema API is not enabled for this deployment and supported in EventCatalog Scale."}'
      );
    });
  });
});
