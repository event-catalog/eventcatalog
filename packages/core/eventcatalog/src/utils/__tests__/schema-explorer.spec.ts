import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSchemaDetails, getSchemaMetadata } from '../schema-explorer';
import { GET, getStaticPaths } from '../../pages/schemas/explorer/content/[key].json';
import { getSchemaRelationshipReference } from '@components/SchemaExplorer/utils';
import { buildUrl } from '../url-builder';

const fixtures = vi.hoisted(() => ({
  ssr: false,
  schemas: [] as any[],
  events: [] as any[],
  services: [] as any[],
  domains: [] as any[],
  products: [] as any[],
}));
vi.mock('astro:content', () => ({ getCollection: vi.fn(async () => fixtures.schemas) }));
vi.mock('@utils/collections/events', () => ({ getEvents: vi.fn(async () => fixtures.events) }));
vi.mock('@utils/collections/commands', () => ({ getCommands: vi.fn(async () => []) }));
vi.mock('@utils/collections/queries', () => ({ getQueries: vi.fn(async () => []) }));
vi.mock('@utils/collections/services', () => ({
  getServices: vi.fn(async () => fixtures.services),
  getSpecificationsForService: (s: any) => s.data.specifications || [],
}));
vi.mock('@utils/collections/domains', () => ({
  getDomains: vi.fn(async () => fixtures.domains),
  getSpecificationsForDomain: (s: any) => s.data.specifications || [],
}));
vi.mock('@utils/collections/data-products', () => ({ getDataProducts: vi.fn(async () => fixtures.products) }));
vi.mock('@utils/collections/owners', () => ({ getOwner: vi.fn() }));
vi.mock('@utils/resource-files', () => ({
  resourceFileExists: vi.fn(() => true),
  readResourceFile: vi.fn((_resource, path) => `content:${path}`),
}));
vi.mock('@utils/collections/examples', () => ({
  getExamplesForResource: vi.fn(() => [
    { fileName: 'example.json', title: 'Example', extension: 'json', content: 'example content' },
  ]),
}));
vi.mock('@utils/feature', () => ({ isSSR: () => fixtures.ssr }));

import { readResourceFile } from '@utils/resource-files';
import { getExamplesForResource } from '@utils/collections/examples';
import { getEvents } from '@utils/collections/events';

const resource = (collection: string, version = '1.0.0') => ({
  collection,
  filePath: '/catalog/index.mdx',
  data: { id: 'Orders', name: 'Orders', version },
});
const spec = (path: string) => ({ path, type: 'openapi', name: path, filenameWithoutExtension: path.replace('.yaml', '') });
const keyOf = (url: string) => url.split('/').pop()!.replace('.json', '');

describe('schema explorer content delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixtures.ssr = false;
    vi.stubEnv('DISABLE_EVENTCATALOG_CACHE', 'true');
    fixtures.events = [
      {
        ...resource('events'),
        data: {
          ...resource('events').data,
          producers: [{ id: 'OrderProducer', version: '1.0.0' }],
          consumers: [{ id: 'OrderConsumer', version: '2.0.0' }],
        },
      },
    ];
    fixtures.schemas = [
      {
        data: {
          message: { collectionName: 'events', id: 'Orders', version: '1.0.0' },
          file: 'schema.json',
          source: { path: 'schema.json' },
          content: 'schema content',
        },
      },
    ];
    fixtures.services = [
      {
        ...resource('services'),
        data: { ...resource('services').data, specifications: [spec('api.yaml'), spec('second.yaml')] },
      },
    ];
    fixtures.domains = [{ ...resource('domains'), data: { ...resource('domains').data, specifications: [spec('api.yaml')] } }];
    fixtures.products = [
      {
        ...resource('data-products'),
        data: {
          ...resource('data-products').data,
          outputs: [{ contract: { name: 'Contract', path: 'contract.json', type: 'json-schema' } }],
        },
      },
    ];
  });

  it('sends metadata without reading specification files or examples', async () => {
    const items = await getSchemaMetadata();
    expect(items).toHaveLength(5);
    expect(readResourceFile).not.toHaveBeenCalled();
    expect(getExamplesForResource).not.toHaveBeenCalled();
    expect(getEvents).toHaveBeenCalledWith({ getAllVersions: true, hydrateServices: false });
    for (const item of items) {
      expect(item).not.toHaveProperty('schemaContent');
      expect(item).not.toHaveProperty('examples');
      expect(item).not.toHaveProperty('loadDetails');
      expect(item.data).not.toHaveProperty('producers');
      expect(item.data).not.toHaveProperty('consumers');
      expect(item.contentUrl).toMatch(/\/schemas\/explorer\/content\/[a-f0-9]{64}\.json$/);
    }
    expect(JSON.stringify(items)).not.toContain('schema content');
  });

  it('gives collections, specification files, and versions separate stable URLs', async () => {
    fixtures.schemas.push({
      data: { ...fixtures.schemas[0].data, message: { ...fixtures.schemas[0].data.message, version: '0.9.0' } },
    });
    const items = await getSchemaMetadata();
    expect(new Set(items.map((item) => item.contentUrl)).size).toBe(6);
    expect((await getSchemaMetadata()).map((item) => item.contentUrl)).toEqual(items.map((item) => item.contentUrl));
  });

  it('loads only the selected specification or contract', async () => {
    const items = await getSchemaMetadata();
    for (const collection of ['services', 'domains', 'data-products']) {
      vi.mocked(readResourceFile).mockClear();
      const item = items.find((item) => item.collection === collection)!;
      expect(await getSchemaDetails(keyOf(item.contentUrl!))).toEqual({
        schemaContent: `content:${item.data.schemaPath}`,
        examples: [],
      });
      expect(readResourceFile).toHaveBeenCalledTimes(1);
      expect(getExamplesForResource).not.toHaveBeenCalled();
    }
  });

  it('loads message schema content and examples on demand', async () => {
    const item = (await getSchemaMetadata())[0];
    const details = await getSchemaDetails(keyOf(item.contentUrl!));
    expect(details?.schemaContent).toBe('schema content');
    expect(details?.examples[0].content).toBe('example content');
    expect(item.data.producerName).toBe('OrderProducer');
    expect(details?.data).toEqual({ producers: fixtures.events[0].data.producers, consumers: fixtures.events[0].data.consumers });
    expect(getExamplesForResource).toHaveBeenCalledTimes(1);
    expect(readResourceFile).not.toHaveBeenCalled();
  });

  it('still serves schema content and relationships when examples cannot be read', async () => {
    const item = (await getSchemaMetadata())[0];
    const error = new SyntaxError('Invalid examples configuration');
    vi.mocked(getExamplesForResource).mockImplementationOnce(() => {
      throw error;
    });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await GET({ params: { key: keyOf(item.contentUrl!) }, props: {} } as any);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        schemaContent: 'schema content',
        examples: [],
        data: {
          producers: fixtures.events[0].data.producers,
          consumers: fixtures.events[0].data.consumers,
        },
      });
      expect(log).toHaveBeenCalledWith('Error reading examples for Orders:', error);
    } finally {
      log.mockRestore();
    }
  });

  it.each(['payments-2', 'payments-2.0', 'payments-2.0.0'])(
    'preserves the exact service ID %s in compact and enriched relationships',
    (id) => {
      const compact = { id, version: '3.0.0' };
      const enriched = { id: `${id}-3.0.0`, data: { id, version: '3.0.0' } };
      for (const reference of [compact, enriched]) {
        const resolved = getSchemaRelationshipReference(reference);
        expect(resolved).toEqual(compact);
        expect(buildUrl(`/docs/services/${resolved.id}/${resolved.version}`)).toBe(`/docs/services/${id}/3.0.0`);
      }
    }
  );

  it('generates individual static JSON routes and serves the same content without static props', async () => {
    const paths = await getStaticPaths();
    expect(paths).toHaveLength(5);
    const response = await GET({ params: paths[0].params, props: {} } as any);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ schemaContent: 'schema content' });
    const missing = await GET({ params: { key: '../../secret' }, props: {} } as any);
    expect(missing.status).toBe(404);
    expect(readResourceFile).not.toHaveBeenCalled();
  });

  it('serves metadata and selected content in SSR without generating static paths or receiving build props', async () => {
    fixtures.ssr = true;
    vi.resetModules();
    const endpoint = await import('../../pages/schemas/explorer/content/[key].json');
    const { Page } = await import('../../pages/schemas/explorer/_index.data');
    expect(endpoint.prerender).toBe(false);
    expect(Page.prerender).toBe(false);
    expect(await Page.getStaticPaths()).toEqual([]);

    const { schemas } = await Page.getData({ props: {}, params: {} } as any);
    expect(schemas).toHaveLength(5);
    expect(readResourceFile).not.toHaveBeenCalled();
    for (const item of schemas) {
      const response = await endpoint.GET({ params: { key: keyOf(item.contentUrl) }, props: {} } as any);
      expect(response.status).toBe(200);
      const details = await response.json();
      expect(details.schemaContent).toBe(item.collection === 'events' ? 'schema content' : `content:${item.data.schemaPath}`);
      expect(details.examples).toHaveLength(item.collection === 'events' ? 1 : 0);
      if (item.collection === 'events') {
        expect(details.data).toEqual({
          producers: fixtures.events[0].data.producers,
          consumers: fixtures.events[0].data.consumers,
        });
      }
    }
  });

  it('keeps the initial payload constant as a catalog becomes densely connected', async () => {
    const template = fixtures.schemas[0];
    const message = fixtures.events[0];
    fixtures.events = Array.from({ length: 100 }, (_, index) => ({
      ...message,
      data: { ...message.data, id: `Message${index}` },
    }));
    fixtures.schemas = fixtures.events.map((event) => ({
      data: { ...template.data, message: { ...template.data.message, id: event.data.id } },
    }));
    const sparse = JSON.stringify(await getSchemaMetadata());
    const producers = Array.from({ length: 1000 }, (_, index) => ({
      id: index === 0 ? 'OrderProducer' : `Producer${index}`,
      version: '1.0.0',
    }));
    const consumers = Array.from({ length: 1000 }, (_, index) => ({ id: `Consumer${index}`, version: '2.0.0' }));
    fixtures.events.forEach((event) => {
      event.data.producers = producers;
      event.data.consumers = consumers;
    });
    const dense = await getSchemaMetadata();
    expect(JSON.stringify(dense)).toBe(sparse);
    const selected = dense.find((item) => item.data.id === 'Message42')!;
    const details = await getSchemaDetails(keyOf(selected.contentUrl!));
    expect(details?.data).toEqual({ producers, consumers });
    expect(getExamplesForResource).toHaveBeenCalledTimes(1);
  });
});
