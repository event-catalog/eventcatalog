// sum.test.js
import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import os from 'node:os';
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

  describe('path containment', () => {
    let parentDirectory: string;
    let catalogDirectory: string;
    let markerPath: string;

    const escapes = (filePath: string) => `Custom doc path "${filePath}" escapes the catalog docs directory`;

    const relativeEscape = () => path.relative(path.join(catalogDirectory, 'docs'), markerPath);

    const absoluteEscape = () => `/${relativeEscape().split(path.sep).join('/')}`;

    beforeEach(() => {
      parentDirectory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-custom-docs-')));
      catalogDirectory = path.join(parentDirectory, 'catalog');
      fs.mkdirSync(path.join(catalogDirectory, 'docs'), { recursive: true });
      markerPath = path.join(parentDirectory, 'marker.mdx');
      fs.writeFileSync(markerPath, 'MARKER');
    });

    afterEach(() => {
      fs.rmSync(parentDirectory, { recursive: true, force: true });
    });

    it('does not read a file outside the catalog via ../ or an absolute path', async () => {
      const { getCustomDoc } = utils(catalogDirectory);
      const relativePath = relativeEscape();
      const absolutePath = absoluteEscape();

      await expect(getCustomDoc(relativePath)).rejects.toThrow(escapes(relativePath));
      await expect(getCustomDoc(absolutePath)).rejects.toThrow(escapes(absolutePath));
      await expect(getCustomDoc(relativePath.split('/').join('\\'))).rejects.toThrow(escapes(relativePath.split('/').join('\\')));
      await expect(getCustomDoc(markerPath)).resolves.toBeUndefined();
      await expect(getCustomDoc('C:\\secret\\marker.mdx')).rejects.toThrow(escapes('C:\\secret\\marker.mdx'));

      expect(fs.readFileSync(markerPath, 'utf8')).toBe('MARKER');
    });

    it('does not write a file outside the catalog via ../ or an absolute path', async () => {
      const { writeCustomDoc } = utils(catalogDirectory);
      const relativePath = relativeEscape();
      const absolutePath = absoluteEscape();
      const relativeDirectory = path.dirname(relativePath).split(path.sep).join('/');
      const absoluteDirectory = absolutePath.replace(/\/marker\.mdx$/, '');
      const payload = { title: 'Nope', markdown: 'PWNED', fileName: 'marker.mdx' };

      await expect(writeCustomDoc({ ...payload, fileName: relativePath })).rejects.toThrow(escapes(relativePath));
      await expect(writeCustomDoc(payload, { path: relativeDirectory })).rejects.toThrow(
        escapes(`${relativeDirectory}/marker.mdx`)
      );
      await expect(writeCustomDoc(payload, { path: absoluteDirectory })).rejects.toThrow(
        escapes(`${absoluteDirectory}/marker.mdx`)
      );
      await expect(writeCustomDoc({ ...payload, fileName: 'C:\\secret\\marker.mdx' })).rejects.toThrow(
        escapes('C:\\secret\\marker.mdx')
      );

      // A filesystem-absolute file name is catalog-relative after the leading slash, so it cannot replace the marker.
      await writeCustomDoc({ ...payload, fileName: markerPath });
      const containedPath = path.join(catalogDirectory, 'docs', markerPath.replace(/^[/\\]+/, ''));

      expect(fs.readFileSync(markerPath, 'utf8')).toBe('MARKER');
      expect(fs.existsSync(containedPath)).toBe(true);
      expect(fs.readFileSync(containedPath, 'utf8')).toContain('PWNED');
    });

    it('does not delete a file outside the catalog via ../ or an absolute path', async () => {
      const { rmCustomDoc } = utils(catalogDirectory);
      const relativePath = relativeEscape();
      const absolutePath = absoluteEscape();

      await expect(rmCustomDoc(relativePath)).rejects.toThrow(escapes(relativePath));
      await expect(rmCustomDoc(absolutePath)).rejects.toThrow(escapes(absolutePath));
      await expect(rmCustomDoc(markerPath)).rejects.toThrow();

      expect(fs.readFileSync(markerPath, 'utf8')).toBe('MARKER');
    });

    it('does not list custom docs outside the catalog via ../ or an absolute path', async () => {
      const { getCustomDocs } = utils(catalogDirectory);
      const relativePath = path.dirname(relativeEscape());
      const absolutePath = absoluteEscape().replace(/\/marker\.mdx$/, '');

      await expect(getCustomDocs({ path: relativePath })).rejects.toThrow(escapes(relativePath));
      await expect(getCustomDocs({ path: absolutePath })).rejects.toThrow(escapes(absolutePath));

      expect(fs.readFileSync(markerPath, 'utf8')).toBe('MARKER');
    });

    it('does not follow a symlink outside the catalog docs directory', async () => {
      const { getCustomDoc, writeCustomDoc, rmCustomDoc } = utils(catalogDirectory);
      fs.symlinkSync(parentDirectory, path.join(catalogDirectory, 'docs', 'escape'));

      await expect(getCustomDoc('/escape/marker.mdx')).rejects.toThrow(escapes('/escape/marker.mdx'));
      await expect(
        writeCustomDoc({ title: 'Nope', markdown: 'PWNED', fileName: 'planted.mdx' }, { path: '/escape' })
      ).rejects.toThrow(escapes('/escape/planted.mdx'));
      await expect(rmCustomDoc('/escape/marker.mdx')).rejects.toThrow(escapes('/escape/marker.mdx'));

      await writeCustomDoc({ title: 'Inside', markdown: 'SAFE', fileName: 'inside' }, { path: '/guides' });
      await expect(getCustomDoc('/guides/inside')).resolves.toEqual({
        title: 'Inside',
        markdown: 'SAFE',
      });

      expect(fs.readFileSync(markerPath, 'utf8')).toBe('MARKER');
      expect(fs.existsSync(path.join(parentDirectory, 'planted.mdx'))).toBe(false);
    });
  });
});
