import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import utils, { hydrate, resolve, type Fetcher } from '../index';

/**
 * Exercises the complete federation pipeline against small, real catalogs on disk:
 * buildIndex reads their MDX and related files, resolve joins relationships across
 * source boundaries, and hydrate materializes the federated files through a local
 * filesystem fetcher.
 *
 * The fixtures cover cross-team and unresolved references, pinned and latest version
 * resolution, central domains and flows, sidecars, assets, and stale-file removal.
 * Committed snapshots make changes to the resolved graph and hydrated file tree visible
 * during review, protecting behaviours that hand-written unit fixtures can miss.
 */
const FIXTURE_ROOT = path.resolve(__dirname, '../../../../examples/federation');
const RESOLVED_GRAPH_SNAPSHOT_PATH = path.join(__dirname, 'fixtures/resolve/federation-resolved-graph.json');
const HYDRATED_TREE_SNAPSHOT_PATH = path.join(__dirname, 'fixtures/hydrate/federation-hydrated-files.json');

const sources = {
  central: {
    commit: 'central-fixture',
    catalogPath: path.join(FIXTURE_ROOT, 'central/catalog'),
  },
  'team/payments': {
    commit: 'payments-fixture',
    catalogPath: path.join(FIXTURE_ROOT, 'team-payments/catalog'),
  },
  'team/fulfilment': {
    commit: 'fulfilment-fixture',
    catalogPath: path.join(FIXTURE_ROOT, 'team-fulfilment/catalog'),
  },
} as const;

const buildFixtureIndexes = () =>
  Promise.all(
    Object.entries(sources).map(([source, fixture]) =>
      utils(fixture.catalogPath).buildIndex({
        source,
        commit: fixture.commit,
      })
    )
  );

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

describe('federation pipeline integration', () => {
  let testDirectory: string;
  let outDir: string;

  beforeEach(async () => {
    testDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-federation-integration-'));
    outDir = path.join(testDirectory, 'federated-catalog');
  });

  afterEach(async () => {
    await fs.rm(testDirectory, { recursive: true, force: true });
  });

  it('matches the committed resolved graph snapshot', async () => {
    const graph = resolve(await buildFixtureIndexes());
    const snapshot = JSON.parse(await fs.readFile(RESOLVED_GRAPH_SNAPSHOT_PATH, 'utf8'));

    expect(graph).toEqual(snapshot);
  });

  it('indexes, resolves, and hydrates real catalogs from disk', async () => {
    const indexes = await buildFixtureIndexes();

    expect(
      indexes.map((index) => ({
        source: index.source,
        resources: index.resources.map(({ type, id, version }) => `${type}:${id}@${version ?? 'unversioned'}`),
      }))
    ).toEqual([
      {
        source: 'central',
        resources: ['adr:federate-commerce-services@1.0.0', 'domain:commerce@1.0.0', 'flow:payment-to-fulfilment@1.0.0'],
      },
      {
        source: 'team/payments',
        resources: ['event:payment-captured@2.0.0', 'event:payment-captured@1.0.0', 'service:payment-service@1.0.0'],
      },
      {
        source: 'team/fulfilment',
        resources: ['service:fulfilment-service@1.0.0'],
      },
    ]);

    const graph = resolve(indexes);

    expect(graph.conflicts).toEqual([]);
    expect(graph.warnings).toEqual([]);
    expect(graph.externals).toEqual([
      {
        id: 'shipment-dispatched',
        referencedBy: ['fulfilment-service'],
      },
    ]);
    expect(graph.edges).toHaveLength(9);
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: 'payment-service',
          to: 'payment-captured',
          direction: 'sends',
          resolved: '2.0.0',
          resolvedFrom: { source: 'team/payments', commit: 'payments-fixture' },
          status: 'resolved',
        }),
        expect.objectContaining({
          from: 'fulfilment-service',
          to: 'payment-captured',
          direction: 'receives',
          resolved: '1.0.0',
          resolvedFrom: { source: 'team/payments', commit: 'payments-fixture' },
          status: 'resolved',
        }),
        expect.objectContaining({
          from: 'federate-commerce-services',
          to: 'fulfilment-service',
          direction: 'appliesTo',
          resolvedFrom: { source: 'team/fulfilment', commit: 'fulfilment-fixture' },
          status: 'resolved',
        }),
        expect.objectContaining({
          from: 'fulfilment-service',
          to: 'shipment-dispatched',
          direction: 'receives',
          resolved: null,
          status: 'external',
        }),
        expect.objectContaining({
          from: 'payment-to-fulfilment',
          to: 'payment-service',
          direction: 'references',
          via: 'steps',
          status: 'resolved',
        }),
        expect.objectContaining({
          from: 'payment-to-fulfilment',
          to: 'fulfilment-service',
          direction: 'references',
          via: 'steps',
          status: 'resolved',
        }),
      ])
    );

    const fetch: Fetcher = async ({ source, commit, path: artifactPath }) => {
      const fixture = sources[source as keyof typeof sources];
      if (!fixture) throw new Error(`Unknown fixture source: ${source}`);
      if (commit !== fixture.commit) throw new Error(`Unexpected commit for ${source}: ${commit}`);

      const absolutePath = path.resolve(fixture.catalogPath, artifactPath);
      const relativePath = path.relative(fixture.catalogPath, absolutePath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        throw new Error(`Artifact path escapes fixture catalog: ${artifactPath}`);
      }

      return fs.readFile(absolutePath);
    };

    const staleFile = path.join(outDir, 'stale-source/services/deleted-service/index.mdx');
    await fs.mkdir(path.dirname(staleFile), { recursive: true });
    await fs.writeFile(staleFile, '# Deleted service');

    await expect(
      hydrate(graph, {
        outDir,
        localSource: 'central',
        fetch,
      })
    ).resolves.toEqual({
      fetched: 7,
      written: 7,
    });

    const hydratedTreeSnapshot = JSON.parse(await fs.readFile(HYDRATED_TREE_SNAPSHOT_PATH, 'utf8'));
    expect(await listFiles(outDir)).toEqual(hydratedTreeSnapshot);

    await expect(
      fs.readFile(
        path.join(outDir, 'team-payments--28eeaeb29a32/services/payment-service/events/payment-captured/schema.json'),
        'utf8'
      )
    ).resolves.toContain('"paymentId"');
    await expect(fs.readFile(path.join(outDir, 'public/icons/nodejs.svg'), 'utf8')).resolves.toContain('<title>Node.js</title>');
  });
});
