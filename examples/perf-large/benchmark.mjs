#!/usr/bin/env node
/**
 * Build the synthetic perf-large catalog and report wall-clock, peak RSS, and HTML sizes.
 *
 * Usage (from repo root):
 *   node examples/perf-large/benchmark.mjs
 *   node examples/perf-large/benchmark.mjs --label before
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const projectDir = __dirname;
const catalogDir = path.join(repoRoot, 'packages/core/eventcatalog');
const cliEntry = path.join(repoRoot, 'packages/core/bin/eventcatalog.js');
const distDir = path.join(projectDir, 'dist');

const args = process.argv.slice(2);
const label = args.includes('--label') ? args[args.indexOf('--label') + 1] : 'run';
const skipGenerate = args.includes('--skip-generate');
const skipBuild = args.includes('--skip-build');

const formatBytes = (bytes) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const readRssKb = (pid) => {
  try {
    const status = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
    const match = status.match(/VmRSS:\s+(\d+)\s+kB/);
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
};

const collectDescendantPids = (rootPid) => {
  const pids = new Set([rootPid]);
  try {
    const children = fs.readFileSync(`/proc/${rootPid}/task/${rootPid}/children`, 'utf8').trim();
    for (const child of children.split(/\s+/).filter(Boolean)) {
      const childPid = Number(child);
      if (!Number.isNaN(childPid)) {
        for (const descendant of collectDescendantPids(childPid)) {
          pids.add(descendant);
        }
      }
    }
  } catch {
    // process exited
  }
  return [...pids];
};

const run = (command, commandArgs, { env = {}, cwd = repoRoot } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['inherit', 'inherit', 'inherit'],
    });

    let peakRssKb = readRssKb(child.pid);
    const sampler = setInterval(() => {
      let treeRss = 0;
      for (const pid of collectDescendantPids(child.pid)) {
        treeRss += readRssKb(pid);
      }
      if (treeRss > peakRssKb) peakRssKb = treeRss;
    }, 250);

    const started = Date.now();
    child.on('error', (error) => {
      clearInterval(sampler);
      reject(error);
    });
    child.on('close', (code) => {
      clearInterval(sampler);
      if (code === 0) {
        resolve({ seconds: (Date.now() - started) / 1000, peakRssMb: peakRssKb / 1024 });
        return;
      }
      reject(new Error(`${command} ${commandArgs.join(' ')} exited with ${code}`));
    });
  });

const walkFiles = (dir, suffix, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, suffix, out);
    else if (entry.name.endsWith(suffix)) out.push(full);
  }
  return out;
};

const analyzeHtml = () => {
  const htmlFiles = walkFiles(distDir, '.html');
  const rows = htmlFiles.map((file) => ({
    file: path.relative(distDir, file),
    bytes: fs.statSync(file).size,
  }));
  rows.sort((a, b) => b.bytes - a.bytes);

  const sum = (predicate) => rows.filter((row) => predicate(row.file)).reduce((total, row) => total + row.bytes, 0);
  const count = (predicate) => rows.filter((row) => predicate(row.file)).length;

  const worst = rows.slice(0, 12);
  const totals = {
    htmlFiles: rows.length,
    htmlBytes: rows.reduce((total, row) => total + row.bytes, 0),
    docsDomainBytes: sum((file) => file.startsWith('docs/domains/')),
    docsServiceBytes: sum((file) => file.startsWith('docs/services/')),
    docsEventBytes: sum((file) => file.startsWith('docs/events/')),
    visualiserDomainBytes: sum((file) => file.startsWith('visualiser/domains/')),
    discoverBytes: sum((file) => file.startsWith('discover/')),
    docsDomainPages: count((file) => file.startsWith('docs/domains/') && file.endsWith('/index.html')),
    docsEventPages: count((file) => file.startsWith('docs/events/') && file.endsWith('/index.html')),
  };

  return { worst, totals };
};

const main = async () => {
  if (!skipGenerate) {
    await run(process.execPath, [path.join(__dirname, 'generate.mjs')], { cwd: repoRoot });
  }

  let build = { seconds: null, peakRssMb: null };
  if (!skipBuild) {
    if (!fs.existsSync(cliEntry)) {
      throw new Error(`CLI not built. Run pnpm --filter @eventcatalog/core run build:bin first.`);
    }
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true });
    }
    build = await run(process.execPath, [cliEntry, 'build'], {
      env: {
        NODE_ENV: 'production',
        PROJECT_DIR: projectDir,
        CATALOG_DIR: catalogDir,
        IGNORE_BUILD_ARTIFACTS: 'true',
        NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=8192',
      },
    });
  }

  const html = analyzeHtml();
  const report = {
    label,
    generatedAt: new Date().toISOString(),
    buildSeconds: build.seconds,
    peakRssMb: build.peakRssMb === null ? null : Number(build.peakRssMb.toFixed(1)),
    ...html.totals,
    worstPages: html.worst,
  };

  const reportPath = path.join(__dirname, `benchmark-${label}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');

  console.log('\n=== EventCatalog perf-large benchmark ===');
  console.log(`label:            ${label}`);
  console.log(`build time:       ${report.buildSeconds === null ? 'n/a' : `${report.buildSeconds.toFixed(1)}s`}`);
  console.log(`peak RSS:         ${report.peakRssMb === null ? 'n/a' : `${report.peakRssMb.toFixed(1)} MB`}`);
  console.log(`HTML files:       ${report.htmlFiles}`);
  console.log(`HTML total:       ${formatBytes(report.htmlBytes)}`);
  console.log(`docs/domains:     ${formatBytes(report.docsDomainBytes)}`);
  console.log(`docs/services:    ${formatBytes(report.docsServiceBytes)}`);
  console.log(`docs/events:      ${formatBytes(report.docsEventBytes)}`);
  console.log(`visualiser/domains: ${formatBytes(report.visualiserDomainBytes)}`);
  console.log(`discover:         ${formatBytes(report.discoverBytes)}`);
  console.log('\nWorst HTML pages:');
  for (const page of report.worstPages) {
    console.log(`  ${formatBytes(page.bytes).padStart(10)}  ${page.file}`);
  }
  console.log(`\nWrote ${path.relative(repoRoot, reportPath)}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
