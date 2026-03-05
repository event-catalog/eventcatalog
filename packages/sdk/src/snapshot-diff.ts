import type { CatalogSnapshot, ResourceChange, SnapshotResourceType, RelationshipChange } from './snapshot-types';

/**
 * Stable JSON stringify with sorted keys for deep comparison.
 * Recurses into nested objects and arrays to ensure key order doesn't affect output.
 */
const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  const sorted = Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => JSON.stringify(key) + ':' + stableStringify((value as Record<string, unknown>)[key]));
  return '{' + sorted.join(',') + '}';
};

type FlatResource = {
  resourceId: string;
  version: string;
  type: SnapshotResourceType;
  data: Record<string, unknown>;
};

const flattenResources = (snapshot: CatalogSnapshot): FlatResource[] => {
  const resources: FlatResource[] = [];

  const addResources = (items: Record<string, unknown>[], type: SnapshotResourceType) => {
    for (const item of items) {
      resources.push({
        resourceId: item.id as string,
        version: item.version as string,
        type,
        data: item,
      });
    }
  };

  addResources(snapshot.resources.domains, 'domain');
  addResources(snapshot.resources.services, 'service');
  addResources(snapshot.resources.messages.events, 'event');
  addResources(snapshot.resources.messages.commands, 'command');
  addResources(snapshot.resources.messages.queries, 'query');
  addResources(snapshot.resources.channels, 'channel');

  return resources;
};

// Fields to exclude from comparison
const EXCLUDED_FIELDS = new Set(['markdown', '_eventcatalog']);

const getComparableFields = (data: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!EXCLUDED_FIELDS.has(key)) {
      result[key] = value;
    }
  }
  return result;
};

const findChangedFields = (dataA: Record<string, unknown>, dataB: Record<string, unknown>): string[] => {
  const fieldsA = getComparableFields(dataA);
  const fieldsB = getComparableFields(dataB);
  const allKeys = new Set([...Object.keys(fieldsA), ...Object.keys(fieldsB)]);
  const changed: string[] = [];

  for (const key of allKeys) {
    if (stableStringify(fieldsA[key] ?? null) !== stableStringify(fieldsB[key] ?? null)) {
      changed.push(key);
    }
  }

  return changed;
};

const resourceKey = (r: FlatResource): string => `${r.resourceId}@${r.version}`;
const idTypeKey = (r: FlatResource): string => `${r.resourceId}:${r.type}`;

export const computeResourceDiff = (snapshotA: CatalogSnapshot, snapshotB: CatalogSnapshot): ResourceChange[] => {
  const resourcesA = flattenResources(snapshotA);
  const resourcesB = flattenResources(snapshotB);

  // Build both maps in a single pass per array
  const mapA = new Map<string, FlatResource>();
  const byIdA = new Map<string, FlatResource>();
  for (const r of resourcesA) {
    mapA.set(resourceKey(r), r);
    byIdA.set(idTypeKey(r), r);
  }

  const mapB = new Map<string, FlatResource>();
  const byIdB = new Map<string, FlatResource>();
  for (const r of resourcesB) {
    mapB.set(resourceKey(r), r);
    byIdB.set(idTypeKey(r), r);
  }

  const changes: ResourceChange[] = [];
  const handledIds = new Set<string>();

  // Find added resources (in B but not A)
  for (const resource of resourcesB) {
    const key = resourceKey(resource);
    if (!mapA.has(key)) {
      const idKey = idTypeKey(resource);
      const oldResource = byIdA.get(idKey);
      if (oldResource && oldResource.version !== resource.version && !handledIds.has(idKey)) {
        // Version bump: same id, different version
        const changedFields = findChangedFields(oldResource.data, resource.data);
        changes.push({
          resourceId: resource.resourceId,
          version: resource.version,
          type: resource.type,
          changeType: 'versioned',
          previousVersion: oldResource.version,
          newVersion: resource.version,
          changedFields: changedFields.length > 0 ? changedFields : undefined,
        });
        handledIds.add(idKey);
      } else if (!handledIds.has(idKey)) {
        changes.push({
          resourceId: resource.resourceId,
          version: resource.version,
          type: resource.type,
          changeType: 'added',
        });
      }
    }
  }

  // Find removed resources (in A but not B)
  for (const resource of resourcesA) {
    const key = resourceKey(resource);
    if (!mapB.has(key)) {
      const idKey = idTypeKey(resource);
      if (!handledIds.has(idKey)) {
        changes.push({
          resourceId: resource.resourceId,
          version: resource.version,
          type: resource.type,
          changeType: 'removed',
        });
      }
    }
  }

  // Find modified resources (in both, but fields differ)
  for (const resourceB of resourcesB) {
    const key = resourceKey(resourceB);
    const resourceA = mapA.get(key);
    if (resourceA) {
      const changedFields = findChangedFields(resourceA.data, resourceB.data);
      if (changedFields.length > 0) {
        changes.push({
          resourceId: resourceB.resourceId,
          version: resourceB.version,
          type: resourceB.type,
          changeType: 'modified',
          changedFields,
        });
      }
    }
  }

  return changes;
};

type ServicePointer = { id: string; version?: string };

const getRelationshipKey = (
  serviceId: string,
  serviceVersion: string,
  resourceId: string,
  resourceVersion: string | undefined,
  direction: string
): string => {
  return `${serviceId}@${serviceVersion}:${direction}:${resourceId}@${resourceVersion || 'latest'}`;
};

type RelationshipInfo = Omit<RelationshipChange, 'changeType'>;

const extractRelationships = (snapshot: CatalogSnapshot): Map<string, RelationshipInfo> => {
  const relationships = new Map<string, RelationshipInfo>();

  for (const service of snapshot.resources.services) {
    for (const direction of ['sends', 'receives'] as const) {
      const pointers: ServicePointer[] = (service as Record<string, any>)[direction] || [];
      for (const pointer of pointers) {
        const key = getRelationshipKey(service.id as string, service.version as string, pointer.id, pointer.version, direction);
        relationships.set(key, {
          serviceId: service.id as string,
          serviceVersion: service.version as string,
          resourceId: pointer.id,
          resourceVersion: pointer.version,
          direction,
        });
      }
    }
  }

  return relationships;
};

export const computeRelationshipDiff = (snapshotA: CatalogSnapshot, snapshotB: CatalogSnapshot): RelationshipChange[] => {
  const relsA = extractRelationships(snapshotA);
  const relsB = extractRelationships(snapshotB);

  const changes: RelationshipChange[] = [];

  // Relationships in B but not in A = added
  for (const [key, rel] of relsB) {
    if (!relsA.has(key)) {
      changes.push({ ...rel, changeType: 'added' });
    }
  }

  // Relationships in A but not in B = removed
  for (const [key, rel] of relsA) {
    if (!relsB.has(key)) {
      changes.push({ ...rel, changeType: 'removed' });
    }
  }

  return changes;
};
