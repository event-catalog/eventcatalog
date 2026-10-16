import { writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import {
  formatCustomExportReport,
  renderCustomExports,
  renderHtml,
  summariseCustomExportReport,
  writeHtml,
} from '@eventcatalog/exporters';
import { openInBrowser } from './open-in-browser';

interface ExportHtmlOptions {
  dir: string;
  output?: string;
  stdout?: boolean;
  /** Open the written file in the default browser. */
  open?: boolean;
  /** How to open it; replaceable in tests. */
  openFile?: (filePath: string) => Promise<boolean>;
  /** A custom export from the catalog's exports/ folder (by id) rather than the whole catalog. */
  customExport?: string;
  /** With `customExport`: say what's in it and what was left out, without writing it. */
  check?: boolean;
}

const indent = (text: string) =>
  text
    .split('\n')
    .map((line) => (line ? `  ${line}` : line))
    .join('\n');

/**
 * `eventcatalog export --format html`: the whole catalog as one self-contained HTML architecture reference, or with
 * `eventcatalog export <id>` one of the catalog's custom exports (part of it, chosen for people outside the team).
 */
export async function exportHtml({
  dir,
  output,
  stdout = false,
  open = false,
  openFile = openInBrowser,
  customExport,
  check = false,
}: ExportHtmlOptions): Promise<string> {
  if (check && !customExport) throw new Error('--check needs a custom export: eventcatalog export <id> --check');
  if (customExport) return exportCustom({ dir, output, stdout, open, openFile, id: customExport, check });
  if (stdout) return (await renderHtml(dir)).html;

  const { path, bytes, durationMs, model } = await writeHtml({ dir, outputPath: resolve(output || 'architecture.html') });
  const lines = [
    '',
    `  Exported architecture reference to ${path}`,
    `  ${model.messages.length} messages, ${model.services.length} services, ${model.domains.length} domains · ${Math.round(bytes / 1024)} KB in ${durationMs} ms`,
  ];
  if (open)
    lines.push((await openFile(path)) ? '  Opened it in your browser' : `  Could not open a browser. Open ${path} yourself.`);
  return [...lines, ''].join('\n');
}

async function exportCustom({
  dir,
  output,
  stdout,
  open,
  openFile,
  id,
  check,
}: Required<Pick<ExportHtmlOptions, 'dir' | 'stdout' | 'open' | 'openFile' | 'check'>> & { output?: string; id: string }) {
  // Only this export's own problems stop it: a broken file next to it doesn't
  const { rendered, failed } = await renderCustomExports(dir, { only: [id] });
  const failure = failed.find((f) => f.id === id);
  if (failure || !rendered.length) throw failure?.error ?? new Error(`Could not export "${id}".`);
  const [{ spec, html, report }] = rendered;
  const heading = `  ${spec.title} (${spec.file ?? spec.id})`;

  if (check) {
    const text = ['', heading, indent(formatCustomExportReport(report)), ''].join('\n');
    // A selector that matches nothing usually means a resource was renamed or removed: fail, so CI notices
    if (report.unmatched.length)
      throw new Error(
        `${text}\n  ${report.unmatched.length} selector(s) in ${spec.file ?? spec.id} matched nothing in the catalog.\n`
      );
    return text;
  }
  if (stdout) return html;

  const path = resolve(output || `${spec.id}.html`);
  writeFileSync(path, html, 'utf-8');
  const lines = [
    '',
    `  Exported "${spec.title}" to ${path}`,
    `  ${summariseCustomExportReport(report)} · ${Math.round(Buffer.byteLength(html) / 1024)} KB`,
    `  See what's in it and what was left out: eventcatalog export ${spec.id} --check`,
  ];
  if (report.unmatched.length) lines.push(`  Not found: ${report.unmatched.map((u) => `${u.field} ${u.selector}`).join(', ')}`);
  if (open)
    lines.push(
      (await openFile(path))
        ? '  Opened it in your browser'
        : `  Could not open a browser. Open ${relative(process.cwd(), path)} yourself.`
    );
  return [...lines, ''].join('\n');
}
