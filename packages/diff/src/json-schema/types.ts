/** A JSON Schema document. Boolean schemas (`true` / `false`) are valid in draft-06 and later. */
export type JsonSchema = boolean | { [keyword: string]: unknown };

/**
 * Every kind of change the comparer can detect. Each kind has exactly one row in
 * the rules table, which decides whether it is breaking under each strategy.
 */
export type JsonSchemaChangeKind =
  // properties
  | 'property.added'
  | 'property.added-to-closed-object'
  | 'property.removed'
  | 'property.removed-from-closed-object'
  | 'required.added'
  | 'required.added-with-default'
  | 'required.removed'
  // types
  | 'type.widened'
  | 'type.narrowed'
  | 'type.changed'
  // enums and const
  | 'enum.added'
  | 'enum.removed'
  | 'enum.value.added'
  | 'enum.value.removed'
  // numeric, string, array and object constraints
  | 'constraint.tightened'
  | 'constraint.loosened'
  | 'constraint.changed'
  // content model
  | 'additionalProperties.closed'
  | 'additionalProperties.opened'
  // arrays
  | 'tuple.item.added'
  | 'tuple.item.removed'
  // composition
  | 'union.branch.added'
  | 'union.branch.removed'
  | 'allOf.branch.added'
  | 'allOf.branch.removed'
  // boolean schemas
  | 'schema.restricted'
  | 'schema.relaxed'
  // annotations worth surfacing
  | 'schema.deprecated'
  // anything we cannot reason about
  | 'keyword.changed';

/** A single semantic change between two schemas, with the values on both sides. */
export type JsonSchemaChange = {
  kind: JsonSchemaChangeKind;
  /** JSON pointer to the affected node, e.g. `/properties/customerId`. */
  path: string;
  /** The keyword involved, when the kind is generic (e.g. `minLength`, `oneOf`). */
  keyword?: string;
  before?: unknown;
  after?: unknown;
};
