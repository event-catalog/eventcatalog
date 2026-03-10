import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-examples');

const {
  writeEvent,
  writeCommand,
  writeQuery,
  addExampleToEvent,
  getExamplesFromEvent,
  removeExampleFromEvent,
  addExampleToCommand,
  getExamplesFromCommand,
  removeExampleFromCommand,
  addExampleToQuery,
  getExamplesFromQuery,
  removeExampleFromQuery,
  versionEvent,
} = utils(CATALOG_PATH);

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Examples SDK', () => {
  describe('Events', () => {
    it('adds an example file to an event examples directory', async () => {
      await writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', summary: '', markdown: '' });

      await addExampleToEvent('OrderPlaced', { content: '{"orderId": "123"}', fileName: 'basic.json' });

      const examplesDir = path.join(CATALOG_PATH, 'events', 'OrderPlaced', 'examples');
      expect(fs.existsSync(examplesDir)).toBe(true);
      expect(fs.readFileSync(path.join(examplesDir, 'basic.json'), 'utf-8')).toBe('{"orderId": "123"}');
    });

    it('creates the examples directory if it does not exist', async () => {
      await writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', summary: '', markdown: '' });

      const examplesDir = path.join(CATALOG_PATH, 'events', 'OrderPlaced', 'examples');
      expect(fs.existsSync(examplesDir)).toBe(false);

      await addExampleToEvent('OrderPlaced', { content: '{}', fileName: 'test.json' });

      expect(fs.existsSync(examplesDir)).toBe(true);
    });

    it('retrieves all examples from an event sorted alphabetically by file name', async () => {
      await writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', summary: '', markdown: '' });

      await addExampleToEvent('OrderPlaced', { content: '{"type": "b"}', fileName: 'beta.json' });
      await addExampleToEvent('OrderPlaced', { content: '{"type": "a"}', fileName: 'alpha.json' });

      const examples = await getExamplesFromEvent('OrderPlaced');

      expect(examples).toHaveLength(2);
      expect(examples[0].fileName).toBe('alpha.json');
      expect(examples[0].content).toBe('{"type": "a"}');
      expect(examples[1].fileName).toBe('beta.json');
      expect(examples[1].content).toBe('{"type": "b"}');
    });

    it('returns empty array when event has no examples', async () => {
      await writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', summary: '', markdown: '' });

      const examples = await getExamplesFromEvent('OrderPlaced');

      expect(examples).toEqual([]);
    });

    it('removes a specific example from an event', async () => {
      await writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', summary: '', markdown: '' });

      await addExampleToEvent('OrderPlaced', { content: '{}', fileName: 'remove-me.json' });
      await addExampleToEvent('OrderPlaced', { content: '{}', fileName: 'keep-me.json' });

      await removeExampleFromEvent('OrderPlaced', 'remove-me.json');

      const examples = await getExamplesFromEvent('OrderPlaced');
      expect(examples).toHaveLength(1);
      expect(examples[0].fileName).toBe('keep-me.json');
    });

    it('throws error when removing an example that does not exist', async () => {
      await writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', summary: '', markdown: '' });

      await expect(removeExampleFromEvent('OrderPlaced', 'nope.json')).rejects.toThrowError(
        'Example file nope.json does not exist in resource OrderPlaced'
      );
    });

    it('preserves existing examples when adding a new one', async () => {
      await writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', summary: '', markdown: '' });

      await addExampleToEvent('OrderPlaced', { content: 'first', fileName: 'first.txt' });
      await addExampleToEvent('OrderPlaced', { content: 'second', fileName: 'second.txt' });

      const examples = await getExamplesFromEvent('OrderPlaced');
      expect(examples).toHaveLength(2);
    });

    it('retrieves examples from nested directories inside the examples folder', async () => {
      await writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', summary: '', markdown: '' });

      await addExampleToEvent('OrderPlaced', { content: '{"root": true}', fileName: 'root.json' });

      // Manually create a nested directory with a file
      const nestedDir = path.join(CATALOG_PATH, 'events', 'OrderPlaced', 'examples', 'errors');
      fs.mkdirSync(nestedDir, { recursive: true });
      fs.writeFileSync(path.join(nestedDir, 'not-found.json'), '{"error": true}');

      const examples = await getExamplesFromEvent('OrderPlaced');

      expect(examples).toHaveLength(2);
      expect(examples[0].fileName).toBe(path.join('errors', 'not-found.json'));
      expect(examples[1].fileName).toBe('root.json');
    });

    it('copies examples to versioned directory when event is versioned', async () => {
      await writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', summary: '', markdown: '' });

      await addExampleToEvent('OrderPlaced', { content: '{"v": 1}', fileName: 'sample.json' });

      await versionEvent('OrderPlaced');

      const versionedExamplesDir = path.join(CATALOG_PATH, 'events', 'OrderPlaced', 'versioned', '1.0.0', 'examples');
      expect(fs.existsSync(versionedExamplesDir)).toBe(true);
      expect(fs.readFileSync(path.join(versionedExamplesDir, 'sample.json'), 'utf-8')).toBe('{"v": 1}');
    });
  });

  describe('Commands', () => {
    it('adds an example file to a command', async () => {
      await writeCommand({ id: 'PlaceOrder', name: 'Place Order', version: '1.0.0', summary: '', markdown: '' });

      await addExampleToCommand('PlaceOrder', { content: '{"cmd": true}', fileName: 'basic.json' });

      const examples = await getExamplesFromCommand('PlaceOrder');
      expect(examples).toHaveLength(1);
      expect(examples[0].fileName).toBe('basic.json');
    });

    it('removes an example from a command', async () => {
      await writeCommand({ id: 'PlaceOrder', name: 'Place Order', version: '1.0.0', summary: '', markdown: '' });

      await addExampleToCommand('PlaceOrder', { content: '{}', fileName: 'test.json' });
      await removeExampleFromCommand('PlaceOrder', 'test.json');

      const examples = await getExamplesFromCommand('PlaceOrder');
      expect(examples).toEqual([]);
    });
  });

  describe('Queries', () => {
    it('adds an example file to a query', async () => {
      await writeQuery({ id: 'GetOrder', name: 'Get Order', version: '1.0.0', summary: '', markdown: '' });

      await addExampleToQuery('GetOrder', { content: '{"query": true}', fileName: 'basic.json' });

      const examples = await getExamplesFromQuery('GetOrder');
      expect(examples).toHaveLength(1);
      expect(examples[0].fileName).toBe('basic.json');
    });

    it('removes an example from a query', async () => {
      await writeQuery({ id: 'GetOrder', name: 'Get Order', version: '1.0.0', summary: '', markdown: '' });

      await addExampleToQuery('GetOrder', { content: '{}', fileName: 'test.json' });
      await removeExampleFromQuery('GetOrder', 'test.json');

      const examples = await getExamplesFromQuery('GetOrder');
      expect(examples).toEqual([]);
    });
  });
});
