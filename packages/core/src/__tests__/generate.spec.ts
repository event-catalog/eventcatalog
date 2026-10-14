import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generate } from '../generate';

// A catalog whose package.json has no "type": "module", as a new catalog's doesn't
const createCatalog = async (generator: string) => {
  // The real path: on macOS the temp folder is under a symlink (/var is /private/var)
  const catalogDirectory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-generate-')));
  await fs.mkdir(path.join(catalogDirectory, 'openapi-files'));
  await fs.writeFile(path.join(catalogDirectory, 'openapi-files', 'product-api.yml'), 'openapi: 3.0.0');
  await fs.writeFile(path.join(catalogDirectory, 'package.json'), JSON.stringify({ name: 'catalog', private: true }));
  await fs.writeFile(
    path.join(catalogDirectory, 'eventcatalog.config.js'),
    `
      import path from 'node:path';
      import url from 'node:url';

      const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

      export default {
        generators: [['./generator.mjs', { path: path.join(__dirname, 'openapi-files', 'product-api.yml') }]],
      };
    `
  );
  await fs.writeFile(path.join(catalogDirectory, 'generator.mjs'), generator);
  return catalogDirectory;
};

describe('generate', () => {
  let catalogDirectory: string | undefined;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
    if (catalogDirectory) await fs.rm(catalogDirectory, { recursive: true, force: true });
    catalogDirectory = undefined;
  });

  it('gives generators paths in the catalog when the config builds them from its own location', async () => {
    catalogDirectory = await createCatalog(`
      import fs from 'node:fs';
      export default async (_config, options) => {
        if (!fs.existsSync(options.path)) throw new Error('File not found: ' + options.path);
        fs.writeFileSync(new URL('./generated.txt', import.meta.url), options.path);
      };
    `);

    await generate(catalogDirectory);

    const generatedFrom = await fs.readFile(path.join(catalogDirectory, 'generated.txt'), 'utf8');
    expect(generatedFrom).toBe(path.join(catalogDirectory, 'openapi-files', 'product-api.yml'));
    expect(process.exitCode).toBeUndefined();
  });

  it('fails the command when a generator fails', async () => {
    catalogDirectory = await createCatalog(`export default async () => { throw new Error('Could not read the spec'); };`);

    await generate(catalogDirectory);

    expect(process.exitCode).toBe(1);
  });
});
