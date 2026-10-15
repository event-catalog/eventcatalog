import { resolve } from 'node:path';
import { renderHtml, writeHtml } from '@eventcatalog/exporters';
import { openInBrowser } from './open-in-browser';

interface ExportHtmlOptions {
  dir: string;
  output?: string;
  stdout?: boolean;
  /** Open the written file in the default browser. */
  open?: boolean;
  /** How to open it; replaceable in tests. */
  openFile?: (filePath: string) => Promise<boolean>;
}

/** `eventcatalog export --format html`: the whole catalog as one self-contained HTML architecture reference. */
export async function exportHtml({
  dir,
  output,
  stdout = false,
  open = false,
  openFile = openInBrowser,
}: ExportHtmlOptions): Promise<string> {
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
