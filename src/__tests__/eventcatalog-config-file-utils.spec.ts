import * as path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const CATALOG_DIR = path.join(__dirname, 'example-catalog');

import { expect, describe, it } from 'vitest';
import {
  addPropertyToFrontMatter,
  getEventCatalogConfigFile,
  verifyRequiredFieldsAreInCatalogConfigFile,
  writeEventCatalogConfigFile,
} from '../eventcatalog-config-file-utils';
import { tmpdir } from 'os';

describe('catalog-to-astro-content-directory', () => {
  afterEach(async () => {
    const defaultFile = await fs.readFile(path.join(CATALOG_DIR, 'eventcatalog.config.defaults.js'), 'utf8');
    await fs.writeFile(path.join(CATALOG_DIR, 'eventcatalog.config.js'), defaultFile);
  });

  describe('getEventCatalogConfigFile', () => {
    it('returns the eventcatalog.config.js file from the catalog directory', async () => {
      const config = await getEventCatalogConfigFile(CATALOG_DIR);

      expect(config).toEqual(
        expect.objectContaining({
          title: 'OurLogix',
          tagline: 'A comprehensive logistics and shipping management company',
          organizationName: 'OurLogix',
          homepageLink: 'https://eventcatalog.dev/',
          landingPage: '',
          editUrl: 'https://github.com/boyney123/eventcatalog-demo/edit/master',
          trailingSlash: false,
          base: '/company',
          logo: {
            alt: 'EventCatalog Logo',
            src: '/logo.png',
            text: 'OurLogix',
          },
          docs: {
            sidebar: {
              showPageHeadings: true,
            },
          },
          generators: [
            [
              '@eventcatalog/generator-asyncapi',
              {
                services: [
                  {
                    path: expect.any(String),
                  },
                  {
                    path: expect.any(String),
                  },
                  {
                    path: expect.any(String),
                  },
                ],
                domain: {
                  id: 'orders',
                  name: 'Orders',
                  version: '0.0.1',
                },
              },
            ],
            [
              '@eventcatalog/generator-asyncapi',
              {
                services: [
                  {
                    path: expect.any(String),
                  },
                  {
                    path: expect.any(String),
                  },
                ],
                domain: {
                  id: 'payment',
                  name: 'Payment',
                  version: '0.0.1',
                },
              },
            ],
            [
              '@eventcatalog/generator-asyncapi',
              {
                services: [
                  {
                    path: expect.any(String),
                  },
                ],
                domain: {
                  id: 'users',
                  name: 'User',
                  version: '0.0.1',
                },
                debug: true,
              },
            ],
          ],
        })
      );
    });
    it('removes eventcatalog config from the tmpdir', async () => {
      await getEventCatalogConfigFile(CATALOG_DIR);

      const configFile = path.join(tmpdir(), 'eventcatalog.config.mjs');
      expect(existsSync(configFile)).toBe(false);
    });
  });

  describe('writeEventCatalogConfigFile', () => {
    it('takes given configuration and writes it to the eventcatalog.config.js file', async () => {
      // const file = await fs.readFile(path.join(CATALOG_DIR, 'eventcatalog.config.js'), 'utf8');

      const propertiesToAdd = { extraProperty: 'testing' };
      await writeEventCatalogConfigFile(CATALOG_DIR, propertiesToAdd);

      // Have to read the file as we have import caching....
      const fileWithChanges = await fs.readFile(path.join(CATALOG_DIR, 'eventcatalog.config.js'), 'utf8');
      expect(fileWithChanges).contains("extraProperty: 'testing'");
    });

    it('when writing to the eventcatalog.config.js file, all imports are left untouched', async () => {
      const propertiesToAdd = { extraProperty: 'testing' };
      await writeEventCatalogConfigFile(CATALOG_DIR, propertiesToAdd);

      const file = await fs.readFile(path.join(CATALOG_DIR, 'eventcatalog.config.js'), 'utf8');

      expect(file).toContain("import path from 'path';");
      expect(file).toContain("import url from 'url';");
      expect(file).toContain('const __dirname = path.dirname(url.fileURLToPath(import.meta.url));');
    });
  });

  describe('verifyRequiredFieldsAreInCatalogConfigFile', () => {
    it('if cId (catalog id) is not in the config file it is added', async () => {
      // Verify its not there first
      const config = await getEventCatalogConfigFile(CATALOG_DIR);
      expect(config.cId).toBeUndefined();

      await verifyRequiredFieldsAreInCatalogConfigFile(CATALOG_DIR);

      // Have to read the file as we have import caching....
      const file = await fs.readFile(path.join(CATALOG_DIR, 'eventcatalog.config.js'), 'utf8');

      // cId: '2aa9384e-b0f3-4ea3-a6e0-97188f4027cb' expect this to be there, but the uiid dan be anything
      expect(file).toContain("cId: '");
    });
  });

  describe('addPropertyToFrontMatter', () => {
    it('should support content containing ----', async () => {
      const result = addPropertyToFrontMatter('---\nfront: matter\n---hello\n---\nworld', 'foo', 'bar');

      expect(result).toBe('---\nfront: matter\nfoo: bar\n---\nhello\n---\nworld\n');
    });
  });
});
