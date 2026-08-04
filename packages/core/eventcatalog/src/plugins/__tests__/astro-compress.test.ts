import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadAstroCompressIntegration } from '../astro-compress';

const testProjectDirectory = path.join(__dirname, 'tmp-astro-compress');

describe('loadAstroCompressIntegration', () => {
  beforeEach(async () => {
    await fs.mkdir(testProjectDirectory, { recursive: true });
    await fs.writeFile(path.join(testProjectDirectory, 'package.json'), '{}');
  });

  afterEach(async () => {
    await fs.rm(testProjectDirectory, { recursive: true, force: true });
  });

  it('loads astro-compress from the EventCatalog project', async () => {
    const packageDirectory = path.join(testProjectDirectory, 'node_modules', 'astro-compress');
    await fs.mkdir(packageDirectory, { recursive: true });
    await fs.writeFile(
      path.join(packageDirectory, 'package.json'),
      JSON.stringify({ name: 'astro-compress', type: 'module', exports: './index.js' })
    );
    await fs.writeFile(
      path.join(packageDirectory, 'index.js'),
      `export default (options) => ({ name: 'astro-compress-test', options });`
    );

    const integration = (await loadAstroCompressIntegration(testProjectDirectory)) as unknown as {
      name: string;
      options: { Logger: number; CSS: boolean };
    };

    expect(integration).toEqual({
      name: 'astro-compress-test',
      options: {
        Logger: 0,
        CSS: false,
      },
    });
  });

  it('explains how to install astro-compress when it is missing', async () => {
    await expect(loadAstroCompressIntegration(testProjectDirectory)).rejects.toThrow(
      `Compression is enabled, but astro-compress is not installed.

Install it in your EventCatalog project:

  npm install --save-dev astro-compress`
    );
  });
});
