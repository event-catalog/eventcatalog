import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getExamplesForResource,
  getExampleEntriesForMessage,
  getExampleEntryDetails,
  parseExampleFile,
} from '@utils/collections/examples';

const TEST_DIR = path.join(__dirname, '__test-examples-tmp__');

const createResource = (subdir: string = '') => {
  const resourceDir = path.join(TEST_DIR, subdir);
  fs.mkdirSync(resourceDir, { recursive: true });
  const indexPath = path.join(resourceDir, 'index.mdx');
  fs.writeFileSync(indexPath, '---\nid: TestEvent\n---\n');
  return { filePath: indexPath };
};

const createExamples = (subdir: string, files: Record<string, string>) => {
  const examplesDir = path.join(TEST_DIR, subdir, 'examples');
  fs.mkdirSync(examplesDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(examplesDir, name)), { recursive: true });
    fs.writeFileSync(path.join(examplesDir, name), content);
  }
};

beforeEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('getExamplesForResource', () => {
  it('returns markdown examples sorted alphabetically', () => {
    const resource = createResource('event1');
    createExamples('event1', {
      'beta.md': '# Beta\n\nSecond example.',
      'alpha.md': '# Alpha\n\nFirst example.',
    });

    const examples = getExamplesForResource(resource);

    expect(examples.map((example) => example.fileName)).toEqual(['alpha.md', 'beta.md']);
    expect(examples[0]).toEqual({ fileName: 'alpha.md', title: 'Alpha', content: '# Alpha\n\nFirst example.' });
  });

  it('returns empty array when no examples directory exists', () => {
    expect(getExamplesForResource(createResource('event2'))).toEqual([]);
  });

  it('returns empty array when examples directory is empty', () => {
    const resource = createResource('event3');
    fs.mkdirSync(path.join(TEST_DIR, 'event3', 'examples'), { recursive: true });

    expect(getExamplesForResource(resource)).toEqual([]);
  });

  it('ignores files that are not markdown', () => {
    const resource = createResource('event4');
    createExamples('event4', {
      'payload.json': '{"orderId": "abc"}',
      'notes.txt': 'not an example',
      'walkthrough.mdx': 'Some **markdown**.',
    });

    const examples = getExamplesForResource(resource);

    expect(examples.map((example) => example.fileName)).toEqual(['walkthrough.mdx']);
  });

  it('includes markdown files from nested directories', () => {
    const resource = createResource('event5');
    createExamples('event5', {
      'domestic/basic.md': '# Basic\n\nDomestic.',
      'international/eu.md': '# EU\n\nInternational.',
    });

    const examples = getExamplesForResource(resource);

    expect(examples.map((example) => example.fileName)).toEqual(['domestic/basic.md', 'international/eu.md']);
  });

  it('returns empty array when resource has no filePath', () => {
    expect(getExamplesForResource({})).toEqual([]);
  });

  it('keeps fenced code blocks in the markdown body', () => {
    const resource = createResource('event6');
    const markdown = '# Basic order\n\nA simple order.\n\n```json\n{"orderId": "abc"}\n```\n';
    createExamples('event6', { 'basic-order.md': markdown });

    const [example] = getExamplesForResource(resource);

    expect(example.title).toBe('Basic order');
    expect(example.content).toBe(markdown.trim());
  });
});

describe('parseExampleFile', () => {
  it('uses the first level-one heading as the title and keeps the body as written', () => {
    expect(parseExampleFile('basic-order.md', '# Basic order\n\nBody text.')).toEqual({
      fileName: 'basic-order.md',
      title: 'Basic order',
      content: '# Basic order\n\nBody text.',
    });
  });

  it('prefers a frontmatter title and summary and strips the frontmatter', () => {
    const raw = '---\ntitle: Multi item order\nsummary: Several line items.\n---\n\n# Ignored heading\n\nBody.';

    expect(parseExampleFile('multi.md', raw)).toEqual({
      fileName: 'multi.md',
      title: 'Multi item order',
      summary: 'Several line items.',
      content: '# Ignored heading\n\nBody.',
    });
  });

  it('falls back to a humanised file name when there is no title', () => {
    expect(parseExampleFile('nested/out_of-stock.md', 'Body only.')).toEqual({
      fileName: 'nested/out_of-stock.md',
      title: 'Out of stock',
      content: 'Body only.',
    });
  });

  it('normalises windows path separators in file names', () => {
    expect(parseExampleFile('domestic\\basic.md', 'Body.').fileName).toBe('domestic/basic.md');
  });
});

describe('getExampleEntriesForMessage', () => {
  const entries = [
    { id: 'events/OrderCreated/examples/beta.md', filePath: '/catalog/events/OrderCreated/examples/beta.md', data: {} },
    { id: 'events/OrderCreated/examples/alpha.mdx', filePath: '/catalog/events/OrderCreated/examples/alpha.mdx', data: {} },
    {
      id: 'events/OrderCreated/versioned/1.0.0/examples/old.md',
      filePath: '/catalog/events/OrderCreated/versioned/1.0.0/examples/old.md',
      data: {},
    },
    { id: 'events/OrderCancelled/examples/other.md', filePath: '/catalog/events/OrderCancelled/examples/other.md', data: {} },
  ];

  it('returns the entries under the examples folder beside the message, sorted by path', () => {
    const matched = getExampleEntriesForMessage(entries, '/catalog/events/OrderCreated/index.mdx');

    expect(matched.map((entry) => entry.id)).toEqual([
      'events/OrderCreated/examples/alpha.mdx',
      'events/OrderCreated/examples/beta.md',
    ]);
  });

  it('keeps versioned message examples separate from the latest version', () => {
    const matched = getExampleEntriesForMessage(entries, '/catalog/events/OrderCreated/versioned/1.0.0/index.mdx');

    expect(matched.map((entry) => entry.id)).toEqual(['events/OrderCreated/versioned/1.0.0/examples/old.md']);
  });

  it('returns nothing without a message file path', () => {
    expect(getExampleEntriesForMessage(entries, undefined)).toEqual([]);
  });
});

describe('getExampleEntryDetails', () => {
  it('derives the title from the first heading', () => {
    const details = getExampleEntryDetails(
      { id: 'x', filePath: '/catalog/events/OrderCreated/examples/basic-order.md', body: '# Basic order\n\nBody', data: {} },
      '/catalog/events/OrderCreated/examples'
    );

    expect(details).toEqual({ fileName: 'basic-order.md', title: 'Basic order', summary: undefined });
  });

  it('prefers frontmatter title and summary and falls back to the file name', () => {
    expect(
      getExampleEntryDetails(
        {
          id: 'x',
          filePath: '/catalog/events/OrderCreated/examples/nested/eu-order.mdx',
          body: 'No heading here.',
          data: { title: 'EU order', summary: 'Ships to the EU.' },
        },
        '/catalog/events/OrderCreated/examples'
      )
    ).toEqual({ fileName: 'nested/eu-order.mdx', title: 'EU order', summary: 'Ships to the EU.' });

    expect(
      getExampleEntryDetails(
        { id: 'x', filePath: '/catalog/events/OrderCreated/examples/multi_item.md', body: 'Body', data: {} },
        '/catalog/events/OrderCreated/examples'
      ).title
    ).toBe('Multi item');
  });
});
