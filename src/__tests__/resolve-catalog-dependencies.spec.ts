import resolveCatalogDependencies from '../resolve-catalog-dependencies';
import * as path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
// import * as fs from 'fs-extra';

const TMP_DIRECTORY = path.join(__dirname, 'tmp');
const ASTRO_OUTPUT = path.join(TMP_DIRECTORY);
const ASTRO_CONTENT_DIRECTORY = path.join(TMP_DIRECTORY, 'src', 'content');
// const OUTPUT_EXTERNAL_FILES = path.join(TMP_DIRECTORY, 'catalog-files');
const CATALOG_DIR = path.join(__dirname, 'example-catalog-dependencies');

import { expect, describe, it, beforeAll, afterAll } from 'vitest';

describe('resolve-catalog-dependencies', () => {
  beforeAll(async () => {
    await fs.mkdir(TMP_DIRECTORY, { recursive: true });
    await fs.mkdir(ASTRO_OUTPUT, { recursive: true });
    // create src/content inside astro directory
    await fs.mkdir(ASTRO_CONTENT_DIRECTORY, { recursive: true });
    await fs.writeFile(path.join(ASTRO_CONTENT_DIRECTORY, 'config.ts'), 'export const config = {};');
  });

  afterAll(async () => {
    await fs.rm(TMP_DIRECTORY, { recursive: true });
  });

  describe('dependencies', () => {
    it('if the dependencies are set in the catalog config, it creates a dependencies directory', async () => {
      await resolveCatalogDependencies(CATALOG_DIR, ASTRO_OUTPUT);
      expect(existsSync(path.join(CATALOG_DIR, 'dependencies'))).toBe(true);
    });

    describe('events', () => {
      it('creates a dependency file for each event', async () => {
        const content = await fs.readFile(
          path.join(CATALOG_DIR, 'dependencies', 'events', 'TestingEventOrder', 'index.md'),
          'utf8'
        );
        expect(content).toContain('id: TestingEventOrder');
        expect(content).toContain('name: TestingEventOrder');
        expect(content).toContain('version: 5.0.0');
      });
    });

    describe('services', () => {
      it('creates a dependency file for each service', async () => {
        const content = await fs.readFile(
          path.join(CATALOG_DIR, 'dependencies', 'services', 'TestingServiceOrder', 'index.md'),
          'utf8'
        );
        expect(content).toContain('id: TestingServiceOrder');
        expect(content).toContain('name: TestingServiceOrder');
        expect(content).toContain('version: 5.0.0');
      });
    });

    describe('domains', () => {
      it('creates a dependency file for each domain', async () => {
        const content = await fs.readFile(
          path.join(CATALOG_DIR, 'dependencies', 'domains', 'TestingDomainOrder', 'index.md'),
          'utf8'
        );
        expect(content).toContain('id: TestingDomainOrder');
        expect(content).toContain('name: TestingDomainOrder');
        expect(content).toContain('version: 5.0.0');
      });
    });

    describe('commands', () => {
      it('creates a dependency file for each command', async () => {
        const content = await fs.readFile(
          path.join(CATALOG_DIR, 'dependencies', 'commands', 'TestingCommandOrder', 'index.md'),
          'utf8'
        );
        expect(content).toContain('id: TestingCommandOrder');
        expect(content).toContain('name: TestingCommandOrder');
        expect(content).toContain('version: 5.0.0');
      });
    });

    describe('queries', () => {
      it('creates a dependency file for each query', async () => {
        const content = await fs.readFile(
          path.join(CATALOG_DIR, 'dependencies', 'queries', 'TestingQueryOrder', 'index.md'),
          'utf8'
        );
        expect(content).toContain('id: TestingQueryOrder');
        expect(content).toContain('name: TestingQueryOrder');
        expect(content).toContain('version: 5.0.0');
      });
    });

    describe('channels', () => {
      it('creates a dependency file for each channel', async () => {
        const content = await fs.readFile(
          path.join(CATALOG_DIR, 'dependencies', 'channels', 'TestingChannelOrder', 'index.md'),
          'utf8'
        );
        expect(content).toContain('id: TestingChannelOrder');
        expect(content).toContain('name: TestingChannelOrder');
        expect(content).toContain('version: 5.0.0');
      });

      it('creates a dependency file for parameterized channels', async () => {
        const content = await fs.readFile(
          path.join(CATALOG_DIR, 'dependencies', 'channels', '{env}.testing.channel.order', 'index.md'),
          'utf8'
        );
        expect(content).toContain(`id: '{env}.testing.channel.order'`);
        expect(content).toContain(`name: '{env}.testing.channel.order'`);
        expect(content).toContain('version: 5.0.0');
      });
    });
  });
});
