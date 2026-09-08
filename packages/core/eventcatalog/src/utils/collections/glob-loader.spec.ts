import picomatch from 'picomatch';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { globWithSafeWatcher, withFederatedContent, withIgnoredBuildArtifacts } from './glob-loader';

describe('catalog discovery', () => {
  const directories: string[] = [];

  afterEach(async () => {
    vi.unstubAllEnvs();
    await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  });

  it.each([undefined, 'false', 'true'])('excludes dependency catalogs when IGNORE_BUILD_ARTIFACTS is %s', async (flag) => {
    vi.stubEnv('IGNORE_BUILD_ARTIFACTS', flag);
    const root = await mkdtemp(path.join(tmpdir(), 'catalog-discovery-'));
    directories.push(root);
    const catalog = path.join(root, 'catalog');
    const resources = [
      'events/OrderConfirmed/index.md',
      'domains/Orders/services/Inventory/events/Adjusted/versioned/1.0.0/index.mdx',
      'federated/orders/events/OrderConfirmed/index.mdx',
    ];
    const dependencies = [
      'node_modules/core/src/__tests__/events/OrderConfirmed/index.md',
      'node_modules/core/node_modules/sdk/events/OrderConfirmed/index.mdx',
      'federated/orders/node_modules/sdk/events/OrderConfirmed/index.md',
    ];
    for (const entry of [...resources, ...dependencies]) {
      const file = path.join(catalog, entry);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, entry);
    }
    // Workspace dependencies are often symlinked outside the catalog.
    const linkedPackage = path.join(root, 'linked-package');
    await mkdir(path.join(linkedPackage, 'events/OrderConfirmed'), { recursive: true });
    await writeFile(path.join(linkedPackage, 'events/OrderConfirmed/index.md'), 'dependency');
    await symlink(linkedPackage, path.join(catalog, 'node_modules/linked'));

    const loaded = new Map();
    const logger = { warn: vi.fn(), error: vi.fn() };
    const base = pathToFileURL(`${catalog}/`);
    const loader = globWithSafeWatcher({
      pattern: withIgnoredBuildArtifacts('**/events/**/index.(md|mdx)'),
      base,
      generateId: ({ entry }) => entry,
    });
    await loader.load({
      config: { root: base, srcDir: new URL('src/', base) },
      collection: 'events',
      logger,
      store: {
        keys: () => loaded.keys(),
        get: (id: string) => loaded.get(id),
        set: (entry: { id: string }) => loaded.set(entry.id, entry),
        delete: (id: string) => loaded.delete(id),
      },
      parseData: async ({ data }: { data: unknown }) => data,
      generateDigest: (contents: string) => contents,
      entryTypes: new Map(['.md', '.mdx'].map((ext) => [ext, { getEntryInfo: () => ({ data: {}, body: '' }) }])),
    } as unknown as Parameters<typeof loader.load>[0]);

    expect([...loaded.keys()].sort()).toEqual(resources.sort());
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});

describe('withFederatedContent', () => {
  it('loads root catalog content from every federated source directory', () => {
    const patterns = withFederatedContent(['services/*/index.(md|mdx)', 'domains/*/index.(md|mdx)', '!domains/*/services/**']);

    expect(patterns).toEqual([
      'services/*/index.(md|mdx)',
      'domains/*/index.(md|mdx)',
      '!domains/*/services/**',
      'federated/*/services/*/index.(md|mdx)',
      'federated/*/domains/*/index.(md|mdx)',
      '!federated/*/domains/*/services/**',
    ]);
    expect(picomatch.isMatch('federated/team-payments--abc123/services/payment-service/index.mdx', patterns)).toBe(true);
    expect(picomatch.isMatch('federated/team-payments--abc123/domains/payments/index.mdx', patterns)).toBe(true);
  });
});
