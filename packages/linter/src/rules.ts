/**
 * Registry of every rule the linter can report, with its default severity and a short
 * description. Used to build the default configuration, the `--init` scaffold and docs.
 */

export type RuleDefaultSeverity = 'error' | 'warn';

export interface RuleDefinition {
  name: string;
  description: string;
  default: RuleDefaultSeverity;
  /** Example of the rule's options object, when the rule accepts options */
  optionsExample?: string;
}

export interface RuleCategory {
  id: string;
  title: string;
  rules: RuleDefinition[];
}

export const RULE_CATEGORIES: RuleCategory[] = [
  {
    id: 'schema',
    title: 'Schema validation',
    rules: [
      { name: 'schema/required-fields', description: 'Required fields are present in frontmatter', default: 'error' },
      { name: 'schema/valid-type', description: 'Field types are correct (strings, arrays, objects)', default: 'error' },
      {
        name: 'schema/valid-semver',
        description: 'Versions use a format EventCatalog understands (1.2.3, 1, v1, latest, ^1.0.0)',
        default: 'error',
      },
      { name: 'schema/valid-email', description: 'Email addresses are valid', default: 'error' },
      { name: 'schema/validation-error', description: 'General schema validation errors', default: 'error' },
      {
        name: 'schema/unknown-field',
        description: 'Top-level frontmatter keys the schema does not know (typos, or custom fields missing the x- prefix)',
        default: 'error',
        optionsExample: "{ allow: ['costCenter', 'legacy*'], suggestions: true }",
      },
      {
        name: 'schema/unknown-nested-field',
        description: 'Unknown keys inside nested objects (e.g. sends[0].too)',
        default: 'warn',
        optionsExample: "{ allow: ['note'], suggestions: true }",
      },
    ],
  },
  {
    id: 'refs',
    title: 'Reference validation',
    rules: [
      { name: 'refs/owner-exists', description: 'Referenced owners (users/teams) exist', default: 'error' },
      {
        name: 'refs/resource-exists',
        description: 'Referenced resources exist (with "did you mean" hints for near-miss ids)',
        default: 'error',
      },
      {
        name: 'refs/valid-version-range',
        description: 'Referenced resource has a version matching the reference (lists available versions)',
        default: 'error',
      },
      { name: 'refs/channel-exists', description: 'Channels referenced in sends/receives to/from exist', default: 'error' },
      { name: 'refs/container-exists', description: 'Containers referenced in writesTo/readsFrom exist', default: 'error' },
      {
        name: 'refs/file-exists',
        description: 'schemaPath, schemas[], specifications, contract paths and /public icons resolve to real files',
        default: 'error',
        optionsExample: "{ icons: true, publicDir: 'public' }",
      },
      { name: 'refs/orphan-messages', description: 'Events/commands/queries with no producer and no consumer', default: 'warn' },
    ],
  },
  {
    id: 'best-practices',
    title: 'Best practices',
    rules: [
      { name: 'best-practices/summary-required', description: 'Resources have a summary', default: 'error' },
      { name: 'best-practices/owner-required', description: 'Resources have at least one owner', default: 'error' },
      {
        name: 'best-practices/description-required',
        description: 'Resources have markdown body content beyond the frontmatter',
        default: 'warn',
      },
      {
        name: 'best-practices/schema-required',
        description: 'Events, commands and queries define a schemaPath',
        default: 'warn',
      },
    ],
  },
  {
    id: 'versions',
    title: 'Versioning',
    rules: [
      {
        name: 'versions/no-deprecated-references',
        description: 'References to deprecated resources are flagged',
        default: 'warn',
      },
    ],
  },
  {
    id: 'structure',
    title: 'Catalog structure',
    rules: [
      {
        name: 'structure/duplicate-resource-ids',
        description: 'No two resources share the same type, id and version',
        default: 'error',
      },
      {
        name: 'structure/unrecognised-file',
        description: 'Markdown files under resource folders that EventCatalog would silently ignore',
        default: 'warn',
      },
    ],
  },
];

export const RULES: RuleDefinition[] = RULE_CATEGORIES.flatMap((category) => category.rules);

export const RULE_NAMES: string[] = RULES.map((rule) => rule.name);

export const getRuleDefinition = (name: string): RuleDefinition | undefined => RULES.find((rule) => rule.name === name);
