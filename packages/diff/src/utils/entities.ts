import type { ResolvedEntity, ResolvedGraph } from '@eventcatalog/sdk';

/**
 * Constant-time entity lookup by id and version, built once per graph so impact
 * and edge reporting stay linear on catalogs with thousands of resources.
 */
export type EntityIndex = {
  find: (id: string, version: string | null) => ResolvedEntity | undefined;
};

export const indexEntities = (graph: ResolvedGraph): EntityIndex => {
  const byIdAndVersion = new Map<string, ResolvedEntity>();
  const firstById = new Map<string, ResolvedEntity>();

  for (const entity of graph.entities) {
    byIdAndVersion.set(`${entity.id}@${entity.version ?? ''}`, entity);
    if (!firstById.has(entity.id)) firstById.set(entity.id, entity);
  }

  return {
    find: (id, version) => (version === null ? firstById.get(id) : byIdAndVersion.get(`${id}@${version}`)),
  };
};
