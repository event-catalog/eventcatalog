import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { execFileSync, spawn, prepareCatalogRuntime } = vi.hoisted(() => ({
  execFileSync: vi.fn(),
  spawn: vi.fn(),
  prepareCatalogRuntime: vi.fn(),
}));

vi.mock('node:child_process', () => ({ execFileSync, spawn }));

const originalArgv = process.argv;
let repoRoot: string;
let scriptPath: string;
let runtimePath: string;
const runScript = () => import(scriptPath);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  // Run the unchanged script in a disposable package, with a resolvable runtime
  // stub. Package-scoped tests must not require or modify Core's build output.
  repoRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-check-types-')));
  const coreDirectory = path.join(repoRoot, 'packages/core');
  scriptPath = path.join(coreDirectory, 'scripts/check-types.js');
  runtimePath = path.join(coreDirectory, 'dist/catalog-runtime.js');
  for (const file of ['scripts/check-types.js', 'eventcatalog/integrations/runtime-paths.mjs']) {
    const destination = path.join(coreDirectory, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(new URL(`../../${file}`, import.meta.url), destination);
  }
  fs.writeFileSync(path.join(repoRoot, 'package.json'), JSON.stringify({ type: 'module' }));
  fs.mkdirSync(path.dirname(runtimePath), { recursive: true });
  fs.writeFileSync(runtimePath, 'export function prepareCatalogRuntime() { throw new Error("Runtime mock not applied"); }');
  vi.doMock(runtimePath, () => ({ prepareCatalogRuntime }));
  spawn.mockImplementation(() => {
    const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() });
    queueMicrotask(() => child.emit('close', 0));
    return child;
  });
});

afterEach(() => {
  process.argv = originalArgv;
  vi.doUnmock(runtimePath);
  fs.rmSync(repoRoot, { recursive: true, force: true });
});

describe('Core type-check script', () => {
  it('builds Core before preparing the runtime for a standalone check', async () => {
    process.argv = ['node', 'check-types.js'];
    await runScript();

    expect(execFileSync).toHaveBeenCalledWith(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['run', 'build:bin'], {
      cwd: path.join(repoRoot, 'packages/core'),
      stdio: 'inherit',
    });
    expect(execFileSync.mock.invocationCallOrder[0]).toBeLessThan(prepareCatalogRuntime.mock.invocationCallOrder[0]);
    expect(spawn).toHaveBeenCalledOnce();
  });

  it.each<[string[], string]>([
    [['--skip-build'], 'default'],
    [['--skip-build', 'ssr'], 'ssr'],
    [['ssr', '--skip-build'], 'ssr'],
  ])('reuses built outputs with arguments %j and still checks the selected catalog', async (args, catalog) => {
    process.argv = ['node', 'check-types.js', ...args];
    await runScript();

    expect(execFileSync).not.toHaveBeenCalled();
    expect(prepareCatalogRuntime).toHaveBeenCalledWith({
      projectDirectory: path.join(repoRoot, 'examples', catalog),
      catalogDirectory: path.join(repoRoot, 'examples', catalog, '.astro/eventcatalog'),
      packageDirectory: path.join(repoRoot, 'packages/core/eventcatalog'),
    });
    expect(spawn).toHaveBeenCalledOnce();
    expect(spawn.mock.calls[0][0]).toContain('astro check --minimumSeverity error');
    expect(spawn.mock.calls[0][1].env.PROJECT_DIR).toBe(path.join(repoRoot, 'examples', catalog));
  });

  it('stops when the standalone package build fails', async () => {
    process.argv = ['node', 'check-types.js'];
    execFileSync.mockImplementationOnce(() => {
      throw new Error('Package build failed');
    });

    await expect(runScript()).rejects.toThrow('Package build failed');
    expect(prepareCatalogRuntime).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });

  it('propagates type-check failures when reusing built outputs', async () => {
    process.argv = ['node', 'check-types.js', '--skip-build'];
    spawn.mockImplementationOnce(() => {
      const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() });
      queueMicrotask(() => child.emit('close', 1));
      return child;
    });

    await expect(runScript()).rejects.toThrow('Command failed with exit code 1');
  });
});
