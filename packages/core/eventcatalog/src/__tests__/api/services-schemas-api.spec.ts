import type { ContentCollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { getStaticPaths, GET } from '../../pages/api/schemas/services/[id]/[version]/[specification]/index.ts';
import path from 'path';
import fs from 'node:fs';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: ContentCollectionKey) => {
      switch (key) {
        case 'services':
          return Promise.resolve([
            {
              collection: 'services',
              filePath: path.join(__dirname, 'schemas', 'test-openapi.yml'),
              data: {
                name: 'Order Service',
                id: 'OrderService',
                version: '1.0.0',
                summary: 'Order Service summary',
                specifications: [
                  { type: 'openapi', path: 'test-openapi.yml' },
                  { type: 'asyncapi', path: 'test-asyncapi.yml' },
                ],
              },
            },
            {
              collection: 'services',
              filePath: path.join(__dirname, 'schemas', 'test-openapi.yml'),
              data: {
                name: 'Order Service',
                id: 'OrderService',
                version: '2.0.0',
                summary: 'Order Service summary',
                specifications: [{ type: 'openapi', path: 'test-openapi.yml' }],
              },
            },
          ]);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('api/schemas/services/[id]/[version]/[specification]/index.ts', () => {
  describe('getStaticPaths', () => {
    it('returns static paths for services that have a schema', async () => {
      const staticPaths = await getStaticPaths();
      expect(staticPaths).toHaveLength(3);

      // Check all the params
      expect(staticPaths.map((path) => path.params.collection)).toEqual(['services', 'services', 'services']);
      expect(staticPaths.map((path) => path.params.id)).toEqual(['OrderService', 'OrderService', 'OrderService']);
      expect(staticPaths.map((path) => path.params.version)).toEqual(['1.0.0', '1.0.0', '2.0.0']);
      expect(staticPaths.map((path) => path.params.specification)).toEqual(['openapi', 'asyncapi', 'openapi']);

      // Check all the props
      expect(staticPaths.map((path) => path.props.schema)).toEqual([
        fs.readFileSync(path.join(__dirname, 'schemas', 'test-openapi.yml'), 'utf8'),
        fs.readFileSync(path.join(__dirname, 'schemas', 'test-asyncapi.yml'), 'utf8'),
        fs.readFileSync(path.join(__dirname, 'schemas', 'test-openapi.yml'), 'utf8'),
      ]);
    });
  });

  describe('GET', () => {
    it('returns the given schema when EventCatalog Scale is enabled', async () => {
      process.env.EVENTCATALOG_SCALE = 'true';
      const response = await GET({
        request: new Request('http://localhost:4321/api/schemas/services/OrderService/1.0.0/openapi'),
        props: { schema: fs.readFileSync(path.join(__dirname, 'schemas', 'test-openapi.yml'), 'utf8') },
      } as any);
      expect(response.status).toBe(200);
      expect(await response.text()).toEqual(fs.readFileSync(path.join(__dirname, 'schemas', 'test-openapi.yml'), 'utf8'));
    });
    it('returns an error when EventCatalog Scale is disabled', async () => {
      process.env.EVENTCATALOG_SCALE = 'false';
      const response = await GET({
        request: new Request('http://localhost:4321/api/schemas/services/OrderService/1.0.0/openapi'),
        props: { schema: fs.readFileSync(path.join(__dirname, 'schemas', 'test-openapi.yml'), 'utf8') },
      } as any);
      expect(response.status).toBe(501);
      expect(await response.text()).toEqual(
        '{"error":"feature_not_available_on_server","message":"Schema API is not enabled for this deployment and supported in EventCatalog Scale."}'
      );
    });
  });
});
