// users.test.js
import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-resources');

const { writeEvent, writeService, writeChannel, getService, getResourceFolderName } = utils(CATALOG_PATH);

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

  describe('getResource type filtering', () => {
    it('returns the requested resource type when multiple resources share the same id', async () => {
      await writeChannel({
        id: 'SharedResource',
        name: 'SharedResource',
        version: '1.0.0',
        markdown: '',
        address: 'shared.resource',
      });

      await writeService({
        id: 'SharedResource',
        name: 'SharedResource',
        version: '1.0.0',
        markdown: '',
      });

      const service = await getService('SharedResource');

      expect(service?.id).toEqual('SharedResource');
      expect(service?.address).toEqual(undefined);
    });
  });
});
