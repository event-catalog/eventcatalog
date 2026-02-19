const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { spawnSync } = require('node:child_process');

const PACKAGE_ROOT = path.resolve(__dirname, '../../..');
const CLI_ENTRY = path.join(PACKAGE_ROOT, 'dist', 'cli', 'index.js');

function envInt(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid ${name} value '${raw}'. Must be a positive integer.`);
  }
  return value;
}

const ITERATIONS = envInt('BENCH_ITERATIONS', 5);
const SERVICES = envInt('BENCH_SERVICES', 60);
const EVENTS_PER_SERVICE = envInt('BENCH_EVENTS_PER_SERVICE', 2);
const WARMUP_RUNS = envInt('BENCH_WARMUP_RUNS', 1);

function runCli(args) {
  const result = spawnSync('node', [CLI_ENTRY, ...args], {
    cwd: PACKAGE_ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 50 * 1024 * 1024,
  });

  if (result.status !== 0) {
    const stderr = result.stderr || '';
    const stdout = result.stdout || '';
    throw new Error(`Command failed: node ${CLI_ENTRY} ${args.join(' ')}\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  }

  return result.stdout;
}

function makeDataset(services, eventsPerService) {
  const blocks = [];
  const totalEvents = services * eventsPerService;

  for (let i = 1; i <= totalEvents; i += 1) {
    blocks.push(`event Event${i} {\n  version 1.0.0\n  name "Event ${i}"\n}`);
  }

  for (let i = 1; i <= services; i += 1) {
    const refs = [];
    for (let j = 0; j < eventsPerService; j += 1) {
      const eventId = (i - 1) * eventsPerService + j + 1;
      refs.push(`  sends event Event${eventId}@1.0.0`);
    }
    blocks.push(`service Service${i} {\n  version 1.0.0\n  name "Service ${i}"\n${refs.join('\n')}\n}`);
  }

  return blocks.join('\n\n');
}

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p95 = sorted[Math.floor((sorted.length - 1) * 0.95)];
  return { mean, median, min, max, p95 };
}

function fmt(n) {
  return `${n.toFixed(1)}ms`;
}

function runIteration(dsl) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-cli-bench-'));
  const catalogDir = path.join(tmpRoot, 'catalog');
  const inputFile = path.join(tmpRoot, 'catalog.ec');
  fs.mkdirSync(catalogDir, { recursive: true });
  fs.writeFileSync(inputFile, dsl, 'utf8');

  const tImportStart = performance.now();
  runCli(['import', inputFile, '--no-init', '-d', catalogDir]);
  const tImportEnd = performance.now();

  const tExportStart = performance.now();
  const exported = runCli(['export', '--all', '--stdout', '-d', catalogDir]);
  const tExportEnd = performance.now();

  fs.rmSync(tmpRoot, { recursive: true, force: true });

  return {
    importMs: tImportEnd - tImportStart,
    exportMs: tExportEnd - tExportStart,
    exportBytes: Buffer.byteLength(exported, 'utf8'),
  };
}

function main() {
  if (!fs.existsSync(CLI_ENTRY)) {
    throw new Error(`Missing ${CLI_ENTRY}. Run 'pnpm --filter @eventcatalog/cli build' first.`);
  }

  const dsl = makeDataset(SERVICES, EVENTS_PER_SERVICE);
  const events = SERVICES * EVENTS_PER_SERVICE;

  console.log('EventCatalog CLI Benchmark');
  console.log(`- Iterations: ${ITERATIONS}`);
  console.log(`- Warmup Runs: ${WARMUP_RUNS}`);
  console.log(`- Services: ${SERVICES}`);
  console.log(`- Events: ${events}`);
  console.log(`- Events per service: ${EVENTS_PER_SERVICE}`);
  console.log('');

  for (let i = 0; i < WARMUP_RUNS; i += 1) {
    runIteration(dsl);
  }

  const importSamples = [];
  const exportSamples = [];
  let bytes = 0;

  for (let i = 1; i <= ITERATIONS; i += 1) {
    const { importMs, exportMs, exportBytes } = runIteration(dsl);
    importSamples.push(importMs);
    exportSamples.push(exportMs);
    bytes = exportBytes;
    console.log(`run ${i}: import=${fmt(importMs)} export=${fmt(exportMs)}`);
  }

  const importStats = stats(importSamples);
  const exportStats = stats(exportSamples);

  console.log('');
  console.log('Summary');
  console.log(`- Import mean/median: ${fmt(importStats.mean)} / ${fmt(importStats.median)}`);
  console.log(`- Import min/max/p95: ${fmt(importStats.min)} / ${fmt(importStats.max)} / ${fmt(importStats.p95)}`);
  console.log(`- Export mean/median: ${fmt(exportStats.mean)} / ${fmt(exportStats.median)}`);
  console.log(`- Export min/max/p95: ${fmt(exportStats.min)} / ${fmt(exportStats.max)} / ${fmt(exportStats.p95)}`);
  console.log(`- Export output size: ${bytes} bytes`);
}

main();
