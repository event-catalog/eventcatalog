/**
 * Optional wall-clock repro. Skipped in the default unit suite so CI does not
 * depend on host speed. Run with:
 *
 *   EVENTCATALOG_GRAPH_BENCH=1 pnpm --filter @eventcatalog/core exec vitest run \
 *     eventcatalog/src/utils/__tests__/node-graphs/large-graph.bench.spec.ts
 */
import { describe, it, vi, beforeEach } from 'vitest';
import { getCollection } from 'astro:content';
import { getNodesAndEdges as getDomainNodesAndEdges } from '@utils/node-graphs/domains-node-graph';
import { getNodesAndEdges as getServiceNodesAndEdges } from '@utils/node-graphs/services-node-graph';
import { createLargeCatalog, installLargeCatalogMock } from './large-catalog';

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: vi.fn(),
  };
});

const catalog = createLargeCatalog();
const RUN_BENCH = process.env.EVENTCATALOG_GRAPH_BENCH === '1';

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const time = async (label: string, fn: () => Promise<void> | void, runs = 3) => {
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    await fn();
    samples.push(performance.now() - start);
  }
  const result = { label, samples, median: median(samples) };
  // eslint-disable-next-line no-console
  console.log(`[bench] ${label}: ${samples.map((s) => s.toFixed(1)).join(', ')} ms (median ${result.median.toFixed(1)} ms)`);
  return result;
};

describe.skipIf(!RUN_BENCH)('large node-graph benchmark', () => {
  beforeEach(() => {
    vi.mocked(getCollection).mockImplementation(installLargeCatalogMock(catalog, getCollection) as any);
  });

  it('prints domain and service graph timings for a large catalog', async () => {
    await time('domain getNodesAndEdges layout:false', async () => {
      await getDomainNodesAndEdges({ id: 'Commerce', version: '1.0.0', mode: 'simple', layout: false } as any);
    });

    await time('domain getNodesAndEdges layout:true', async () => {
      await getDomainNodesAndEdges({ id: 'Commerce', version: '1.0.0', mode: 'simple', layout: true } as any);
    });

    await time('service getNodesAndEdges layout:true', async () => {
      await getServiceNodesAndEdges({ id: 'Service0', version: '1.0.0', mode: 'simple', layout: true });
    });
  }, 60_000);
});
