import { describe, it, expect } from 'vitest';
import {
  getFrontmatterBlock,
  parseFieldPath,
  locateField,
  locateBody,
  locateParseError,
  attachLocations,
  getAnchorForRule,
} from '../src/utils/locations';
import { parseFrontmatter } from '../src/parser';
import { formatError, formatParseError, formatLocation } from '../src/reporters';
import { ParsedFile } from '../src/parser';
import { ValidationError } from '../src/types';
import fs from 'fs';
import os from 'os';
import path from 'path';

const raw = [
  '---', // 1
  'id: order-service', // 2
  'name: Order Service', // 3
  'version: 1.0.0', // 4
  'owner:', // 5
  '  - platform-team', // 6
  'sends:', // 7
  '  - id: OrderCreated', // 8
  '    version: 2.0.0', // 9
  '    to:', // 10
  '      - id: orders', // 11
  '        too: push', // 12
  'receives: [{ id: CreateOrder, version: latest }]', // 13
  'styles:', // 14
  '  icon: /icons/go.svg', // 15
  '---', // 16
  '', // 17
  '# Order Service', // 18
].join('\n');

describe('getFrontmatterBlock', () => {
  it('extracts the block and its line numbers', () => {
    const block = getFrontmatterBlock(raw)!;
    expect(block.startLine).toBe(2);
    expect(block.bodyStartLine).toBe(17);
    expect(block.text.split('\n')[0]).toBe('id: order-service');
  });

  it('handles CRLF line endings and a BOM', () => {
    const block = getFrontmatterBlock('﻿---\r\nid: a\r\nname: b\r\n---\r\nbody')!;
    expect(block.text).toBe('id: a\nname: b');
    expect(block.bodyStartLine).toBe(5);
  });

  it('returns undefined without frontmatter', () => {
    expect(getFrontmatterBlock('# Just markdown')).toBeUndefined();
    expect(getFrontmatterBlock('---\nid: a\n')).toBeUndefined();
  });
});

describe('parseFieldPath', () => {
  it('splits dotted and indexed paths', () => {
    expect(parseFieldPath('sends[0].to[1].id')).toEqual(['sends', 0, 'to', 1, 'id']);
    expect(parseFieldPath('owners[2]')).toEqual(['owners', 2]);
    expect(parseFieldPath('data-products')).toEqual(['data-products']);
    expect(parseFieldPath('specifications.openapiPath')).toEqual(['specifications', 'openapiPath']);
  });
});

describe('locateField', () => {
  it('points at top-level values', () => {
    expect(locateField(raw, 'version')).toEqual({ line: 4, column: 10 });
    expect(locateField(raw, 'id')).toEqual({ line: 2, column: 5 });
  });

  it('points at top-level keys when key-anchored', () => {
    expect(locateField(raw, 'owner', 'key')).toEqual({ line: 5, column: 1 });
    expect(locateField(raw, 'version', 'key')).toEqual({ line: 4, column: 1 });
  });

  it('walks into sequences and nested maps', () => {
    expect(locateField(raw, 'sends[0].id')).toEqual({ line: 8, column: 9 });
    expect(locateField(raw, 'sends[0].version')).toEqual({ line: 9, column: 14 });
    expect(locateField(raw, 'sends[0].to[0].id')).toEqual({ line: 11, column: 13 });
    expect(locateField(raw, 'sends[0].to[0].too', 'key')).toEqual({ line: 12, column: 9 });
  });

  it('points at the key line for a collection value', () => {
    expect(locateField(raw, 'sends')).toEqual({ line: 7, column: 1 });
    expect(locateField(raw, 'sends[0].to')).toEqual({ line: 10, column: 5 });
  });

  it('points at a sequence item that is a map', () => {
    // sends[0] is a map, so we get its first key
    expect(locateField(raw, 'sends[0]')).toEqual({ line: 8, column: 5 });
  });

  it('handles flow-style collections', () => {
    expect(locateField(raw, 'receives[0].id')).toEqual({ line: 13, column: 18 });
    expect(locateField(raw, 'receives[0].version')).toEqual({ line: 13, column: 40 });
  });

  it('falls back to the nearest ancestor for a missing path', () => {
    expect(locateField(raw, 'sends[0].nonexistent')).toEqual({ line: 7, column: 1 });
    expect(locateField(raw, 'sends[5].id')).toEqual({ line: 7, column: 1 });
    expect(locateField(raw, 'styles.node.color')).toEqual({ line: 14, column: 1 });
  });

  it('falls back to the first frontmatter line for a missing top-level field', () => {
    expect(locateField(raw, 'summary', 'key')).toEqual({ line: 2, column: 1 });
    expect(locateField(raw, undefined)).toEqual({ line: 2, column: 1 });
  });

  it('returns undefined without frontmatter', () => {
    expect(locateField('# nothing', 'id')).toBeUndefined();
  });
});

describe('locateBody / locateParseError', () => {
  it('locates the start of the body', () => {
    expect(locateBody(raw)).toEqual({ line: 17, column: 1 });
  });

  it('locates a YAML syntax error at the failing line', () => {
    const broken = ['---', 'id: a', 'name: b', 'sends:', '  - id: [unclosed', '---', 'body'].join('\n');
    const location = locateParseError(broken)!;
    expect(location.line).toBe(5);
    expect(location.column).toBeGreaterThan(0);
  });

  it('defaults to line 1 when there is no frontmatter', () => {
    expect(locateParseError('no frontmatter')).toEqual({ line: 1, column: 1 });
  });
});

describe('getAnchorForRule', () => {
  it('anchors field-presence rules to keys and reference rules to values', () => {
    expect(getAnchorForRule('schema/unknown-field')).toBe('key');
    expect(getAnchorForRule('best-practices/owner-required')).toBe('key');
    expect(getAnchorForRule('refs/resource-exists')).toBe('value');
    expect(getAnchorForRule(undefined)).toBe('value');
  });
});

describe('attachLocations', () => {
  const parsedFile: ParsedFile = {
    file: {
      path: '/x/services/order-service/index.mdx',
      relativePath: 'services/order-service/index.mdx',
      resourceType: 'service',
      resourceId: 'order-service',
    },
    frontmatter: {},
    content: '',
    raw,
  };
  const base = {
    type: 'schema' as const,
    resource: 'service/order-service',
    file: 'services/order-service/index.mdx',
    message: 'x',
  };

  it('resolves a location for each kind of finding', () => {
    const errors: ValidationError[] = [
      { ...base, field: 'owner', rule: 'schema/unknown-field' },
      { ...base, field: 'summary', rule: 'best-practices/summary-required' },
      { ...base, field: 'sends[0].to[0].too', rule: 'schema/unknown-nested-field' },
      { ...base, type: 'reference', field: 'sends[0]', rule: 'refs/valid-version-range' },
      { ...base, type: 'reference', field: 'sends[0].to[0]', rule: 'refs/channel-exists' },
      { ...base, type: 'reference', field: 'styles.icon', rule: 'refs/file-exists' },
      { ...base, field: 'description', rule: 'best-practices/description-required' },
      { ...base, type: 'reference', field: 'id', rule: 'structure/duplicate-resource-ids' },
    ];

    const located = attachLocations(errors, [parsedFile]);

    expect(located.map((e) => [e.rule, e.line, e.column])).toEqual([
      ['schema/unknown-field', 5, 1],
      ['best-practices/summary-required', 2, 1],
      ['schema/unknown-nested-field', 12, 9],
      ['refs/valid-version-range', 8, 5],
      ['refs/channel-exists', 11, 9],
      ['refs/file-exists', 15, 9],
      ['best-practices/description-required', 17, 1],
      ['structure/duplicate-resource-ids', 2, 5],
    ]);
  });

  it('defaults to 1:1 for files that were not parsed', () => {
    const [located] = attachLocations(
      [{ ...base, type: 'structure', file: 'events/Stray.mdx', rule: 'structure/unrecognised-file' }],
      [parsedFile]
    );
    expect(located.line).toBe(1);
    expect(located.column).toBe(1);
  });

  it('leaves findings that already have a line untouched', () => {
    const [located] = attachLocations([{ ...base, field: 'owner', line: 42, column: 7 }], [parsedFile]);
    expect(located).toMatchObject({ line: 42, column: 7 });
  });
});

describe('parser attaches parse error positions', () => {
  it('reports the failing line of invalid YAML', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-locations-'));
    try {
      const filePath = path.join(dir, 'index.mdx');
      fs.writeFileSync(filePath, ['---', 'id: a', 'name: b', 'sends:', '  - id: [unclosed', '---', 'body'].join('\n'));
      const result = await parseFrontmatter({
        path: filePath,
        relativePath: 'events/a/index.mdx',
        resourceType: 'event',
        resourceId: 'a',
      });

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.line).toBe(5);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('reporter output includes locations', () => {
  const error: ValidationError = {
    type: 'schema',
    resource: 'service/a',
    field: 'owner',
    message: 'Unknown property "owner"',
    file: 'services/a/index.mdx',
    rule: 'schema/unknown-field',
    severity: 'error',
    line: 5,
    column: 1,
  };

  it('formats line:col', () => {
    expect(formatLocation(error)).toBe('5:1');
    expect(formatLocation({ line: undefined })).toBe('');
  });

  it('prefixes grouped findings with a padded position', () => {
    const line = formatError(error, { showFilename: false, locationWidth: 5 });
    expect(line).toContain('  5:1');
    expect(line).toContain('(schema/unknown-field)');
  });

  it('appends the position to the filename when not grouped', () => {
    expect(formatError(error, { showFilename: true })).toContain('services/a/index.mdx:5:1');
    // Legacy boolean form still works
    expect(formatError(error, true)).toContain('services/a/index.mdx:5:1');
  });

  it('formats parse errors with positions and only the first message line', () => {
    const line = formatParseError(
      {
        file: { path: '/x', relativePath: 'events/a/index.mdx', resourceType: 'event', resourceId: 'a' },
        error: new Error('bad indentation\n  at line 3'),
        line: 4,
        column: 3,
      },
      { showFilename: false, locationWidth: 3 }
    );
    expect(line).toContain('4:3');
    expect(line).toContain('Parse error: bad indentation');
    expect(line).not.toContain('at line 3');
  });
});
