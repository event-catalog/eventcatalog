import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Index } from '@eventcatalog/sdk';
import { federateCatalog, FederationConflictError, type FederationProgressEvent } from '../federation/federate';
import type { FederationSourceProvider } from '../federation/types';

const sourceIndex = (source: string, resourceId: string): Index => {
  const contentPath = `services/${resourceId}/index.mdx`;
  const content = Buffer.from(`# ${contentPath}\n`);
  return {
    indexVersion: 1,
    source,
    commit: `${source}-commit`,
    resources: [
      {
        type: 'service',
        id: resourceId,
        name: resourceId,
        contentPath,
        contentHash: `sha256:${createHash('sha256').update(content).digest('hex')}`,
      },
    ],
  };
};

const sourceIndexWithPublicFiles = (source: string, resourceId: string, files: Record<string, Buffer>): Index => ({
  ...sourceIndex(source, resourceId),
  assets: Object.entries(files).map(([assetPath, content]) => ({
    path: assetPath,
    hash: `sha256:${createHash('sha256').update(content).digest('hex')}`,
  })),
});

const hash = (content: Buffer | string) => `sha256:${createHash('sha256').update(content).digest('hex')}`;

const writeProject = async (projectDirectory: string, sources: unknown[]) => {
  await fs.writeFile(path.join(projectDirectory, 'package.json'), JSON.stringify({ type: 'module' }));
  await fs.writeFile(
    path.join(projectDirectory, 'eventcatalog.config.js'),
    `export default ${JSON.stringify({ cId: 'central-catalog', federation: { sources } }, null, 2)};\n`
  );
};

const listFiles = async (directory: string, relativeDirectory = ''): Promise<string[]> => {
  const entries = await fs.readdir(path.join(directory, relativeDirectory), { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = path.join(relativeDirectory, entry.name);
      return entry.isDirectory() ? listFiles(directory, relativePath) : [relativePath.split(path.sep).join('/')];
    })
  );
  return files.flat().sort();
};

describe('federate catalog', () => {
  let projectDirectory: string;

  beforeEach(async () => {
    projectDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-federate-'));
  });

  afterEach(async () => {
    await fs.rm(projectDirectory, { recursive: true, force: true });
  });

  it('resolves only configured sources, hydrates, locks, and reports progress', async () => {
    await writeProject(projectDirectory, [
      { id: 'acme/payments', source: 'github:acme/catalogs', path: 'payments', mode: 'hydrate' },
      { id: 'acme/orders', source: 'github:acme/catalogs', path: 'orders', mode: 'hydrate' },
    ]);
    const indexes = {
      'acme/payments': sourceIndex('acme/payments', 'payment-service'),
      'acme/orders': sourceIndex('acme/orders', 'order-service'),
    };
    const provider: FederationSourceProvider = {
      resolve: vi.fn(async (source) => {
        const index = indexes[source.id as keyof typeof indexes];
        return { bytes: Buffer.from(JSON.stringify(index)), index, commit: index.commit, generated: true };
      }),
      fetchContent: vi.fn(async ({ path: artifactPath }) => Buffer.from(`# ${artifactPath}\n`)),
    };
    const progress: FederationProgressEvent[] = [];
    const centralResource = path.join(projectDirectory, 'services', 'payment-service', 'index.mdx');
    await fs.mkdir(path.dirname(centralResource), { recursive: true });
    await fs.writeFile(centralResource, '---\nid: payment-service\nname: Central payment service\n---\n# Central');
    const previousOutput = path.join(projectDirectory, 'federated', 'old-source', 'services', 'payment-service', 'index.mdx');
    await fs.mkdir(path.dirname(previousOutput), { recursive: true });
    await fs.writeFile(previousOutput, '---\nid: payment-service\nname: Previously hydrated payment service\n---\n# Previous');

    const result = await federateCatalog(projectDirectory, {
      provider,
      now: () => new Date('2026-08-11T12:00:00.000Z'),
      onProgress: (event) => progress.push(event),
    });

    expect(result).toMatchObject({ sources: 2, resources: 2, hydrate: { fetched: 2, written: 2, referenced: 0 } });
    expect(result?.graph.conflicts).toEqual([]);
    expect(result?.graph.entities.map((entity) => entity.resolvedFrom.source).sort()).toEqual(['acme/orders', 'acme/payments']);
    expect(await listFiles(path.join(projectDirectory, 'federated'))).toEqual([
      'acme-orders--874229ea429d/services/order-service/index.mdx',
      'acme-payments--bf264d5186bc/services/payment-service/index.mdx',
    ]);
    expect(JSON.parse(await fs.readFile(path.join(projectDirectory, 'eventcatalog.lock'), 'utf8'))).toEqual({
      lockVersion: 1,
      sources: [
        expect.objectContaining({ id: 'acme/orders', commit: 'acme/orders-commit', resolvedAt: '2026-08-11T12:00:00.000Z' }),
        expect.objectContaining({ id: 'acme/payments', commit: 'acme/payments-commit', resolvedAt: '2026-08-11T12:00:00.000Z' }),
      ],
      publicFiles: {},
    });
    expect(progress.map((event) => event.type)).toEqual([
      'configured',
      'source:start',
      'source:complete',
      'source:start',
      'source:complete',
      'resolving',
      'resolved',
      'hydrating',
      'hydrate:file',
      'hydrate:file',
      'public:complete',
      'complete',
    ]);
  });

  it('composes public assets into the root with main ownership and last-source-wins semantics', async () => {
    await writeProject(projectDirectory, [
      { id: 'acme/first', source: 'github:acme/first' },
      { id: 'acme/last', source: 'github:acme/last' },
    ]);
    const filesBySource: Record<string, Record<string, Buffer>> = {
      'acme/first': {
        'public/first.txt': Buffer.from('first source'),
        'public/main.txt': Buffer.from('remote main'),
        'public/shared.txt': Buffer.from('first shared'),
      },
      'acme/last': {
        'public/last.txt': Buffer.from('last source'),
        'public/shared.txt': Buffer.from('last shared'),
      },
    };
    const indexes = {
      'acme/first': sourceIndexWithPublicFiles('acme/first', 'first-service', filesBySource['acme/first']),
      'acme/last': sourceIndexWithPublicFiles('acme/last', 'last-service', filesBySource['acme/last']),
    };
    const provider: FederationSourceProvider = {
      resolve: vi.fn(async (source) => {
        const index = indexes[source.id as keyof typeof indexes];
        return { bytes: Buffer.from(JSON.stringify(index)), index, commit: index.commit, generated: true };
      }),
      fetchContent: vi.fn(async ({ source, path: artifactPath }) => {
        if (artifactPath.startsWith('public/')) return filesBySource[source.id][artifactPath];
        return Buffer.from(`# ${artifactPath}\n`);
      }),
    };
    await fs.mkdir(path.join(projectDirectory, 'public'), { recursive: true });
    await fs.writeFile(path.join(projectDirectory, 'public/main.txt'), 'main catalog');

    const result = await federateCatalog(projectDirectory, { provider });

    expect(result?.public).toEqual({ copied: 3, skipped: 1, overwritten: 1, removed: 0, files: expect.any(Object) });
    await expect(fs.readFile(path.join(projectDirectory, 'public/main.txt'), 'utf8')).resolves.toBe('main catalog');
    await expect(fs.readFile(path.join(projectDirectory, 'public/first.txt'), 'utf8')).resolves.toBe('first source');
    await expect(fs.readFile(path.join(projectDirectory, 'public/last.txt'), 'utf8')).resolves.toBe('last source');
    await expect(fs.readFile(path.join(projectDirectory, 'public/shared.txt'), 'utf8')).resolves.toBe('last shared');
    await expect(fs.access(path.join(projectDirectory, 'federated/public'))).rejects.toThrow();
    expect(result?.graph.warnings).toContainEqual({
      kind: 'asset-collision',
      path: 'public/shared.txt',
      sources: ['acme/first', 'acme/last'],
      winner: 'acme/last',
    });

    const lock = JSON.parse(await fs.readFile(path.join(projectDirectory, 'eventcatalog.lock'), 'utf8'));
    expect(lock.publicFiles).toEqual({
      'first.txt': { source: 'acme/first', hash: hash('first source') },
      'last.txt': { source: 'acme/last', hash: hash('last source') },
      'shared.txt': { source: 'acme/last', hash: hash('last shared') },
    });
  });

  it('updates managed public assets, removes stale ones, and preserves manually edited files', async () => {
    await writeProject(projectDirectory, [{ id: 'acme/payments', source: 'github:acme/payments' }]);
    let files: Record<string, Buffer> = {
      'public/manual.txt': Buffer.from('generated manual'),
      'public/remove.txt': Buffer.from('remove me'),
      'public/update.txt': Buffer.from('first version'),
    };
    let index = sourceIndexWithPublicFiles('acme/payments', 'payment-service', files);
    const provider: FederationSourceProvider = {
      resolve: vi.fn(async () => ({ bytes: Buffer.from(JSON.stringify(index)), index, commit: index.commit, generated: true })),
      fetchContent: vi.fn(async ({ path: artifactPath }) =>
        artifactPath.startsWith('public/') ? files[artifactPath] : Buffer.from(`# ${artifactPath}\n`)
      ),
    };

    await federateCatalog(projectDirectory, { provider });
    await fs.writeFile(path.join(projectDirectory, 'public/manual.txt'), 'main catalog edit');
    files = {
      'public/manual.txt': Buffer.from('new generated manual'),
      'public/update.txt': Buffer.from('second version'),
    };
    index = sourceIndexWithPublicFiles('acme/payments', 'payment-service', files);

    const result = await federateCatalog(projectDirectory, { provider });

    expect(result?.public).toEqual({
      copied: 1,
      skipped: 1,
      overwritten: 0,
      removed: 1,
      files: {
        'update.txt': { source: 'acme/payments', hash: hash('second version') },
      },
    });
    await expect(fs.readFile(path.join(projectDirectory, 'public/manual.txt'), 'utf8')).resolves.toBe('main catalog edit');
    await expect(fs.readFile(path.join(projectDirectory, 'public/update.txt'), 'utf8')).resolves.toBe('second version');
    await expect(fs.access(path.join(projectDirectory, 'public/remove.txt'))).rejects.toThrow();
    await expect(fs.access(path.join(projectDirectory, 'federated/public'))).rejects.toThrow();
  });

  it('stops before hydration when two sources own the same resource', async () => {
    await writeProject(projectDirectory, [
      { id: 'acme/payments', source: 'github:acme/payments' },
      { id: 'acme/orders', source: 'github:acme/orders' },
    ]);
    const provider: FederationSourceProvider = {
      resolve: vi.fn(async (source) => {
        const index = sourceIndex(source.id, 'shared-service');
        return { bytes: Buffer.from(JSON.stringify(index)), index, commit: index.commit, generated: true };
      }),
      fetchContent: vi.fn(),
    };
    const previousOutput = path.join(projectDirectory, 'federated', 'previous.txt');
    await fs.mkdir(path.dirname(previousOutput), { recursive: true });
    await fs.writeFile(previousOutput, 'keep me');

    await expect(federateCatalog(projectDirectory, { provider })).rejects.toBeInstanceOf(FederationConflictError);
    await expect(fs.readFile(previousOutput, 'utf8')).resolves.toBe('keep me');
    await expect(fs.access(path.join(projectDirectory, 'eventcatalog.lock'))).rejects.toThrow();
    expect(provider.fetchContent).not.toHaveBeenCalled();
  });

  it('reuses unchanged content from the cache on later runs', async () => {
    await writeProject(projectDirectory, [{ id: 'acme/payments', source: 'github:acme/payments' }]);
    const index = sourceIndex('acme/payments', 'payment-service');
    const provider: FederationSourceProvider = {
      resolve: vi.fn(async () => ({ bytes: Buffer.from(JSON.stringify(index)), index, commit: index.commit, generated: true })),
      fetchContent: vi.fn(async ({ path: artifactPath }) => Buffer.from(`# ${artifactPath}\n`)),
    };

    await expect(federateCatalog(projectDirectory, { provider })).resolves.toMatchObject({
      hydrate: { fetched: 1, written: 1 },
    });

    const progress: FederationProgressEvent[] = [];
    await expect(
      federateCatalog(projectDirectory, { provider, onProgress: (event) => progress.push(event) })
    ).resolves.toMatchObject({ hydrate: { fetched: 0, written: 1 } });

    expect(provider.fetchContent).toHaveBeenCalledTimes(1);
    expect(progress).toContainEqual({ type: 'hydrate:cache', files: 1 });
  });

  it('downloads and refreshes content when cache reads are disabled', async () => {
    await writeProject(projectDirectory, [{ id: 'acme/payments', source: 'github:acme/payments' }]);
    const index = sourceIndex('acme/payments', 'payment-service');
    const provider: FederationSourceProvider = {
      resolve: vi.fn(async () => ({ bytes: Buffer.from(JSON.stringify(index)), index, commit: index.commit, generated: true })),
      fetchContent: vi.fn(async ({ path: artifactPath }) => Buffer.from(`# ${artifactPath}\n`)),
    };
    await federateCatalog(projectDirectory, { provider });
    const progress: FederationProgressEvent[] = [];

    await expect(
      federateCatalog(projectDirectory, {
        provider,
        useCache: false,
        onProgress: (event) => progress.push(event),
      })
    ).resolves.toMatchObject({ hydrate: { fetched: 1, written: 1 } });

    expect(provider.fetchContent).toHaveBeenCalledTimes(2);
    expect(progress).toContainEqual({ type: 'cache:disabled' });
    expect(progress.some((event) => event.type === 'hydrate:cache')).toBe(false);
  });

  it('does nothing when federation has no configured sources', async () => {
    await writeProject(projectDirectory, []);
    const progress: FederationProgressEvent[] = [];

    await expect(federateCatalog(projectDirectory, { onProgress: (event) => progress.push(event) })).resolves.toBeNull();
    expect(progress).toEqual([{ type: 'configured', sources: 0 }]);
  });
});
