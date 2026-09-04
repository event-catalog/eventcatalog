import type { CompatibilityStrategy } from '../types';
import type { JsonSchemaChange, JsonSchemaChangeKind } from './types';

/**
 * The business rules: which changes break which compatibility strategy.
 *
 * Definitions (as used by Confluent Schema Registry, which Kafka users expect):
 *
 *   backward  a consumer using the NEW schema can read messages written with the OLD schema
 *             (consumers upgrade first)
 *   forward   a consumer using the OLD schema can read messages written with the NEW schema
 *             (producers upgrade first)
 *   full      both of the above
 *   none      nothing is ever breaking
 *
 * Every row answers one question per direction: does the reader's schema accept
 * everything the writer's schema could have produced? A change that makes the
 * schema accept MORE is safe for backward and breaking for forward. A change that
 * makes it accept LESS is the reverse.
 *
 * Schemas are treated as having an open content model (`additionalProperties` not
 * `false`), which is the JSON Schema default: unknown properties are accepted. We
 * take Confluent's lenient reading of that model: adding a property is safe, on the
 * assumption that producers do not emit undeclared properties.
 * See https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/serdes-json.html
 *
 * To add a rule: add the kind to `JsonSchemaChangeKind`, emit it from `compare.ts`,
 * add a row here, add explicit tests under each strategy in
 * `src/test/json-schema/json-schema.test.ts`, and update the rules table in the
 * package README.
 */
type Rule = {
  backward: boolean;
  forward: boolean;
  reason: (change: JsonSchemaChange) => string;
};

/** Accepts more than before: safe for backward, breaking for forward. */
const WIDENS = { backward: false, forward: true };
/** Accepts less than before: breaking for backward, safe for forward. */
const NARROWS = { backward: true, forward: false };
/** Neither side can be trusted to read the other. */
const INCOMPATIBLE = { backward: true, forward: true };
/** Safe both ways. */
const SAFE = { backward: false, forward: false };

const RULES: Record<JsonSchemaChangeKind, Rule> = {
  // --- properties -----------------------------------------------------------
  // Old messages simply don't have the property; new messages carry an extra one.
  'property.added': { ...SAFE, reason: () => 'property added' },
  // The old schema was closed (additionalProperties: false), so an old reader rejects the new property.
  'property.added-to-closed-object': {
    ...WIDENS,
    reason: () => 'property added to a closed object (old readers reject unknown properties)',
  },
  // Old messages still carry the property but the new schema ignores it; new messages lack
  // a property the old schema knew about but did not require.
  'property.removed': { ...SAFE, reason: () => 'property removed' },
  // The new schema is closed, so a new reader rejects old messages that still carry the property.
  'property.removed-from-closed-object': {
    ...NARROWS,
    reason: () => 'property removed from a closed object (new readers reject old messages that still carry it)',
  },
  // Old messages were written without the property, so a new consumer that requires it cannot read them.
  'required.added': { ...NARROWS, reason: () => 'property became required' },
  // The new consumer fills the gap with the default, so old messages still read.
  'required.added-with-default': { ...SAFE, reason: () => 'property became required but has a default' },
  // New messages may omit the property, so an old consumer that requires it cannot read them.
  'required.removed': { ...WIDENS, reason: () => 'property is no longer required' },

  // --- types ----------------------------------------------------------------
  'type.widened': { ...WIDENS, reason: (c) => `type widened from ${show(c.before)} to ${show(c.after)}` },
  'type.narrowed': { ...NARROWS, reason: (c) => `type narrowed from ${show(c.before)} to ${show(c.after)}` },
  'type.changed': { ...INCOMPATIBLE, reason: (c) => `type changed from ${show(c.before)} to ${show(c.after)}` },

  // --- enum and const -------------------------------------------------------
  'enum.added': { ...NARROWS, reason: (c) => `values restricted to ${show(c.after)}` },
  'enum.removed': { ...WIDENS, reason: () => 'enum restriction removed' },
  'enum.value.added': { ...WIDENS, reason: (c) => `enum value ${show(c.after)} added` },
  'enum.value.removed': { ...NARROWS, reason: (c) => `enum value ${show(c.before)} removed` },

  // --- constraints ----------------------------------------------------------
  'constraint.tightened': {
    ...NARROWS,
    reason: (c) =>
      c.before === undefined
        ? `${c.keyword} added (${show(c.after)})`
        : `${c.keyword} tightened from ${show(c.before)} to ${show(c.after)}`,
  },
  'constraint.loosened': {
    ...WIDENS,
    reason: (c) =>
      c.after === undefined ? `${c.keyword} removed` : `${c.keyword} loosened from ${show(c.before)} to ${show(c.after)}`,
  },
  'constraint.changed': { ...INCOMPATIBLE, reason: (c) => `${c.keyword} changed from ${show(c.before)} to ${show(c.after)}` },

  // --- content model --------------------------------------------------------
  'additionalProperties.closed': { ...NARROWS, reason: () => 'additional properties are no longer allowed' },
  'additionalProperties.opened': { ...WIDENS, reason: () => 'additional properties are now allowed' },

  // --- arrays ---------------------------------------------------------------
  'tuple.item.added': { ...NARROWS, reason: () => 'tuple position is now constrained' },
  'tuple.item.removed': { ...WIDENS, reason: () => 'tuple position is no longer constrained' },

  // --- composition ----------------------------------------------------------
  'union.branch.added': { ...WIDENS, reason: (c) => `${c.keyword} branch added` },
  'union.branch.removed': { ...NARROWS, reason: (c) => `${c.keyword} branch removed` },
  'allOf.branch.added': { ...NARROWS, reason: () => 'allOf branch added' },
  'allOf.branch.removed': { ...WIDENS, reason: () => 'allOf branch removed' },

  // --- boolean schemas ------------------------------------------------------
  'schema.restricted': { ...NARROWS, reason: () => 'schema now accepts fewer values' },
  'schema.relaxed': { ...WIDENS, reason: () => 'schema now accepts more values' },

  // --- annotations ----------------------------------------------------------
  // Changes nothing about accepted values, but consumers of the diff want to see it.
  'schema.deprecated': { ...SAFE, reason: () => 'marked as deprecated' },

  // --- unknown --------------------------------------------------------------
  // We cannot reason about it, so we refuse to call it safe.
  'keyword.changed': { ...INCOMPATIBLE, reason: (c) => `${c.keyword} changed, compatibility cannot be determined` },
};

export const isBreaking = (change: JsonSchemaChange, strategy: CompatibilityStrategy): boolean => {
  const rule = RULES[change.kind];
  switch (strategy) {
    case 'backward':
      return rule.backward;
    case 'forward':
      return rule.forward;
    case 'full':
      return rule.backward || rule.forward;
    case 'none':
      return false;
  }
};

export const reasonFor = (change: JsonSchemaChange): string => RULES[change.kind].reason(change);

const show = (value: unknown): string => (typeof value === 'string' ? value : JSON.stringify(value));
