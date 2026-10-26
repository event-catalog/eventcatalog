import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { ValidationError } from '../types';
import { RULES } from '../rules';

export type RuleSeverity = 'error' | 'warn' | 'off';

export interface RuleConfig {
  severity: RuleSeverity;
  options?: Record<string, any>;
}

export interface ConfigOverride {
  files: string[];
  rules: Record<string, RuleSeverity | [RuleSeverity, Record<string, any>]>;
}

export interface LinterConfig {
  rules: Record<string, RuleSeverity | [RuleSeverity, Record<string, any>]>;
  ignorePatterns?: string[];
  overrides?: ConfigOverride[];
}

export const DEFAULT_IGNORE_PATTERNS: string[] = ['dependencies/**'];

/** Default severity for every rule, derived from the rule registry. */
export const DEFAULT_RULES: Record<string, RuleSeverity> = Object.fromEntries(
  RULES.map((rule) => [rule.name, rule.default])
) as Record<string, RuleSeverity>;

export interface DependencyEntry {
  id: string;
  version?: string;
}

export type CatalogDependencies = Record<string, DependencyEntry[]>;

const PLURAL_TO_SINGULAR: Record<string, string> = {
  events: 'event',
  commands: 'command',
  queries: 'query',
  services: 'service',
  agents: 'agent',
  adrs: 'adr',
  domains: 'domain',
  systems: 'system',
  entities: 'entity',
  channels: 'channel',
  flows: 'flow',
  users: 'user',
  teams: 'team',
  containers: 'container',
  'data-products': 'dataProduct',
  diagrams: 'diagram',
};

const unwrapDefaultExport = (config: unknown): Record<string, any> => {
  if (config && typeof config === 'object' && 'default' in config) {
    const defaultExport = (config as Record<string, unknown>).default;
    if (defaultExport && typeof defaultExport === 'object') {
      return defaultExport as Record<string, any>;
    }
  }

  return config as Record<string, any>;
};

const errorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
};

const toDependencyEntries = (entries: unknown): DependencyEntry[] => {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry && typeof entry.id === 'string')
    .map((entry) => ({ id: entry.id, version: entry.version }));
};

const parseDependencies = (config: Record<string, any>): CatalogDependencies => {
  if (!config.dependencies || typeof config.dependencies !== 'object') {
    return {};
  }

  const dependencies: CatalogDependencies = {};

  for (const [pluralKey, entries] of Object.entries(config.dependencies)) {
    const singularType = PLURAL_TO_SINGULAR[pluralKey];
    if (!singularType || !Array.isArray(entries)) continue;

    dependencies[singularType] = toDependencyEntries(entries);
  }

  return dependencies;
};

/** Reads `dependencies` from CommonJS configs synchronously. Use loadEventCatalogConfigAsync to include directory sources. */
export const loadEventCatalogConfig = (rootDir: string): CatalogDependencies => {
  const configPath = path.join(rootDir, 'eventcatalog.config.js');

  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    delete require.cache[require.resolve(configPath)];
    return parseDependencies(unwrapDefaultExport(require(configPath)));
  } catch (error) {
    console.warn(`Warning: Could not load eventcatalog.config.js: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
};

export interface EventCatalogConfigResult {
  dependencies: CatalogDependencies;
  /** Directory sources that could not be loaded, with no synced copy to fall back on: owners they provide can't be checked. */
  unloadedDirectorySources: string[];
}

export const DIRECTORY_STORE_PATH = path.join('.eventcatalog', 'store', 'directory.json');

// EventCatalog loads the catalog's .env before its config, so connector tokens like process.env.GH_TOKEN resolve here too
const loadEnvFile = (rootDir: string) => {
  const envPath = path.join(rootDir, '.env');
  if (typeof process.loadEnvFile !== 'function' || !fs.existsSync(envPath)) return;

  try {
    process.loadEnvFile(envPath);
  } catch (error) {
    console.warn(`Warning: Could not load .env: ${errorMessage(error)}`);
  }
};

/** Users and teams EventCatalog synced from directory sources the last time it ran. */
const readDirectoryStore = (rootDir: string): { user: DependencyEntry[]; team: DependencyEntry[] } | undefined => {
  const storePath = path.join(rootDir, DIRECTORY_STORE_PATH);
  if (!fs.existsSync(storePath)) return undefined;

  try {
    const resources = JSON.parse(fs.readFileSync(storePath, 'utf8'))?.resources;
    return { user: toDependencyEntries(resources?.users), team: toDependencyEntries(resources?.teams) };
  } catch (error) {
    console.warn(`Warning: Could not read ${DIRECTORY_STORE_PATH}: ${errorMessage(error)}`);
    return undefined;
  }
};

/** Runs each directory source, as EventCatalog does, so synced users and teams count as owners. */
const loadDirectoryOwners = async (rootDir: string, sources: unknown) => {
  const owners: { user: DependencyEntry[]; team: DependencyEntry[] } = { user: [], team: [] };
  const failedSources: string[] = [];
  if (!Array.isArray(sources)) return { owners, failedSources };

  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    const name = typeof source.name === 'string' ? source.name : 'unnamed';

    try {
      const [users, teams] = await Promise.all([source.loadUsers?.(), source.loadTeams?.()]);
      owners.user.push(...toDependencyEntries(users));
      owners.team.push(...toDependencyEntries(teams));
    } catch (error) {
      console.warn(`Warning: Could not load directory source "${name}": ${errorMessage(error)}`);
      failedSources.push(name);
    }
  }

  if (failedSources.length === 0) return { owners, failedSources };

  // Fall back to the users and teams synced the last time EventCatalog ran
  const store = readDirectoryStore(rootDir);
  if (!store) return { owners, failedSources };

  console.warn(`Warning: Using users and teams from ${DIRECTORY_STORE_PATH} (last synced by EventCatalog) instead`);
  owners.user.push(...store.user);
  owners.team.push(...store.team);
  return { owners, failedSources: [] };
};

/** Loads `dependencies` and the owners from `directory.sources`, from CommonJS or ESM configs. */
export const loadEventCatalogConfigAsync = async (rootDir: string): Promise<EventCatalogConfigResult> => {
  const configPath = path.join(rootDir, 'eventcatalog.config.js');

  if (!fs.existsSync(configPath)) {
    return { dependencies: {}, unloadedDirectorySources: [] };
  }

  loadEnvFile(rootDir);

  let config: Record<string, any>;
  try {
    delete require.cache[require.resolve(configPath)];
    const configUrl = pathToFileURL(configPath);
    configUrl.searchParams.set('mtime', String(fs.statSync(configPath).mtimeMs));
    config = unwrapDefaultExport(await import(configUrl.href));
  } catch (error) {
    console.warn(`Warning: Could not load eventcatalog.config.js: ${errorMessage(error)}`);
    return { dependencies: {}, unloadedDirectorySources: [] };
  }

  const dependencies = parseDependencies(config);
  const { owners, failedSources } = await loadDirectoryOwners(rootDir, config.directory?.sources);

  for (const type of ['user', 'team'] as const) {
    if (owners[type].length > 0) {
      dependencies[type] = [...(dependencies[type] || []), ...owners[type]];
    }
  }

  return { dependencies, unloadedDirectorySources: failedSources };
};

const defaultConfig = (): LinterConfig => ({
  rules: DEFAULT_RULES,
  ignorePatterns: DEFAULT_IGNORE_PATTERNS,
  overrides: [],
});

const mergeConfig = (config: Record<string, any>): LinterConfig => ({
  rules: { ...DEFAULT_RULES, ...config.rules },
  ignorePatterns: [...DEFAULT_IGNORE_PATTERNS, ...(config.ignorePatterns || [])],
  overrides: config.overrides || [],
});

/** Loads CommonJS configs synchronously for backwards compatibility. */
export const loadConfig = (rootDir: string): LinterConfig => {
  const configPath = path.join(rootDir, '.eventcatalogrc.js');

  if (!fs.existsSync(configPath)) {
    return defaultConfig();
  }

  try {
    delete require.cache[require.resolve(configPath)];
    return mergeConfig(unwrapDefaultExport(require(configPath)));
  } catch (error) {
    console.warn(`Warning: Could not load .eventcatalogrc.js: ${errorMessage(error)}`);
    return defaultConfig();
  }
};

/** Loads CommonJS or ESM configs asynchronously on every supported Node version. */
export const loadConfigAsync = async (rootDir: string): Promise<LinterConfig> => {
  const configPath = path.join(rootDir, '.eventcatalogrc.js');

  if (!fs.existsSync(configPath)) {
    return defaultConfig();
  }

  try {
    // Clear the CommonJS cache and add the mtime to the URL so repeated loads see edits.
    delete require.cache[require.resolve(configPath)];
    const configUrl = pathToFileURL(configPath);
    configUrl.searchParams.set('mtime', String(fs.statSync(configPath).mtimeMs));
    const config = unwrapDefaultExport(await import(configUrl.href));
    return mergeConfig(config);
  } catch (error) {
    console.warn(`Warning: Could not load .eventcatalogrc.js: ${errorMessage(error)}`);
    return defaultConfig();
  }
};

export const parseRuleConfig = (rule: RuleSeverity | [RuleSeverity, Record<string, any>]): RuleConfig => {
  if (Array.isArray(rule)) {
    return {
      severity: rule[0],
      options: rule[1],
    };
  }
  return {
    severity: rule,
    options: {},
  };
};

export const shouldIgnoreFile = (filePath: string, ignorePatterns: string[]): boolean => {
  if (!ignorePatterns || ignorePatterns.length === 0) {
    return false;
  }

  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const pattern of ignorePatterns) {
    // Simple glob matching for now
    const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
    if (regex.test(normalizedPath)) {
      return true;
    }
  }

  return false;
};

export const getEffectiveRules = (filePath: string, config: LinterConfig): Record<string, RuleConfig> => {
  let effectiveRules = { ...config.rules };

  // Apply overrides
  if (config.overrides) {
    for (const override of config.overrides) {
      const matchesFile = override.files.some((pattern) => {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        return regex.test(filePath);
      });

      if (matchesFile) {
        effectiveRules = { ...effectiveRules, ...override.rules };
      }
    }
  }

  // Parse rules into RuleConfig objects
  const parsedRules: Record<string, RuleConfig> = {};
  for (const [ruleName, ruleValue] of Object.entries(effectiveRules)) {
    parsedRules[ruleName] = parseRuleConfig(ruleValue);
  }

  return parsedRules;
};

export const applyRuleSeverity = (errors: ValidationError[], rules: Record<string, RuleConfig>): ValidationError[] => {
  const result: ValidationError[] = [];

  for (const error of errors) {
    // Map validation errors to rule names
    const ruleName = mapErrorToRuleName(error);
    const rule = rules[ruleName];

    if (!rule || rule.severity === 'off') {
      continue; // Skip disabled rules
    }

    result.push({
      ...error,
      severity: rule.severity === 'warn' ? ('warning' as const) : ('error' as const),
    });
  }

  return result;
};

const mapErrorToRuleName = (error: ValidationError): string => {
  // Use explicit rule if set by the validator
  if (error.rule) {
    return error.rule;
  }

  // Map validation errors to rule names based on the error type and content
  if (error.type === 'schema') {
    // Check field-specific rules first
    if (error.field === 'summary') {
      return 'best-practices/summary-required';
    }
    if (error.field === 'owners') {
      return 'best-practices/owner-required';
    }

    // Check message content for specific validation types
    if (error.message.includes('email') || error.message.includes('Invalid email')) {
      return 'schema/valid-email';
    }
    if (error.message.includes('version') || error.message.includes('semantic')) {
      return 'schema/valid-semver';
    }
    if (error.message.includes('Required') || error.message.includes('Expected')) {
      return 'schema/required-fields';
    }

    return 'schema/required-fields';
  }

  if (error.type === 'reference') {
    if (error.message.includes('user') || error.message.includes('team')) {
      return 'refs/owner-exists';
    }
    if (error.message.includes('version')) {
      return 'refs/valid-version-range';
    }
    return 'refs/resource-exists';
  }

  return 'schema/required-fields';
};
