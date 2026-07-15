// users.test.js
import { expect, it, describe, beforeEach, afterEach, expectTypeOf } from 'vitest';
import utils from '../index';
import type { Event } from '../types';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-resources');

const { writeEvent, getEvent, getResourceFolderName } = utils(CATALOG_PATH);

// clean the catalog before each test
beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Resources SDK', () => {
  describe('extension properties', () => {
    it('writes and reads x-* properties on resources', async () => {
      const event: Event = {
        id: 'OrderPlaced',
        version: '1.0.0',
        name: 'Order Placed',
        markdown: '',
        'x-operational-tier': 1,
        'x-scrum-masters': ['David', 'Andrew'],
        'x-on-call': {
          schedule: 'orders-primary',
        },
      };

      expectTypeOf(event['x-operational-tier']).toEqualTypeOf<unknown>();

      await writeEvent(event);

      const resource = await getEvent('OrderPlaced');

      expect(resource).toMatchObject({
        'x-operational-tier': 1,
        'x-scrum-masters': ['David', 'Andrew'],
        'x-on-call': {
          schedule: 'orders-primary',
        },
      });
    });
  });

  describe('getResourceFolderName', () => {
    it('returns the folder name of a given resource,', async () => {
      await writeEvent({
        id: 'OrderPlaced',
        version: '1',
        name: 'OrderPlaced',
        summary: 'This is an order',
        markdown: '',
      });

      const folderName = await getResourceFolderName(CATALOG_PATH, 'OrderPlaced', '1');

      expect(folderName).toEqual('OrderPlaced');
    });
  });
});
