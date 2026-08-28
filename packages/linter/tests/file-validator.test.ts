import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pathToFileURL } from 'url';
import {
  extractFileReferences,
  validateFileReferencesForFile,
  validateFileReferences,
  getCatalogRoot,
  FILE_EXISTS_RULE,
} from '../src/validators/file-validator';
import { validateCatalog } from '../src/validators';
import { ParsedFile } from '../src/parser';
import { DEFAULT_RULES, LinterConfig } from '../src/config';

describe('file-validator', () => {
  let rootDir: string;

  const write = (relativePath: string, content = '{}') => {
    const fullPath = path.join(rootDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  };

  const createParsedFile = (relativePath: string, resourceType: any, frontmatter: Record<string, unknown>): ParsedFile => {
    const resourceId = path.basename(path.dirname(relativePath));
    write(relativePath, '---\n---\n');
    return {
      file: { path: path.join(rootDir, relativePath), relativePath, resourceType, resourceId },
      frontmatter: { id: resourceId, name: resourceId, version: '1.0.0', ...frontmatter },
      content: '',
      raw: '',
    };
  };

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-file-test-'));
  });

  afterEach(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  describe('getCatalogRoot', () => {
    it('derives the catalog root from the absolute and relative paths', () => {
      const parsedFile = createParsedFile('events/OrderCreated/index.mdx', 'event', {});
      expect(getCatalogRoot(parsedFile)).toBe(rootDir);
    });
  });

  describe('extractFileReferences', () => {
    it('resolves schemaPath relative to the resource folder', () => {
      const parsedFile = createParsedFile('events/OrderCreated/index.mdx', 'event', { schemaPath: 'schema.json' });
      const refs = extractFileReferences(parsedFile);

      expect(refs).toEqual([
        {
          field: 'schemaPath',
          value: 'schema.json',
          resolvedPath: path.join(rootDir, 'events', 'OrderCreated', 'schema.json'),
          kind: 'schema',
        },
      ]);
    });

    it('resolves schemaPath for versioned resources inside the versioned folder', () => {
      const parsedFile = createParsedFile('events/OrderCreated/versioned/0.0.1/index.mdx', 'event', {
        schemaPath: 'schema.json',
      });
      const refs = extractFileReferences(parsedFile);

      expect(refs[0].resolvedPath).toBe(path.join(rootDir, 'events', 'OrderCreated', 'versioned', '0.0.1', 'schema.json'));
    });

    it('resolves schemas[] file, path and file:// refs', () => {
      const parsedFile = createParsedFile('events/OrderCreated/index.mdx', 'event', {
        schemas: [
          { file: 'schemas/v1.json' },
          { path: 'schemas/v2.avro' },
          { ref: 'file://schemas/v3.json' },
          { ref: 'file://./schemas/v4.json' },
          { ref: 'registry://orders/OrderCreated' },
          { ref: 'schema-registry-id' },
          { id: 'only-an-id' },
        ],
      });
      const refs = extractFileReferences(parsedFile);
      const dir = path.join(rootDir, 'events', 'OrderCreated');

      expect(refs.map((r) => [r.field, r.resolvedPath])).toEqual([
        ['schemas[0].file', path.join(dir, 'schemas', 'v1.json')],
        ['schemas[1].path', path.join(dir, 'schemas', 'v2.avro')],
        ['schemas[2].ref', path.join(dir, 'schemas', 'v3.json')],
        ['schemas[3].ref', path.join(dir, 'schemas', 'v4.json')],
      ]);
    });

    it('resolves absolute file:/// refs', () => {
      const absolute = path.join(rootDir, 'shared', 'schema.json');
      const parsedFile = createParsedFile('events/OrderCreated/index.mdx', 'event', {
        schemas: [{ ref: pathToFileURL(absolute).href }],
      });
      const refs = extractFileReferences(parsedFile);

      expect(refs).toHaveLength(1);
      expect(refs[0].resolvedPath).toBe(absolute);
    });

    it('resolves both forms of specifications', () => {
      const objectForm = createParsedFile('services/order-service/index.mdx', 'service', {
        specifications: { openapiPath: 'openapi.yml', asyncapiPath: 'asyncapi.yml', graphqlPath: 'schema.graphql' },
      });
      const arrayForm = createParsedFile('services/payment-service/index.mdx', 'service', {
        specifications: [
          { type: 'openapi', path: 'specs/openapi.yml' },
          { type: 'asyncapi', path: 'https://example.com/asyncapi.yml' },
        ],
      });

      expect(extractFileReferences(objectForm).map((r) => r.field)).toEqual([
        'specifications.openapiPath',
        'specifications.asyncapiPath',
        'specifications.graphqlPath',
      ]);
      expect(extractFileReferences(arrayForm).map((r) => r.field)).toEqual(['specifications[0].path', 'specifications[1].path']);
    });

    it('resolves data product contract paths', () => {
      const parsedFile = createParsedFile('data-products/refund-analytics/index.mdx', 'dataProduct', {
        outputs: [{ id: 'orders' }, { id: 'refunds', contract: { path: 'contracts/refunds.json', name: 'Refunds' } }],
      });
      const refs = extractFileReferences(parsedFile);

      expect(refs).toHaveLength(1);
      expect(refs[0]).toMatchObject({
        field: 'outputs[1].contract.path',
        kind: 'contract',
        resolvedPath: path.join(rootDir, 'data-products', 'refund-analytics', 'contracts', 'refunds.json'),
      });
    });

    it('resolves /-prefixed icons against the public folder and skips icon names and URLs', () => {
      const local = createParsedFile('services/a/index.mdx', 'service', { styles: { icon: '/icons/go.svg' } });
      const named = createParsedFile('services/b/index.mdx', 'service', { styles: { icon: 'BoltIcon' } });
      const remote = createParsedFile('services/c/index.mdx', 'service', { styles: { icon: 'https://x.com/i.svg' } });

      expect(extractFileReferences(local)).toEqual([
        {
          field: 'styles.icon',
          value: '/icons/go.svg',
          resolvedPath: path.join(rootDir, 'public', 'icons', 'go.svg'),
          kind: 'icon',
        },
      ]);
      expect(extractFileReferences(named)).toEqual([]);
      expect(extractFileReferences(remote)).toEqual([]);
    });

    it('honours the icons and publicDir options', () => {
      const parsedFile = createParsedFile('services/a/index.mdx', 'service', { styles: { icon: '/icons/go.svg' } });

      expect(extractFileReferences(parsedFile, { icons: false })).toEqual([]);
      expect(extractFileReferences(parsedFile, { publicDir: 'static' })[0].resolvedPath).toBe(
        path.join(rootDir, 'static', 'icons', 'go.svg')
      );
    });

    it('treats URL-looking local path fields as filesystem paths and skips empty values', () => {
      const parsedFile = createParsedFile('events/OrderCreated/index.mdx', 'event', {
        schemaPath: 'https://schemas.example.com/order-created.json',
        schemas: [{ file: 'https://schemas.example.com/order-v2.json' }, { file: '   ' }],
      });

      expect(extractFileReferences(parsedFile).map((reference) => reference.field)).toEqual(['schemaPath', 'schemas[0].file']);
      expect(validateFileReferencesForFile(parsedFile).map((error) => error.field)).toEqual(['schemaPath', 'schemas[0].file']);
    });
  });

  describe('validateFileReferencesForFile', () => {
    it('passes when every referenced file exists', () => {
      write('events/OrderCreated/schema.json');
      write('events/OrderCreated/schemas/v2.json');
      write('public/icons/go.svg', '<svg/>');
      const parsedFile = createParsedFile('events/OrderCreated/index.mdx', 'event', {
        schemaPath: 'schema.json',
        schemas: [{ file: 'schemas/v2.json' }],
        styles: { icon: '/icons/go.svg' },
      });

      expect(validateFileReferencesForFile(parsedFile)).toEqual([]);
    });

    it('reports a missing schemaPath with the resolved location', () => {
      const parsedFile = createParsedFile('events/OrderCreated/index.mdx', 'event', { schemaPath: 'schema.json' });

      const errors = validateFileReferencesForFile(parsedFile);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({
        type: 'reference',
        resource: 'event/OrderCreated',
        field: 'schemaPath',
        file: 'events/OrderCreated/index.mdx',
        severity: 'error',
        rule: FILE_EXISTS_RULE,
      });
      expect(errors[0].message).toBe(
        'Referenced schema file "schema.json" does not exist (looked for "events/OrderCreated/schema.json")'
      );
    });

    it('reports a schemaPath that points at a directory', () => {
      write('events/OrderCreated/schema/.keep');
      const parsedFile = createParsedFile('events/OrderCreated/index.mdx', 'event', { schemaPath: 'schema' });

      expect(validateFileReferencesForFile(parsedFile)).toHaveLength(1);
    });

    it('reports missing specifications, contracts and icons with the right labels', () => {
      const service = createParsedFile('services/order-service/index.mdx', 'service', {
        specifications: [{ type: 'openapi', path: 'openapi.yml' }],
        styles: { icon: '/icons/missing.svg' },
      });
      const dataProduct = createParsedFile('data-products/refunds/index.mdx', 'dataProduct', {
        outputs: [{ id: 'refunds', contract: { path: 'contract.json', name: 'Refunds' } }],
      });

      const messages = [...validateFileReferencesForFile(service), ...validateFileReferencesForFile(dataProduct)].map(
        (e) => e.message
      );

      expect(messages).toEqual([
        'Referenced specification file "openapi.yml" does not exist (looked for "services/order-service/openapi.yml")',
        'Referenced icon "/icons/missing.svg" does not exist (looked for "public/icons/missing.svg")',
        'Referenced contract file "contract.json" does not exist (looked for "data-products/refunds/contract.json")',
      ]);
    });

    it('resolves relative paths that climb out of the resource folder', () => {
      write('shared/order.json');
      const parsedFile = createParsedFile('events/OrderCreated/index.mdx', 'event', { schemaPath: '../../shared/order.json' });

      expect(validateFileReferencesForFile(parsedFile)).toEqual([]);
    });
  });

  describe('validateFileReferences with config', () => {
    it('reads options from the rule config', () => {
      const parsedFile = createParsedFile('services/a/index.mdx', 'service', { styles: { icon: '/icons/go.svg' } });
      const config: LinterConfig = {
        rules: { ...DEFAULT_RULES, [FILE_EXISTS_RULE]: ['error', { icons: false }] },
        ignorePatterns: [],
        overrides: [],
      };

      expect(validateFileReferences([parsedFile])).toHaveLength(1);
      expect(validateFileReferences([parsedFile], config)).toHaveLength(0);
    });

    it('is included in validateCatalog output', () => {
      const parsedFile = createParsedFile('events/OrderCreated/index.mdx', 'event', { schemaPath: 'nope.json' });
      const errors = validateCatalog([parsedFile]);

      expect(errors.some((e) => e.rule === FILE_EXISTS_RULE)).toBe(true);
    });
  });
});
