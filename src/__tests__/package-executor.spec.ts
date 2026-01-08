import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detect } from 'package-manager-detector';
import { getPackageExecutor } from '../utils/package-executor';

vi.mock('package-manager-detector', () => ({
  detect: vi.fn(),
}));

describe('getPackageExecutor', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.EVENTCATALOG_PACKAGE_EXECUTOR;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetAllMocks();
  });

  it('returns npx when npm is detected', async () => {
    vi.mocked(detect).mockResolvedValue({ name: 'npm', agent: 'npm' });
    const result = await getPackageExecutor();
    expect(result).toBe('npx');
  });

  it('returns yarn dlx when yarn is detected', async () => {
    vi.mocked(detect).mockResolvedValue({ name: 'yarn', agent: 'yarn' });
    const result = await getPackageExecutor();
    expect(result).toBe('yarn dlx');
  });

  it('returns pnpm dlx when pnpm is detected', async () => {
    vi.mocked(detect).mockResolvedValue({ name: 'pnpm', agent: 'pnpm' });
    const result = await getPackageExecutor();
    expect(result).toBe('pnpm dlx');
  });

  it('returns bunx when bun is detected', async () => {
    vi.mocked(detect).mockResolvedValue({ name: 'bun', agent: 'bun' });
    const result = await getPackageExecutor();
    expect(result).toBe('bunx');
  });

  it('returns npx when no package manager is detected', async () => {
    vi.mocked(detect).mockResolvedValue(null);
    const result = await getPackageExecutor();
    expect(result).toBe('npx');
  });

  it('returns npx when detect returns undefined name', async () => {
    vi.mocked(detect).mockResolvedValue({ name: undefined, agent: 'unknown' } as any);
    const result = await getPackageExecutor();
    expect(result).toBe('npx');
  });

  it('respects EVENTCATALOG_PACKAGE_EXECUTOR env var override', async () => {
    process.env.EVENTCATALOG_PACKAGE_EXECUTOR = 'custom-executor';
    vi.mocked(detect).mockResolvedValue({ name: 'npm', agent: 'npm' });
    const result = await getPackageExecutor();
    expect(result).toBe('custom-executor');
    // detect should not be called when env var is set
    expect(detect).not.toHaveBeenCalled();
  });

  it('prioritizes env var over detected package manager', async () => {
    process.env.EVENTCATALOG_PACKAGE_EXECUTOR = 'bunx';
    vi.mocked(detect).mockResolvedValue({ name: 'npm', agent: 'npm' });
    const result = await getPackageExecutor();
    expect(result).toBe('bunx');
  });

  it('returns npx for unknown package manager names', async () => {
    vi.mocked(detect).mockResolvedValue({ name: 'unknown-pm', agent: 'unknown' } as any);
    const result = await getPackageExecutor();
    expect(result).toBe('npx');
  });
});
