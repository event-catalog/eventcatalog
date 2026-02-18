import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importDSL, initCatalog } from '../../cli/import';
import createSDK from '@eventcatalog/sdk';
import { createCatalogHelper } from './helpers';
import fs from 'node:fs';
import path from 'node:path';

const { catalogPath, setup, writeEcFile } = createCatalogHelper('init');
setup();

describe('catalog initialization', () => {
  describe('initCatalog', () => {
    it('creates package.json with correct dependencies and scripts', () => {
      initCatalog(catalogPath);

      const pkg = JSON.parse(fs.readFileSync(path.join(catalogPath, 'package.json'), 'utf-8'));
      expect(pkg.dependencies['@eventcatalog/core']).toBe('latest');
      expect(pkg.dependencies['@eventcatalog/linter']).toBe('latest');
      expect(pkg.scripts.dev).toBe('eventcatalog dev');
      expect(pkg.scripts.build).toBe('eventcatalog build');
      expect(pkg.scripts.start).toBe('eventcatalog start');
      expect(pkg.scripts.preview).toBe('eventcatalog preview');
      expect(pkg.scripts.generate).toBe('eventcatalog generate');
      expect(pkg.scripts.lint).toBe('eventcatalog-linter');
    });

    it('creates eventcatalog.config.js with a valid cId', () => {
      initCatalog(catalogPath);

      const config = fs.readFileSync(path.join(catalogPath, 'eventcatalog.config.js'), 'utf-8');
      expect(config).toContain('organizationName');
      expect(config).toContain('My Organization');
      // cId should be a UUID
      const match = config.match(/cId:\s*'([^']+)'/);
      expect(match).toBeTruthy();
      expect(match![1]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('uses custom organization name when provided', () => {
      initCatalog(catalogPath, 'Acme Corp');

      const config = fs.readFileSync(path.join(catalogPath, 'eventcatalog.config.js'), 'utf-8');
      expect(config).toContain("organizationName: 'Acme Corp'");
    });

    it('creates .gitignore', () => {
      initCatalog(catalogPath);
      expect(fs.existsSync(path.join(catalogPath, '.gitignore'))).toBe(true);
      const content = fs.readFileSync(path.join(catalogPath, '.gitignore'), 'utf-8');
      expect(content).toContain('node_modules');
    });

    it('creates .env', () => {
      initCatalog(catalogPath);
      expect(fs.existsSync(path.join(catalogPath, '.env'))).toBe(true);
    });

    it('creates .npmrc', () => {
      initCatalog(catalogPath);
      const content = fs.readFileSync(path.join(catalogPath, '.npmrc'), 'utf-8');
      expect(content).toContain('strict-peer-dependencies=false');
    });

    it('creates public/logo.png', () => {
      initCatalog(catalogPath);
      const logoPath = path.join(catalogPath, 'public', 'logo.png');
      expect(fs.existsSync(logoPath)).toBe(true);
      // Should be a valid PNG (starts with PNG magic bytes)
      const buf = fs.readFileSync(logoPath);
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50); // P
      expect(buf[2]).toBe(0x4e); // N
      expect(buf[3]).toBe(0x47); // G
    });
  });

  describe('importDSL with init', () => {
    it('skips scaffolding when noInit is true', async () => {
      const ecFile = writeEcFile(
        'test.ec',
        `event OrderCreated {
  version 1.0.0
  name "Order Created"
}`
      );

      await importDSL({
        files: [ecFile],
        noInit: true,
        dir: catalogPath,
      });

      // Should NOT have created config (noInit skips it)
      expect(fs.existsSync(path.join(catalogPath, 'eventcatalog.config.js'))).toBe(false);
    });

    it('skips scaffolding when eventcatalog.config.js already exists', async () => {
      // Pre-create a config file
      fs.writeFileSync(path.join(catalogPath, 'eventcatalog.config.js'), 'export default {};', 'utf-8');

      const ecFile = writeEcFile(
        'test.ec',
        `event OrderCreated {
  version 1.0.0
  name "Order Created"
}`
      );

      await importDSL({
        files: [ecFile],
        dir: catalogPath,
      });

      // Config should still be the original one (not overwritten)
      const config = fs.readFileSync(path.join(catalogPath, 'eventcatalog.config.js'), 'utf-8');
      expect(config).toBe('export default {};');
    });

    it('imports resources into a scaffolded catalog when init runs', async () => {
      // Scaffold first, then import
      initCatalog(catalogPath);

      const ecFile = writeEcFile(
        'test.ec',
        `event OrderCreated {
  version 1.0.0
  name "Order Created"
}

service OrderService {
  version 1.0.0
  name "Order Service"
  sends event OrderCreated@1.0.0
}`
      );

      const result = await importDSL({
        files: [ecFile],
        noInit: true,
        dir: catalogPath,
      });

      expect(result).toContain('Created 2 resource(s)');

      const sdk = createSDK(catalogPath);
      expect(await sdk.getEvent('OrderCreated', '1.0.0')).toBeDefined();
      expect(await sdk.getService('OrderService', '1.0.0')).toBeDefined();
    });

    it('creates unique cId on each init', () => {
      initCatalog(catalogPath);
      const config1 = fs.readFileSync(path.join(catalogPath, 'eventcatalog.config.js'), 'utf-8');
      const cId1 = config1.match(/cId:\s*'([^']+)'/)![1];

      // Re-init to get a different cId
      initCatalog(catalogPath);
      const config2 = fs.readFileSync(path.join(catalogPath, 'eventcatalog.config.js'), 'utf-8');
      const cId2 = config2.match(/cId:\s*'([^']+)'/)![1];

      expect(cId1).not.toBe(cId2);
    });
  });
});
