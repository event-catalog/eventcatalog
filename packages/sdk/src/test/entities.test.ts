// sum.test.js
import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-entities');

const { writeEntity, getEntity, getEntities, rmEntity, rmEntityById, versionEntity, entityHasVersion } = utils(CATALOG_PATH);

// clean the catalog before each test
beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Entities SDK', () => {
  describe('getEntity', () => {
    it('returns the given entity id from EventCatalog and the latest version when no version is given,', async () => {
      await writeEntity({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        summary: 'User entity',
        markdown: '# User entity',
        aggregateRoot: true,
        identifier: 'id',
        attachments: ['https://example.com'],
        diagrams: [{ id: 'UserDiagram', version: '1.0.0' }],
      });

      const test = await getEntity('User');

      expect(test).toEqual({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        summary: 'User entity',
        markdown: '# User entity',
        aggregateRoot: true,
        identifier: 'id',
        attachments: ['https://example.com'],
        diagrams: [{ id: 'UserDiagram', version: '1.0.0' }],
      });
    });

    it('returns the given entity id from EventCatalog and the requested version when a version is given,', async () => {
      await writeEntity({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        summary: 'User entity',
        markdown: '# User entity',
        aggregateRoot: true,
      });

      await versionEntity('User');

      await writeEntity({
        id: 'User',
        name: 'User',
        version: '0.0.2',
        summary: 'User entity v2',
        markdown: '# User entity v2',
        aggregateRoot: false,
      });

      const test = await getEntity('User', '0.0.1');

      expect(test).toEqual({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        summary: 'User entity',
        markdown: '# User entity',
        aggregateRoot: true,
      });
    });

    it('returns undefined when a given resource is not found', async () => {
      const entity = await getEntity('InventoryAdjusted');
      await expect(entity).toEqual(undefined);
    });
  });

  describe('getEntities', () => {
    it('returns all entities from the catalog', async () => {
      await writeEntity({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        summary: 'User entity',
        markdown: '# User entity',
      });

      await writeEntity({
        id: 'Product',
        name: 'Product',
        version: '0.0.1',
        summary: 'Product entity',
        markdown: '# Product entity',
      });

      const entities = await getEntities();
      expect(entities).toHaveLength(2);
      expect(entities.map((e) => e.id)).toEqual(['User', 'Product']);
    });

    it('returns only latest versions when latestOnly is true', async () => {
      await writeEntity({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        summary: 'User entity',
        markdown: '# User entity',
      });

      await versionEntity('User');

      await writeEntity({
        id: 'User',
        name: 'User',
        version: '0.0.2',
        summary: 'User entity v2',
        markdown: '# User entity v2',
      });

      const entities = await getEntities({ latestOnly: true });
      expect(entities).toHaveLength(1);
      expect(entities[0].version).toBe('0.0.2');
    });
  });

  describe('writeEntity', () => {
    it('writes the given entity to the file system', async () => {
      await writeEntity({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        summary: 'User entity',
        markdown: '# User entity',
        aggregateRoot: true,
        properties: [
          {
            name: 'id',
            type: 'string',
            required: true,
          },
        ],
      });

      const entity = await getEntity('User');

      expect(entity).toEqual({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        summary: 'User entity',
        markdown: '# User entity',
        aggregateRoot: true,
        properties: [
          {
            name: 'id',
            type: 'string',
            required: true,
          },
        ],
      });
    });

    it('writes the entity to a custom path when path is provided', async () => {
      await writeEntity(
        {
          id: 'User',
          name: 'User',
          version: '0.0.1',
          summary: 'User entity',
          markdown: '# User entity',
        },
        { path: '/Account/User' }
      );

      const entity = await getEntity('User');
      expect(entity).toEqual({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        summary: 'User entity',
        markdown: '# User entity',
      });
    });
  });

  describe('rmEntity', () => {
    it('removes an entity by its path', async () => {
      await writeEntity({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        summary: 'User entity',
        markdown: '# User entity',
      });

      await rmEntity('/User');

      const entity = await getEntity('User');

      await expect(entity).toEqual(undefined);
    });
  });

  describe('rmEntityById', () => {
    it('removes an entity by its id', async () => {
      await writeEntity({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        summary: 'User entity',
        markdown: '# User entity',
      });

      await rmEntityById('User');

      const entity = await getEntity('User');

      await expect(entity).toEqual(undefined);
    });

    it('removes a specific version of an entity by its id and version', async () => {
      await writeEntity({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        summary: 'User entity',
        markdown: '# User entity',
      });

      await versionEntity('User');

      await writeEntity({
        id: 'User',
        name: 'User',
        version: '0.0.2',
        summary: 'User entity v2',
        markdown: '# User entity v2',
      });

      await rmEntityById('User', '0.0.1');

      const oldEntity = await getEntity('User', '0.0.1');
      expect(oldEntity).toEqual(undefined);

      const newEntity = await getEntity('User', '0.0.2');
      expect(newEntity).toEqual({
        id: 'User',
        name: 'User',
        version: '0.0.2',
        summary: 'User entity v2',
        markdown: '# User entity v2',
      });
    });
  });

  describe('versionEntity', () => {
    it('versions an entity by moving it to a versioned directory', async () => {
      await writeEntity({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        summary: 'User entity',
        markdown: '# User entity',
      });

      await versionEntity('User');

      const versionedEntity = await getEntity('User', '0.0.1');
      expect(versionedEntity).toEqual({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        summary: 'User entity',
        markdown: '# User entity',
      });
    });
  });

  describe('entityHasVersion', () => {
    it('returns true if entity version exists', async () => {
      await writeEntity({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        summary: 'User entity',
        markdown: '# User entity',
      });

      const hasVersion = await entityHasVersion('User', '0.0.1');
      expect(hasVersion).toBe(true);
    });

    it('returns false if entity version does not exist', async () => {
      await writeEntity({
        id: 'User',
        name: 'User',
        version: '0.0.1',
        summary: 'User entity',
        markdown: '# User entity',
      });

      const hasVersion = await entityHasVersion('User', '0.0.2');
      expect(hasVersion).toBe(false);
    });

    it('returns false if entity does not exist', async () => {
      const hasVersion = await entityHasVersion('NonExistentEntity', '0.0.1');
      expect(hasVersion).toBe(false);
    });
  });
});
