import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import createSDK from '@eventcatalog/sdk';
import { createReadOnlyCatalog } from './catalog';
import { getFitnessFunctionProblems } from './define';
import { discoverFitnessFiles, FITNESS_FILE_SUFFIX, type FitnessFile, type FitnessScope } from './discover';
import type {
  CatalogResource,
  FitnessFunction,
  FitnessFunctionResult,
  FitnessReport,
  FitnessReportResourceReference,
  FitnessReportViolation,
  FitnessResourceReference,
  FitnessViolation,
} from './types';

export const DEFAULT_REPORT_PATH = '.eventcatalog/fitness/results.json';

type SDK = ReturnType<typeof createSDK>;
type Getter = (id: string, version?: string) => Promise<{ version?: string } | undefined>;

/** The SDK method that reads each type of resource */
const GETTERS = {
  domain: 'getDomain',
  system: 'getSystem',
  service: 'getService',
  agent: 'getAgent',
  event: 'getEvent',
  command: 'getCommand',
  query: 'getQuery',
  flow: 'getFlow',
  channel: 'getChannel',
  entity: 'getEntity',
  container: 'getDataStore',
  'data-product': 'getDataProduct',
  adr: 'getAdr',
  diagram: 'getDiagram',
  team: 'getTeam',
  user: 'getUser',
} as const satisfies Record<string, keyof SDK>;

type ReferenceType = keyof typeof GETTERS;

/** Other ways people write a resource type in a violation, by their lower-case letters (e.g. `dataStore` -> `datastore`) */
const REFERENCE_TYPE_ALIASES: Record<string, ReferenceType> = {
  subdomain: 'domain',
  datastore: 'container',
  dataproduct: 'data-product',
};

const toReferenceType = (type: string): ReferenceType | undefined => {
  const key = type.toLowerCase().replace(/[^a-z]/g, '');
  if (key in REFERENCE_TYPE_ALIASES) return REFERENCE_TYPE_ALIASES[key];
  return (Object.keys(GETTERS) as ReferenceType[]).find((name) => name.replace(/[^a-z]/g, '') === key);
};

// `@eventcatalog/fitness` imports in fitness functions load this package (the copy running them), so they work
// without the catalog installing it. The runner is bundled into the package's index (dist/index.js or index.mjs);
// when running from source it is src/run.ts, next to src/index.ts.
const getPackageEntryPath = () => {
  const file = fileURLToPath(import.meta.url);
  return path.basename(file).startsWith('index.') ? file : path.join(path.dirname(file), 'index.ts');
};

const getCatalogRevision = (catalogDir: string): string | null => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: catalogDir, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
};

const describe = (value: unknown) => (value === null ? 'null' : Array.isArray(value) ? 'an array' : typeof value);

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

// Frontmatter like `version: 1` or `id: 42` is read as a number, so references built from resources can hold numbers
const isStringOrNumber = (value: unknown): value is string | number =>
  isNonEmptyString(value) || (typeof value === 'number' && Number.isFinite(value));

/** Checks what a fitness function returned. Returns the problem when it isn't a list of violations. */
const getViolationsProblem = (value: unknown): string | undefined => {
  if (!Array.isArray(value))
    return `run() must return an array of violations (empty when the check passes), but returned ${describe(value)}`;

  for (const [index, violation] of value.entries()) {
    const at = `Violation ${index}`;
    if (!violation || typeof violation !== 'object' || Array.isArray(violation))
      return `${at} must be an object, but is ${describe(violation)}`;
    if (!isNonEmptyString(violation.message)) return `${at}: \`message\` must be a non-empty string`;
    for (const field of ['details', 'suggestion']) {
      if (violation[field] !== undefined && typeof violation[field] !== 'string') return `${at}: \`${field}\` must be a string`;
    }
    if (violation.resources === undefined) continue;
    if (!Array.isArray(violation.resources)) return `${at}: \`resources\` must be an array`;
    for (const [resourceIndex, resource] of violation.resources.entries()) {
      const resourceAt = `${at}, resource ${resourceIndex}`;
      if (!resource || typeof resource !== 'object') return `${resourceAt} must be an object with a type and id`;
      if (!isNonEmptyString(resource.type)) return `${resourceAt}: \`type\` must be a non-empty string`;
      if (!isStringOrNumber(resource.id)) return `${resourceAt}: \`id\` must be a non-empty string`;
      if (resource.version !== undefined && !isStringOrNumber(resource.version))
        return `${resourceAt}: \`version\` must be a string`;
    }
  }
};

const toErrorDetails = (error: unknown, catalogDir: string): { message: string; stack?: string } => {
  if (!(error instanceof Error)) return { message: String(error) };
  // Paths relative to the catalog, so the report reads the same on every machine
  const stack = error.stack?.split(catalogDir + path.sep).join('');
  return stack ? { message: error.message, stack } : { message: error.message };
};

export type EvaluateFitnessOptions = {
  /** The catalog directory */
  dir: string;
  /** Defaults to the catalog's current git commit */
  catalogRevision?: string | null;
  /** Defaults to now */
  evaluatedAt?: Date;
};

/** Finds and runs the catalog's fitness functions, one at a time, and returns the report. */
export const evaluateFitness = async (options: EvaluateFitnessOptions): Promise<FitnessReport> => {
  const catalogDir = path.resolve(options.dir);
  if (!fs.existsSync(catalogDir) || !fs.statSync(catalogDir).isDirectory()) {
    throw new Error(`EventCatalog directory not found: ${catalogDir}`);
  }

  const { files, diagnostics } = discoverFitnessFiles(catalogDir);
  const sdk = createSDK(catalogDir);
  const catalog = createReadOnlyCatalog(catalogDir);
  const jiti = createJiti(path.join(catalogDir, 'eventcatalog.config.js'), {
    alias: { '@eventcatalog/fitness': getPackageEntryPath() },
    moduleCache: false,
    fsCache: false,
  });

  const readResource = (type: ReferenceType, id: string, version?: string) =>
    (sdk[GETTERS[type]] as unknown as Getter)(id, version || undefined);

  const resolvedReferences = new Map<string, Promise<FitnessReportResourceReference>>();
  const resolveReference = (reference: FitnessResourceReference): Promise<FitnessReportResourceReference> => {
    const key = JSON.stringify([reference.type, reference.id, reference.version]);
    if (!resolvedReferences.has(key)) {
      resolvedReferences.set(
        key,
        (async () => {
          const type = toReferenceType(reference.type);
          const resource = type ? await readResource(type, reference.id, reference.version).catch(() => undefined) : undefined;
          if (!type || !resource) return { ...reference, ...(type ? { type } : {}), resolved: false };
          // Point at the version that was evaluated
          const version = resource.version !== undefined ? String(resource.version) : reference.version;
          return { type, id: reference.id, ...(version ? { version } : {}), resolved: true };
        })()
      );
    }
    return resolvedReferences.get(key)!;
  };

  const toReportViolation = async (violation: FitnessViolation): Promise<FitnessReportViolation> => ({
    message: violation.message,
    resources: await Promise.all(
      (violation.resources ?? []).map(({ type, id, version }) =>
        resolveReference({ type, id: String(id), ...(version !== undefined ? { version: String(version) } : {}) })
      )
    ),
    ...(violation.details !== undefined ? { details: violation.details } : {}),
    ...(violation.suggestion !== undefined ? { suggestion: violation.suggestion } : {}),
  });

  const loadScopeResource = async (scope: FitnessScope): Promise<CatalogResource> => {
    const resource = await readResource(scope.type, scope.id, scope.version);
    if (!resource) {
      throw new Error(
        `Could not load the ${scope.type} '${scope.id}'${scope.version ? ` (${scope.version})` : ''} this fitness function sits alongside`
      );
    }
    return { ...structuredClone(resource), type: scope.type } as CatalogResource;
  };

  const definedIn = new Map<string, string>();

  const evaluate = async (file: FitnessFile): Promise<FitnessFunctionResult> => {
    const scope = file.scope
      ? { type: file.scope.type, id: file.scope.id, ...(file.scope.version !== undefined ? { version: file.scope.version } : {}) }
      : null;
    const failed = (
      error: { message: string; stack?: string },
      definition?: Partial<FitnessFunction>
    ): FitnessFunctionResult => ({
      id: isNonEmptyString(definition?.id) ? definition.id : file.source,
      name: isNonEmptyString(definition?.name) ? definition.name : path.basename(file.source, FITNESS_FILE_SUFFIX),
      ...(typeof definition?.description === 'string' ? { description: definition.description } : {}),
      severity: definition?.severity === 'warning' ? 'warning' : 'error',
      status: 'error',
      source: file.source,
      scope,
      violations: [],
      error,
    });

    if (file.scopeError) return failed({ message: file.scopeError });

    let definition: FitnessFunction;
    try {
      const module = await jiti.import<Record<string, unknown>>(file.path);
      if (!module || !('default' in module) || module.default === undefined) {
        return failed({
          message: 'The file has no default export. Export the function with `export default defineFitnessFunction({ ... })`',
        });
      }
      definition = module.default as FitnessFunction;
    } catch (error) {
      return failed(toErrorDetails(error, catalogDir));
    }

    const problems = getFitnessFunctionProblems(definition);
    if (problems.length > 0) return failed({ message: `Invalid fitness function: ${problems.join(', ')}` }, definition);

    const firstSource = definedIn.get(definition.id);
    if (firstSource) {
      return failed(
        { message: `Another fitness function already has the id '${definition.id}' (${firstSource}). Ids must be unique.` },
        definition
      );
    }
    definedIn.set(definition.id, file.source);

    let returned: unknown;
    try {
      const resource = file.scope ? await loadScopeResource(file.scope) : undefined;
      returned = await definition.run({ resource, catalog });
    } catch (error) {
      return failed(toErrorDetails(error, catalogDir), definition);
    }

    const problem = getViolationsProblem(returned);
    if (problem) return failed({ message: problem }, definition);

    const severity = definition.severity ?? 'error';
    const violations = await Promise.all((returned as FitnessViolation[]).map(toReportViolation));
    return {
      id: definition.id,
      name: definition.name,
      ...(definition.description !== undefined ? { description: definition.description } : {}),
      severity,
      status: violations.length === 0 ? 'passed' : severity === 'warning' ? 'warning' : 'failed',
      source: file.source,
      scope,
      violations,
    };
  };

  // One at a time, in path order, so results and logs are the same on every run
  const functions: FitnessFunctionResult[] = [];
  for (const file of files) functions.push(await evaluate(file));

  const count = (status: FitnessFunctionResult['status']) => functions.filter((result) => result.status === status).length;

  return {
    schemaVersion: 1,
    evaluatedAt: (options.evaluatedAt ?? new Date()).toISOString(),
    catalogRevision: options.catalogRevision !== undefined ? options.catalogRevision : getCatalogRevision(catalogDir),
    summary: {
      total: functions.length,
      passed: count('passed'),
      warnings: count('warning'),
      failed: count('failed'),
      errors: count('error'),
    },
    functions,
    diagnostics,
  };
};

/** 1 when a function failed or could not be evaluated, otherwise 0 (warnings don't fail the check). */
export const getFitnessExitCode = (report: FitnessReport): 0 | 1 =>
  report.summary.failed > 0 || report.summary.errors > 0 ? 1 : 0;

export const writeFitnessReport = (report: FitnessReport, outputPath: string) => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
};
