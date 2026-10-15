import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadCatalog } from '../catalog/load';
import type { CatalogModel } from '../catalog/model';
import { renderDocument, type RenderHtmlOptions } from './render';

export type { RenderHtmlOptions } from './render';

export interface RenderHtmlResult {
  html: string;
  model: CatalogModel;
}

export interface WriteHtmlResult extends RenderHtmlResult {
  path: string;
  bytes: number;
  durationMs: number;
}

/**
 * Renders the whole catalog as one self-contained HTML architecture reference: no build step,
 * no runtime framework, a single file to open, attach or host anywhere.
 */
export async function renderHtml(dir: string, options: RenderHtmlOptions = {}): Promise<RenderHtmlResult> {
  const model = await loadCatalog(resolve(dir));
  if (!model.domains.length && !model.services.length && !model.messages.length) {
    throw new Error(`No resources found in catalog at '${dir}'`);
  }
  return { html: renderDocument(model, options), model };
}

/** Renders the architecture reference and writes it to `outputPath`, creating the folder if needed. */
export async function writeHtml({
  dir,
  outputPath,
  ...options
}: { dir: string; outputPath: string } & RenderHtmlOptions): Promise<WriteHtmlResult> {
  const started = performance.now();
  const result = await renderHtml(dir, options);
  const path = resolve(outputPath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, result.html, 'utf-8');
  return { ...result, path, bytes: Buffer.byteLength(result.html), durationMs: Math.round(performance.now() - started) };
}
