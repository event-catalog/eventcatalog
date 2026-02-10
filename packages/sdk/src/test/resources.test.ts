// users.test.js
import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-users');

const { writeEvent, getResourceFolderName } = utils(CATALOG_PATH);

// clean the catalog before each test
beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Resources SDK', () => {
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
