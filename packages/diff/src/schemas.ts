import type { Index, IndexResource, IndexSchema } from '@eventcatalog/sdk';
import { checkJsonSchemaCompatibility } from './json-schema';
import type { JsonSchema } from './json-schema';
import type { CompatibilityStrategy, MessageType, SchemaChange, SchemaPointer } from './types';
import { compareVersions, latest } from './utils/versions';

const MESSAGE_TYPES: ReadonlySet<string> = new Set<MessageType>(['event', 'command', 'query']);

type Message = IndexResource & { type: MessageType };

const isMessage = (resource: IndexResource): resource is Message => MESSAGE_TYPES.has(resource.type);

export type DiffSchemasOptions = {
  strategy: CompatibilityStrategy;
  /** Copy the raw schema text onto `before` and `after` of each change. */
  includeSchemaContent: boolean;
};

/**
 * Finds every message schema that changed between the two indexes and judges each
 * change under the strategy.
 *
 * Which versions are compared:
 *   - every version that exists on both sides, against itself (an in-place edit)
 *   - the latest version on each side, when they differ (a version bump)
 *
 * Which schemas within a message are compared: see `pairSchemas`. A schema file
 * that exists on only one side is reported as added or removed, with no verdict.
 */
export const diffSchemas = (a: Index, b: Index, options: DiffSchemasOptions): SchemaChange[] => {
  const before = messagesByKey(a);
  const after = messagesByKey(b);
  const changes: SchemaChange[] = [];

  for (const [key, versionsA] of before) {
    const versionsB = after.get(key);
    if (!versionsB) continue;

    for (const [messageA, messageB] of pairVersions(versionsA, versionsB)) {
      changes.push(...diffMessageSchemas(messageA, messageB, options));
    }
  }

  return changes;
};

// ---------------------------------------------------------------------------
// versions
// ---------------------------------------------------------------------------

/** Every version of each message, keyed by `type:id`. */
const messagesByKey = (index: Index) => {
  const byKey = new Map<string, Message[]>();
  for (const resource of index.resources) {
    if (!isMessage(resource)) continue;
    const key = `${resource.type}:${resource.id}`;
    byKey.set(key, [...(byKey.get(key) ?? []), resource]);
  }
  return byKey;
};

/** Exact version matches first (ordered by version), then the latest-to-latest bump if the latest versions differ. */
const pairVersions = (versionsA: Message[], versionsB: Message[]): Array<[Message, Message]> => {
  const byVersionB = new Map(versionsB.map((message) => [message.version, message]));
  const pairs: Array<[Message, Message]> = [];

  for (const messageA of [...versionsA].sort((left, right) => compareVersions(left.version, right.version))) {
    const messageB = byVersionB.get(messageA.version);
    if (messageB) pairs.push([messageA, messageB]);
  }

  const latestA = latest(versionsA);
  const latestB = latest(versionsB);
  if (latestA && latestB && latestA.version !== latestB.version) pairs.push([latestA, latestB]);

  return pairs;
};

// ---------------------------------------------------------------------------
// schemas within a message
// ---------------------------------------------------------------------------

const diffMessageSchemas = (messageA: Message, messageB: Message, options: DiffSchemasOptions): SchemaChange[] => {
  const { strategy, includeSchemaContent } = options;
  const message = { type: messageA.type, id: messageA.id, version: { a: messageA.version, b: messageB.version } };
  const changes: SchemaChange[] = [];

  for (const { before, after } of pairSchemas(messageA.schemas ?? [], messageB.schemas ?? [])) {
    if (before && after) {
      if (before.hash !== undefined && before.hash === after.hash) continue;
      changes.push({
        message,
        change: 'modified',
        before: pointer(before, includeSchemaContent),
        after: pointer(after, includeSchemaContent),
        strategy,
        ...judge(before, after, strategy),
      });
    } else if (after) {
      changes.push({ message, change: 'added', after: pointer(after, includeSchemaContent), strategy, ...UNKNOWN });
    } else if (before) {
      changes.push({ message, change: 'removed', before: pointer(before, includeSchemaContent), strategy, ...UNKNOWN });
    }
  }

  return changes;
};

type SchemaPair = { before?: IndexSchema; after?: IndexSchema };

/**
 * Pairs the schema files of a message across the two sides. In order:
 *   1. same `id`
 *   2. same `path`
 *   3. both flagged `default`
 *   4. exactly one unmatched schema on each side (a renamed file)
 * Anything still unmatched is an added or removed schema.
 */
const pairSchemas = (schemasA: IndexSchema[], schemasB: IndexSchema[]): SchemaPair[] => {
  const pairs: SchemaPair[] = [];
  let remainingA = [...schemasA];
  let remainingB = [...schemasB];

  const matchBy = (key: (schema: IndexSchema) => string | undefined) => {
    for (const before of [...remainingA]) {
      const keyA = key(before);
      if (keyA === undefined) continue;
      const after = remainingB.find((candidate) => key(candidate) === keyA);
      if (!after) continue;
      pairs.push({ before, after });
      remainingA = remainingA.filter((schema) => schema !== before);
      remainingB = remainingB.filter((schema) => schema !== after);
    }
  };

  matchBy((schema) => schema.id);
  matchBy((schema) => schema.path);
  matchBy((schema) => (schema.default ? 'default' : undefined));

  if (remainingA.length === 1 && remainingB.length === 1) {
    pairs.push({ before: remainingA[0]!, after: remainingB[0]! });
    remainingA = [];
    remainingB = [];
  }

  for (const before of remainingA) pairs.push({ before });
  for (const after of remainingB) pairs.push({ after });

  return pairs;
};

const pointer = (schema: IndexSchema, includeContent: boolean): SchemaPointer => ({
  path: schema.path ?? '',
  hash: schema.hash,
  ...(includeContent && schema.content !== undefined ? { content: schema.content } : {}),
});

// ---------------------------------------------------------------------------
// verdict
// ---------------------------------------------------------------------------

const UNKNOWN: Pick<SchemaChange, 'breaking' | 'direction' | 'ops'> = { breaking: null, direction: null, ops: [] };

/**
 * Judge a changed schema. Returns `breaking: null` when no verdict is possible:
 * the index was built without schema content, the content is not valid JSON, or
 * the format is not one we can compare yet.
 */
const judge = (
  before: IndexSchema,
  after: IndexSchema,
  strategy: CompatibilityStrategy
): Pick<SchemaChange, 'breaking' | 'direction' | 'ops'> => {
  const beforeContent = asJsonSchema(before);
  const afterContent = asJsonSchema(after);
  if (beforeContent === undefined || afterContent === undefined) return UNKNOWN;

  return checkJsonSchemaCompatibility(beforeContent, afterContent, strategy);
};

/**
 * The parsed schema, or undefined when this is not a JSON Schema we can compare.
 * `format: 'json-schema'` is trusted. Without a format, a `.json` file counts only
 * when its content uses JSON Schema keywords, so an example payload stored as
 * `schema.json` is not walked as if it were a schema.
 */
const asJsonSchema = (schema: IndexSchema): JsonSchema | undefined => {
  if (schema.format !== undefined && schema.format !== 'json-schema') return undefined;
  if (schema.format === undefined && !(schema.path ?? '').endsWith('.json')) return undefined;

  const parsed = parseJson(schema.content);
  if (parsed === undefined) return undefined;
  if (schema.format === undefined && !looksLikeJsonSchema(parsed)) return undefined;
  return parsed;
};

const SCHEMA_KEYWORDS = [
  '$schema',
  'type',
  'properties',
  'items',
  'required',
  'enum',
  'oneOf',
  'anyOf',
  'allOf',
  '$ref',
  'definitions',
  '$defs',
];

const looksLikeJsonSchema = (value: JsonSchema): boolean =>
  typeof value === 'boolean' || SCHEMA_KEYWORDS.some((keyword) => keyword in value);

const parseJson = (content: string | undefined): JsonSchema | undefined => {
  if (content === undefined) return undefined;
  try {
    const parsed: unknown = JSON.parse(content);
    return typeof parsed === 'boolean' || (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed))
      ? (parsed as JsonSchema)
      : undefined;
  } catch {
    return undefined;
  }
};
