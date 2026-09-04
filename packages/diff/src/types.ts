/**
 * ArchitectureDiff
 *
 * The single versioned document produced by `diff(a, b)`. Consumers (CI actions,
 * policy engines, notifiers, UIs) build on top of this and never re-walk the graph.
 *
 * Input is the SDK `Index` returned by `buildIndex()`. Vocabulary follows the SDK:
 * resources have a `type`, edges have a `direction`.
 */

import type { EdgeDirection, IndexResourceType } from '@eventcatalog/sdk';

export const ARCHITECTURE_DIFF_SCHEMA_VERSION = 1 as const;

export type CompatibilityStrategy = 'backward' | 'forward' | 'full' | 'none';

/** Which side a breaking change hurts. `both` only occurs under the `full` strategy. */
export type BreakingDirection = 'backward' | 'forward' | 'both';

/** Resource types that carry schemas and travel along sends/receives edges. */
export type MessageType = Extract<IndexResourceType, 'event' | 'command' | 'query'>;

/** Where an index came from: the SDK index `source` and `commit`. */
export type DiffRef = {
  source: string;
  commit: string;
};

/** A value that differs between the baseline (a) and the candidate (b). */
export type Change<T> = {
  a: T;
  b: T;
};

export type DiffSummary = {
  breaking: boolean;
  resourcesAdded: number;
  resourcesRemoved: number;
  resourcesChanged: number;
  edgesAdded: number;
  edgesRemoved: number;
  schemaChanges: number;
  schemaBreaking: number;
  /** Schema changes with no verdict (`breaking: null`). Policy should decide whether these warn or fail. */
  schemaUnknown: number;
};

export type ResourceRef = {
  type: IndexResourceType;
  id: string;
  version?: string;
};

export type ResourceAdded = ResourceRef;

export type ResourceRemoved = ResourceRef;

/** The fields of a resource the diff compares. Markdown content and schema files are covered elsewhere. */
export type ResourceField = 'version' | 'name' | 'owners' | 'deprecated';

export type ResourceChanged = {
  type: IndexResourceType;
  id: string;
  /** Latest version on each side. Equal when only metadata changed. */
  version: Change<string | undefined>;
  /** Which fields differ between the latest version on each side. */
  fields: ResourceField[];
};

/** One end of an edge. `type` is absent when the target could not be resolved in the index. */
export type EdgeEnd = {
  type?: IndexResourceType;
  id: string;
  version?: string;
};

/**
 * An edge between two resources, as resolved by the SDK. Identity ignores versions,
 * so bumping a message does not churn every edge that points at it.
 */
export type DiffEdge = {
  direction: EdgeDirection;
  from: EdgeEnd;
  to: EdgeEnd;
  /** The field the pointer came from when it is not the direction itself, e.g. `steps`. */
  via?: string;
};

export type SchemaPointer = {
  path: string;
  hash?: string;
  /** Raw schema text. Only present when `diff()` is called with `includeSchemaContent: true`. */
  content?: string;
};

export type SchemaOp = {
  op: 'add' | 'remove' | 'replace';
  /** JSON pointer into the schema document, e.g. `/properties/customerId`. */
  path: string;
  /** Stable machine-readable change kind, e.g. `required.added`, for consumers that key on it. */
  kind: string;
  /** Human-readable explanation. */
  reason: string;
  /** Whether this op alone breaks the chosen strategy. */
  breaking: boolean;
};

export type SchemaChange = {
  message: {
    type: MessageType;
    id: string;
    version: Change<string | undefined>;
  };
  /** `modified` when the same schema file changed; `added` / `removed` when a schema file appeared or disappeared. */
  change: 'modified' | 'added' | 'removed';
  /** Absent when the schema was added. */
  before?: SchemaPointer;
  /** Absent when the schema was removed. */
  after?: SchemaPointer;
  /**
   * `null` when no verdict was possible: the schema was added or removed, the index was
   * built without schema content, the content is not valid JSON, or the format is not
   * one we can compare yet. Counted in `summary.schemaUnknown` so it is never silent.
   */
  breaking: boolean | null;
  strategy: CompatibilityStrategy;
  /** Which side the change breaks. `null` when not breaking or when no verdict was possible. */
  direction: BreakingDirection | null;
  ops: SchemaOp[];
};

export type ImpactReason =
  | 'schema_breaking_change'
  | 'schema_changed'
  | 'message_removed'
  | 'producer_removed'
  | 'consumer_removed';

export type ImpactedResource = {
  type: IndexResourceType;
  id: string;
  version?: string;
  owners?: string[];
};

/**
 * Who a change hurts, derived from the baseline graph so consumers of the diff
 * never have to walk edges themselves.
 *
 * - `forward` breaking: the consumers listed are on the old schema and will fail
 *   to read new messages.
 * - `backward` breaking: the consumers listed will fail to read old messages once
 *   they move to the new schema (e.g. when replaying history).
 * - `both`: both of the above.
 */
export type Impact = {
  message: {
    type: MessageType;
    id: string;
    version?: string;
  };
  reason: ImpactReason;
  /** Which direction broke. Only present for schema-related reasons. */
  direction?: BreakingDirection;
  producers: ImpactedResource[];
  consumers: ImpactedResource[];
};

export type ArchitectureDiff = {
  schemaVersion: typeof ARCHITECTURE_DIFF_SCHEMA_VERSION;
  refs: {
    a: DiffRef;
    b: DiffRef;
  };
  compatibility: {
    strategy: CompatibilityStrategy;
  };
  summary: DiffSummary;
  resources: {
    added: ResourceAdded[];
    removed: ResourceRemoved[];
    changed: ResourceChanged[];
  };
  edges: {
    added: DiffEdge[];
    removed: DiffEdge[];
  };
  schemaChanges: SchemaChange[];
  impact: Impact[];
};
