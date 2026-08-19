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

const writeService = async (directory: string, id: string, markdown = `# ${id}`) => {
  const filePath = path.join(directory, 'services', id, 'index.mdx');
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `---\nid: ${id}\nname: ${id}\nversion: 1.0.0\n---\n${markdown}\n`);
  return filePath;
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
    const centralResource = path.join(projectDirectory, 'services', 'central-service', 'index.mdx');
    await fs.mkdir(path.dirname(centralResource), { recursive: true });
    await fs.writeFile(centralResource, '---\nid: central-service\nname: Central service\n---\n# Central');
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
      'local:start',
      'local:complete',
      'resolving',
      'resolved',
      'hydrating',
      'hydrate:file',
      'hydrate:file',
      'public:complete',
      'complete',
    ]);
    expect(progress).toContainEqual({ type: 'local:complete', resources: 1 });
    expect(progress).toContainEqual({ type: 'resolving', localResources: 1, resources: 2 });
  });

  it('indexes and hydrates local filesystem resources and assets through the default provider', async () => {
    const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-local-source-'));
    try {
      await writeService(sourceDirectory, 'payment-service');
      await fs.mkdir(path.join(sourceDirectory, 'components'), { recursive: true });
      await fs.writeFile(path.join(sourceDirectory, 'components', 'payment-card.astro'), '<aside>Payments</aside>');
      await fs.mkdir(path.join(sourceDirectory, 'public'), { recursive: true });
      await fs.writeFile(path.join(sourceDirectory, 'public', 'payment.txt'), 'payments');
      await writeProject(projectDirectory, [
        { id: 'acme/payments', source: `file:${path.relative(projectDirectory, sourceDirectory)}` },
      ]);

      const result = await federateCatalog(projectDirectory, { now: () => new Date('2026-08-19T12:00:00.000Z') });

      expect(result).toMatchObject({
        sources: 1,
        resources: 1,
        hydrate: { fetched: 3, written: 3, referenced: 0 },
      });
      expect(await listFiles(path.join(projectDirectory, 'federated'))).toEqual([
        'acme-payments--bf264d5186bc/services/payment-service/index.mdx',
        'components/payment-card.astro',
      ]);
      await expect(fs.readFile(path.join(projectDirectory, 'public', 'payment.txt'), 'utf8')).resolves.toBe('payments');
      const lock = JSON.parse(await fs.readFile(path.join(projectDirectory, 'eventcatalog.lock'), 'utf8'));
      expect(lock.sources).toEqual([
        expect.objectContaining({
          id: 'acme/payments',
          commit: expect.stringMatching(/^local:[a-f0-9]{12}$/),
          resolvedAt: '2026-08-19T12:00:00.000Z',
        }),
      ]);
    } finally {
      await fs.rm(sourceDirectory, { recursive: true, force: true });
    }
  });

  it('applies source conflict rules to filesystem catalogs before hydration', async () => {
    const firstSource = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-local-first-'));
    const secondSource = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-local-second-'));
    try {
      await writeService(firstSource, 'shared-service', '# First');
      await writeService(secondSource, 'shared-service', '# Second');
      await writeProject(projectDirectory, [
        { id: 'acme/first', source: `file:${path.relative(projectDirectory, firstSource)}` },
        { id: 'acme/second', source: `file:${path.relative(projectDirectory, secondSource)}` },
      ]);

      await expect(federateCatalog(projectDirectory)).rejects.toMatchObject({
        conflicts: [
          {
            kind: 'duplicate-source',
            id: 'shared-service',
            sources: ['acme/first', 'acme/second'],
          },
        ],
      });
      await expect(fs.access(path.join(projectDirectory, 'federated'))).rejects.toThrow();
    } finally {
      await Promise.all([
        fs.rm(firstSource, { recursive: true, force: true }),
        fs.rm(secondSource, { recursive: true, force: true }),
      ]);
    }
  });

  it('applies central ownership conflicts to filesystem catalogs before hydration', async () => {
    const sourceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-local-conflict-'));
    try {
      await writeService(sourceDirectory, 'shared-service', '# Source');
      await writeService(projectDirectory, 'shared-service', '# Central');
      await writeProject(projectDirectory, [
        { id: 'acme/source', source: `file:${path.relative(projectDirectory, sourceDirectory)}` },
      ]);

      await expect(federateCatalog(projectDirectory)).rejects.toMatchObject({
        conflicts: [
          {
            kind: 'duplicate-source',
            id: 'shared-service',
            sources: ['acme/source', 'central-catalog'],
          },
        ],
      });
      await expect(fs.access(path.join(projectDirectory, 'federated'))).rejects.toThrow();
    } finally {
      await fs.rm(sourceDirectory, { recursive: true, force: true });
    }
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

  it('removes resources, public assets, and lock entries when a configured source is removed', async () => {
    const paymentsSource = { id: 'acme/payments', source: 'github:acme/payments' };
    await writeProject(projectDirectory, [paymentsSource]);
    const filesBySource: Record<string, Record<string, Buffer>> = {
      'acme/payments': { 'public/payments.txt': Buffer.from('payments') },
    };
    const index = sourceIndexWithPublicFiles('acme/payments', 'payment-service', filesBySource['acme/payments']);
    const provider: FederationSourceProvider = {
      resolve: vi.fn(async () => ({ bytes: Buffer.from(JSON.stringify(index)), index, commit: index.commit, generated: true })),
      fetchContent: vi.fn(async ({ source, path: artifactPath }) => {
        if (artifactPath.startsWith('public/')) return filesBySource[source.id][artifactPath];
        return Buffer.from(`# ${artifactPath}\n`);
      }),
    };
    const removedSourceDirectory = path.join(projectDirectory, 'federated/acme-orders--874229ea429d');
    await fs.mkdir(removedSourceDirectory, { recursive: true });
    await fs.writeFile(path.join(removedSourceDirectory, 'old-resource.mdx'), '# Old resource');
    await fs.mkdir(path.join(projectDirectory, 'public'), { recursive: true });
    await fs.writeFile(path.join(projectDirectory, 'public/payments.txt'), 'payments');
    await fs.writeFile(path.join(projectDirectory, 'public/orders.txt'), 'orders');
    await fs.writeFile(
      path.join(projectDirectory, 'eventcatalog.lock'),
      JSON.stringify({
        lockVersion: 1,
        sources: [
          { id: 'acme/orders', digest: hash('orders-index'), commit: 'orders-commit', resolvedAt: '2026-08-11T12:00:00.000Z' },
          {
            id: 'acme/payments',
            digest: hash('payments-index'),
            commit: 'payments-commit',
            resolvedAt: '2026-08-11T12:00:00.000Z',
          },
        ],
        publicFiles: {
          'orders.txt': { source: 'acme/orders', hash: hash('orders') },
          'payments.txt': { source: 'acme/payments', hash: hash('payments') },
        },
      })
    );

    const result = await federateCatalog(projectDirectory, { provider });

    expect(result).toMatchObject({ sources: 1, resources: 1 });
    await expect(
      fs.readFile(path.join(projectDirectory, 'federated/acme-payments--bf264d5186bc/services/payment-service/index.mdx'), 'utf8')
    ).resolves.toBe('# services/payment-service/index.mdx\n');
    await expect(fs.access(path.join(projectDirectory, 'federated/acme-orders--874229ea429d'))).rejects.toThrow();
    await expect(fs.readFile(path.join(projectDirectory, 'public/payments.txt'), 'utf8')).resolves.toBe('payments');
    await expect(fs.access(path.join(projectDirectory, 'public/orders.txt'))).rejects.toThrow();

    const lock = JSON.parse(await fs.readFile(path.join(projectDirectory, 'eventcatalog.lock'), 'utf8'));
    expect(lock.sources.map((source: { id: string }) => source.id)).toEqual(['acme/payments']);
    expect(lock.publicFiles).toEqual({
      'payments.txt': { source: 'acme/payments', hash: hash('payments') },
    });
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

  it('stops before hydration when the main catalog and a source own the same resource', async () => {
    await writeProject(projectDirectory, [{ id: 'acme/payments', source: 'github:acme/payments' }]);
    const localResource = path.join(projectDirectory, 'services', 'payment-service', 'index.mdx');
    await fs.mkdir(path.dirname(localResource), { recursive: true });
    await fs.writeFile(localResource, '---\nid: payment-service\nname: Local payment service\n---\n# Local');

    const index = sourceIndex('acme/payments', 'payment-service');
    const provider: FederationSourceProvider = {
      resolve: vi.fn(async () => ({ bytes: Buffer.from(JSON.stringify(index)), index, commit: index.commit, generated: true })),
      fetchContent: vi.fn(async ({ path: artifactPath }) => Buffer.from(`# ${artifactPath}\n`)),
    };

    await expect(federateCatalog(projectDirectory, { provider })).rejects.toMatchObject({
      conflicts: [
        {
          kind: 'duplicate-source',
          id: 'payment-service',
          sources: ['acme/payments', 'central-catalog'],
        },
      ],
    });
    expect(provider.fetchContent).not.toHaveBeenCalled();
    await expect(fs.access(path.join(projectDirectory, 'federated'))).rejects.toThrow();
    await expect(fs.access(path.join(projectDirectory, 'eventcatalog.lock'))).rejects.toThrow();
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

  it('cleans previous federation output when the source list becomes empty', async () => {
    await writeProject(projectDirectory, []);
    const federatedResource = path.join(projectDirectory, 'federated', 'acme-payments', 'services', 'payments', 'index.mdx');
    const managedPublicFile = path.join(projectDirectory, 'public', 'icons', 'managed.svg');
    const editedPublicFile = path.join(projectDirectory, 'public', 'icons', 'edited.svg');
    const centralPublicFile = path.join(projectDirectory, 'public', 'central.svg');
    await fs.mkdir(path.dirname(federatedResource), { recursive: true });
    await fs.mkdir(path.dirname(managedPublicFile), { recursive: true });
    await fs.writeFile(federatedResource, '# Previously federated');
    await fs.writeFile(managedPublicFile, 'managed');
    await fs.writeFile(editedPublicFile, 'edited by the main catalog');
    await fs.writeFile(centralPublicFile, 'central');
    await fs.writeFile(
      path.join(projectDirectory, 'eventcatalog.lock'),
      JSON.stringify({
        lockVersion: 1,
        sources: [
          {
            id: 'acme/payments',
            digest: hash('index'),
            commit: 'abc123',
            resolvedAt: '2026-08-11T12:00:00.000Z',
          },
        ],
        publicFiles: {
          'icons/managed.svg': { source: 'acme/payments', hash: hash('managed') },
          'icons/edited.svg': { source: 'acme/payments', hash: hash('original generated content') },
        },
      })
    );

    const progress: FederationProgressEvent[] = [];
    const isFederationEnabled = vi.fn(async () => false);
    await federateCatalog(projectDirectory, {
      isFederationEnabled,
      onProgress: (event) => progress.push(event),
    });

    await expect(fs.access(path.join(projectDirectory, 'federated'))).rejects.toThrow();
    await expect(fs.access(managedPublicFile)).rejects.toThrow();
    await expect(fs.readFile(editedPublicFile, 'utf8')).resolves.toBe('edited by the main catalog');
    await expect(fs.readFile(centralPublicFile, 'utf8')).resolves.toBe('central');

    const lock = await fs
      .readFile(path.join(projectDirectory, 'eventcatalog.lock'), 'utf8')
      .then((contents) => JSON.parse(contents))
      .catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return undefined;
        throw error;
      });
    if (lock) expect(lock).toMatchObject({ sources: [], publicFiles: {} });
    expect(progress).toContainEqual({ type: 'cleanup:complete', federated: true, publicFiles: 1, lock: true });
    expect(isFederationEnabled).not.toHaveBeenCalled();
  });

  it('checks entitlement before resolving configured sources', async () => {
    await writeProject(projectDirectory, [{ id: 'acme/payments', source: 'github:acme/payments' }]);
    const provider: FederationSourceProvider = {
      resolve: vi.fn(),
      fetchContent: vi.fn(),
    };
    const isFederationEnabled = vi.fn(async () => false);

    await expect(federateCatalog(projectDirectory, { provider, isFederationEnabled })).rejects.toThrow(
      'EventCatalog federation is an Enterprise feature'
    );

    expect(isFederationEnabled).toHaveBeenCalledOnce();
    expect(provider.resolve).not.toHaveBeenCalled();
    expect(provider.fetchContent).not.toHaveBeenCalled();
  });

  it('does nothing when federation has no configured sources', async () => {
    await writeProject(projectDirectory, []);
    const progress: FederationProgressEvent[] = [];

    await expect(federateCatalog(projectDirectory, { onProgress: (event) => progress.push(event) })).resolves.toBeNull();
    expect(progress).toEqual([{ type: 'configured', sources: 0 }]);
  });
});
