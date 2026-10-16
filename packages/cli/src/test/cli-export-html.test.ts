import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import createSDK from '@eventcatalog/sdk';
import { exportHtml } from '../cli/export-html';

const CATALOG_PATH = path.join(__dirname, 'catalog-export-html-test');
const { writeEvent, writeService } = createSDK(CATALOG_PATH);

beforeEach(async () => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('export --format html', () => {
  it('prints the HTML reference with --stdout', async () => {
    await writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', markdown: '' });

    const html = await exportHtml({ dir: CATALOG_PATH, stdout: true });

    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('id="event-OrderPlaced"');
  });

  it('writes the file and reports what it exported', async () => {
    await writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', markdown: '' });
    await writeService({ id: 'Orders', name: 'Orders', version: '1.0.0', sends: [{ id: 'OrderPlaced' }], markdown: '' });
    const output = path.join(CATALOG_PATH, 'architecture.html');

    const result = await exportHtml({ dir: CATALOG_PATH, output });

    expect(fs.existsSync(output)).toBe(true);
    expect(result).toContain(`Exported architecture reference to ${output}`);
    expect(result).toContain('1 messages, 1 services, 0 domains');
  });

  it('opens the written file when asked to', async () => {
    await writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', markdown: '' });
    const output = path.join(CATALOG_PATH, 'architecture.html');
    const openFile = vi.fn().mockResolvedValue(true);

    const result = await exportHtml({ dir: CATALOG_PATH, output, open: true, openFile });

    expect(openFile).toHaveBeenCalledWith(output);
    expect(result).toContain('Opened it in your browser');
  });

  it('tells you where the file is when no browser can be opened', async () => {
    await writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', markdown: '' });
    const output = path.join(CATALOG_PATH, 'architecture.html');

    const result = await exportHtml({ dir: CATALOG_PATH, output, open: true, openFile: async () => false });

    expect(result).toContain(`Could not open a browser. Open ${output} yourself.`);
  });

  it('does not open anything unless asked to', async () => {
    await writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', markdown: '' });
    const openFile = vi.fn();

    await exportHtml({ dir: CATALOG_PATH, output: path.join(CATALOG_PATH, 'architecture.html'), openFile });

    expect(openFile).not.toHaveBeenCalled();
  });

  it('fails when the catalog has no resources', async () => {
    await expect(exportHtml({ dir: CATALOG_PATH, stdout: true })).rejects.toThrow('No resources found');
  });

  describe('custom exports', () => {
    const writeExportFile = (name: string, source: string) => {
      fs.mkdirSync(path.join(CATALOG_PATH, 'exports'), { recursive: true });
      fs.writeFileSync(path.join(CATALOG_PATH, 'exports', name), source);
    };

    beforeEach(async () => {
      await writeEvent({ id: 'OrderPlaced', name: 'Order Placed', version: '1.0.0', markdown: '' });
      await writeService({ id: 'Orders', name: 'Orders', version: '1.0.0', sends: [{ id: 'OrderPlaced' }], markdown: '' });
      writeExportFile('partners.mdx', '---\ntitle: For partners\ninclude:\n  - event: OrderPlaced\n---\n\nHello partners.\n');
    });

    it('exports one even when another file next to it is broken, and reports a broken one asked for', async () => {
      writeExportFile('broken.mdx', '---\ntitle: Broken\ninclude:\n  - widget: A\n---\n');

      await expect(exportHtml({ dir: CATALOG_PATH, customExport: 'partners', stdout: true })).resolves.toContain(
        '<h1>For partners</h1>'
      );
      await expect(exportHtml({ dir: CATALOG_PATH, customExport: 'broken', check: true })).rejects.toThrow(
        '"widget" isn\'t a resource kind'
      );
    });

    it('writes the custom export to <id>.html and says what was left out', async () => {
      const output = path.join(CATALOG_PATH, 'partners.html');

      const result = await exportHtml({ dir: CATALOG_PATH, customExport: 'partners', output });

      expect(fs.readFileSync(output, 'utf-8')).toContain('<h1>For partners</h1>');
      expect(fs.readFileSync(output, 'utf-8')).not.toContain('Orders</');
      expect(result).toContain(`Exported "For partners" to ${output}`);
      expect(result).toContain('1 resource, 1 link dropped');
      expect(result).toContain('eventcatalog export partners --check');
    });

    it('lists what is in it with --check, without writing anything', async () => {
      const result = await exportHtml({ dir: CATALOG_PATH, customExport: 'partners', check: true });

      expect(result).toContain('For partners (exports/partners.mdx)');
      expect(result).toContain('Included (1)');
      expect(result).toContain('Links dropped (1)');
      expect(result).toContain('event OrderPlaced  →  service Orders  (not in this export)');
      expect(fs.readdirSync(CATALOG_PATH)).not.toContain('partners.html');
    });

    it('fails --check when the custom export names something the catalog no longer has', async () => {
      writeExportFile(
        'partners.mdx',
        '---\ntitle: For partners\ninclude:\n  - event: OrderPlaced\n  - event: OrderShipped\n---\n'
      );

      await expect(exportHtml({ dir: CATALOG_PATH, customExport: 'partners', check: true })).rejects.toThrow(
        '1 selector(s) in exports/partners.mdx matched nothing in the catalog'
      );
    });

    it('names the custom exports there are when the one asked for is not one of them', async () => {
      await expect(exportHtml({ dir: CATALOG_PATH, customExport: 'nope', stdout: true })).rejects.toThrow(
        'Custom exports: partners'
      );
      await expect(exportHtml({ dir: CATALOG_PATH, check: true })).rejects.toThrow('--check needs a custom export');
    });
  });
});
