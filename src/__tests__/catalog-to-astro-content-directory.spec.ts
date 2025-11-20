import { catalogToAstro } from '../catalog-to-astro-content-directory';
import * as path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
// import * as fs from 'fs-extra';

const TMP_DIRECTORY = path.join(__dirname, 'tmp');
const ASTRO_OUTPUT = path.join(TMP_DIRECTORY);
const ASTRO_CONTENT_DIRECTORY = path.join(TMP_DIRECTORY, 'src', 'content');
// const OUTPUT_EXTERNAL_FILES = path.join(TMP_DIRECTORY, 'catalog-files');
const CATALOG_DIR = path.join(__dirname, 'example-catalog');

import { expect, describe, it, beforeAll, afterAll } from 'vitest';

describe('catalog-to-astro-content-directory', () => {
  beforeAll(async () => {
    await fs.mkdir(TMP_DIRECTORY, { recursive: true });
    await fs.mkdir(ASTRO_OUTPUT, { recursive: true });
    // create src/content inside astro directory
    await fs.mkdir(ASTRO_CONTENT_DIRECTORY, { recursive: true });
    await fs.writeFile(path.join(ASTRO_CONTENT_DIRECTORY, 'config.ts'), 'export const config = {};');

    // Convert the catalog
    await catalogToAstro(CATALOG_DIR, ASTRO_OUTPUT);
  });

  afterAll(async () => {
    await fs.rm(TMP_DIRECTORY, { recursive: true });
    // await fs.rm(path.join(__dirname, 'public'), { recursive: true });
    const defaultFile = await fs.readFile(path.join(CATALOG_DIR, 'eventcatalog.config.defaults.js'), 'utf8');
    await fs.writeFile(path.join(CATALOG_DIR, 'eventcatalog.config.js'), defaultFile);
  });

  describe('public directory', () => {
    it('copies schemas from an event folder into the public directory', async () => {
      expect(existsSync(path.join(ASTRO_OUTPUT, 'public', 'generated', 'events', 'OrderAmended', 'schema.json'))).toBe(true);
    });

    it('copies specification files from services into the public directory', async () => {
      expect(
        existsSync(path.join(ASTRO_OUTPUT, 'public', 'generated', 'services', 'ExternalPaymentService', 'asyncapi.yml'))
      ).toBe(true);
      expect(existsSync(path.join(ASTRO_OUTPUT, 'public', 'generated', 'services', 'PaymentService', 'openapi.yaml'))).toBe(true);
    });

    it('copies custom files from the public directory into the astro directory', async () => {
      expect(existsSync(path.join(ASTRO_OUTPUT, 'public', 'custom-file.txt'))).toBe(true);
    });
  });

  describe('eventcatalog.config.js', () => {
    it('copies the eventcatalog.config.js file into the astro directory', async () => {
      expect(existsSync(path.join(ASTRO_OUTPUT, 'eventcatalog.config.js'))).toBe(true);
    });
  });
});
