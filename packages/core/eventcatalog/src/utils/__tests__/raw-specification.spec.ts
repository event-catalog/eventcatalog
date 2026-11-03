import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from 'vitest';

const config: Record<string, any> = {};
vi.mock('@config', () => ({ default: config }));

const { getRawSpecificationUrl, getRawSpecificationResponse, createRawSpecificationRoute } = await import(
  '@utils/raw-specification'
);

const serviceDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'raw-specification-'));

beforeAll(() => {
  fs.writeFileSync(path.join(serviceDirectory, 'index.mdx'), '---\nid: Orders\n---');
  fs.writeFileSync(path.join(serviceDirectory, 'orders-asyncapi.yaml'), 'asyncapi: 3.0.0\n');
  fs.writeFileSync(path.join(serviceDirectory, 'orders-openapi.json'), '{"openapi":"3.1.0"}');
  fs.writeFileSync(path.join(serviceDirectory, 'orders.graphql'), 'type Query { order: String }');
});

afterAll(() => {
  fs.rmSync(serviceDirectory, { recursive: true, force: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const specifications = [
  { type: 'asyncapi', path: 'orders-asyncapi.yaml' },
  { type: 'openapi', path: 'orders-openapi.json' },
  { type: 'graphql', path: 'orders.graphql' },
  {
    type: 'asyncapi',
    path: 'https://specs.example.com/payments.yml',
    headers: { Authorization: 'Bearer ${EC_SPEC_TOKEN}' },
  },
];

const service = {
  id: 'Orders-1.0.0',
  collection: 'services',
  filePath: '',
  data: { id: 'Orders', version: '1.0.0', specifications },
};

/** What a specification page's data loader returns for one of the service's specifications */
const pageDataFor = (specPath: string) => {
  const filename = path.basename(specPath);
  return {
    ...service,
    filePath: path.join(serviceDirectory, 'index.mdx'),
    type: 'services',
    path: specPath,
    filename,
    filenameWithoutExtension: filename.replace(/\.[^.]*$/, ''),
  };
};

describe('getRawSpecificationUrl', () => {
  it("is the specification page's URL followed by the file's own name", () => {
    expect(
      getRawSpecificationUrl({
        collection: 'services',
        id: 'Orders',
        version: '1.0.0',
        type: 'asyncapi',
        filename: 'orders-asyncapi.yaml',
        filenameWithoutExtension: 'orders-asyncapi',
      })
    ).toBe('/docs/services/Orders/1.0.0/asyncapi/orders-asyncapi/orders-asyncapi.yaml');
  });

  it('puts OpenAPI files under /spec, where OpenAPI pages live', () => {
    expect(
      getRawSpecificationUrl({
        collection: 'domains',
        id: 'Sales',
        version: '2.0.0',
        type: 'openapi',
        filename: 'sales.json',
        filenameWithoutExtension: 'sales',
      })
    ).toBe('/docs/domains/Sales/2.0.0/spec/sales/sales.json');
  });
});

describe('getRawSpecificationResponse', () => {
  it('serves a local YAML specification as written, as application/yaml', async () => {
    const response = await getRawSpecificationResponse('asyncapi', pageDataFor('orders-asyncapi.yaml') as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/yaml');
    expect(await response.text()).toBe('asyncapi: 3.0.0\n');
  });

  it('serves a JSON specification as application/json', async () => {
    const response = await getRawSpecificationResponse('openapi', pageDataFor('orders-openapi.json') as any);

    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(await response.text()).toBe('{"openapi":"3.1.0"}');
  });

  it('serves a GraphQL schema as application/graphql', async () => {
    const response = await getRawSpecificationResponse('graphql', pageDataFor('orders.graphql') as any);

    expect(response.headers.get('Content-Type')).toBe('application/graphql');
  });

  it("fetches a remote specification with the specification's headers", async () => {
    process.env.EC_SPEC_TOKEN = 'secret';
    const fetchMock = vi.fn().mockResolvedValue(new Response('asyncapi: 2.6.0\n'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await getRawSpecificationResponse('asyncapi', pageDataFor('https://specs.example.com/payments.yml') as any);

    expect(fetchMock).toHaveBeenCalledWith('https://specs.example.com/payments.yml', {
      headers: { Authorization: 'Bearer secret' },
    });
    expect(response.headers.get('Content-Type')).toBe('application/yaml');
    expect(await response.text()).toBe('asyncapi: 2.6.0\n');
  });

  it('is a 404 when a remote specification cannot be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 500 })));

    const response = await getRawSpecificationResponse('asyncapi', pageDataFor('https://specs.example.com/payments.yml') as any);

    expect(response.status).toBe(404);
  });

  it("is a 404 when the specification's file is missing", async () => {
    const pageData = pageDataFor('missing.yaml');
    pageData.data = { ...pageData.data, specifications: [{ type: 'asyncapi', path: 'missing.yaml' }] };

    const response = await getRawSpecificationResponse('asyncapi', pageData as any);

    expect(response.status).toBe(404);
  });

  it('is a 404 when the resource has no specification of that type at that path', async () => {
    const response = await getRawSpecificationResponse('openapi', pageDataFor('orders-asyncapi.yaml') as any);

    expect(response.status).toBe(404);
  });
});

describe('createRawSpecificationRoute', () => {
  const pageData = pageDataFor('orders-asyncapi.yaml');
  const Page = {
    getStaticPaths: vi.fn().mockResolvedValue([
      {
        params: { type: 'services', id: 'Orders', version: '1.0.0', filename: 'orders-asyncapi' },
        props: pageData,
      },
    ]),
    getData: vi.fn(async ({ props }: { props: any }) => props),
  };

  it("adds each specification's file name to its page's path", async () => {
    const { getStaticPaths } = createRawSpecificationRoute('asyncapi', Page);

    expect(await getStaticPaths()).toEqual([
      {
        params: {
          type: 'services',
          id: 'Orders',
          version: '1.0.0',
          filename: 'orders-asyncapi',
          file: 'orders-asyncapi.yaml',
        },
        props: pageData,
      },
    ]);
  });

  it("gives no path to a local specification whose file doesn't exist", async () => {
    const missing = { ...pageDataFor('missing.yaml') };
    const MissingPage = {
      getStaticPaths: vi
        .fn()
        .mockResolvedValue([
          { params: { type: 'services', id: 'Orders', version: '1.0.0', filename: 'missing' }, props: missing },
        ]),
      getData: vi.fn(),
    };

    const { getStaticPaths } = createRawSpecificationRoute('asyncapi', MissingPage);

    expect(await getStaticPaths()).toEqual([]);
  });

  it("serves the file when the URL names the specification's file", async () => {
    const { GET } = createRawSpecificationRoute('asyncapi', Page);

    const response = await GET({
      params: { type: 'services', id: 'Orders', version: '1.0.0', filename: 'orders-asyncapi', file: 'orders-asyncapi.yaml' },
      props: pageData,
    } as any);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('asyncapi: 3.0.0\n');
  });

  it('is a 404 when the URL names a different file', async () => {
    const { GET } = createRawSpecificationRoute('asyncapi', Page);

    const response = await GET({
      params: { type: 'services', id: 'Orders', version: '1.0.0', filename: 'orders-asyncapi', file: 'orders-asyncapi.json' },
      props: pageData,
    } as any);

    expect(response.status).toBe(404);
  });
});
