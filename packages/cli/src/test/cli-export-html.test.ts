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
});
