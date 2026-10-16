import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import createSDK from '@eventcatalog/sdk';
import { loadCatalog } from '../catalog/load';
import type { CatalogModel } from '../catalog/model';
import { renderDocument } from '../html/render';
import { selectCustomExport, type CustomExportReport } from './select';
import {
  DEFAULT_CUSTOM_EXPORTS_DIR,
  CustomExportError,
  loadCustomExports,
  resolveCustomExportsConfig,
  type ExportSelector,
  type CustomExportFailure,
  type CustomExportSpec,
  type CustomExportsConfig,
} from './spec';

export { selectCustomExport } from './select';
export type { CustomExportEntry, CustomExportLink, CustomExportReport } from './select';
export { formatCustomExportReport, summariseCustomExportReport } from './report';
export {
  DEFAULT_CUSTOM_EXPORTS_DIR,
  DEFAULT_HIDE,
  CustomExportError,
  HIDE_FIELDS,
  REFERENCE_POLICIES,
  isPropertySelector,
  loadCustomExports,
  parseCustomExport,
  resolveCustomExportsConfig,
} from './spec';
export type {
  CustomExportDefaults,
  CustomExportFailure,
  ExportSelector,
  CustomExportSpec,
  CustomExportsConfig,
  HideField,
  PropertySelector,
  ReferencePolicy,
  ResourceSelector,
} from './spec';

export interface RenderedCustomExport {
  spec: CustomExportSpec;
  html: string;
  /** The catalog as the export has it: only what's in it, with pointers out of it dropped. */
  model: CatalogModel;
  report: CustomExportReport;
}

export interface WrittenCustomExport extends RenderedCustomExport {
  path: string;
  bytes: number;
}

/** `exports.custom` from the catalog's eventcatalog.config.js, or nothing when it has none. */
export const readCustomExportsConfig = async (dir: string): Promise<CustomExportsConfig> => {
  if (!existsSync(join(dir, 'eventcatalog.config.js'))) return {};
  const config = await createSDK(dir)
    .getEventCatalogConfigurationFile()
    .catch(() => null);
  return config?.exports?.custom ?? {};
};

/** One custom export from a catalog that's already loaded. */
export const renderCatalogCustomExport = (
  catalog: CatalogModel,
  spec: CustomExportSpec,
  { neverExport = [] }: { neverExport?: ExportSelector[] } = {}
): RenderedCustomExport => {
  const { model, report, intro } = selectCustomExport(catalog, spec, { neverExport });
  if (!report.included.length)
    throw new CustomExportError(
      `The custom export ${spec.file ?? spec.id} has nothing in it.`,
      report.unmatched.length
        ? report.unmatched.map((u) => `${u.field} ${u.selector}: ${u.reason}`)
        : ['Everything it includes is excluded.']
    );
  const html = renderDocument(model, {
    customExport: { title: spec.title, summary: spec.summary, audience: spec.audience, version: spec.version, intro },
    hideOwners: spec.hide.includes('owners'),
  });
  return { spec, html, model, report };
};

/**
 * The catalog's custom exports (the files in `exports/`), rendered: all of them, or those named in `only`. The catalog is
 * loaded once for all of them. `config` is `exports.custom` from eventcatalog.config.js (read from the catalog
 * when not given).
 *
 * Each export stands alone: one that can't be exported (its file has problems, it has nothing in it, or an id in
 * `only` has no file) is in `failed`, and the rest are still rendered. A problem with the config itself throws.
 */
export async function renderCustomExports(
  dir: string,
  { only, config }: { only?: string[]; config?: CustomExportsConfig } = {}
): Promise<{ rendered: RenderedCustomExport[]; failed: CustomExportFailure[] }> {
  const resolved = resolveCustomExportsConfig(config ?? (await readCustomExportsConfig(resolve(dir))));
  const { found, failed: unreadable } = loadCustomExports(resolve(dir), resolved);
  const wanted = only ?? resolved.only;
  const isWanted = (id: string) => !wanted || wanted.includes(id);
  const failed = unreadable.filter((f) => isWanted(f.id));

  const folder = resolved.dir || DEFAULT_CUSTOM_EXPORTS_DIR;
  const known = [...found.map((d) => d.id), ...unreadable.map((f) => f.id)];
  for (const id of (wanted ?? []).filter((id) => !known.includes(id)))
    failed.push({
      id,
      error: new CustomExportError(
        `No custom export "${id}" in ${folder}/.`,
        known.length ? [`Custom exports: ${[...new Set(known)].sort().join(', ')}`] : [`Add one as ${folder}/${id}.mdx`]
      ),
    });

  const chosen = found.filter((d) => isWanted(d.id));
  if (!chosen.length) return { rendered: [], failed };
  const catalog = await loadCatalog(resolve(dir));
  const rendered: RenderedCustomExport[] = [];
  for (const spec of chosen) {
    try {
      rendered.push(renderCatalogCustomExport(catalog, spec, { neverExport: resolved.neverExport }));
    } catch (error) {
      if (!(error instanceof CustomExportError)) throw error;
      failed.push({ id: spec.id, file: spec.file, error });
    }
  }
  return { rendered, failed };
}

/** Renders the catalog's custom exports and writes each to `<outputDir>/<id>.html`. Those that can't be are in `failed`. */
export async function writeCustomExports({
  dir,
  outputDir,
  only,
  config,
}: {
  dir: string;
  outputDir: string;
  only?: string[];
  config?: CustomExportsConfig;
}): Promise<{ written: WrittenCustomExport[]; failed: CustomExportFailure[] }> {
  const { rendered, failed } = await renderCustomExports(dir, { only, config });
  if (rendered.length) mkdirSync(resolve(outputDir), { recursive: true });
  const written = rendered.map((exported) => {
    const path = resolve(outputDir, `${exported.spec.id}.html`);
    writeFileSync(path, exported.html, 'utf-8');
    return { ...exported, path, bytes: Buffer.byteLength(exported.html) };
  });
  return { written, failed };
}
