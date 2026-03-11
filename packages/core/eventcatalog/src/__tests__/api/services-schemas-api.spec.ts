import type { CollectionKey } from 'astro:content';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import { getStaticPaths, GET } from '../../pages/api/schemas/services/[id]/[version]/[specification]/index.ts';
import path from 'path';
import fs from 'node:fs';

let mockIsEventCatalogScaleEnabled = vi.fn();
let mockIsSSR = vi.fn().mockReturnValue(false);

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const mockServices = [
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
];

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: CollectionKey) => {
      switch (key) {
        case 'services':
          return Promise.resolve(mockServices);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

vi.mock('@utils/feature', () => {
  return {
    isEventCatalogScaleEnabled: () => mockIsEventCatalogScaleEnabled(),
    isSSR: () => mockIsSSR(),
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

  describe('GET (static mode)', () => {
    it('returns the given schema when EventCatalog Scale is enabled', async () => {
      mockIsEventCatalogScaleEnabled.mockReturnValue(true);
      const response = await GET({
        request: new Request('http://localhost:4321/api/schemas/services/OrderService/1.0.0/openapi'),
        props: { schema: fs.readFileSync(path.join(__dirname, 'schemas', 'test-openapi.yml'), 'utf8') },
      } as any);
      expect(response.status).toBe(200);
      expect(await response.text()).toEqual(fs.readFileSync(path.join(__dirname, 'schemas', 'test-openapi.yml'), 'utf8'));
    });
    it('returns an error when EventCatalog Scale is disabled', async () => {
      mockIsEventCatalogScaleEnabled.mockReturnValue(false);
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

  describe('GET (SSR mode)', () => {
    beforeEach(() => {
      mockIsEventCatalogScaleEnabled.mockReturnValue(true);
      mockIsSSR.mockReturnValue(true);
    });

    it('resolves the service specification dynamically when props are empty (SSR mode)', async () => {
      const expectedSchema = fs.readFileSync(path.join(__dirname, 'schemas', 'test-openapi.yml'), 'utf8');

      const response = await GET({
        request: new Request('http://localhost:4321/api/schemas/services/OrderService/1.0.0/openapi'),
        props: {},
        params: { id: 'OrderService', version: '1.0.0', specification: 'openapi' },
      } as any);

      expect(response.status).toBe(200);
      expect(await response.text()).toEqual(expectedSchema);
    });

    it('resolves different specification types (asyncapi) in SSR mode', async () => {
      const expectedSchema = fs.readFileSync(path.join(__dirname, 'schemas', 'test-asyncapi.yml'), 'utf8');

      const response = await GET({
        request: new Request('http://localhost:4321/api/schemas/services/OrderService/1.0.0/asyncapi'),
        props: {},
        params: { id: 'OrderService', version: '1.0.0', specification: 'asyncapi' },
      } as any);

      expect(response.status).toBe(200);
      expect(await response.text()).toEqual(expectedSchema);
    });

    it('returns 404 when the service is not found in SSR mode', async () => {
      const response = await GET({
        request: new Request('http://localhost:4321/api/schemas/services/NonExistent/1.0.0/openapi'),
        props: {},
        params: { id: 'NonExistent', version: '1.0.0', specification: 'openapi' },
      } as any);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Service not found' });
    });

    it('returns 404 when the specification type is not found in SSR mode', async () => {
      const response = await GET({
        request: new Request('http://localhost:4321/api/schemas/services/OrderService/1.0.0/graphql'),
        props: {},
        params: { id: 'OrderService', version: '1.0.0', specification: 'graphql' },
      } as any);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Specification not found' });
    });

    it('returns 400 when required params are missing in SSR mode', async () => {
      const response = await GET({
        request: new Request('http://localhost:4321/api/schemas/services/OrderService/1.0.0/'),
        props: {},
        params: { id: 'OrderService', version: '1.0.0', specification: '' },
      } as any);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Missing id, version, or specification parameter' });
    });
  });
});
