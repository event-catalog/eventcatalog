import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogModuleUrl, importCatalogModule } from '@utils/catalog-modules';

describe('catalog modules', () => {
  let catalogDirectory: string;

  beforeEach(async () => {
    catalogDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-catalog-modules-'));
  });

  afterEach(async () => {
    await fs.rm(catalogDirectory, { recursive: true, force: true });
  });

  it('gives the file:// URL of a file in the catalog, which Node can import on every platform', () => {
    const url = catalogModuleUrl('eventcatalog.auth.js', catalogDirectory);

    expect(url.startsWith('file:///')).toBe(true);
    expect(fileURLToPath(url)).toBe(path.join(catalogDirectory, 'eventcatalog.auth.js'));
  });

  it('imports a module from the catalog', async () => {
    await fs.writeFile(path.join(catalogDirectory, 'eventcatalog.auth.js'), `export default { providers: { github: {} } };`);

    const config = await importCatalogModule('eventcatalog.auth.js', catalogDirectory);

    expect(config.default).toEqual({ providers: { github: {} } });
  });

  it('imports a file in a folder of the catalog', async () => {
    await fs.mkdir(path.join(catalogDirectory, 'auth'));
    await fs.writeFile(path.join(catalogDirectory, 'auth', 'custom.js'), `export default { trustHost: true };`);

    const config = await importCatalogModule('auth/custom.js', catalogDirectory);

    expect(config.default).toEqual({ trustHost: true });
  });

  it('rejects when the file does not exist', async () => {
    await expect(importCatalogModule('eventcatalog.chat.js', catalogDirectory)).rejects.toThrow();
  });
});
