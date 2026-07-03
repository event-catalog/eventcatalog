import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-adrs');

const { writeAdr, getAdr, getAdrs, rmAdr, rmAdrById, versionAdr, adrHasVersion, addFileToAdr } = utils(CATALOG_PATH);

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('ADRs SDK', () => {
  describe('getAdr', () => {
    it('returns the given ADR id from EventCatalog and the latest version when no version is given', async () => {
      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        summary: 'Use the transactional outbox pattern for integration events',
        status: 'accepted',
        date: '2024-01-15',
        decisionMakers: ['platform-team', 'dboyne'],
        appliesTo: [{ id: 'OrdersService', version: '1.0.0', type: 'service' }],
        markdown: '# Use Transactional Outbox',
      });

      const adr = await getAdr('use-transactional-outbox');

      expect(adr).toEqual({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        summary: 'Use the transactional outbox pattern for integration events',
        status: 'accepted',
        date: '2024-01-15',
        decisionMakers: ['platform-team', 'dboyne'],
        appliesTo: [{ id: 'OrdersService', version: '1.0.0', type: 'service' }],
        markdown: '# Use Transactional Outbox',
      });
    });

    it('returns the given ADR id from EventCatalog and the requested version when a version is given', async () => {
      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });

      await versionAdr('use-transactional-outbox');

      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '2.0.0',
        status: 'superseded',
        date: '2024-02-15',
        markdown: '# Use Transactional Outbox v2',
      });

      const adr = await getAdr('use-transactional-outbox', '1.0.0');

      expect(adr).toEqual({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });
    });

    it('returns undefined when a given resource is not found', async () => {
      const adr = await getAdr('missing-adr');
      expect(adr).toEqual(undefined);
    });
  });

  describe('getAdrs', () => {
    it('returns all ADRs from the catalog', async () => {
      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });

      await writeAdr({
        id: 'use-postgres',
        name: 'Use Postgres',
        version: '1.0.0',
        status: 'proposed',
        date: '2024-01-20',
        markdown: '# Use Postgres',
      });

      const adrs = await getAdrs();
      expect(adrs).toHaveLength(2);
      expect(adrs.map((adr) => adr.id).sort()).toEqual(['use-postgres', 'use-transactional-outbox']);
    });

    it('returns only latest versions when latestOnly is true', async () => {
      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });

      await versionAdr('use-transactional-outbox');

      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '2.0.0',
        status: 'superseded',
        date: '2024-02-15',
        markdown: '# Use Transactional Outbox v2',
      });

      const adrs = await getAdrs({ latestOnly: true });
      expect(adrs).toHaveLength(1);
      expect(adrs[0].version).toBe('2.0.0');
    });
  });

  describe('writeAdr', () => {
    it('writes the given ADR to the file system', async () => {
      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        summary: 'Use the transactional outbox pattern for integration events',
        status: 'accepted',
        date: '2024-01-15',
        supersedes: [{ id: 'publish-after-commit', version: '1.0.0' }],
        related: [{ id: 'use-postgres' }],
        markdown: '# Use Transactional Outbox',
      });

      const adr = await getAdr('use-transactional-outbox');

      expect(adr).toEqual({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        summary: 'Use the transactional outbox pattern for integration events',
        status: 'accepted',
        date: '2024-01-15',
        supersedes: [{ id: 'publish-after-commit', version: '1.0.0' }],
        related: [{ id: 'use-postgres' }],
        markdown: '# Use Transactional Outbox',
      });
    });

    it('writes the ADR to a custom path when path is provided', async () => {
      await writeAdr(
        {
          id: 'use-transactional-outbox',
          name: 'Use Transactional Outbox',
          version: '1.0.0',
          status: 'accepted',
          date: '2024-01-15',
          markdown: '# Use Transactional Outbox',
        },
        { path: '/technical/use-transactional-outbox' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'adrs/technical/use-transactional-outbox', 'index.mdx'))).toBe(true);
      expect(await getAdr('use-transactional-outbox')).toEqual({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });
    });

    it('throws an error when trying to write an ADR that already exists', async () => {
      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });

      await expect(
        writeAdr({
          id: 'use-transactional-outbox',
          name: 'Use Transactional Outbox',
          version: '1.0.0',
          status: 'accepted',
          date: '2024-01-15',
          markdown: '# Use Transactional Outbox',
        })
      ).rejects.toThrowError('Failed to write use-transactional-outbox (adr) as the version 1.0.0 already exists');
    });

    it('overrides the ADR when trying to write an ADR that already exists and override is true', async () => {
      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });

      await writeAdr(
        {
          id: 'use-transactional-outbox',
          name: 'Use Transactional Outbox',
          version: '1.0.0',
          status: 'accepted',
          date: '2024-01-15',
          markdown: 'Overridden content',
        },
        { override: true }
      );

      const adr = await getAdr('use-transactional-outbox');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'adrs/use-transactional-outbox', 'index.mdx'))).toBe(true);
      expect(adr.markdown).toBe('Overridden content');
    });

    it('versions the previous ADR when trying to write an ADR that already exists and versionExistingContent is true', async () => {
      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });

      await writeAdr(
        {
          id: 'use-transactional-outbox',
          name: 'Use Transactional Outbox',
          version: '2.0.0',
          status: 'accepted',
          date: '2024-02-15',
          markdown: '# Use Transactional Outbox v2',
        },
        { versionExistingContent: true }
      );

      const adr = await getAdr('use-transactional-outbox');
      expect(adr.version).toBe('2.0.0');
      expect(adr.markdown).toBe('# Use Transactional Outbox v2');
      expect(fs.existsSync(path.join(CATALOG_PATH, 'adrs/use-transactional-outbox/versioned/1.0.0', 'index.mdx'))).toBe(true);
    });

    it('writes the ADR as md when format is md', async () => {
      await writeAdr(
        {
          id: 'use-transactional-outbox',
          name: 'Use Transactional Outbox',
          version: '1.0.0',
          status: 'accepted',
          date: '2024-01-15',
          markdown: '# Use Transactional Outbox',
        },
        { format: 'md' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'adrs/use-transactional-outbox', 'index.md'))).toBe(true);
    });
  });

  describe('rmAdr', () => {
    it('removes an ADR by its path', async () => {
      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });

      await rmAdr('/use-transactional-outbox');

      expect(await getAdr('use-transactional-outbox')).toEqual(undefined);
    });
  });

  describe('rmAdrById', () => {
    it('removes an ADR by its id', async () => {
      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });

      await rmAdrById('use-transactional-outbox');

      expect(await getAdr('use-transactional-outbox')).toEqual(undefined);
    });

    it('removes a specific version of an ADR by its id and version', async () => {
      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });

      await versionAdr('use-transactional-outbox');

      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '2.0.0',
        status: 'superseded',
        date: '2024-02-15',
        markdown: '# Use Transactional Outbox v2',
      });

      await rmAdrById('use-transactional-outbox', '1.0.0');

      expect(await getAdr('use-transactional-outbox', '1.0.0')).toEqual(undefined);
      expect(await getAdr('use-transactional-outbox', '2.0.0')).toEqual({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '2.0.0',
        status: 'superseded',
        date: '2024-02-15',
        markdown: '# Use Transactional Outbox v2',
      });
    });
  });

  describe('versionAdr', () => {
    it('versions an ADR by moving it to a versioned directory', async () => {
      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });

      await versionAdr('use-transactional-outbox');

      expect(await getAdr('use-transactional-outbox', '1.0.0')).toEqual({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });
    });
  });

  describe('adrHasVersion', () => {
    it('returns true if ADR version exists', async () => {
      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });

      expect(await adrHasVersion('use-transactional-outbox', '1.0.0')).toBe(true);
    });

    it('returns false if ADR version does not exist', async () => {
      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });

      expect(await adrHasVersion('use-transactional-outbox', '2.0.0')).toBe(false);
    });

    it('returns false if ADR does not exist', async () => {
      expect(await adrHasVersion('missing-adr', '1.0.0')).toBe(false);
    });
  });

  describe('addFileToAdr', () => {
    it('adds a file to the ADR', async () => {
      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });

      await addFileToAdr('use-transactional-outbox', { content: 'decision context', fileName: 'context.txt' });

      const filePath = path.join(CATALOG_PATH, 'adrs/use-transactional-outbox', 'context.txt');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('decision context');
    });

    it('adds a file to a specific version of the ADR', async () => {
      await writeAdr({
        id: 'use-transactional-outbox',
        name: 'Use Transactional Outbox',
        version: '1.0.0',
        status: 'accepted',
        date: '2024-01-15',
        markdown: '# Use Transactional Outbox',
      });

      await versionAdr('use-transactional-outbox');

      await addFileToAdr('use-transactional-outbox', { content: 'decision context v1', fileName: 'context.txt' }, '1.0.0');

      const filePath = path.join(CATALOG_PATH, 'adrs/use-transactional-outbox/versioned/1.0.0', 'context.txt');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('decision context v1');
    });

    it('throws an error when trying to write to an ADR that does not exist', async () => {
      await expect(addFileToAdr('missing-adr', { content: 'hello', fileName: 'test.txt' })).rejects.toThrowError(
        'Cannot find directory to write file to'
      );
    });
  });
});
