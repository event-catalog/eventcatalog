import type { Index, IndexResource } from '@eventcatalog/sdk';
import type { ResourceAdded, ResourceChanged, ResourceField, ResourceRemoved } from './types';
import { compareVersions, latest } from './utils/versions';

export type ResourceDiff = {
  added: ResourceAdded[];
  removed: ResourceRemoved[];
  changed: ResourceChanged[];
};

/**
 * Compares the resources of two indexes.
 *
 * A resource is identified by type and id. Because an index carries every version
 * of a resource, the rules are:
 *   - id only in the candidate: added (every version listed)
 *   - id only in the baseline: removed (every version listed)
 *   - id on both sides and the latest version differs: changed, with `version: { a, b }`
 *   - id on both sides, same latest version, but name / owners / deprecated differ: changed
 *   - an individual old version that appears or disappears while the id survives: added / removed
 */
export const diffResources = (a: Index, b: Index): ResourceDiff => {
  const before = byKey(a);
  const after = byKey(b);
  const added: ResourceAdded[] = [];
  const removed: ResourceRemoved[] = [];
  const changed: ResourceChanged[] = [];

  for (const key of new Set([...before.keys(), ...after.keys()])) {
    const versionsA = before.get(key) ?? [];
    const versionsB = after.get(key) ?? [];

    if (versionsA.length === 0) {
      added.push(...versionsB.map(ref));
      continue;
    }
    if (versionsB.length === 0) {
      removed.push(...versionsA.map(ref));
      continue;
    }

    const latestA = latest(versionsA)!;
    const latestB = latest(versionsB)!;
    const fields = changedFields(latestA, latestB);
    if (fields.length > 0) {
      changed.push({ type: latestA.type, id: latestA.id, version: { a: latestA.version, b: latestB.version }, fields });
    }

    // Old versions that came or went while the id itself survived. The latest pair is
    // already covered by `changed`, so skip those two.
    const has = (list: IndexResource[], version: string | undefined) => list.some((resource) => resource.version === version);
    for (const resource of versionsB) {
      if (resource !== latestB && !has(versionsA, resource.version)) added.push(ref(resource));
    }
    for (const resource of versionsA) {
      if (resource !== latestA && !has(versionsB, resource.version)) removed.push(ref(resource));
    }
  }

  return { added: sort(added), removed: sort(removed), changed: sort(changed) };
};

const byKey = (index: Index) => {
  const map = new Map<string, IndexResource[]>();
  for (const resource of index.resources) {
    const key = `${resource.type}:${resource.id}`;
    map.set(key, [...(map.get(key) ?? []), resource]);
  }
  return map;
};

const ref = (resource: IndexResource): ResourceAdded => ({
  type: resource.type,
  id: resource.id,
  ...(resource.version !== undefined ? { version: resource.version } : {}),
});

const changedFields = (before: IndexResource, after: IndexResource): ResourceField[] => {
  const fields: ResourceField[] = [];
  if (before.version !== after.version) fields.push('version');
  if (before.name !== after.name) fields.push('name');
  if (stable(before.owners) !== stable(after.owners)) fields.push('owners');
  if (stable(before.deprecated) !== stable(after.deprecated)) fields.push('deprecated');
  return fields;
};

const stable = (value: unknown) => JSON.stringify(value ?? null);

const sort = <T extends { type: string; id: string; version?: string | { a?: string } }>(items: T[]): T[] =>
  [...items].sort(
    (left, right) =>
      left.type.localeCompare(right.type) ||
      left.id.localeCompare(right.id) ||
      compareVersions(versionOf(left.version), versionOf(right.version))
  );

const versionOf = (version: string | { a?: string } | undefined) => (typeof version === 'object' ? version.a : version);
