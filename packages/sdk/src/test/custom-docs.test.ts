// sum.test.js
import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-custom-docs');

const { writeCustomDoc, getCustomDoc, getCustomDocs, rmCustomDoc } = utils(CATALOG_PATH);

// clean the catalog before each test
beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Custom Docs SDK', () => {
  describe('getCustomDoc', () => {
    it('returns a custom doc by the given path,', async () => {
      // Write a custom doc
      await writeCustomDoc(
        {
          title: 'Inventory Management',
          summary: 'This is a summary',
          markdown: '# Hello world',
          fileName: 'inventory-management',
        },
        { path: '/guides/inventory-management' }
      );

      const test = await getCustomDoc('/guides/inventory-management/inventory-management.mdx');

      expect(test).toEqual({
        title: 'Inventory Management',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('if the given path does not have .mdx extension, it will be added', async () => {
      await writeCustomDoc(
        {
          title: 'Inventory Management',
          summary: 'This is a summary',
          markdown: '# Hello world',
          fileName: 'inventory-management',
        },
        { path: '/guides/inventory-management' }
      );

      const test = await getCustomDoc('/guides/inventory-management/inventory-management');

      expect(test).toEqual({
        title: 'Inventory Management',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });
  });

  describe('getCustomDocs', () => {
    it('when no target path is given, returns all custom docs for the project', async () => {
      await writeCustomDoc(
        {
          title: 'Inventory Management',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/guides/inventory-management' }
      );
      await writeCustomDoc(
        {
          title: 'How to use inventory management',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/tutorials/how-to-use-inventory-management' }
      );

      const test = await getCustomDocs();

      expect(test).toEqual([
        { title: 'How to use inventory management', summary: 'This is a summary', markdown: '# Hello world' },
        { title: 'Inventory Management', summary: 'This is a summary', markdown: '# Hello world' },
      ]);
    });

    it('when a target path is given, returns all custom docs for the given path', async () => {
      await writeCustomDoc(
        {
          title: 'Inventory Management',
          summary: 'This is a summary',
          markdown: '# Hello world',
          fileName: 'inventory-management',
        },
        { path: '/guides/inventory-management' }
      );
      await writeCustomDoc(
        {
          title: 'How to use inventory management',
          summary: 'This is a summary',
          markdown: '# Hello world',
          fileName: 'how-to-use-inventory-management',
        },
        { path: '/tutorials/how-to-use-inventory-management' }
      );

      const tutorials = await getCustomDocs({ path: '/tutorials' });

      expect(tutorials).toEqual([
        { title: 'How to use inventory management', summary: 'This is a summary', markdown: '# Hello world' },
      ]);
    });
  });

  describe('writeCustomDoc', () => {
    it('writes a custom doc to the given path', async () => {
      await writeCustomDoc(
        {
          title: 'Inventory Management',
          summary: 'This is a summary',
          markdown: '# Hello world',
          fileName: 'inventory-management',
        },
        { path: '/guides/inventory-management' }
      );

      const test = await getCustomDoc('/guides/inventory-management/inventory-management');

      expect(test).toEqual({
        title: 'Inventory Management',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('if the given path does not have .mdx extension, it will be added', async () => {
      await writeCustomDoc(
        {
          title: 'Inventory Management',
          summary: 'This is a summary',
          markdown: '# Hello world',
          fileName: 'inventory-management',
        },
        { path: '/guides/inventory-management' }
      );

      const test = await getCustomDoc('/guides/inventory-management/inventory-management');

      expect(test).toEqual({
        title: 'Inventory Management',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });

    it('if no filename is given, it will use the title as the filename', async () => {
      await writeCustomDoc(
        {
          title: 'Inventory Management',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/guides/inventory-management' }
      );

      const test = await getCustomDoc('/guides/inventory-management/inventory-management');

      expect(test).toEqual({
        title: 'Inventory Management',
        summary: 'This is a summary',
        markdown: '# Hello world',
      });
    });
  });

  describe('rmCustomDoc', () => {
    it('removes a custom doc at the given path', async () => {
      await writeCustomDoc(
        {
          title: 'Inventory Management',
          summary: 'This is a summary',
          markdown: '# Hello world',
          fileName: 'inventory-management',
        },
        { path: '/guides/inventory-management' }
      );

      await rmCustomDoc('/guides/inventory-management/inventory-management.mdx');
      const test = await getCustomDoc('/guides/inventory-management/inventory-management');

      expect(test).toBeUndefined();
    });

    it('if no extension is given, it will be added', async () => {
      await writeCustomDoc(
        {
          title: 'Inventory Management',
          summary: 'This is a summary',
          markdown: '# Hello world',
        },
        { path: '/guides/inventory-management' }
      );

      await rmCustomDoc('/guides/inventory-management/inventory-management');
      const test = await getCustomDoc('/guides/inventory-management/inventory-management');

      expect(test).toBeUndefined();
    });
  });
});
