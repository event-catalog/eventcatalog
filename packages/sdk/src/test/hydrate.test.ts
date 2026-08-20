import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hydrate, type Cache, type Fetcher } from '../hydrate';
import type { ResolvedGraph } from '../index-types';

describe('hydrate', () => {
  let testDirectory: string;
  let outDir: string;

  beforeEach(async () => {
    testDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-hydrate-'));
    outDir = path.join(testDirectory, 'federated');
  });

  afterEach(async () => {
    await fs.rm(testDirectory, { recursive: true, force: true });
  });

  it('writes nothing for a graph with no federated entities', async () => {
    const fetch = vi.fn<Fetcher>();
    const graph: ResolvedGraph = {
      entities: [
        {
          type: 'service',
          id: 'payment-service',
          version: '1.0.0',
          name: 'Payment Service',
          contentPath: 'services/payment-service/index.mdx',
          contentHash: 'sha256:3e63897b7cc3a92411599289d00d686f1b1fc8e336927efa46101c8943410c70',
          resolvedFrom: {
            source: 'acme/central',
            commit: '4a1b7e2',
          },
        },
      ],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    };

    await expect(
      hydrate(graph, {
        outDir,
        localSource: 'acme/central',
        fetch,
      })
    ).resolves.toEqual({
      fetched: 0,
      written: 0,
    });
    expect(fetch).not.toHaveBeenCalled();
    await expect(fs.access(outDir)).rejects.toThrow();
  });

  it('fetches content for a federated entity', async () => {
    const content = Buffer.from('# Payment Service');
    const fetch = vi.fn<Fetcher>().mockResolvedValue(content);
    const graph: ResolvedGraph = {
      entities: [
        {
          type: 'service',
          id: 'payment-service',
          version: '1.0.0',
          name: 'Payment Service',
          contentPath: 'services/payment-service/index.mdx',
          contentHash: 'sha256:3e63897b7cc3a92411599289d00d686f1b1fc8e336927efa46101c8943410c70',
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
        },
      ],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    };

    const result = await hydrate(graph, {
      outDir,
      fetch,
    });

    expect(fetch.mock.calls).toEqual([
      [
        {
          source: 'acme/payments',
          commit: '4a1b7e2',
          path: 'services/payment-service/index.mdx',
        },
      ],
    ]);
    await expect(
      fs.readFile(path.join(outDir, 'acme-payments--bf264d5186bc', 'services/payment-service/index.mdx'))
    ).resolves.toEqual(content);
    expect(result).toEqual({
      fetched: 1,
      written: 1,
    });
  });

  it('flattens content from an already composed source instead of creating nested federation directories', async () => {
    const files: Record<string, Buffer> = {
      'federated/inner/teams/payments-team.mdx': Buffer.from('# Payments Team'),
      'federated/inner/users/alice.mdx': Buffer.from('# Alice'),
      'federated/inner/services/payment-service/index.mdx': Buffer.from('# Payment Service'),
      'federated/inner/services/payment-service/schema.json': Buffer.from('{}'),
      'federated/inner/services/payment-service/openapi.yaml': Buffer.from('openapi: 3.0.0'),
      'federated/inner/services/payment-service/docs/runbook.mdx': Buffer.from('# Runbook'),
    };
    const fetch = vi.fn<Fetcher>().mockImplementation(async (request) => files[request.path]);
    const graph: ResolvedGraph = {
      entities: [
        {
          type: 'team',
          id: 'payments-team',
          name: 'Payments Team',
          contentPath: 'federated/inner/teams/payments-team.mdx',
          resolvedFrom: { source: 'acme/composed', commit: '4a1b7e2' },
        },
        {
          type: 'user',
          id: 'alice',
          name: 'Alice',
          contentPath: 'federated/inner/users/alice.mdx',
          resolvedFrom: { source: 'acme/composed', commit: '4a1b7e2' },
        },
        {
          type: 'service',
          id: 'payment-service',
          name: 'Payment Service',
          contentPath: 'federated/inner/services/payment-service/index.mdx',
          schemas: [{ path: 'schema.json' }],
          specifications: [{ type: 'openapi', path: 'openapi.yaml' }],
          sidecars: [{ path: 'federated/inner/services/payment-service/docs/runbook.mdx' }],
          resolvedFrom: { source: 'acme/composed', commit: '4a1b7e2' },
        },
      ],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    };

    await hydrate(graph, { outDir, fetch });

    expect(fetch.mock.calls.map(([request]) => request.path)).toEqual(Object.keys(files));
    const sourceDirectory = path.join(outDir, 'acme-composed--929126a0ee67');
    await expect(
      Promise.all([
        fs.readFile(path.join(sourceDirectory, 'teams/payments-team.mdx')),
        fs.readFile(path.join(sourceDirectory, 'users/alice.mdx')),
        fs.readFile(path.join(sourceDirectory, 'services/payment-service/index.mdx')),
        fs.readFile(path.join(sourceDirectory, 'services/payment-service/schema.json')),
        fs.readFile(path.join(sourceDirectory, 'services/payment-service/openapi.yaml')),
        fs.readFile(path.join(sourceDirectory, 'services/payment-service/docs/runbook.mdx')),
      ])
    ).resolves.toEqual(Object.values(files));
    await expect(fs.access(path.join(sourceDirectory, 'federated'))).rejects.toThrow();
  });

  it('fetches content for a federated channel', async () => {
    const content = Buffer.from('# Payments Events');
    const fetch = vi.fn<Fetcher>().mockResolvedValue(content);
    const graph: ResolvedGraph = {
      entities: [
        {
          type: 'channel',
          id: 'payments.events',
          version: '2.0.0',
          name: 'Payments Events',
          address: 'payments.{region}.events',
          protocols: ['kafka'],
          contentPath: 'channels/payments.events/index.mdx',
          contentHash: 'sha256:13a1dc9349756c968fe39144ad9092d796262d1afd98135188e8932420f64af2',
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
        },
      ],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    };

    const result = await hydrate(graph, {
      outDir,
      localSource: 'acme/central',
      fetch,
    });

    expect(fetch.mock.calls).toEqual([
      [
        {
          source: 'acme/payments',
          commit: '4a1b7e2',
          path: 'channels/payments.events/index.mdx',
        },
      ],
    ]);
    await expect(
      fs.readFile(path.join(outDir, 'acme-payments--bf264d5186bc', 'channels/payments.events/index.mdx'))
    ).resolves.toEqual(content);
    expect(result).toEqual({
      fetched: 1,
      written: 1,
    });
  });

  it('skips a fetch when contentHash is already cached', async () => {
    const cachedContent = Buffer.from('# Cached Payment Service');
    const fetch = vi.fn<Fetcher>().mockResolvedValue(Buffer.from('# Fresh Payment Service'));
    const get = vi.fn<Cache['get']>().mockResolvedValue(cachedContent);
    const set = vi.fn<Cache['set']>();
    const cache: Cache = {
      get,
      set,
    };
    const graph: ResolvedGraph = {
      entities: [
        {
          type: 'service',
          id: 'payment-service',
          version: '1.0.0',
          name: 'Payment Service',
          contentPath: 'services/payment-service/index.mdx',
          contentHash: 'sha256:9b9b66289f3674fc27543c1005631a23cabcb6d09b67225689d2e635829064c1',
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
        },
      ],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    };

    const result = await hydrate(graph, {
      outDir,
      localSource: 'acme/central',
      fetch,
      cache,
    });

    expect(get.mock.calls).toEqual([['sha256:9b9b66289f3674fc27543c1005631a23cabcb6d09b67225689d2e635829064c1']]);
    expect(set.mock.calls).toEqual([]);
    expect(fetch.mock.calls).toEqual([]);
    await expect(
      fs.readFile(path.join(outDir, 'acme-payments--bf264d5186bc', 'services/payment-service/index.mdx'))
    ).resolves.toEqual(cachedContent);
    expect(result).toEqual({
      fetched: 0,
      written: 1,
    });
  });

  it('refetches and replaces cached bytes that do not match contentHash', async () => {
    const content = Buffer.from('# Payment Service');
    const contentHash = 'sha256:3e63897b7cc3a92411599289d00d686f1b1fc8e336927efa46101c8943410c70';
    const fetch = vi.fn<Fetcher>().mockResolvedValue(content);
    const get = vi.fn<Cache['get']>().mockResolvedValue(Buffer.from('# Corrupted Payment Service'));
    const set = vi.fn<Cache['set']>();
    const cache: Cache = { get, set };
    const graph: ResolvedGraph = {
      entities: [
        {
          type: 'service',
          id: 'payment-service',
          version: '1.0.0',
          name: 'Payment Service',
          contentPath: 'services/payment-service/index.mdx',
          contentHash,
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
        },
      ],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    };

    const result = await hydrate(graph, {
      outDir,
      localSource: 'acme/central',
      fetch,
      cache,
    });

    expect(get.mock.calls).toEqual([[contentHash]]);
    expect(fetch.mock.calls).toEqual([
      [
        {
          source: 'acme/payments',
          commit: '4a1b7e2',
          path: 'services/payment-service/index.mdx',
        },
      ],
    ]);
    expect(set.mock.calls).toEqual([[contentHash, content]]);
    await expect(
      fs.readFile(path.join(outDir, 'acme-payments--bf264d5186bc', 'services/payment-service/index.mdx'))
    ).resolves.toEqual(content);
    expect(result).toEqual({
      fetched: 1,
      written: 1,
    });
  });

  it('populates the cache after a fetch', async () => {
    const content = Buffer.from('# Payment Service');
    const contentHash = 'sha256:3e63897b7cc3a92411599289d00d686f1b1fc8e336927efa46101c8943410c70';
    const fetch = vi.fn<Fetcher>().mockResolvedValue(content);
    const get = vi.fn<Cache['get']>().mockResolvedValue(undefined);
    const set = vi.fn<Cache['set']>();
    const cache: Cache = {
      get,
      set,
    };
    const graph: ResolvedGraph = {
      entities: [
        {
          type: 'service',
          id: 'payment-service',
          version: '1.0.0',
          name: 'Payment Service',
          contentPath: 'services/payment-service/index.mdx',
          contentHash,
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
        },
      ],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    };

    const result = await hydrate(graph, {
      outDir,
      localSource: 'acme/central',
      fetch,
      cache,
    });

    expect(get.mock.calls).toEqual([[contentHash]]);
    expect(fetch.mock.calls).toEqual([
      [
        {
          source: 'acme/payments',
          commit: '4a1b7e2',
          path: 'services/payment-service/index.mdx',
        },
      ],
    ]);
    expect(set.mock.calls).toEqual([[contentHash, content]]);
    await expect(
      fs.readFile(path.join(outDir, 'acme-payments--bf264d5186bc', 'services/payment-service/index.mdx'))
    ).resolves.toEqual(content);
    expect(result).toEqual({
      fetched: 1,
      written: 1,
    });
  });

  it('fails when fetched bytes do not match contentHash', async () => {
    const content = Buffer.from('# Tampered Payment Service');
    const contentHash = 'sha256:3e63897b7cc3a92411599289d00d686f1b1fc8e336927efa46101c8943410c70';
    const fetch = vi.fn<Fetcher>().mockResolvedValue(content);
    const get = vi.fn<Cache['get']>().mockResolvedValue(undefined);
    const set = vi.fn<Cache['set']>();
    const cache: Cache = {
      get,
      set,
    };
    const graph: ResolvedGraph = {
      entities: [
        {
          type: 'service',
          id: 'payment-service',
          version: '1.0.0',
          name: 'Payment Service',
          contentPath: 'services/payment-service/index.mdx',
          contentHash,
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
        },
      ],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    };

    await expect(
      hydrate(graph, {
        outDir,
        localSource: 'acme/central',
        fetch,
        cache,
      })
    ).rejects.toThrow(
      new Error(
        'Content hash mismatch for "acme/payments/services/payment-service/index.mdx": expected "sha256:3e63897b7cc3a92411599289d00d686f1b1fc8e336927efa46101c8943410c70", received "sha256:5d907fd78585e3b4dbd117148b063ad75f24761ac2cb50199dacf87a474fd3d6"'
      )
    );

    expect(get.mock.calls).toEqual([[contentHash]]);
    expect(fetch.mock.calls).toEqual([
      [
        {
          source: 'acme/payments',
          commit: '4a1b7e2',
          path: 'services/payment-service/index.mdx',
        },
      ],
    ]);
    expect(set.mock.calls).toEqual([]);
    await expect(fs.access(outDir)).rejects.toThrow();
  });

  it('preserves the previous hydrated catalog when a new hydrate fails', async () => {
    const existingPath = path.join(outDir, 'existing', 'index.mdx');
    await fs.mkdir(path.dirname(existingPath), { recursive: true });
    await fs.writeFile(existingPath, '# Existing catalog');

    const validContent = Buffer.from('# Payment Service');
    const invalidContent = Buffer.from('# Tampered Refund Service');
    const fetch = vi
      .fn<Fetcher>()
      .mockImplementation(async ({ path: artifactPath }) =>
        artifactPath === 'services/payment-service/index.mdx' ? validContent : invalidContent
      );
    const graph: ResolvedGraph = {
      entities: [
        {
          type: 'service',
          id: 'payment-service',
          version: '1.0.0',
          name: 'Payment Service',
          contentPath: 'services/payment-service/index.mdx',
          contentHash: 'sha256:3e63897b7cc3a92411599289d00d686f1b1fc8e336927efa46101c8943410c70',
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
        },
        {
          type: 'service',
          id: 'refund-service',
          version: '1.0.0',
          name: 'Refund Service',
          contentPath: 'services/refund-service/index.mdx',
          contentHash: 'sha256:3e63897b7cc3a92411599289d00d686f1b1fc8e336927efa46101c8943410c70',
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
        },
      ],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    };

    await expect(
      hydrate(graph, {
        outDir,
        localSource: 'acme/central',
        fetch,
      })
    ).rejects.toThrow('Content hash mismatch for "acme/payments/services/refund-service/index.mdx"');

    await expect(fs.readFile(existingPath, 'utf8')).resolves.toBe('# Existing catalog');
    await expect(
      fs.access(path.join(outDir, 'acme-payments--bf264d5186bc', 'services/payment-service/index.mdx'))
    ).rejects.toThrow();
  });

  it('rejects an entity path that escapes its source output directory', async () => {
    const outsidePath = path.join(testDirectory, 'outside.mdx');
    await fs.writeFile(outsidePath, '# Locally authored content');

    const fetch = vi.fn<Fetcher>().mockResolvedValue(Buffer.from('# Malicious federated content'));
    const graph: ResolvedGraph = {
      entities: [
        {
          type: 'service',
          id: 'payment-service',
          version: '1.0.0',
          name: 'Payment Service',
          contentPath: '../../outside.mdx',
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
        },
      ],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    };

    await expect(
      hydrate(graph, {
        outDir,
        localSource: 'acme/central',
        fetch,
      })
    ).rejects.toThrow('Artifact path "../../outside.mdx" escapes its allowed output directory');

    expect(fetch).not.toHaveBeenCalled();
    await expect(fs.readFile(outsidePath, 'utf8')).resolves.toBe('# Locally authored content');
    await expect(fs.access(outDir)).rejects.toThrow();
  });

  it('fetches schemas and specifications as separate files', async () => {
    const files: Record<string, Buffer> = {
      'events/payment-captured/index.mdx': Buffer.from('# Payment Captured'),
      'events/payment-captured/schema.avsc': Buffer.from('{"type":"record","name":"PaymentCaptured","fields":[]}'),
      'events/payment-captured/asyncapi.yaml': Buffer.from('asyncapi: 3.0.0'),
    };
    const fetch = vi.fn<Fetcher>().mockImplementation(async (request) => files[request.path]);
    const graph: ResolvedGraph = {
      entities: [
        {
          type: 'event',
          id: 'payment-captured',
          version: '2.0.0',
          name: 'Payment Captured',
          contentPath: 'events/payment-captured/index.mdx',
          contentHash: 'sha256:3c87a04f4e36f5d89aed98abfeb4bd1c6453d253fe7f165cd2b08a850c4f2a5e',
          schemas: [
            {
              id: 'avro',
              path: 'schema.avsc',
              format: 'avro',
              hash: 'sha256:e48445ded67965113a9897f4afa5a39eb6ccd76850b3a2aa8da751716d05eb20',
            },
          ],
          specifications: [
            {
              type: 'asyncapi',
              path: 'asyncapi.yaml',
              hash: 'sha256:5a883f95ffcf726b0cd97b2537568783af5a12e9ffd852aeee15bb631629db55',
            },
          ],
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
        },
      ],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    };

    const result = await hydrate(graph, {
      outDir,
      localSource: 'acme/central',
      fetch,
    });

    expect(fetch.mock.calls).toEqual([
      [
        {
          source: 'acme/payments',
          commit: '4a1b7e2',
          path: 'events/payment-captured/index.mdx',
        },
      ],
      [
        {
          source: 'acme/payments',
          commit: '4a1b7e2',
          path: 'events/payment-captured/schema.avsc',
        },
      ],
      [
        {
          source: 'acme/payments',
          commit: '4a1b7e2',
          path: 'events/payment-captured/asyncapi.yaml',
        },
      ],
    ]);
    await expect(
      Promise.all([
        fs.readFile(path.join(outDir, 'acme-payments--bf264d5186bc', 'events/payment-captured/index.mdx')),
        fs.readFile(path.join(outDir, 'acme-payments--bf264d5186bc', 'events/payment-captured/schema.avsc')),
        fs.readFile(path.join(outDir, 'acme-payments--bf264d5186bc', 'events/payment-captured/asyncapi.yaml')),
      ])
    ).resolves.toEqual([
      files['events/payment-captured/index.mdx'],
      files['events/payment-captured/schema.avsc'],
      files['events/payment-captured/asyncapi.yaml'],
    ]);
    expect(result).toEqual({
      fetched: 3,
      written: 3,
    });
  });

  it('fetches arbitrary resource sidecars as separate files', async () => {
    const files: Record<string, Buffer> = {
      'services/payment-service/index.mdx': Buffer.from('# Payment Service'),
      'services/payment-service/schema.sql': Buffer.from('CREATE TABLE payments;'),
      'services/payment-service/attachments/context.txt': Buffer.from('Payment context'),
    };
    const fetch = vi.fn<Fetcher>().mockImplementation(async (request) => files[request.path]);
    const graph: ResolvedGraph = {
      entities: [
        {
          type: 'service',
          id: 'payment-service',
          version: '1.0.0',
          name: 'Payment Service',
          contentPath: 'services/payment-service/index.mdx',
          contentHash: 'sha256:3e63897b7cc3a92411599289d00d686f1b1fc8e336927efa46101c8943410c70',
          sidecars: [
            {
              path: 'services/payment-service/schema.sql',
              hash: 'sha256:e44f1f6425e35d3ab653011cb06288b1645df6fa40cc3bcbbcc08f73542c5557',
            },
            {
              path: 'services/payment-service/attachments/context.txt',
              hash: 'sha256:8b0484119548bb106d52c15578fe3caa6f2aad64ef08e943d8c53ab544ef5e26',
            },
          ],
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
        },
      ],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    };

    const result = await hydrate(graph, {
      outDir,
      localSource: 'acme/central',
      fetch,
    });

    expect(fetch.mock.calls).toEqual([
      [
        {
          source: 'acme/payments',
          commit: '4a1b7e2',
          path: 'services/payment-service/index.mdx',
        },
      ],
      [
        {
          source: 'acme/payments',
          commit: '4a1b7e2',
          path: 'services/payment-service/schema.sql',
        },
      ],
      [
        {
          source: 'acme/payments',
          commit: '4a1b7e2',
          path: 'services/payment-service/attachments/context.txt',
        },
      ],
    ]);
    await expect(
      Promise.all([
        fs.readFile(path.join(outDir, 'acme-payments--bf264d5186bc', 'services/payment-service/index.mdx')),
        fs.readFile(path.join(outDir, 'acme-payments--bf264d5186bc', 'services/payment-service/schema.sql')),
        fs.readFile(path.join(outDir, 'acme-payments--bf264d5186bc', 'services/payment-service/attachments/context.txt')),
      ])
    ).resolves.toEqual([
      files['services/payment-service/index.mdx'],
      files['services/payment-service/schema.sql'],
      files['services/payment-service/attachments/context.txt'],
    ]);
    expect(result).toEqual({
      fetched: 3,
      written: 3,
    });
  });

  it('fetches resource documents and their category metadata as separate files', async () => {
    const files: Record<string, Buffer> = {
      'domains/payments/index.mdx': Buffer.from('# Payments'),
      'domains/payments/docs/onboarding.mdx': Buffer.from('# Onboarding'),
      'domains/payments/docs/runbooks/category.json': Buffer.from(JSON.stringify({ label: 'Operational Runbooks', position: 1 })),
      'domains/payments/docs/runbooks/incident-response.mdx': Buffer.from('# Incident Response'),
    };
    const fetch = vi.fn<Fetcher>().mockImplementation(async (request) => files[request.path]);
    const graph: ResolvedGraph = {
      entities: [
        {
          type: 'domain',
          id: 'payments',
          version: '1.0.0',
          name: 'Payments',
          contentPath: 'domains/payments/index.mdx',
          contentHash: 'sha256:c395d26f16032f31a91ace4acd2a5b82afd4b6736fe1ba3a5eef0dec04588164',
          sidecars: [
            {
              path: 'domains/payments/docs/onboarding.mdx',
              hash: 'sha256:d48985255cee7713590203a844f62d3dfe0adef92316b6316e5bedf7c0c66b31',
            },
            {
              path: 'domains/payments/docs/runbooks/category.json',
              hash: 'sha256:2c8df9bd7ea9c1915b58b51a4984feb7931c49092889ae755c46a52916902ad8',
            },
            {
              path: 'domains/payments/docs/runbooks/incident-response.mdx',
              hash: 'sha256:1bab8d3a3cc7ba05fefc924f1755630aebefaba3046a06f6d073c873a64fdb6e',
            },
          ],
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
        },
      ],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    };

    const result = await hydrate(graph, {
      outDir,
      localSource: 'acme/central',
      fetch,
    });

    expect(fetch.mock.calls).toEqual(
      Object.keys(files).map((filePath) => [
        {
          source: 'acme/payments',
          commit: '4a1b7e2',
          path: filePath,
        },
      ])
    );
    await expect(
      Promise.all(Object.keys(files).map((filePath) => fs.readFile(path.join(outDir, 'acme-payments--bf264d5186bc', filePath))))
    ).resolves.toEqual(Object.values(files));
    expect(result).toEqual({
      fetched: 4,
      written: 4,
    });
  });

  describe('assets', () => {
    it('fetches public files and components into the shared asset directories', async () => {
      const files: Record<string, Buffer> = {
        'components/TeamBadge.astro': Buffer.from('<span>Team badge</span>'),
        'public/icons/payments.svg': Buffer.from('<svg>Payments</svg>'),
      };
      const fetch = vi.fn<Fetcher>().mockImplementation(async (request) => files[request.path]);
      const graph: ResolvedGraph = {
        entities: [],
        assets: [
          {
            path: 'components/TeamBadge.astro',
            hash: 'sha256:3062886724e1c5d3d56b85d7d88720d0f679c019ddcfa347241d545d31fcb82e',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
          },
          {
            path: 'public/icons/payments.svg',
            hash: 'sha256:4c22e5bcafd94c0d64a92f4d0f45853c2ea14d5e76b0e3c7806ef59fa45b9817',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
          },
        ],
        edges: [],
        conflicts: [],
        warnings: [],
        externals: [],
      };

      const result = await hydrate(graph, {
        outDir,
        localSource: 'acme/central',
        fetch,
      });

      expect(fetch.mock.calls).toEqual(
        Object.keys(files).map((filePath) => [
          {
            source: 'acme/payments',
            commit: '4a1b7e2',
            path: filePath,
          },
        ])
      );
      await expect(Promise.all(Object.keys(files).map((filePath) => fs.readFile(path.join(outDir, filePath))))).resolves.toEqual(
        Object.values(files)
      );
      expect(result).toEqual({
        fetched: 2,
        written: 2,
      });
    });

    it('hydrates the selected asset when a collision warning is present', async () => {
      const content = Buffer.from('<svg>Fulfilment</svg>');
      const fetch = vi.fn<Fetcher>().mockResolvedValue(content);
      const graph: ResolvedGraph = {
        entities: [],
        assets: [
          {
            path: 'public/logo.svg',
            hash: 'sha256:d0d43badac07c1be7d31807a734096b3a9e3ac4be1ecdd24323b703e2edb7514',
            resolvedFrom: {
              source: 'acme/fulfilment',
              commit: '8f2c6d0',
            },
          },
        ],
        edges: [],
        conflicts: [],
        warnings: [
          {
            kind: 'asset-collision',
            path: 'public/logo.svg',
            sources: ['acme/fulfilment', 'acme/payments'],
            winner: 'acme/fulfilment',
          },
        ],
        externals: [],
      };

      await expect(
        hydrate(graph, {
          outDir,
          localSource: 'acme/central',
          fetch,
        })
      ).resolves.toEqual({
        fetched: 1,
        written: 1,
      });
      expect(fetch.mock.calls).toEqual([
        [
          {
            source: 'acme/fulfilment',
            commit: '8f2c6d0',
            path: 'public/logo.svg',
          },
        ],
      ]);
      await expect(fs.readFile(path.join(outDir, 'public/logo.svg'))).resolves.toEqual(content);
    });
  });

  it('removes files from a previous hydrate that are no longer in the graph', async () => {
    const stalePath = path.join(outDir, 'acme-payments--bf264d5186bc', 'services/retired-service/index.mdx');
    const currentPath = path.join(outDir, 'acme-payments--bf264d5186bc', 'services/payment-service/index.mdx');
    const content = Buffer.from('# Payment Service');
    await fs.mkdir(path.dirname(stalePath), { recursive: true });
    await fs.writeFile(stalePath, '# Retired Service');

    const fetch = vi.fn<Fetcher>().mockResolvedValue(content);
    const graph: ResolvedGraph = {
      entities: [
        {
          type: 'service',
          id: 'payment-service',
          version: '1.0.0',
          name: 'Payment Service',
          contentPath: 'services/payment-service/index.mdx',
          contentHash: 'sha256:3e63897b7cc3a92411599289d00d686f1b1fc8e336927efa46101c8943410c70',
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
        },
      ],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    };

    await expect(
      hydrate(graph, {
        outDir,
        localSource: 'acme/central',
        fetch,
      })
    ).resolves.toEqual({
      fetched: 1,
      written: 1,
    });
    await expect(fs.access(stalePath)).rejects.toThrow();
    await expect(fs.readFile(currentPath)).resolves.toEqual(content);
  });

  it('preserves locally authored content outside outDir', async () => {
    const localPath = path.join(testDirectory, 'catalog/services/local-service/index.mdx');
    const stalePath = path.join(outDir, 'acme-payments--bf264d5186bc', 'services/retired-service/index.mdx');
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, '# Local Service');
    await fs.mkdir(path.dirname(stalePath), { recursive: true });
    await fs.writeFile(stalePath, '# Retired Service');

    const fetch = vi.fn<Fetcher>();
    const graph: ResolvedGraph = {
      entities: [],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    };

    await expect(
      hydrate(graph, {
        outDir,
        localSource: 'acme/central',
        fetch,
      })
    ).resolves.toEqual({
      fetched: 0,
      written: 0,
    });
    expect(fetch.mock.calls).toEqual([]);
    await expect(fs.readFile(localPath, 'utf8')).resolves.toBe('# Local Service');
    await expect(fs.access(stalePath)).rejects.toThrow();
  });

  it("removes a source's directory when it leaves the graph", async () => {
    const departedSourcePath = path.join(outDir, 'acme-legacy--80e013786537', 'services/legacy-service/index.mdx');
    const departedSourceDirectory = path.join(outDir, 'acme-legacy--80e013786537');
    const currentPath = path.join(outDir, 'acme-payments--bf264d5186bc', 'services/payment-service/index.mdx');
    const content = Buffer.from('# Payment Service');
    await fs.mkdir(path.dirname(departedSourcePath), { recursive: true });
    await fs.writeFile(departedSourcePath, '# Legacy Service');

    const fetch = vi.fn<Fetcher>().mockResolvedValue(content);
    const graph: ResolvedGraph = {
      entities: [
        {
          type: 'service',
          id: 'payment-service',
          version: '1.0.0',
          name: 'Payment Service',
          contentPath: 'services/payment-service/index.mdx',
          contentHash: 'sha256:3e63897b7cc3a92411599289d00d686f1b1fc8e336927efa46101c8943410c70',
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
        },
      ],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    };

    await expect(
      hydrate(graph, {
        outDir,
        localSource: 'acme/central',
        fetch,
      })
    ).resolves.toEqual({
      fetched: 1,
      written: 1,
    });
    await expect(fs.access(departedSourceDirectory)).rejects.toThrow();
    await expect(fs.readFile(currentPath)).resolves.toEqual(content);
  });
});
