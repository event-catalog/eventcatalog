import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import utils from '../index';

const BENCH_CATALOG = path.join(__dirname, 'catalog-benchmark');
const NUM_SEED_RESOURCES = 500;

function seedCatalog() {
  fs.mkdirSync(BENCH_CATALOG, { recursive: true });

  for (let i = 0; i < NUM_SEED_RESOURCES; i++) {
    const dir = path.join(BENCH_CATALOG, 'events', `SeedEvent${i}`);
    fs.mkdirSync(dir, { recursive: true });
    const content = `---\nid: SeedEvent${i}\nname: Seed Event ${i}\nversion: "1.0.0"\n---\n# Seed Event ${i}\n`;
    fs.writeFileSync(path.join(dir, 'index.mdx'), content);
  }

  for (let i = 0; i < 100; i++) {
    const dir = path.join(BENCH_CATALOG, 'services', `SeedService${i}`);
    fs.mkdirSync(dir, { recursive: true });
    const content = `---\nid: SeedService${i}\nname: Seed Service ${i}\nversion: "1.0.0"\n---\n# Seed Service ${i}\n`;
    fs.writeFileSync(path.join(dir, 'index.mdx'), content);
  }
}

describe('SDK Performance Benchmarks', () => {
  let sdk: ReturnType<typeof utils>;

  beforeAll(() => {
    fs.rmSync(BENCH_CATALOG, { recursive: true, force: true });
    seedCatalog();
    sdk = utils(BENCH_CATALOG);
  });

  afterAll(() => {
    fs.rmSync(BENCH_CATALOG, { recursive: true, force: true });
  });

  it('writeEvent x100 sequential', async () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      await sdk.writeEvent(
        {
          id: `BenchWriteEvent${i}`,
          name: `Bench Write Event ${i}`,
          version: '1.0.0',
          markdown: `# Bench ${i}`,
        },
        { override: true }
      );
    }
    const elapsed = performance.now() - start;
    const perOp = elapsed / 100;
    console.log(`  writeEvent x100: ${elapsed.toFixed(0)}ms total, ${perOp.toFixed(1)}ms/op`);
    expect(perOp).toBeLessThan(5000); // sanity check, not a target
  });

  it('getEvent x100 sequential (cache warm)', async () => {
    // Warm up - read one event first
    await sdk.getEvent('SeedEvent0');

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      await sdk.getEvent(`SeedEvent${i}`);
    }
    const elapsed = performance.now() - start;
    const perOp = elapsed / 100;
    console.log(`  getEvent x100: ${elapsed.toFixed(0)}ms total, ${perOp.toFixed(1)}ms/op`);
    expect(perOp).toBeLessThan(5000);
  });

  it('getEvent x100 sequential (cache cold)', async () => {
    // Force cold cache by recreating SDK instance
    const freshSdk = utils(BENCH_CATALOG);

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      await freshSdk.getEvent(`SeedEvent${i}`);
    }
    const elapsed = performance.now() - start;
    const perOp = elapsed / 100;
    console.log(`  getEvent x100 (cold): ${elapsed.toFixed(0)}ms total, ${perOp.toFixed(1)}ms/op`);
    expect(perOp).toBeLessThan(5000);
  });

  it('versionEvent + writeEvent x20 (version-then-write)', async () => {
    for (let i = 0; i < 20; i++) {
      await sdk.writeEvent(
        {
          id: `BenchVersionEvent${i}`,
          name: `Bench Version Event ${i}`,
          version: '1.0.0',
          markdown: `# V1`,
        },
        { override: true }
      );
    }

    const start = performance.now();
    for (let i = 0; i < 20; i++) {
      await sdk.writeEvent(
        {
          id: `BenchVersionEvent${i}`,
          name: `Bench Version Event ${i}`,
          version: '2.0.0',
          markdown: `# V2`,
        },
        { override: true, versionExistingContent: true }
      );
    }
    const elapsed = performance.now() - start;
    const perOp = elapsed / 20;
    console.log(`  version+write x20: ${elapsed.toFixed(0)}ms total, ${perOp.toFixed(1)}ms/op`);
    expect(perOp).toBeLessThan(10000);
  });

  it('rmEventById x50', async () => {
    // Write events to delete
    for (let i = 0; i < 50; i++) {
      await sdk.writeEvent(
        {
          id: `BenchRmEvent${i}`,
          name: `Bench Rm Event ${i}`,
          version: '1.0.0',
          markdown: `# Delete me`,
        },
        { override: true }
      );
    }

    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      await sdk.rmEventById(`BenchRmEvent${i}`);
    }
    const elapsed = performance.now() - start;
    const perOp = elapsed / 50;
    console.log(`  rmEventById x50: ${elapsed.toFixed(0)}ms total, ${perOp.toFixed(1)}ms/op`);
    expect(perOp).toBeLessThan(10000);
  });

  it('mixed read/write workload x50', async () => {
    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      await sdk.writeEvent(
        {
          id: `BenchMixedEvent${i}`,
          name: `Bench Mixed ${i}`,
          version: '1.0.0',
          markdown: `# Mixed ${i}`,
        },
        { override: true }
      );
      await sdk.getEvent(`SeedEvent${i}`);
    }
    const elapsed = performance.now() - start;
    const perOp = elapsed / 100; // 50 writes + 50 reads
    console.log(`  mixed read/write x100 ops: ${elapsed.toFixed(0)}ms total, ${perOp.toFixed(1)}ms/op`);
    expect(perOp).toBeLessThan(5000);
  });
});
