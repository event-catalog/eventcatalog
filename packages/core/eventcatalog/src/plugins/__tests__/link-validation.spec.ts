import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { linkValidation } from '../link-validation';
import type { LinkValidationOptions } from '../../utils/link-validation';

let outDir: string;
beforeEach(async () => {
  outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-link-integration-'));
  await fs.writeFile(path.join(outDir, 'index.html'), '<a href="/missing">Missing</a><a href="#absent">Anchor</a>');
});
afterEach(async () => {
  await fs.rm(outDir, { recursive: true, force: true });
});

const runIntegration = async (options?: LinkValidationOptions | false, server = false) => {
  const integration = linkValidation(options);
  const logger = { info: vi.fn(), warn: vi.fn() };
  await integration.hooks['astro:config:done']!({
    config: { base: '/', build: { format: 'directory' } },
    buildOutput: server ? 'server' : 'static',
  } as any);
  const run = () => integration.hooks['astro:build:done']!({ dir: pathToFileURL(`${outDir}/`), logger } as any);
  return { run, logger };
};

describe('link validation integration', () => {
  it('warns by default without failing the build', async () => {
    const { run, logger } = await runIntegration();
    await expect(run()).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledOnce();
    expect(logger.warn.mock.calls[0][0]).toContain('Broken link: /missing');
    expect(logger.warn.mock.calls[0][0]).toContain('Broken anchor: /#absent');
    expect(logger.info.mock.calls[0][0]).toMatch(/^Checked links in 1 HTML page\(s\) in /);
  });

  it('fails the build for error-level links while reporting warning-level anchors separately', async () => {
    const { run, logger } = await runIntegration({ onBrokenLinks: 'error' });
    await expect(run()).rejects.toThrow(
      'Link validation failed.\nFound 1 broken link/anchor destination(s) in 1 page reference(s).\n\nBroken link: /missing\n  From: /'
    );
    expect(logger.warn.mock.calls[0][0]).toContain('Broken anchor: /#absent');
    expect(logger.warn.mock.calls[0][0]).not.toContain('/missing');
  });

  it('can fail only on broken anchors', async () => {
    const { run, logger } = await runIntegration({ onBrokenLinks: 'ignore', onBrokenAnchors: 'error' });
    await expect(run()).rejects.toThrow('Broken anchor: /#absent');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each([false, { onBrokenLinks: 'ignore', onBrokenAnchors: 'ignore' }] as const)(
    'does no work when disabled with %j',
    async (options) => {
      const { run, logger } = await runIntegration(options);
      await run();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    }
  );

  it('explicitly skips server output instead of reporting dynamic routes as missing files', async () => {
    const { run, logger } = await runIntegration({ onBrokenLinks: 'error' }, true);
    await expect(run()).resolves.toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Link validation skipped: only static catalog builds are supported.');
  });
});
