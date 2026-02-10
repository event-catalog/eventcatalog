import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import { getStaticPaths, GET } from '../../pages/api/schemas/[collection]/[id]/[version]/index.ts';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

let mockEvents: any[] = [];
let mockCommands: any[] = [];
let mockQueries: any[] = [];

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'events':
          return Promise.resolve(mockEvents);
        case 'commands':
          return Promise.resolve(mockCommands);
        case 'queries':
          return Promise.resolve(mockQueries);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('api/schemas/[collection]/[id]/[version]/index.ts', () => {
  beforeEach(() => {
    mockEvents = [
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
    ];
    mockCommands = [
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
    ];
    mockQueries = [
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
    ];
  });

  describe('getStaticPaths', () => {
    it('returns static paths for messages (events, commands, queries) that have a schema including latest paths', async () => {
      const staticPaths = await getStaticPaths();
      // 3 versioned paths + 3 latest paths
      expect(staticPaths).toHaveLength(6);

      const versionedPaths = staticPaths.filter((p) => p.params.version !== 'latest');
      const latestPaths = staticPaths.filter((p) => p.params.version === 'latest');

      // Check versioned paths
      expect(versionedPaths.map((path) => path.params.collection)).toEqual(['events', 'commands', 'queries']);
      expect(versionedPaths.map((path) => path.params.id)).toEqual(['OrderPlaced', 'CreateOrder', 'GetOrder']);
      expect(versionedPaths.map((path) => path.params.version)).toEqual(['1.0.0', '1.0.0', '1.0.0']);

      // Check latest paths
      expect(latestPaths.map((path) => path.params.collection)).toEqual(['events', 'commands', 'queries']);
      expect(latestPaths.map((path) => path.params.id)).toEqual(['OrderPlaced', 'CreateOrder', 'GetOrder']);
      expect(latestPaths.map((path) => path.params.version)).toEqual(['latest', 'latest', 'latest']);

      // Check all the props
      expect(versionedPaths.map((path) => path.props.pathToSchema)).toEqual([
        path.join(__dirname, 'schemas', 'test-schema.json'),
        path.join(__dirname, 'schemas', 'test-schema.avro'),
        path.join(__dirname, 'schemas', 'test-schema.avro'),
      ]);
      expect(versionedPaths.map((path) => path.props.extension)).toEqual(['json', 'avro', 'avro']);
    });

    it('returns the latest version schema when multiple versions exist for the same message', async () => {
      mockEvents = [
        {
          collection: 'events',
          filePath: path.join(__dirname, 'schemas', 'test-schema.json'),
          data: {
            name: 'Order Placed',
            id: 'OrderPlaced',
            version: '1.0.0',
            summary: 'Order Placed summary v1',
            schemaPath: 'test-schema.json',
          },
        },
        {
          collection: 'events',
          filePath: path.join(__dirname, 'schemas', 'test-schema.avro'),
          data: {
            name: 'Order Placed',
            id: 'OrderPlaced',
            version: '2.0.0',
            summary: 'Order Placed summary v2',
            schemaPath: 'test-schema.avro',
          },
        },
      ];
      mockCommands = [];
      mockQueries = [];

      const staticPaths = await getStaticPaths();
      // 2 versioned paths + 1 latest path
      expect(staticPaths).toHaveLength(3);

      const latestPath = staticPaths.find((p) => p.params.version === 'latest');
      expect(latestPath).toBeDefined();
      expect(latestPath?.params.id).toEqual('OrderPlaced');
      // Latest should point to v2.0.0's schema (test-schema.avro)
      expect(latestPath?.props.pathToSchema).toEqual(path.join(__dirname, 'schemas', 'test-schema.avro'));
      expect(latestPath?.props.extension).toEqual('avro');
    });

    it('handles non-semver versions and returns the latest based on string comparison', async () => {
      mockEvents = [
        {
          collection: 'events',
          filePath: path.join(__dirname, 'schemas', 'test-schema.json'),
          data: {
            name: 'Order Placed',
            id: 'OrderPlaced',
            version: 'draft',
            summary: 'Order Placed draft',
            schemaPath: 'test-schema.json',
          },
        },
        {
          collection: 'events',
          filePath: path.join(__dirname, 'schemas', 'test-schema.avro'),
          data: {
            name: 'Order Placed',
            id: 'OrderPlaced',
            version: 'v2',
            summary: 'Order Placed v2',
            schemaPath: 'test-schema.avro',
          },
        },
      ];
      mockCommands = [];
      mockQueries = [];

      const staticPaths = await getStaticPaths();
      // 2 versioned paths + 1 latest path
      expect(staticPaths).toHaveLength(3);

      const latestPath = staticPaths.find((p) => p.params.version === 'latest');
      expect(latestPath).toBeDefined();
      // "v2" > "draft" in string comparison
      expect(latestPath?.props.pathToSchema).toEqual(path.join(__dirname, 'schemas', 'test-schema.avro'));
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
