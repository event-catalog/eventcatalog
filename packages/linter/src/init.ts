import fs from 'fs';
import path from 'path';
import { RULE_CATEGORIES } from './rules';
import { scanCatalogFiles } from './scanner';
import { ResourceType } from './schemas';

/**
 * Scaffolds a commented `.eventcatalogrc.js` so users can see every rule, its default and
 * how to configure it without reading the docs.
 */

export const CONFIG_FILE_NAME = '.eventcatalogrc.js';

export type ConfigModuleFormat = 'commonjs' | 'esm';

export interface InitOptions {
  /** Overwrite an existing config file */
  force?: boolean;
  /** Module format to write. Detected from package.json `type` when omitted. */
  format?: ConfigModuleFormat;
}

export interface InitResult {
  configPath: string;
  format: ConfigModuleFormat;
  resourceCounts: Partial<Record<ResourceType, number>>;
  filesScanned: number;
}

/** ESM catalogs (`"type": "module"`) need `export default`; everything else uses `module.exports`. */
export const detectModuleFormat = (rootDir: string): ConfigModuleFormat => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
    return pkg.type === 'module' ? 'esm' : 'commonjs';
  } catch {
    return 'commonjs';
  }
};

const RESOURCE_LABELS: Partial<Record<ResourceType, string>> = {
  dataProduct: 'data products',
  entity: 'entities',
  query: 'queries',
};

const labelFor = (type: ResourceType, count: number): string => {
  const label = RESOURCE_LABELS[type] ?? `${type}s`;
  return count === 1 ? label.replace(/ies$/, 'y').replace(/s$/, '') : label;
};

const formatCounts = (counts: Partial<Record<ResourceType, number>>): string => {
  const entries = Object.entries(counts)
    .filter(([, count]) => (count ?? 0) > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)) as [ResourceType, number][];
  if (entries.length === 0) return 'No catalog resources were found in this directory yet.';
  return `Found ${entries.map(([type, count]) => `${count} ${labelFor(type, count)}`).join(', ')}.`;
};

export const generateConfig = ({
  format,
  resourceCounts = {},
}: {
  format: ConfigModuleFormat;
  resourceCounts?: Partial<Record<ResourceType, number>>;
}): string => {
  const lines: string[] = [];

  lines.push('// EventCatalog Linter configuration');
  lines.push('// Docs: https://www.eventcatalog.dev/docs/development/developer-tools/eventcatalog-linter');
  lines.push('//');
  lines.push(`// ${formatCounts(resourceCounts)}`);
  lines.push('//');
  lines.push("// Every rule is listed with its default severity: 'error' fails the run, 'warn' reports");
  lines.push("// without failing (unless --fail-on-warning / --max-warnings is used), 'off' disables it.");
  lines.push("// Rules that accept options take the form ['error', { ...options }].");
  lines.push('');
  lines.push(format === 'esm' ? 'export default {' : 'module.exports = {');
  lines.push('  rules: {');

  RULE_CATEGORIES.forEach((category, index) => {
    if (index > 0) lines.push('');
    lines.push(`    // ${category.title}`);
    for (const rule of category.rules) {
      lines.push(`    // ${rule.description}`);
      if (rule.optionsExample) {
        lines.push(`    // e.g. '${rule.name}': ['${rule.default}', ${rule.optionsExample}],`);
      }
      lines.push(`    '${rule.name}': '${rule.default}',`);
    }
  });

  lines.push('  },');
  lines.push('');
  lines.push('  // Skip files matching these glob patterns');
  lines.push('  ignorePatterns: [');
  lines.push("    // '**/drafts/**',");
  lines.push('  ],');
  lines.push('');
  lines.push('  // Apply different rule settings to specific files');
  lines.push('  overrides: [');
  lines.push('    // {');
  lines.push("    //   files: ['**/legacy/**'],");
  lines.push('    //   rules: {');
  lines.push("    //     'best-practices/owner-required': 'warn',");
  lines.push('    //   },');
  lines.push('    // },');
  lines.push('  ],');
  lines.push('};');
  lines.push('');

  return lines.join('\n');
};

export const countResources = async (
  rootDir: string
): Promise<{ counts: Partial<Record<ResourceType, number>>; total: number }> => {
  const files = await scanCatalogFiles(rootDir);
  const counts: Partial<Record<ResourceType, number>> = {};
  for (const file of files) {
    if (file.version) continue; // count each resource once, not every historic version
    counts[file.resourceType] = (counts[file.resourceType] ?? 0) + 1;
  }
  return { counts, total: files.length };
};

export class ConfigExistsError extends Error {
  constructor(public readonly configPath: string) {
    super(`${CONFIG_FILE_NAME} already exists at ${configPath}. Use --force to overwrite it.`);
    this.name = 'ConfigExistsError';
  }
}

export const initConfig = async (rootDir: string, options: InitOptions = {}): Promise<InitResult> => {
  const configPath = path.join(rootDir, CONFIG_FILE_NAME);

  if (fs.existsSync(configPath) && !options.force) {
    throw new ConfigExistsError(configPath);
  }

  const format = options.format ?? detectModuleFormat(rootDir);
  const { counts, total } = await countResources(rootDir);

  fs.writeFileSync(configPath, generateConfig({ format, resourceCounts: counts }));

  return { configPath, format, resourceCounts: counts, filesScanned: total };
};
