import type { JsonSchema, JsonSchemaChange, JsonSchemaChangeKind } from './types';

/**
 * Walks two JSON schemas side by side and emits every semantic change found.
 *
 * This is deliberately rule-free: it only says *what* changed, never whether
 * that matters. `rules.ts` decides what is breaking under each strategy.
 *
 * Supported: properties, required (with `default`), type (including `integer`
 * within `number` and nullable unions), enum and const, the min/max constraint
 * families, pattern, format, multipleOf, uniqueItems, additionalProperties,
 * items and tuples (`items` array or `prefixItems`), oneOf, anyOf, allOf, local
 * `$ref` (changes reported once, at the definition), and boolean schemas.
 *
 * Annotations (title, description, examples, $comment, default ...) are ignored.
 * Keywords we cannot reason about are reported as `keyword.changed` so they are
 * never silently passed.
 */
export const compareJsonSchemas = (before: JsonSchema, after: JsonSchema): JsonSchemaChange[] => {
  const context: Context = { rootBefore: before, rootAfter: after, changes: [], visitedRefs: new Set() };
  walk(before, after, '', context);
  return context.changes;
};

type ObjectSchema = { [keyword: string]: unknown };

type Context = {
  rootBefore: JsonSchema;
  rootAfter: JsonSchema;
  changes: JsonSchemaChange[];
  visitedRefs: Set<string>;
};

// ---------------------------------------------------------------------------
// walk
// ---------------------------------------------------------------------------

const walk = (beforeInput: JsonSchema, afterInput: JsonSchema, pointerInput: string, context: Context): void => {
  const { before, after, pointer, skip } = dereference(beforeInput, afterInput, pointerInput, context);
  if (skip) return;

  if (typeof before === 'boolean' || typeof after === 'boolean') {
    compareBooleanSchemas(before, after, pointer, context);
    return;
  }

  compareDeprecated(before, after, pointer, context);
  compareType(before, after, pointer, context);
  compareEnum(before, after, pointer, context);
  compareConstraints(before, after, pointer, context);
  compareProperties(before, after, pointer, context);
  compareRequired(before, after, pointer, context);
  compareAdditionalProperties(before, after, pointer, context);
  compareItems(before, after, pointer, context);
  compareUnion(before, after, pointer, 'oneOf', context);
  compareUnion(before, after, pointer, 'anyOf', context);
  compareAllOf(before, after, pointer, context);
  compareUnsupportedKeywords(before, after, pointer, context);
};

const emit = (context: Context, change: JsonSchemaChange) => {
  context.changes.push(change);
};

// ---------------------------------------------------------------------------
// $ref
// ---------------------------------------------------------------------------

/**
 * Resolves local `$ref`s on either side. When both sides are refs the changes are
 * reported at the definition's own path, once, so a definition used by ten
 * properties does not produce ten copies of the same change and recursive
 * schemas terminate.
 */
const dereference = (before: JsonSchema, after: JsonSchema, pointer: string, context: Context) => {
  const refBefore = refOf(before);
  const refAfter = refOf(after);
  if (refBefore === undefined && refAfter === undefined) return { before, after, pointer, skip: false };

  if (refBefore !== undefined && refAfter !== undefined) {
    const key = `${refBefore}|${refAfter}`;
    if (context.visitedRefs.has(key)) return { before, after, pointer, skip: true };
    context.visitedRefs.add(key);
    return {
      before: resolveRef(context.rootBefore, refBefore),
      after: resolveRef(context.rootAfter, refAfter),
      pointer: refAfter.slice(1),
      skip: false,
    };
  }

  return {
    before: refBefore !== undefined ? resolveRef(context.rootBefore, refBefore) : before,
    after: refAfter !== undefined ? resolveRef(context.rootAfter, refAfter) : after,
    pointer,
    skip: false,
  };
};

/** Only local refs (`#/...`) are followed. Anything else is left in place and reported by the unsupported-keyword check. */
const refOf = (schema: JsonSchema): string | undefined =>
  isObjectSchema(schema) && typeof schema.$ref === 'string' && schema.$ref.startsWith('#/') ? schema.$ref : undefined;

const MAX_REF_HOPS = 32;

/**
 * Follows a local JSON pointer such as `#/definitions/Address`, and keeps following
 * if the target is itself a local ref. Unknown targets resolve to `true` (anything).
 */
const resolveRef = (root: JsonSchema, ref: string): JsonSchema => {
  let target = resolvePointer(root, ref);
  for (let hop = 0; hop < MAX_REF_HOPS; hop++) {
    const next = refOf(target);
    if (next === undefined) return target;
    target = resolvePointer(root, next);
  }
  return true;
};

const resolvePointer = (root: JsonSchema, ref: string): JsonSchema => {
  let current: unknown = root;
  for (const segment of ref.slice(2).split('/')) {
    if (!isObjectSchema(current as JsonSchema)) return true;
    current = (current as ObjectSchema)[unescapePointer(segment)];
  }
  return current === undefined ? true : (current as JsonSchema);
};

// ---------------------------------------------------------------------------
// boolean schemas: `true` accepts anything, `false` accepts nothing
// ---------------------------------------------------------------------------

const compareBooleanSchemas = (before: JsonSchema, after: JsonSchema, pointer: string, context: Context) => {
  if (before === after) return;
  const relaxed = before === false || after === true;
  emit(context, { kind: relaxed ? 'schema.relaxed' : 'schema.restricted', path: pointer, before, after });
};

// ---------------------------------------------------------------------------
// type
// ---------------------------------------------------------------------------

const compareType = (before: ObjectSchema, after: ObjectSchema, pointer: string, context: Context) => {
  const typesBefore = typesOf(before);
  const typesAfter = typesOf(after);
  const path = `${pointer}/type`;

  if (typesBefore === undefined && typesAfter === undefined) return;
  if (typesBefore === undefined) {
    emit(context, { kind: 'type.narrowed', path, before: 'any', after: after.type });
    return;
  }
  if (typesAfter === undefined) {
    emit(context, { kind: 'type.widened', path, before: before.type, after: 'any' });
    return;
  }

  const afterCoversBefore = covers(typesAfter, typesBefore);
  const beforeCoversAfter = covers(typesBefore, typesAfter);
  if (afterCoversBefore && beforeCoversAfter) return;

  const kind: JsonSchemaChangeKind = afterCoversBefore ? 'type.widened' : beforeCoversAfter ? 'type.narrowed' : 'type.changed';
  emit(context, { kind, path, before: before.type, after: after.type });
};

const typesOf = (schema: ObjectSchema): Set<string> | undefined => {
  if (schema.type === undefined) return undefined;
  return new Set(Array.isArray(schema.type) ? (schema.type as string[]) : [schema.type as string]);
};

/** Does `outer` accept every value that `inner` accepts? `number` covers `integer`. */
const covers = (outer: Set<string>, inner: Set<string>) =>
  [...inner].every((type) => outer.has(type) || (type === 'integer' && outer.has('number')));

// ---------------------------------------------------------------------------
// enum and const
// ---------------------------------------------------------------------------

const compareEnum = (before: ObjectSchema, after: ObjectSchema, pointer: string, context: Context) => {
  const valuesBefore = enumOf(before);
  const valuesAfter = enumOf(after);
  const path = `${pointer}/enum`;

  if (valuesBefore === undefined && valuesAfter === undefined) return;
  if (valuesBefore === undefined) {
    emit(context, { kind: 'enum.added', path, after: valuesAfter });
    return;
  }
  if (valuesAfter === undefined) {
    emit(context, { kind: 'enum.removed', path, before: valuesBefore });
    return;
  }

  const keysBefore = new Set(valuesBefore.map(stableStringify));
  const keysAfter = new Set(valuesAfter.map(stableStringify));

  for (const value of valuesAfter) {
    if (!keysBefore.has(stableStringify(value))) emit(context, { kind: 'enum.value.added', path, after: value });
  }
  for (const value of valuesBefore) {
    if (!keysAfter.has(stableStringify(value))) emit(context, { kind: 'enum.value.removed', path, before: value });
  }
};

const enumOf = (schema: ObjectSchema): unknown[] | undefined => {
  if (Array.isArray(schema.enum)) return schema.enum;
  if ('const' in schema) return [schema.const];
  return undefined;
};

// ---------------------------------------------------------------------------
// constraints
// ---------------------------------------------------------------------------

/** A higher value accepts less. */
const MIN_CONSTRAINTS = ['minLength', 'minimum', 'exclusiveMinimum', 'minItems', 'minProperties'];
/** A lower value accepts less. */
const MAX_CONSTRAINTS = ['maxLength', 'maximum', 'exclusiveMaximum', 'maxItems', 'maxProperties'];
/** Present means constrained; a different value is a different constraint. */
const PRESENCE_CONSTRAINTS = ['pattern', 'format', 'multipleOf'];
/** `true` means constrained. */
const FLAG_CONSTRAINTS = ['uniqueItems'];

const compareConstraints = (before: ObjectSchema, after: ObjectSchema, pointer: string, context: Context) => {
  for (const keyword of MIN_CONSTRAINTS) compareBound(before, after, pointer, keyword, 'higher-is-tighter', context);
  for (const keyword of MAX_CONSTRAINTS) compareBound(before, after, pointer, keyword, 'lower-is-tighter', context);
  for (const keyword of PRESENCE_CONSTRAINTS) comparePresence(before, after, pointer, keyword, context);
  for (const keyword of FLAG_CONSTRAINTS) compareFlag(before, after, pointer, keyword, context);
};

const compareBound = (
  before: ObjectSchema,
  after: ObjectSchema,
  pointer: string,
  keyword: string,
  mode: 'higher-is-tighter' | 'lower-is-tighter',
  context: Context
) => {
  const valueBefore = numberOrUndefined(before[keyword]);
  const valueAfter = numberOrUndefined(after[keyword]);
  if (valueBefore === valueAfter) return;

  const path = `${pointer}/${keyword}`;
  const change = { path, keyword, before: valueBefore, after: valueAfter };

  if (valueBefore === undefined) return emit(context, { kind: 'constraint.tightened', ...change });
  if (valueAfter === undefined) return emit(context, { kind: 'constraint.loosened', ...change });

  const tighter = mode === 'higher-is-tighter' ? valueAfter > valueBefore : valueAfter < valueBefore;
  emit(context, { kind: tighter ? 'constraint.tightened' : 'constraint.loosened', ...change });
};

const comparePresence = (before: ObjectSchema, after: ObjectSchema, pointer: string, keyword: string, context: Context) => {
  const valueBefore = before[keyword];
  const valueAfter = after[keyword];
  if (stableStringify(valueBefore) === stableStringify(valueAfter)) return;

  const change = { path: `${pointer}/${keyword}`, keyword, before: valueBefore, after: valueAfter };
  if (valueBefore === undefined) return emit(context, { kind: 'constraint.tightened', ...change });
  if (valueAfter === undefined) return emit(context, { kind: 'constraint.loosened', ...change });
  emit(context, { kind: 'constraint.changed', ...change });
};

const compareFlag = (before: ObjectSchema, after: ObjectSchema, pointer: string, keyword: string, context: Context) => {
  const flagBefore = before[keyword] === true;
  const flagAfter = after[keyword] === true;
  if (flagBefore === flagAfter) return;

  emit(context, {
    kind: flagAfter ? 'constraint.tightened' : 'constraint.loosened',
    path: `${pointer}/${keyword}`,
    keyword,
    before: flagBefore,
    after: flagAfter,
  });
};

// ---------------------------------------------------------------------------
// properties and required
// ---------------------------------------------------------------------------

const compareProperties = (before: ObjectSchema, after: ObjectSchema, pointer: string, context: Context) => {
  const propsBefore = propertiesOf(before);
  const propsAfter = propertiesOf(after);
  const names = new Set([...Object.keys(propsBefore), ...Object.keys(propsAfter)]);

  for (const name of names) {
    const path = `${pointer}/properties/${escapePointer(name)}`;
    const inBefore = name in propsBefore;
    const inAfter = name in propsAfter;

    if (!inBefore && inAfter) {
      // An old reader on a CLOSED schema rejects the unknown property in new messages.
      const kind: JsonSchemaChangeKind = isClosed(before) ? 'property.added-to-closed-object' : 'property.added';
      emit(context, { kind, path, after: propsAfter[name] });
    } else if (inBefore && !inAfter) {
      // A new reader on a CLOSED schema rejects old messages that still carry the property.
      const kind: JsonSchemaChangeKind = isClosed(after) ? 'property.removed-from-closed-object' : 'property.removed';
      emit(context, { kind, path, before: propsBefore[name] });
    } else {
      walk(propsBefore[name]!, propsAfter[name]!, path, context);
    }
  }
};

/** `additionalProperties: false`. A schema-valued additionalProperties is treated as open (lenient). */
const isClosed = (schema: ObjectSchema) => schema.additionalProperties === false;

// ---------------------------------------------------------------------------
// deprecated: an annotation, never breaking, but worth surfacing
// ---------------------------------------------------------------------------

const compareDeprecated = (before: ObjectSchema, after: ObjectSchema, pointer: string, context: Context) => {
  if (before.deprecated !== true && after.deprecated === true) {
    emit(context, { kind: 'schema.deprecated', path: pointer, before: false, after: true });
  }
};

const compareRequired = (before: ObjectSchema, after: ObjectSchema, pointer: string, context: Context) => {
  const requiredBefore = requiredOf(before);
  const requiredAfter = requiredOf(after);
  const propsAfter = propertiesOf(after);

  for (const name of requiredAfter) {
    if (requiredBefore.has(name)) continue;
    const property = propsAfter[name];
    const hasDefault = isObjectSchema(property as JsonSchema) && (property as ObjectSchema).default !== undefined;
    emit(context, {
      kind: hasDefault ? 'required.added-with-default' : 'required.added',
      path: `${pointer}/properties/${escapePointer(name)}`,
      before: false,
      after: true,
    });
  }
  for (const name of requiredBefore) {
    if (!requiredAfter.has(name)) {
      emit(context, {
        kind: 'required.removed',
        path: `${pointer}/properties/${escapePointer(name)}`,
        before: true,
        after: false,
      });
    }
  }
};

const propertiesOf = (schema: ObjectSchema): Record<string, JsonSchema> =>
  isObjectSchema(schema.properties as JsonSchema) ? (schema.properties as Record<string, JsonSchema>) : {};

const requiredOf = (schema: ObjectSchema): Set<string> =>
  new Set(Array.isArray(schema.required) ? (schema.required as string[]) : []);

// ---------------------------------------------------------------------------
// additionalProperties: absent or `true` is open, `false` is closed, a schema is partially open
// ---------------------------------------------------------------------------

const compareAdditionalProperties = (before: ObjectSchema, after: ObjectSchema, pointer: string, context: Context) => {
  const apBefore = (before.additionalProperties ?? true) as JsonSchema;
  const apAfter = (after.additionalProperties ?? true) as JsonSchema;
  const path = `${pointer}/additionalProperties`;

  if (apBefore !== false && apAfter === false) return emit(context, { kind: 'additionalProperties.closed', path });
  if (apBefore === false && apAfter !== false) return emit(context, { kind: 'additionalProperties.opened', path });
  walk(apBefore, apAfter, path, context);
};

// ---------------------------------------------------------------------------
// arrays: `items` (schema), tuples (`items` array in draft-07, `prefixItems` in 2020-12)
// ---------------------------------------------------------------------------

const compareItems = (before: ObjectSchema, after: ObjectSchema, pointer: string, context: Context) => {
  const tupleBefore = tupleOf(before);
  const tupleAfter = tupleOf(after);

  if (tupleBefore || tupleAfter) {
    const keyword = Array.isArray(after.items) || Array.isArray(before.items) ? 'items' : 'prefixItems';
    const itemsBefore = tupleBefore ?? [];
    const itemsAfter = tupleAfter ?? [];
    const shared = Math.min(itemsBefore.length, itemsAfter.length);

    for (let i = 0; i < shared; i++) walk(itemsBefore[i]!, itemsAfter[i]!, `${pointer}/${keyword}/${i}`, context);
    for (let i = shared; i < itemsAfter.length; i++) {
      emit(context, { kind: 'tuple.item.added', path: `${pointer}/${keyword}/${i}`, after: itemsAfter[i] });
    }
    for (let i = shared; i < itemsBefore.length; i++) {
      emit(context, { kind: 'tuple.item.removed', path: `${pointer}/${keyword}/${i}`, before: itemsBefore[i] });
    }
  }

  const schemaBefore = itemsSchemaOf(before);
  const schemaAfter = itemsSchemaOf(after);
  if (schemaBefore === undefined && schemaAfter === undefined) return;
  walk(schemaBefore ?? true, schemaAfter ?? true, `${pointer}/items`, context);
};

const tupleOf = (schema: ObjectSchema): JsonSchema[] | undefined => {
  if (Array.isArray(schema.items)) return schema.items as JsonSchema[];
  if (Array.isArray(schema.prefixItems)) return schema.prefixItems as JsonSchema[];
  return undefined;
};

const itemsSchemaOf = (schema: ObjectSchema): JsonSchema | undefined =>
  schema.items !== undefined && !Array.isArray(schema.items) ? (schema.items as JsonSchema) : undefined;

// ---------------------------------------------------------------------------
// composition
// ---------------------------------------------------------------------------

const compareUnion = (
  before: ObjectSchema,
  after: ObjectSchema,
  pointer: string,
  keyword: 'oneOf' | 'anyOf',
  context: Context
) => {
  compareBranches(before, after, pointer, keyword, 'union.branch.added', 'union.branch.removed', context);
};

const compareAllOf = (before: ObjectSchema, after: ObjectSchema, pointer: string, context: Context) => {
  compareBranches(before, after, pointer, 'allOf', 'allOf.branch.added', 'allOf.branch.removed', context);
};

/**
 * Identical branches are matched first, wherever they sit, so reordering is not a
 * change. What is left is paired by position and walked when the counts agree, so
 * an edit inside one branch is reported precisely. Otherwise the leftovers are
 * reported as added or removed.
 */
const compareBranches = (
  before: ObjectSchema,
  after: ObjectSchema,
  pointer: string,
  keyword: 'oneOf' | 'anyOf' | 'allOf',
  addedKind: JsonSchemaChangeKind,
  removedKind: JsonSchemaChangeKind,
  context: Context
) => {
  const branchesBefore = Array.isArray(before[keyword]) ? (before[keyword] as JsonSchema[]) : undefined;
  const branchesAfter = Array.isArray(after[keyword]) ? (after[keyword] as JsonSchema[]) : undefined;
  const path = `${pointer}/${keyword}`;

  if (branchesBefore === undefined && branchesAfter === undefined) return;
  if (branchesBefore === undefined) {
    // A union that did not exist now restricts values to its branches; an allOf adds constraints. Both tighten.
    return emit(context, { kind: 'constraint.tightened', path, keyword, after: branchesAfter });
  }
  if (branchesAfter === undefined) {
    return emit(context, { kind: 'constraint.loosened', path, keyword, before: branchesBefore });
  }

  const keysBefore = branchesBefore.map(stableStringify);
  const keysAfter = branchesAfter.map(stableStringify);
  const matchedAfter = new Set<number>();
  const unmatchedBefore: number[] = [];

  branchesBefore.forEach((_branch, i) => {
    const j = keysAfter.findIndex((key, index) => key === keysBefore[i] && !matchedAfter.has(index));
    if (j >= 0) matchedAfter.add(j);
    else unmatchedBefore.push(i);
  });
  const unmatchedAfter = branchesAfter.map((_branch, j) => j).filter((j) => !matchedAfter.has(j));

  if (unmatchedBefore.length === unmatchedAfter.length) {
    unmatchedBefore.forEach((i, n) => {
      const j = unmatchedAfter[n]!;
      walk(branchesBefore[i]!, branchesAfter[j]!, `${path}/${j}`, context);
    });
    return;
  }

  for (const j of unmatchedAfter) emit(context, { kind: addedKind, path: `${path}/${j}`, keyword, after: branchesAfter[j] });
  for (const i of unmatchedBefore) emit(context, { kind: removedKind, path: `${path}/${i}`, keyword, before: branchesBefore[i] });
};

// ---------------------------------------------------------------------------
// keywords we do not reason about: report, never silently pass
// ---------------------------------------------------------------------------

const UNSUPPORTED_KEYWORDS = [
  // Any $ref still present here is external (local ones were resolved). We cannot see its target.
  '$ref',
  'patternProperties',
  'propertyNames',
  'not',
  'if',
  'then',
  'else',
  'dependentRequired',
  'dependentSchemas',
  'dependencies',
  'contains',
  'minContains',
  'maxContains',
  'unevaluatedProperties',
  'unevaluatedItems',
  'additionalItems',
];

const compareUnsupportedKeywords = (before: ObjectSchema, after: ObjectSchema, pointer: string, context: Context) => {
  for (const keyword of UNSUPPORTED_KEYWORDS) {
    if (stableStringify(before[keyword]) === stableStringify(after[keyword])) continue;
    emit(context, {
      kind: 'keyword.changed',
      path: `${pointer}/${keyword}`,
      keyword,
      before: before[keyword],
      after: after[keyword],
    });
  }
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const isObjectSchema = (schema: JsonSchema | undefined): schema is ObjectSchema => typeof schema === 'object' && schema !== null;

const numberOrUndefined = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);

/** Deterministic JSON so two structurally equal values compare equal regardless of key order. */
const stableStringify = (value: unknown): string =>
  JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : item
  ) ?? 'undefined';

/** RFC 6901: `~` becomes `~0` and `/` becomes `~1` inside a pointer segment. */
const escapePointer = (segment: string) => segment.replace(/~/g, '~0').replace(/\//g, '~1');
const unescapePointer = (segment: string) => segment.replace(/~1/g, '/').replace(/~0/g, '~');
