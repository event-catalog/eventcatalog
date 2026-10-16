import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import yaml from 'js-yaml';
import { isCustomPropertyName } from '@eventcatalog/sdk';

/**
 * A custom export: part of the catalog chosen for people outside the team (partners, the public, a regulator), written as
 * a file in the catalog (`exports/<id>.mdx`). Its frontmatter chooses what's in it; its body is the introduction.
 */

/** What a selector can name: the catalog's resource kinds, plus `message` (any of event, command and query). */
export const SELECTOR_KINDS = [
  'domain',
  'system',
  'service',
  'agent',
  'message',
  'event',
  'command',
  'query',
  'channel',
  'container',
  'flow',
  'entity',
  'team',
  'user',
] as const;
export type SelectorKind = (typeof SELECTOR_KINDS)[number];
/** Other names people use for a kind in frontmatter. */
const KIND_ALIASES: Record<string, SelectorKind> = { 'data-store': 'container', datastore: 'container' };

/** Fields a custom export can leave out of every resource in it. */
export const HIDE_FIELDS = ['owners', 'repository', 'specifications', 'examples', 'docs', 'contacts'] as const;
export type HideField = (typeof HIDE_FIELDS)[number];

/**
 * What a custom export shows for a pointer at a resource that isn't in it: nothing (`omit`), the resource's name without a
 * link (`name-only`), or the resource itself, pulled into the export (`include`, one level: not what it points at).
 */
export const REFERENCE_POLICIES = ['omit', 'name-only', 'include'] as const;
export type ReferencePolicy = (typeof REFERENCE_POLICIES)[number];

/** One resource, by its kind and id: `{ service: checkout-api }`. */
export interface ResourceSelector {
  kind: SelectorKind;
  id: string;
  /** A version or semver range. Only latest versions are exported, so it must match the latest one. */
  version?: string;
}

/**
 * Every resource whose custom properties have these values: `{ x-public: true }`. Each property must match (a
 * property matches when its value is one of those listed); `kinds` narrows it to some kinds of resource.
 */
export interface PropertySelector {
  properties: Record<string, string[]>;
  kinds?: SelectorKind[];
}

export type ExportSelector = ResourceSelector | PropertySelector;

export const isPropertySelector = (s: ExportSelector): s is PropertySelector => 'properties' in s;

export interface CustomExportDefaults {
  hide?: HideField[];
  references?: ReferencePolicy;
}

/** `exports.custom` in eventcatalog.config.js. */
export interface CustomExportsConfig {
  /** Write the custom exports when the catalog is built. */
  enabled?: boolean;
  /** The folder in the catalog that holds the custom export files. */
  dir?: string;
  /** Build only these custom exports (by id). */
  only?: string[];
  /** What every custom export starts from; a custom export's own frontmatter overrides it. */
  defaults?: CustomExportDefaults;
  /** Never in any custom export, whatever a custom export includes. */
  neverExport?: unknown[];
}

export interface CustomExportSpec {
  id: string;
  title: string;
  summary?: string;
  /** Who the export is for, shown under its title. */
  audience?: string;
  /** The export's own version, shown on the page. */
  version?: string;
  include: ExportSelector[];
  exclude: ExportSelector[];
  hide: HideField[];
  references: ReferencePolicy;
  /** The body of the file: the introduction, in markdown. */
  intro: string;
  /** Where the export came from, relative to the catalog. */
  file?: string;
}

export const DEFAULT_CUSTOM_EXPORTS_DIR = 'exports';
/**
 * Public by default: who owns what, where the code lives, how to reach the teams, and the resources' own docs (written
 * for the team, and full of what's around them) stay in the catalog unless a custom export asks for them.
 */
export const DEFAULT_HIDE: HideField[] = ['owners', 'repository', 'contacts', 'docs'];
export const DEFAULT_REFERENCES: ReferencePolicy = 'omit';

export class CustomExportError extends Error {
  constructor(
    message: string,
    readonly problems: string[] = [],
    /** The export's id, when its frontmatter gave a valid one: the export that failed may not be named after its file. */
    readonly exportId?: string
  ) {
    super(problems.length ? `${message}\n  - ${problems.join('\n  - ')}` : message);
    this.name = 'CustomExportError';
  }
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const EXPORT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const asList = (value: unknown) => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]);

const kindOf = (name: string): SelectorKind | undefined => {
  const lower = name.toLowerCase();
  return KIND_ALIASES[lower] ?? ((SELECTOR_KINDS as readonly string[]).find((k) => k === lower) as SelectorKind | undefined);
};

/** A value in a property selector as text: YAML in a custom export reads every value as text, so config values are too. */
const asText = (value: unknown) =>
  typeof value === 'string' ? value : typeof value === 'number' || typeof value === 'boolean' ? String(value) : undefined;

/** `{ x-public: true, kind: [service, event] }` as a selector, or the reason it isn't one. */
const parsePropertySelector = (value: Record<string, unknown>): PropertySelector | string => {
  const { kind, ...rest } = value;
  const properties: Record<string, string[]> = {};
  for (const [name, expected] of Object.entries(rest)) {
    if (name === 'version')
      return 'version goes with one resource ({ service: checkout-api, version: 1.x }), not with custom properties';
    if (!isCustomPropertyName(name)) {
      return kindOf(name)
        ? `match one resource ({ ${name}: ${String(expected)} }) or by custom properties ({ x-public: true }), not both`
        : `"${name}" isn't a custom property: they start with x-`;
    }
    const values = (Array.isArray(expected) ? expected : [expected]).map(asText);
    if (!values.length || values.some((v) => v === undefined || !v.trim()))
      return `${name} needs a value, or a list of values: an object or an empty value can't be matched`;
    properties[name] = values as string[];
  }
  if (kind === undefined) return { properties };
  const kinds = (Array.isArray(kind) ? kind : [kind]).map((k) => ({ given: String(k), kind: kindOf(String(k)) }));
  const unknown = kinds.find((k) => !k.kind);
  if (unknown) return `kind "${unknown.given}" isn't a resource kind. Use any of: ${SELECTOR_KINDS.join(', ')}`;
  return { properties, kinds: [...new Set(kinds.map((k) => k.kind!))] };
};

/**
 * A selector, or the reason it isn't one: one resource (`{ service: checkout-api, version: 1.x }`), or every resource
 * with custom properties (`{ x-public: true }`, optionally with `kind: [service, event]`).
 */
export const parseSelector = (value: unknown): ExportSelector | string => {
  if (!isRecord(value))
    return `${JSON.stringify(value)} isn't a selector: use e.g. { service: checkout-api } or { x-public: true }`;
  if (Object.keys(value).some((k) => k.startsWith('x-'))) return parsePropertySelector(value);
  const { version, ...rest } = value;
  const keys = Object.keys(rest);
  if (keys.length !== 1)
    return `${JSON.stringify(value)} should name one resource, e.g. { service: checkout-api } (with an optional version)`;
  const kind = kindOf(keys[0]);
  if (!kind) return `"${keys[0]}" isn't a resource kind. Use one of: ${SELECTOR_KINDS.join(', ')}`;
  const id = text(rest[keys[0]]);
  if (!id) return `${keys[0]} needs the resource's id`;
  if (version !== undefined && !text(version)) return `the version of ${keys[0]} ${id} is empty`;
  return { kind, id, ...(text(version) && { version: text(version) }) };
};

const describeValues = (values: string[]) => (values.length === 1 ? values[0] : `[${values.join(', ')}]`);

export const describeSelector = (s: ExportSelector) => {
  if (!isPropertySelector(s)) return `${s.kind} ${s.id}${s.version ? ` (${s.version})` : ''}`;
  const properties = Object.entries(s.properties)
    .map(([name, values]) => `${name}: ${describeValues(values)}`)
    .join(', ');
  return s.kinds ? `${s.kinds.join(', ')} with ${properties}` : properties;
};

const parseSelectors = (value: unknown, field: string, problems: string[]) =>
  asList(value).flatMap((item) => {
    const parsed = parseSelector(item);
    if (typeof parsed === 'string') {
      problems.push(`${field}: ${parsed}`);
      return [];
    }
    return [parsed];
  });

const parseHide = (value: unknown, problems: string[]): HideField[] =>
  asList(value).flatMap((item) => {
    const field = text(item);
    if (field && (HIDE_FIELDS as readonly string[]).includes(field)) return [field as HideField];
    problems.push(`hide: "${String(item)}" can't be hidden. Use any of: ${HIDE_FIELDS.join(', ')}`);
    return [];
  });

const parseReferences = (value: unknown, problems: string[]): ReferencePolicy | undefined => {
  if (value === undefined) return undefined;
  if ((REFERENCE_POLICIES as readonly unknown[]).includes(value)) return value as ReferencePolicy;
  problems.push(`references: "${String(value)}" isn't one of ${REFERENCE_POLICIES.join(', ')}`);
  return undefined;
};

/** `exports.custom` from eventcatalog.config.js, checked: its defaults and neverExport, as selectors. */
export const resolveCustomExportsConfig = (config: CustomExportsConfig = {}) => {
  const problems: string[] = [];
  const defaults: CustomExportDefaults = {
    ...(config.defaults?.hide !== undefined && { hide: parseHide(config.defaults.hide, problems) }),
    ...(config.defaults?.references !== undefined && { references: parseReferences(config.defaults.references, problems) }),
  };
  const neverExport = parseSelectors(config.neverExport, 'neverExport', problems);
  if (problems.length) throw new CustomExportError('exports.custom in eventcatalog.config.js has problems:', problems);
  return { ...config, defaults, neverExport };
};

/** Reads a custom export file: its frontmatter (what's in it) and its body (the introduction). */
export const parseCustomExport = (
  source: string,
  { file, fallbackId, defaults = {} }: { file?: string; fallbackId?: string; defaults?: CustomExportDefaults } = {}
): CustomExportSpec => {
  const where = file ? `The custom export ${file}` : 'The custom export';
  const match = source.match(FRONTMATTER);
  if (!match) throw new CustomExportError(`${where} has no frontmatter. Start it with --- and say what it includes.`);
  let data: unknown;
  try {
    // Every value as a string: "version: 2026.10" stays 2026.10, not the number 2026.1
    data = yaml.load(match[1], { schema: yaml.FAILSAFE_SCHEMA });
  } catch (error) {
    throw new CustomExportError(`${where} has frontmatter that isn't valid YAML: ${(error as Error).message}`);
  }
  if (!isRecord(data)) throw new CustomExportError(`${where} has empty frontmatter. Give it a title and what it includes.`);

  const problems: string[] = [];
  const id = text(data.id) ?? fallbackId;
  if (!id) problems.push('id is missing');
  else if (!EXPORT_ID.test(id)) problems.push(`id "${id}" can only use letters, numbers, - and _ (it names the HTML file)`);
  const title = text(data.title);
  if (!title) problems.push('title is missing');
  const include = parseSelectors(data.include, 'include', problems);
  if (!include.length && !problems.some((p) => p.startsWith('include')))
    problems.push('include is empty: say what the export covers');
  const exclude = parseSelectors(data.exclude, 'exclude', problems);
  const hide = data.hide === undefined ? (defaults.hide ?? DEFAULT_HIDE) : parseHide(data.hide, problems);
  const references = parseReferences(data.references, problems) ?? defaults.references ?? DEFAULT_REFERENCES;
  const known = new Set(['id', 'title', 'summary', 'audience', 'version', 'include', 'exclude', 'hide', 'references']);
  Object.keys(data)
    .filter((k) => !known.has(k))
    .forEach((k) => problems.push(`"${k}" isn't a custom export field (${[...known].join(', ')})`));
  if (problems.length) throw new CustomExportError(`${where} has problems:`, problems, id && EXPORT_ID.test(id) ? id : undefined);

  return {
    id: id!,
    title: title!,
    summary: text(data.summary),
    audience: text(data.audience),
    version: text(data.version),
    include,
    exclude,
    hide: [...new Set(hide)],
    references,
    intro: source.slice(match[0].length).trim(),
    file,
  };
};

/** A custom export file that can't be exported, and why. The others are exported without it. */
export interface CustomExportFailure {
  /** The export's id: from its frontmatter, or its file name when the frontmatter doesn't give a valid one. */
  id: string;
  /** Where it came from, relative to the catalog (none for an id in `only` that has no file). */
  file?: string;
  error: CustomExportError;
}

/**
 * Every custom export in the catalog's custom exports folder (`exports/` unless the config says otherwise), by file
 * name. Each file stands alone: one with problems is in `failed` (as are two files with the same id, since either could
 * be the one meant), and the rest are still `found`.
 */
export const loadCustomExports = (
  dir: string,
  config: CustomExportsConfig = {}
): { found: CustomExportSpec[]; failed: CustomExportFailure[] } => {
  const folder = join(dir, config.dir || DEFAULT_CUSTOM_EXPORTS_DIR);
  if (!existsSync(folder)) return { found: [], failed: [] };
  const files = readdirSync(folder, { withFileTypes: true })
    .filter((f) => f.isFile() && /\.mdx?$/i.test(f.name))
    .map((f) => f.name)
    .sort();
  const parsed: CustomExportSpec[] = [];
  const failed: CustomExportFailure[] = [];
  for (const name of files) {
    const file = relative(dir, join(folder, name));
    const fallbackId = basename(name, extname(name));
    try {
      parsed.push(parseCustomExport(readFileSync(join(folder, name), 'utf-8'), { file, fallbackId, defaults: config.defaults }));
    } catch (error) {
      if (!(error instanceof CustomExportError)) throw error;
      failed.push({ id: error.exportId ?? fallbackId, file, error });
    }
  }
  const byId = new Map<string, CustomExportSpec[]>();
  parsed.forEach((d) => byId.set(d.id, [...(byId.get(d.id) ?? []), d]));
  const found: CustomExportSpec[] = [];
  for (const [id, same] of byId) {
    if (same.length === 1) {
      found.push(same[0]);
      continue;
    }
    const error = new CustomExportError(
      `${same.map((d) => d.file).join(' and ')} are all the custom export "${id}". Give each one its own id.`
    );
    same.forEach((d) => failed.push({ id, file: d.file, error }));
  }
  return { found, failed };
};
