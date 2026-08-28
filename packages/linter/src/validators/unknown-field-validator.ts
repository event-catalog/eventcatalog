import { z } from 'zod';
import { schemas, ResourceType } from '../schemas';
import { ParsedFile } from '../parser';
import { ValidationError } from '../types';
import { LinterConfig, getEffectiveRules } from '../config';

/**
 * Detects frontmatter keys that are not part of the resource schema.
 *
 * EventCatalog core rejects unknown top-level properties at build time unless they are
 * prefixed with `x-` (extension properties). Zod strips unknown keys silently, so without
 * this rule a typo such as `owner:` instead of `owners:` passes the linter and only fails
 * (or is silently ignored) later on.
 *
 * Rules:
 *  - `schema/unknown-field`        top-level unknown keys (build-breaking in core)
 *  - `schema/unknown-nested-field` unknown keys inside nested objects (silently ignored in core)
 */

export const EXTENSION_PROPERTY_PREFIX = 'x-';

export const UNKNOWN_FIELD_RULE = 'schema/unknown-field';
export const UNKNOWN_NESTED_FIELD_RULE = 'schema/unknown-nested-field';

export interface UnknownFieldOptions {
  /** Keys (or `prefix*` patterns) that should never be reported. */
  allow?: string[];
  /** Include "Did you mean ...?" hints. Defaults to true. */
  suggestions?: boolean;
}

/** Keys the SDK / core inject into generated frontmatter that users may legitimately see. */
const ALWAYS_ALLOWED_TOP_LEVEL_KEYS = new Set(['catalog', 'versions', 'latestVersion']);

const isExtensionProperty = (key: string): boolean =>
  key.startsWith(EXTENSION_PROPERTY_PREFIX) && key.length > EXTENSION_PROPERTY_PREFIX.length;

const matchesAllowPattern = (key: string, pattern: string): boolean => {
  if (pattern.endsWith('*')) {
    return key.startsWith(pattern.slice(0, -1));
  }
  return key === pattern;
};

// ---------------------------------------------------------------------------
// String distance ("did you mean")
// ---------------------------------------------------------------------------

/** Optimal string alignment distance (Levenshtein + adjacent transpositions). */
export const editDistance = (a: string, b: string): number => {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[a.length][b.length];
};

export const suggestKey = (unknownKey: string, knownKeys: Iterable<string>): string | undefined => {
  const lower = unknownKey.toLowerCase();
  const candidates = Array.from(knownKeys);

  // Case-only mismatch is the strongest signal (schemapath -> schemaPath)
  const caseMatch = candidates.find((key) => key.toLowerCase() === lower);
  if (caseMatch) return caseMatch;

  const maxDistance = unknownKey.length < 5 ? 1 : 2;
  let best: { key: string; distance: number } | undefined;

  for (const key of candidates) {
    const distance = editDistance(lower, key.toLowerCase());
    if (distance <= maxDistance && (!best || distance < best.distance)) {
      best = { key, distance };
    }
  }

  return best?.key;
};

// ---------------------------------------------------------------------------
// Zod schema walking
// ---------------------------------------------------------------------------

/** Strip wrappers (optional / nullable / default / effects) to get at the underlying schema. */
const unwrapSchema = (schema: z.ZodTypeAny): z.ZodTypeAny => {
  let current: z.ZodTypeAny = schema;
  // Bounded loop guards against a malformed schema cycling forever
  for (let i = 0; i < 20; i++) {
    if (current instanceof z.ZodOptional || current instanceof z.ZodNullable || current instanceof z.ZodDefault) {
      current = current._def.innerType;
    } else if (current instanceof z.ZodEffects) {
      current = current._def.schema;
    } else if (current instanceof z.ZodLazy) {
      current = current._def.getter();
    } else if (current instanceof z.ZodBranded) {
      current = current._def.type;
    } else {
      break;
    }
  }
  return current;
};

/** Given a union schema and a value, pick the branch that best describes the value. */
const resolveUnionBranch = (union: z.ZodUnion<any>, value: unknown): z.ZodTypeAny | undefined => {
  const options = union._def.options as z.ZodTypeAny[];

  // Prefer a branch that fully accepts the value
  const exact = options.find((option) => option.safeParse(value).success);
  if (exact) return exact;

  // Otherwise fall back to the only branch of the matching shape (object vs array)
  const shapeMatches = options.filter((option) => {
    const inner = unwrapSchema(option);
    if (Array.isArray(value)) return inner instanceof z.ZodArray;
    if (value && typeof value === 'object') return inner instanceof z.ZodObject;
    return false;
  });

  return shapeMatches.length === 1 ? shapeMatches[0] : undefined;
};

export interface UnknownKey {
  /** Dot/bracket path to the unknown key, e.g. `sends[0].too` */
  path: string;
  /** The unknown key name itself */
  key: string;
  /** Keys that are valid at that level */
  knownKeys: string[];
  /** Whether the key sits at the top level of the frontmatter */
  topLevel: boolean;
}

const joinPath = (parent: string, key: string): string => (parent ? `${parent}.${key}` : key);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

/**
 * Walk a value alongside its schema and collect unknown object keys at every level.
 * Recursion stops at `any` / `unknown` / `record` schemas, where arbitrary keys are allowed by design.
 */
export const collectUnknownKeys = (schema: z.ZodTypeAny, value: unknown, path = ''): UnknownKey[] => {
  const inner = unwrapSchema(schema);

  if (inner instanceof z.ZodUnion) {
    const branch = resolveUnionBranch(inner, value);
    return branch ? collectUnknownKeys(branch, value, path) : [];
  }

  if (inner instanceof z.ZodArray) {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item, index) => collectUnknownKeys(inner._def.type, item, `${path}[${index}]`));
  }

  if (inner instanceof z.ZodObject) {
    if (!isPlainObject(value)) return [];

    const shape = inner.shape as Record<string, z.ZodTypeAny>;
    const knownKeys = Object.keys(shape);
    const known = new Set(knownKeys);
    const results: UnknownKey[] = [];

    for (const [key, child] of Object.entries(value)) {
      if (!known.has(key)) {
        results.push({ path: joinPath(path, key), key, knownKeys, topLevel: path === '' });
        continue;
      }
      results.push(...collectUnknownKeys(shape[key], child, joinPath(path, key)));
    }

    return results;
  }

  // ZodAny, ZodUnknown, ZodRecord, primitives, enums, etc. — nothing more to check
  return [];
};

// ---------------------------------------------------------------------------
// Cross-resource hints ("`sends` is a service property, not valid on an event")
// ---------------------------------------------------------------------------

const topLevelKeysByType: Partial<Record<ResourceType, Set<string>>> = {};

const getTopLevelKeys = (resourceType: ResourceType): Set<string> => {
  if (!topLevelKeysByType[resourceType]) {
    const inner = unwrapSchema(schemas[resourceType]);
    topLevelKeysByType[resourceType] = new Set(inner instanceof z.ZodObject ? Object.keys(inner.shape) : []);
  }
  return topLevelKeysByType[resourceType]!;
};

const findResourceTypesWithKey = (key: string, excluding: ResourceType): ResourceType[] => {
  return (Object.keys(schemas) as ResourceType[]).filter(
    (type) => type !== excluding && type !== 'dataStore' && getTopLevelKeys(type).has(key)
  );
};

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

export const buildUnknownFieldMessage = (
  unknown: UnknownKey,
  resourceType: ResourceType,
  options: UnknownFieldOptions = {}
): string => {
  const base = `Unknown property "${unknown.path}"`;
  const suggestions = options.suggestions !== false;

  const suggestion = suggestions ? suggestKey(unknown.key, unknown.knownKeys) : undefined;
  if (suggestion) {
    return `${base}. Did you mean "${suggestion}"?`;
  }

  if (!unknown.topLevel) {
    return base;
  }

  const otherTypes = suggestions ? findResourceTypesWithKey(unknown.key, resourceType) : [];
  if (otherTypes.length > 0) {
    const shown = otherTypes.slice(0, 3).join(', ');
    const more = otherTypes.length > 3 ? ` and ${otherTypes.length - 3} more` : '';
    return `${base}. "${unknown.key}" is valid on ${shown}${more} resources, but not on ${resourceType} resources.`;
  }

  return `${base}. Custom properties must start with "${EXTENSION_PROPERTY_PREFIX}".`;
};

const resolveOptions = (parsedFile: ParsedFile, config?: LinterConfig): UnknownFieldOptions => {
  if (!config) return {};
  const rules = getEffectiveRules(parsedFile.file.relativePath, config);
  // Options can be set on either rule; merge so users only need to configure one.
  const topLevel = rules[UNKNOWN_FIELD_RULE]?.options || {};
  const nested = rules[UNKNOWN_NESTED_FIELD_RULE]?.options || {};
  return {
    allow: [...(topLevel.allow || []), ...(nested.allow || [])],
    suggestions: topLevel.suggestions ?? nested.suggestions,
  };
};

export const validateUnknownFieldsForFile = (parsedFile: ParsedFile, options: UnknownFieldOptions = {}): ValidationError[] => {
  const { file, frontmatter } = parsedFile;
  const schema = schemas[file.resourceType];
  if (!schema) return [];

  const allow = options.allow || [];
  const errors: ValidationError[] = [];

  for (const unknown of collectUnknownKeys(schema, frontmatter)) {
    if (isExtensionProperty(unknown.key)) continue;
    if (unknown.topLevel && ALWAYS_ALLOWED_TOP_LEVEL_KEYS.has(unknown.key)) continue;
    if (allow.some((pattern) => matchesAllowPattern(unknown.key, pattern) || matchesAllowPattern(unknown.path, pattern))) {
      continue;
    }

    errors.push({
      type: 'schema',
      resource: `${file.resourceType}/${file.resourceId}`,
      field: unknown.path,
      message: buildUnknownFieldMessage(unknown, file.resourceType, options),
      file: file.relativePath,
      severity: unknown.topLevel ? 'error' : 'warning',
      rule: unknown.topLevel ? UNKNOWN_FIELD_RULE : UNKNOWN_NESTED_FIELD_RULE,
    });
  }

  return errors;
};

export const validateUnknownFields = (parsedFiles: ParsedFile[], config?: LinterConfig): ValidationError[] => {
  return parsedFiles.flatMap((parsedFile) => validateUnknownFieldsForFile(parsedFile, resolveOptions(parsedFile, config)));
};
