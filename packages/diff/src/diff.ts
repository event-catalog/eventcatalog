import type { Index } from '@eventcatalog/sdk';
import { resolve } from '@eventcatalog/sdk';
import { diffEdges } from './edges';
import { impactOf } from './impact';
import { diffResources } from './resources';
import { diffSchemas } from './schemas';
import type { ArchitectureDiff, CompatibilityStrategy } from './types';
import { ARCHITECTURE_DIFF_SCHEMA_VERSION } from './types';

export type DiffOptions = {
  /**
   * Compatibility strategy used when comparing schemas. Defaults to `full`, so a
   * change is breaking if it could break either producers or consumers.
   */
  strategy?: CompatibilityStrategy;
  /**
   * Copy the raw before and after schema text onto each schema change, so a
   * consumer can render a side-by-side diff without going back to the index.
   * Off by default to keep the document small.
   */
  includeSchemaContent?: boolean;
};

export const DEFAULT_STRATEGY: CompatibilityStrategy = 'full';

/**
 * Compare two catalog indexes and return a single ArchitectureDiff document.
 *
 * `a` is the baseline (e.g. `main`) and `b` is the candidate (e.g. a PR branch).
 * Both are SDK `Index` documents as returned by `buildIndex()`. Build them with
 * `includeSchemaContent: true` to get schema compatibility verdicts.
 */
export const diff = (a: Index, b: Index, options: DiffOptions = {}): ArchitectureDiff => {
  const strategy = options.strategy ?? DEFAULT_STRATEGY;

  // Each side is resolved on its own so pointers (e.g. `version: latest`) become concrete edges.
  const graphA = resolve([a]);
  const graphB = resolve([b]);

  const resources = diffResources(a, b);
  const edges = diffEdges(graphA, graphB);
  const schemaChanges = diffSchemas(a, b, { strategy, includeSchemaContent: options.includeSchemaContent ?? false });
  const impact = impactOf({ baseline: graphA, schemaChanges, resourcesRemoved: resources.removed, edgesRemoved: edges.removed });

  const schemaBreaking = schemaChanges.filter((change) => change.breaking === true).length;
  const schemaUnknown = schemaChanges.filter((change) => change.breaking === null).length;
  // A message that disappears while services still produce or consume it is breaking, whatever the schema said.
  const messageRemoved = impact.some((entry) => entry.reason === 'message_removed');

  return {
    schemaVersion: ARCHITECTURE_DIFF_SCHEMA_VERSION,
    refs: {
      a: { source: a.source, commit: a.commit },
      b: { source: b.source, commit: b.commit },
    },
    compatibility: { strategy },
    summary: {
      breaking: schemaBreaking > 0 || messageRemoved,
      resourcesAdded: resources.added.length,
      resourcesRemoved: resources.removed.length,
      resourcesChanged: resources.changed.length,
      edgesAdded: edges.added.length,
      edgesRemoved: edges.removed.length,
      schemaChanges: schemaChanges.length,
      schemaBreaking,
      schemaUnknown,
    },
    resources,
    edges,
    schemaChanges,
    impact,
  };
};
