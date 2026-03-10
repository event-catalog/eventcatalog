import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getExamplesForResource } from '@utils/collections/examples';

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
  it('returns examples from a message examples directory sorted alphabetically', () => {
    const resource = createResource('event1');
    createExamples('event1', {
      'beta.json': '{"b": true}',
      'alpha.json': '{"a": true}',
    });

    const examples = getExamplesForResource(resource);

    expect(examples).toHaveLength(2);
    expect(examples[0].fileName).toBe('alpha.json');
    expect(examples[1].fileName).toBe('beta.json');
  });

  it('returns empty array when no examples directory exists', () => {
    const resource = createResource('event2');

    const examples = getExamplesForResource(resource);

    expect(examples).toEqual([]);
  });

  it('returns empty array when examples directory is empty', () => {
    const resource = createResource('event3');
    fs.mkdirSync(path.join(TEST_DIR, 'event3', 'examples'), { recursive: true });

    const examples = getExamplesForResource(resource);

    expect(examples).toEqual([]);
  });

  it('extracts title from file name by removing extension', () => {
    const resource = createResource('event4');
    createExamples('event4', { 'my-example.json': '{}' });

    const examples = getExamplesForResource(resource);

    expect(examples[0].title).toBe('my-example');
    expect(examples[0].extension).toBe('json');
  });

  it('reads file content for each example', () => {
    const resource = createResource('event5');
    createExamples('event5', { 'payload.json': '{"orderId": "abc"}' });

    const examples = getExamplesForResource(resource);

    expect(examples[0].content).toBe('{"orderId": "abc"}');
  });

  it('supports multiple file formats', () => {
    const resource = createResource('event6');
    createExamples('event6', {
      'example.json': '{}',
      'example.yaml': 'key: value',
      'example.xml': '<root/>',
      'example.proto': 'message Test {}',
    });

    const examples = getExamplesForResource(resource);

    expect(examples).toHaveLength(4);
    expect(examples.map((e) => e.extension)).toEqual(['json', 'proto', 'xml', 'yaml']);
  });

  it('includes files from nested directories inside examples folder', () => {
    const resource = createResource('event7');
    createExamples('event7', { 'root.json': '{}' });
    fs.mkdirSync(path.join(TEST_DIR, 'event7', 'examples', 'errors'), { recursive: true });
    fs.writeFileSync(path.join(TEST_DIR, 'event7', 'examples', 'errors', 'not-found.json'), '{"error": true}');

    const examples = getExamplesForResource(resource);

    expect(examples).toHaveLength(2);
    expect(examples[0].fileName).toBe(path.join('errors', 'not-found.json'));
    expect(examples[0].title).toBe('not-found');
    expect(examples[0].content).toBe('{"error": true}');
    expect(examples[1].fileName).toBe('root.json');
  });

  it('returns empty array when resource has no filePath', () => {
    const examples = getExamplesForResource({});

    expect(examples).toEqual([]);
  });

  it('excludes examples.config.yaml from the returned examples', () => {
    const resource = createResource('event8');
    createExamples('event8', {
      'basic.json': '{}',
      'examples.config.yaml': 'basic.json:\n  name: Basic\n',
    });

    const examples = getExamplesForResource(resource);

    expect(examples).toHaveLength(1);
    expect(examples[0].fileName).toBe('basic.json');
  });

  it('uses name from config file as title when provided', () => {
    const resource = createResource('event9');
    createExamples('event9', {
      'basic.json': '{}',
      'examples.config.yaml': 'basic.json:\n  name: My Custom Name\n',
    });

    const examples = getExamplesForResource(resource);

    expect(examples[0].title).toBe('My Custom Name');
  });

  it('falls back to file name as title when config has no name', () => {
    const resource = createResource('event10');
    createExamples('event10', {
      'basic.json': '{}',
      'examples.config.yaml': 'basic.json:\n  summary: Just a summary\n',
    });

    const examples = getExamplesForResource(resource);

    expect(examples[0].title).toBe('basic');
  });

  it('includes summary and usage from config file', () => {
    const resource = createResource('event11');
    createExamples('event11', {
      'basic.json': '{}',
      'examples.config.yaml':
        'basic.json:\n  name: Basic Example\n  summary: A basic payload\n  usage: "curl http://localhost"\n',
    });

    const examples = getExamplesForResource(resource);

    expect(examples[0].summary).toBe('A basic payload');
    expect(examples[0].usage).toBe('curl http://localhost');
  });

  it('returns no summary or usage when config file does not exist', () => {
    const resource = createResource('event12');
    createExamples('event12', { 'basic.json': '{}' });

    const examples = getExamplesForResource(resource);

    expect(examples[0].summary).toBeUndefined();
    expect(examples[0].usage).toBeUndefined();
  });

  it('supports examples.config.json as an alternative config format', () => {
    const resource = createResource('event13');
    createExamples('event13', {
      'basic.json': '{}',
      'examples.config.json': JSON.stringify({ 'basic.json': { name: 'From JSON Config' } }),
    });

    const examples = getExamplesForResource(resource);

    expect(examples).toHaveLength(1);
    expect(examples[0].title).toBe('From JSON Config');
  });
});
