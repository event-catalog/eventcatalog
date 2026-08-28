import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { scanCatalogFiles } from '../src/scanner';
import {
  findUnrecognisedFiles,
  suggestDirectoryName,
  suggestLocation,
  validateUnrecognisedFiles,
  toUnrecognisedFileError,
  UNRECOGNISED_FILE_RULE,
} from '../src/validators/structure-validator';

const frontmatter = (id: string) => `---\nid: ${id}\nname: ${id}\nversion: 1.0.0\n---\n# ${id}\n`;

describe('suggestDirectoryName', () => {
  it('matches case-only differences regardless of length', () => {
    expect(suggestDirectoryName('Events')).toBe('events');
    expect(suggestDirectoryName('ADRS')).toBe('adrs');
  });

  it('matches single-edit typos on longer names', () => {
    expect(suggestDirectoryName('event')).toBe('events');
    expect(suggestDirectoryName('comands')).toBe('commands');
    expect(suggestDirectoryName('servcies')).toBe('services');
    expect(suggestDirectoryName('sub-domains')).toBe('subdomains');
  });

  it('does not guess for short or unrelated folder names', () => {
    expect(suggestDirectoryName('team')).toBeUndefined();
    expect(suggestDirectoryName('flow')).toBeUndefined();
    expect(suggestDirectoryName('user')).toBeUndefined();
    expect(suggestDirectoryName('notes')).toBeUndefined();
    expect(suggestDirectoryName('architecture')).toBeUndefined();
  });
});

describe('suggestLocation', () => {
  it('suggests a folder + index file for a resource saved as a flat file', () => {
    expect(suggestLocation('events/OrderCreated.mdx')).toBe('Did you mean "events/OrderCreated/index.mdx"?');
    expect(suggestLocation('domains/Sales/services/order-service.md')).toBe(
      'Did you mean "domains/Sales/services/order-service/index.md"?'
    );
  });

  it('suggests the correct directory name for near-miss folders', () => {
    expect(suggestLocation('event/OrderCreated/index.mdx')).toBe('Did you mean "events/OrderCreated/index.mdx"?');
    expect(suggestLocation('Services/order-service/index.mdx')).toBe('Did you mean "services/order-service/index.mdx"?');
    expect(suggestLocation('domains/Sales/comands/CreateOrder/index.mdx')).toBe(
      'Did you mean "domains/Sales/commands/CreateOrder/index.mdx"?'
    );
    expect(suggestLocation('domains/Sales/sub-domains/Billing/index.mdx')).toBe(
      'Did you mean "domains/Sales/subdomains/Billing/index.mdx"?'
    );
  });

  it('suggests flat files for users and teams', () => {
    expect(suggestLocation('users/john/index.mdx')).toBe('users are flat files. Did you mean "users/john.mdx"?');
    expect(suggestLocation('teams/platform/team.md')).toBe('teams are flat files. Did you mean "teams/team.md"?');
  });

  it('explains that resources need their own folder', () => {
    expect(suggestLocation('events/index.mdx')).toBe('Each resource needs its own folder, e.g. "events/<id>/index.mdx".');
  });

  it('points out a missing version folder', () => {
    expect(suggestLocation('events/OrderCreated/versioned/index.mdx')).toBe(
      'Versioned resources need a version folder, e.g. "events/OrderCreated/versioned/<version>/index.mdx".'
    );
  });

  it('points extra markdown inside a resource folder to docs/', () => {
    expect(suggestLocation('services/order-service/notes.mdx')).toBe(
      'Only index.md(x) files are loaded as resources. Additional documentation belongs in a "docs" folder, e.g. "services/order-service/docs/notes.mdx".'
    );
  });

  it('returns undefined when the path is not under a resource directory', () => {
    expect(suggestLocation('README.md')).toBeUndefined();
    expect(suggestLocation('random/notes.mdx')).toBeUndefined();
  });

  it('returns undefined when there is no obvious fix', () => {
    // Too deeply nested for an event, but nothing to suggest
    expect(suggestLocation('events/a/b/index.mdx')).toBeUndefined();
  });
});

describe('findUnrecognisedFiles', () => {
  let tempDir: string;

  const write = (relativePath: string, content = frontmatter(path.basename(relativePath, path.extname(relativePath)))) => {
    const fullPath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  };

  const run = async () => {
    const recognised = await scanCatalogFiles(tempDir);
    return findUnrecognisedFiles(tempDir, recognised);
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-structure-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns nothing for a well-formed catalog', async () => {
    write('events/OrderCreated/index.mdx');
    write('events/OrderCreated/versioned/0.0.1/index.mdx');
    write('services/order-service/index.mdx');
    write('domains/Sales/index.mdx');
    write('domains/Sales/subdomains/Billing/index.mdx');
    write('domains/Sales/services/billing-service/index.mdx');
    write('domains/Sales/systems/billing-system/index.mdx');
    write('domains/Sales/systems/billing-system/containers/billing-db/index.mdx');
    write('channels/orders/index.mdx');
    write('channels/public/orders/index.mdx');
    write('users/john.mdx');
    write('teams/platform.mdx');
    write('federated/other-catalog/services/remote-service/index.mdx');

    expect(await run()).toEqual([]);
  });

  it('ignores markdown that EventCatalog loads through other collections', async () => {
    write('events/OrderCreated/index.mdx');
    write('events/OrderCreated/changelog.mdx', '# Changelog');
    write('events/OrderCreated/docs/guide.mdx', '# Guide');
    write('events/OrderCreated/versioned/0.0.1/docs/old-guide.md', '# Old');
    write('domains/Sales/index.mdx');
    write('domains/Sales/ubiquitous-language.mdx', '---\ndictionary: []\n---');
    write('domains/Sales/docs/overview.md', '# Overview');
    write('domains/Sales/pages/custom.mdx', '# Custom');
    write('docs/getting-started.mdx', '# Docs');
    write('pages/about.mdx', '# About');
    write('README.md', '# Readme');

    expect(await run()).toEqual([]);
  });

  it('ignores build artifacts and node_modules', async () => {
    write('events/OrderCreated/index.mdx');
    write('node_modules/some-package/events/Foo.mdx');
    write('dist/events/Foo.mdx');
    write('events/OrderCreated/dist/generated.mdx');
    write('.astro/events/Foo.mdx');

    expect(await run()).toEqual([]);
  });

  it('reports a resource saved as a flat file with a suggestion', async () => {
    write('events/OrderCreated.mdx');

    expect(await run()).toEqual([
      { relativePath: 'events/OrderCreated.mdx', suggestion: 'Did you mean "events/OrderCreated/index.mdx"?' },
    ]);
  });

  it('reports files in misspelled resource directories', async () => {
    write('event/OrderCreated/index.mdx');
    write('domains/Sales/servcies/order-service/index.mdx');

    const result = await run();
    expect(result.map((r) => r.relativePath)).toEqual([
      'domains/Sales/servcies/order-service/index.mdx',
      'event/OrderCreated/index.mdx',
    ]);
    expect(result[0].suggestion).toBe('Did you mean "domains/Sales/services/order-service/index.mdx"?');
    expect(result[1].suggestion).toBe('Did you mean "events/OrderCreated/index.mdx"?');
  });

  it('reports users and teams stored as folders', async () => {
    write('users/john/index.mdx');

    expect(await run()).toEqual([
      { relativePath: 'users/john/index.mdx', suggestion: 'users are flat files. Did you mean "users/john.mdx"?' },
    ]);
  });

  it('reports a versioned index without a version folder', async () => {
    write('events/OrderCreated/index.mdx');
    write('events/OrderCreated/versioned/index.mdx');

    const result = await run();
    expect(result).toHaveLength(1);
    expect(result[0].relativePath).toBe('events/OrderCreated/versioned/index.mdx');
    expect(result[0].suggestion).toContain('<version>');
  });

  it('reports stray markdown inside a resource folder', async () => {
    write('services/order-service/index.mdx');
    write('services/order-service/notes.mdx', '# Notes');

    const result = await run();
    expect(result).toHaveLength(1);
    expect(result[0].relativePath).toBe('services/order-service/notes.mdx');
    expect(result[0].suggestion).toContain('services/order-service/docs/notes.mdx');
  });

  it('reports events nested too deeply (no suggestion)', async () => {
    write('events/orders/OrderCreated/index.mdx');

    expect(await run()).toEqual([{ relativePath: 'events/orders/OrderCreated/index.mdx', suggestion: undefined }]);
  });

  it('does not report markdown outside resource directories', async () => {
    write('events/OrderCreated/index.mdx');
    write('notes/todo.md', '# Todo');
    write('architecture/overview.mdx', '# Overview');

    expect(await run()).toEqual([]);
  });
});

describe('validateUnrecognisedFiles', () => {
  it('converts unrecognised files into warnings under structure/unrecognised-file', () => {
    const error = toUnrecognisedFileError({
      relativePath: 'events/OrderCreated.mdx',
      suggestion: 'Did you mean "events/OrderCreated/index.mdx"?',
    });

    expect(error).toEqual({
      type: 'structure',
      resource: 'unknown',
      message:
        'File "events/OrderCreated.mdx" is not recognised as an EventCatalog resource and will be ignored. Did you mean "events/OrderCreated/index.mdx"?',
      file: 'events/OrderCreated.mdx',
      severity: 'warning',
      rule: UNRECOGNISED_FILE_RULE,
    });
  });

  it('omits the hint when there is no suggestion', () => {
    const error = toUnrecognisedFileError({ relativePath: 'events/a/b/index.mdx' });
    expect(error.message).toBe('File "events/a/b/index.mdx" is not recognised as an EventCatalog resource and will be ignored.');
  });

  it('runs end to end against a directory', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-structure-e2e-'));
    try {
      fs.mkdirSync(path.join(tempDir, 'events'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'events', 'OrderCreated.mdx'), frontmatter('OrderCreated'));

      const recognised = await scanCatalogFiles(tempDir);
      const errors = await validateUnrecognisedFiles(tempDir, recognised);

      expect(errors).toHaveLength(1);
      expect(errors[0].rule).toBe(UNRECOGNISED_FILE_RULE);
      expect(errors[0].file).toBe('events/OrderCreated.mdx');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
