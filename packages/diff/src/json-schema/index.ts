import type { BreakingDirection, CompatibilityStrategy, SchemaOp } from '../types';
import { compareJsonSchemas } from './compare';
import { isBreaking, reasonFor } from './rules';
import type { JsonSchema, JsonSchemaChange, JsonSchemaChangeKind } from './types';

export type { JsonSchema, JsonSchemaChange, JsonSchemaChangeKind } from './types';
export { compareJsonSchemas } from './compare';

export type JsonSchemaCompatibility = {
  breaking: boolean;
  /** Which side the change breaks under the strategy, or `null` when it is not breaking. */
  direction: BreakingDirection | null;
  ops: SchemaOp[];
};

/**
 * Compare two JSON schemas and judge the result under a compatibility strategy.
 *
 * Returns every change as an op (so consumers can show what happened), a single
 * verdict (breaking if at least one op is breaking under the strategy) and the
 * direction that broke, so impact can say who is hurt.
 */
export const checkJsonSchemaCompatibility = (
  before: JsonSchema,
  after: JsonSchema,
  strategy: CompatibilityStrategy
): JsonSchemaCompatibility => {
  const changes = compareJsonSchemas(before, after);
  const ops = changes.map((change) => toOp(change, strategy));

  const checksBackward = strategy === 'backward' || strategy === 'full';
  const checksForward = strategy === 'forward' || strategy === 'full';
  const breaksBackward = checksBackward && changes.some((change) => isBreaking(change, 'backward'));
  const breaksForward = checksForward && changes.some((change) => isBreaking(change, 'forward'));

  const direction: BreakingDirection | null =
    breaksBackward && breaksForward ? 'both' : breaksBackward ? 'backward' : breaksForward ? 'forward' : null;

  return { breaking: direction !== null, direction, ops };
};

/** `add` when only an after value exists, `remove` when only a before value exists, otherwise `replace`. */
const opFor = (change: JsonSchemaChange): SchemaOp['op'] => {
  if (change.before === undefined && change.after !== undefined) return 'add';
  if (change.before !== undefined && change.after === undefined) return 'remove';
  return 'replace';
};

const toOp = (change: JsonSchemaChange, strategy: CompatibilityStrategy): SchemaOp => ({
  op: opFor(change),
  path: change.path,
  kind: change.kind,
  reason: reasonFor(change),
  breaking: isBreaking(change, strategy),
});
