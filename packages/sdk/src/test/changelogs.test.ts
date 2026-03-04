import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';
import matter from 'gray-matter';

const CATALOG_PATH = path.join(__dirname, 'catalog-changelogs');

const { writeChangelog, appendChangelog, getChangelog, rmChangelog, writeEvent, writeService, versionEvent } =
  utils(CATALOG_PATH);

// clean the catalog before each test
beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Changelogs SDK', () => {
  describe('writeChangelog', () => {
    it('writes a changelog to an event', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      await writeChangelog('OrderCreated', {
        createdAt: '2024-08-01',
        markdown: '### Added support for JSON Schema',
      });

      const changelogPath = path.join(CATALOG_PATH, 'events', 'OrderCreated', 'changelog.mdx');
      expect(fs.existsSync(changelogPath)).toBe(true);

      const content = fs.readFileSync(changelogPath, 'utf-8');
      const parsed = matter(content);
      expect(parsed.data.createdAt).toBeDefined();
      expect(parsed.content.trim()).toBe('### Added support for JSON Schema');
    });

    it('writes a changelog with badges', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      await writeChangelog('OrderCreated', {
        createdAt: '2024-08-01',
        badges: [{ content: 'Breaking change', backgroundColor: 'red', textColor: 'red' }],
        markdown: '### Removed fields from schema',
      });

      const changelogPath = path.join(CATALOG_PATH, 'events', 'OrderCreated', 'changelog.mdx');
      const content = fs.readFileSync(changelogPath, 'utf-8');
      const parsed = matter(content);
      expect(parsed.data.badges).toEqual([{ content: 'Breaking change', backgroundColor: 'red', textColor: 'red' }]);
    });

    it('writes a changelog to a service', async () => {
      await writeService({
        id: 'InventoryService',
        name: 'Inventory Service',
        version: '1.0.0',
        summary: 'Service for inventory',
        markdown: '# Inventory Service',
      });

      await writeChangelog('InventoryService', {
        createdAt: '2024-08-01',
        markdown: '### Service receives additional events',
      });

      const changelogPath = path.join(CATALOG_PATH, 'services', 'InventoryService', 'changelog.mdx');
      expect(fs.existsSync(changelogPath)).toBe(true);
    });

    it('writes a changelog to a versioned resource', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      // Version the event to move it to versioned/1.0.0/
      await versionEvent('OrderCreated');

      // Write a new version
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '2.0.0',
        summary: 'Event for order creation v2',
        markdown: '# Order Created v2',
      });

      // Write changelog to the versioned resource
      await writeChangelog(
        'OrderCreated',
        {
          createdAt: '2024-07-01',
          markdown: '### Initial release',
        },
        { version: '1.0.0' }
      );

      const changelogPath = path.join(CATALOG_PATH, 'events', 'OrderCreated', 'versioned', '1.0.0', 'changelog.mdx');
      expect(fs.existsSync(changelogPath)).toBe(true);
    });

    it('writes a changelog in md format when specified', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      await writeChangelog(
        'OrderCreated',
        {
          createdAt: '2024-08-01',
          markdown: '### Some changes',
        },
        { format: 'md' }
      );

      const changelogPath = path.join(CATALOG_PATH, 'events', 'OrderCreated', 'changelog.md');
      expect(fs.existsSync(changelogPath)).toBe(true);
    });

    it('overwrites an existing changelog', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      await writeChangelog('OrderCreated', {
        createdAt: '2024-08-01',
        markdown: '### First entry',
      });

      await writeChangelog('OrderCreated', {
        createdAt: '2024-09-01',
        markdown: '### Updated entry',
      });

      const changelogPath = path.join(CATALOG_PATH, 'events', 'OrderCreated', 'changelog.mdx');
      const content = fs.readFileSync(changelogPath, 'utf-8');
      const parsed = matter(content);
      expect(parsed.content.trim()).toBe('### Updated entry');
    });

    it('throws an error if the resource is not found', async () => {
      await expect(
        writeChangelog('NonExistent', {
          createdAt: '2024-08-01',
          markdown: '### Some changes',
        })
      ).rejects.toThrow('No resource found with id: NonExistent');
    });

    it('does not include badges in frontmatter when empty array is provided', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      await writeChangelog('OrderCreated', {
        createdAt: '2024-08-01',
        badges: [],
        markdown: '### Some changes',
      });

      const changelogPath = path.join(CATALOG_PATH, 'events', 'OrderCreated', 'changelog.mdx');
      const content = fs.readFileSync(changelogPath, 'utf-8');
      const parsed = matter(content);
      expect(parsed.data.badges).toBeUndefined();
    });
  });

  describe('getChangelog', () => {
    it('returns the changelog for a resource', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      await writeChangelog('OrderCreated', {
        createdAt: '2024-08-01',
        markdown: '### Added support for JSON Schema',
      });

      const changelog = await getChangelog('OrderCreated');
      expect(changelog).toBeDefined();
      expect(changelog!.markdown).toBe('### Added support for JSON Schema');
    });

    it('returns the changelog with badges', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      await writeChangelog('OrderCreated', {
        createdAt: '2024-08-01',
        badges: [{ content: 'Breaking change', backgroundColor: 'red', textColor: 'red' }],
        markdown: '### Removed fields',
      });

      const changelog = await getChangelog('OrderCreated');
      expect(changelog).toBeDefined();
      expect(changelog!.badges).toEqual([{ content: 'Breaking change', backgroundColor: 'red', textColor: 'red' }]);
    });

    it('returns undefined if no changelog exists', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      const changelog = await getChangelog('OrderCreated');
      expect(changelog).toBeUndefined();
    });

    it('returns undefined if the resource does not exist', async () => {
      const changelog = await getChangelog('NonExistent');
      expect(changelog).toBeUndefined();
    });

    it('returns the changelog for a specific version', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      await versionEvent('OrderCreated');

      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '2.0.0',
        summary: 'Event for order creation v2',
        markdown: '# Order Created v2',
      });

      await writeChangelog(
        'OrderCreated',
        {
          createdAt: '2024-07-01',
          markdown: '### v1 changelog',
        },
        { version: '1.0.0' }
      );

      await writeChangelog('OrderCreated', {
        createdAt: '2024-08-01',
        markdown: '### v2 changelog',
      });

      const v1Changelog = await getChangelog('OrderCreated', { version: '1.0.0' });
      expect(v1Changelog).toBeDefined();
      expect(v1Changelog!.markdown).toBe('### v1 changelog');

      const latestChangelog = await getChangelog('OrderCreated');
      expect(latestChangelog).toBeDefined();
      expect(latestChangelog!.markdown).toBe('### v2 changelog');
    });
  });

  describe('appendChangelog', () => {
    it('creates a changelog if none exists', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      await appendChangelog('OrderCreated', {
        createdAt: '2024-08-01',
        markdown: '### First entry',
      });

      const changelog = await getChangelog('OrderCreated');
      expect(changelog).toBeDefined();
      expect(changelog!.markdown).toBe('### First entry');
    });

    it('prepends a new entry to an existing changelog separated by ---', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      await writeChangelog('OrderCreated', {
        createdAt: '2024-08-01',
        markdown: '### First entry',
      });

      await appendChangelog('OrderCreated', {
        createdAt: '2024-09-01',
        markdown: '### Second entry',
      });

      const changelog = await getChangelog('OrderCreated');
      expect(changelog).toBeDefined();
      expect(changelog!.markdown).toContain('### Second entry');
      expect(changelog!.markdown).toContain('---');
      expect(changelog!.markdown).toContain('### First entry');
      // New entry should come first
      expect(changelog!.markdown.indexOf('### Second entry')).toBeLessThan(changelog!.markdown.indexOf('### First entry'));
    });

    it('updates frontmatter createdAt to the latest entry', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      await writeChangelog('OrderCreated', {
        createdAt: '2024-08-01',
        markdown: '### First entry',
      });

      await appendChangelog('OrderCreated', {
        createdAt: '2024-09-15',
        markdown: '### Second entry',
      });

      const changelogPath = path.join(CATALOG_PATH, 'events', 'OrderCreated', 'changelog.mdx');
      const content = fs.readFileSync(changelogPath, 'utf-8');
      const parsed = matter(content);
      expect(new Date(parsed.data.createdAt).toISOString().slice(0, 10)).toBe('2024-09-15');
    });

    it('appends multiple entries preserving order', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      await appendChangelog('OrderCreated', {
        createdAt: '2024-08-01',
        markdown: '### First',
      });

      await appendChangelog('OrderCreated', {
        createdAt: '2024-09-01',
        markdown: '### Second',
      });

      await appendChangelog('OrderCreated', {
        createdAt: '2024-10-01',
        markdown: '### Third',
      });

      const changelog = await getChangelog('OrderCreated');
      expect(changelog).toBeDefined();
      const md = changelog!.markdown;
      expect(md.indexOf('### Third')).toBeLessThan(md.indexOf('### Second'));
      expect(md.indexOf('### Second')).toBeLessThan(md.indexOf('### First'));
    });

    it('appends to a specific version changelog', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      await versionEvent('OrderCreated');

      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '2.0.0',
        summary: 'Event for order creation v2',
        markdown: '# Order Created v2',
      });

      await writeChangelog(
        'OrderCreated',
        {
          createdAt: '2024-07-01',
          markdown: '### Initial release',
        },
        { version: '1.0.0' }
      );

      await appendChangelog(
        'OrderCreated',
        {
          createdAt: '2024-07-15',
          markdown: '### Patch fix',
        },
        { version: '1.0.0' }
      );

      const changelog = await getChangelog('OrderCreated', { version: '1.0.0' });
      expect(changelog).toBeDefined();
      expect(changelog!.markdown).toContain('### Patch fix');
      expect(changelog!.markdown).toContain('### Initial release');
    });

    it('throws an error if the resource does not exist', async () => {
      await expect(
        appendChangelog('NonExistent', {
          createdAt: '2024-08-01',
          markdown: '### Some changes',
        })
      ).rejects.toThrow('No resource found with id: NonExistent');
    });

    it('uses badges from the new entry', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      await writeChangelog('OrderCreated', {
        createdAt: '2024-08-01',
        markdown: '### First entry',
      });

      await appendChangelog('OrderCreated', {
        createdAt: '2024-09-01',
        badges: [{ content: 'Breaking change', backgroundColor: 'red', textColor: 'red' }],
        markdown: '### Breaking update',
      });

      const changelogPath = path.join(CATALOG_PATH, 'events', 'OrderCreated', 'changelog.mdx');
      const content = fs.readFileSync(changelogPath, 'utf-8');
      const parsed = matter(content);
      expect(parsed.data.badges).toEqual([{ content: 'Breaking change', backgroundColor: 'red', textColor: 'red' }]);
    });
  });

  describe('rmChangelog', () => {
    it('removes the changelog for a resource', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      await writeChangelog('OrderCreated', {
        createdAt: '2024-08-01',
        markdown: '### Some changes',
      });

      const changelogPath = path.join(CATALOG_PATH, 'events', 'OrderCreated', 'changelog.mdx');
      expect(fs.existsSync(changelogPath)).toBe(true);

      await rmChangelog('OrderCreated');
      expect(fs.existsSync(changelogPath)).toBe(false);
    });

    it('removes the changelog for a specific version', async () => {
      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '1.0.0',
        summary: 'Event for order creation',
        markdown: '# Order Created',
      });

      await versionEvent('OrderCreated');

      await writeEvent({
        id: 'OrderCreated',
        name: 'Order Created',
        version: '2.0.0',
        summary: 'Event for order creation v2',
        markdown: '# Order Created v2',
      });

      await writeChangelog(
        'OrderCreated',
        {
          createdAt: '2024-07-01',
          markdown: '### v1 changelog',
        },
        { version: '1.0.0' }
      );

      const changelogPath = path.join(CATALOG_PATH, 'events', 'OrderCreated', 'versioned', '1.0.0', 'changelog.mdx');
      expect(fs.existsSync(changelogPath)).toBe(true);

      await rmChangelog('OrderCreated', { version: '1.0.0' });
      expect(fs.existsSync(changelogPath)).toBe(false);
    });

    it('throws an error if the resource does not exist', async () => {
      await expect(rmChangelog('NonExistent')).rejects.toThrow('No resource found with id: NonExistent');
    });
  });
});
