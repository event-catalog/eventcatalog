import fs from 'fs';
import path from 'path';
import { ValidationError } from '../types';

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

export const DEFAULT_RULES: Record<string, RuleSeverity> = {
  'schema/required-fields': 'error',
  'schema/valid-semver': 'error',
  'schema/valid-email': 'error',
  'refs/owner-exists': 'error',
  'refs/valid-version-range': 'error',
  'refs/resource-exists': 'error',
  'refs/channel-exists': 'error',
  'refs/container-exists': 'error',
  'refs/orphan-messages': 'warn',
  'best-practices/summary-required': 'error',
  'best-practices/owner-required': 'error',
  'best-practices/description-required': 'warn',
  'best-practices/schema-required': 'warn',
  'naming/service-id-format': 'error',
  'naming/event-id-format': 'error',
  'versions/consistent-format': 'error',
  'versions/no-deprecated': 'error',
  'versions/no-deprecated-references': 'warn',
  'structure/duplicate-resource-ids': 'error',
};

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
  domains: 'domain',
  entities: 'entity',
  channels: 'channel',
  flows: 'flow',
  users: 'user',
  teams: 'team',
};

export const loadEventCatalogConfig = (rootDir: string): CatalogDependencies => {
  const configPath = path.join(rootDir, 'eventcatalog.config.js');

  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    delete require.cache[require.resolve(configPath)];
    const config = require(configPath);

    if (!config.dependencies || typeof config.dependencies !== 'object') {
      return {};
    }

    const dependencies: CatalogDependencies = {};

    for (const [pluralKey, entries] of Object.entries(config.dependencies)) {
      const singularType = PLURAL_TO_SINGULAR[pluralKey];
      if (!singularType || !Array.isArray(entries)) continue;

      dependencies[singularType] = (entries as any[])
        .filter((entry) => entry && typeof entry.id === 'string')
        .map((entry) => ({ id: entry.id, version: entry.version }));
    }

    return dependencies;
  } catch (error) {
    console.warn(`Warning: Could not load eventcatalog.config.js: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
};

export const loadConfig = (rootDir: string): LinterConfig => {
  const configPath = path.join(rootDir, '.eventcatalogrc.js');

  if (!fs.existsSync(configPath)) {
    // Return default config if no config file exists
    return {
      rules: DEFAULT_RULES,
      ignorePatterns: DEFAULT_IGNORE_PATTERNS,
      overrides: [],
    };
  }

  try {
    // Clear module cache to ensure fresh load
    delete require.cache[require.resolve(configPath)];
    const config = require(configPath);

    // Merge with defaults
    const mergedConfig: LinterConfig = {
      rules: { ...DEFAULT_RULES, ...config.rules },
      ignorePatterns: [...DEFAULT_IGNORE_PATTERNS, ...(config.ignorePatterns || [])],
      overrides: config.overrides || [],
    };

    return mergedConfig;
  } catch (error) {
    console.warn(`Warning: Could not load .eventcatalogrc.js: ${error instanceof Error ? error.message : String(error)}`);
    return {
      rules: DEFAULT_RULES,
      ignorePatterns: DEFAULT_IGNORE_PATTERNS,
      overrides: [],
    };
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
