import { EventEmitter } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { execFileSync, spawn, prepareCatalogRuntime } = vi.hoisted(() => ({
  execFileSync: vi.fn(),
  spawn: vi.fn(),
  prepareCatalogRuntime: vi.fn(),
}));

vi.mock('node:child_process', () => ({ execFileSync, spawn }));
vi.mock('../../dist/catalog-runtime.js', () => ({ prepareCatalogRuntime }));

const originalArgv = process.argv;
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  spawn.mockImplementation(() => {
    const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() });
    queueMicrotask(() => child.emit('close', 0));
    return child;
  });
});

afterEach(() => {
  process.argv = originalArgv;
});

describe('Core type-check script', () => {
  it('builds Core before preparing the runtime for a standalone check', async () => {
    process.argv = ['node', 'check-types.js'];
    await import('../../scripts/check-types.js');

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
    await import('../../scripts/check-types.js');

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

    await expect(import('../../scripts/check-types.js')).rejects.toThrow('Package build failed');
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

    await expect(import('../../scripts/check-types.js')).rejects.toThrow('Command failed with exit code 1');
  });
});
