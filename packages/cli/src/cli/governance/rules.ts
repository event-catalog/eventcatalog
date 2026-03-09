import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';
import { satisfies, validRange } from 'semver';
import createSDK from '@eventcatalog/sdk';
import type { SnapshotDiff, RelationshipChange, CatalogSnapshot, ResourceChange } from '@eventcatalog/sdk';
import type { GovernanceConfig, GovernanceTrigger, GovernanceResult, DeprecationChange, SchemaChange } from './types';

export const loadGovernanceConfig = (catalogDir: string): GovernanceConfig => {
  const yamlPath = path.join(catalogDir, 'governance.yaml');
  const ymlPath = path.join(catalogDir, 'governance.yml');

  const configPath = fs.existsSync(yamlPath) ? yamlPath : fs.existsSync(ymlPath) ? ymlPath : null;

  if (!configPath) {
    return { rules: [] };
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  const parsed = yaml.load(content) as GovernanceConfig;
  const rules = parsed?.rules || [];

  for (const rule of rules) {
    for (const action of rule.actions) {
      if (action.type === 'fail' && action.message !== undefined && typeof action.message !== 'string') {
        throw new Error(`Invalid "message" in fail action for rule "${rule.name}". Must be a string.`);
      }
    }
  }

  return { rules };
};

const TRIGGER_FILTERS: Partial<Record<GovernanceTrigger, (change: RelationshipChange) => boolean>> = {
  consumer_added: (c) => c.direction === 'receives' && c.changeType === 'added',
  consumer_removed: (c) => c.direction === 'receives' && c.changeType === 'removed',
  producer_added: (c) => c.direction === 'sends' && c.changeType === 'added',
  producer_removed: (c) => c.direction === 'sends' && c.changeType === 'removed',
};

export const buildServiceMessageSets = (
  snapshot: CatalogSnapshot
): { produces: Map<string, Set<string>>; consumes: Map<string, Set<string>> } => {
  const produces = new Map<string, Set<string>>();
  const consumes = new Map<string, Set<string>>();

  for (const service of snapshot.resources.services) {
    const serviceId = service.id as string;
    if (service.sends) {
      const ids = new Set<string>();
      for (const s of service.sends) ids.add(s.id as string);
      produces.set(serviceId, ids);
    }
    if (service.receives) {
      const ids = new Set<string>();
      for (const r of service.receives) ids.add(r.id as string);
      consumes.set(serviceId, ids);
    }
  }

  return { produces, consumes };
};

type ServiceMessageSets = ReturnType<typeof buildServiceMessageSets>;

const matchesResourceId = (
  resourceId: string,
  serviceId: string | undefined,
  resources: string[],
  messageSets?: ServiceMessageSets
): boolean => {
  return resources.some((r) => {
    if (r === '*') return true;
    if (r.startsWith('service:')) {
      if (serviceId) return serviceId === r.slice(8);
      // For deprecation: match if the specified service produces this message
      return messageSets?.produces.get(r.slice(8))?.has(resourceId) ?? false;
    }
    if (r.startsWith('message:')) return resourceId === r.slice(8);
    if (r.startsWith('produces:')) return messageSets?.produces.get(r.slice(9))?.has(resourceId) ?? false;
    if (r.startsWith('consumes:')) return messageSets?.consumes.get(r.slice(9))?.has(resourceId) ?? false;
    return false;
  });
};

const REMOVED_TRIGGERS: Set<GovernanceTrigger> = new Set(['consumer_removed', 'producer_removed']);

const MESSAGE_RESOURCE_TYPES = new Set(['event', 'command', 'query']);

const buildMessageMap = (snapshot: CatalogSnapshot): Map<string, Record<string, any>> => {
  const map = new Map<string, Record<string, any>>();
  for (const msg of snapshot.resources.messages.events) map.set(msg.id as string, msg);
  for (const msg of snapshot.resources.messages.commands) map.set(msg.id as string, msg);
  for (const msg of snapshot.resources.messages.queries) map.set(msg.id as string, msg);
  return map;
};

type ServiceEntry = { id: string; version: string; owners?: string[] };

const buildServiceIndex = (snapshot: CatalogSnapshot, direction: 'sends' | 'receives'): Map<string, ServiceEntry[]> => {
  const index = new Map<string, ServiceEntry[]>();
  for (const service of snapshot.resources.services) {
    const pointers = service[direction] as Array<{ id: string }> | undefined;
    if (!pointers) continue;
    for (const pointer of pointers) {
      let entries = index.get(pointer.id);
      if (!entries) {
        entries = [];
        index.set(pointer.id, entries);
      }
      const entry: ServiceEntry = {
        id: service.id as string,
        version: service.version as string,
      };
      if (service.owners && Array.isArray(service.owners) && service.owners.length > 0) {
        entry.owners = service.owners as string[];
      }
      entries.push(entry);
    }
  }
  return index;
};

const getMessageTypeKey = (resourceId: string, type: string): string => `${type}:${resourceId}`;

const buildLatestMessageVersionMap = (snapshot: CatalogSnapshot): Map<string, string> => {
  const versions = new Map<string, string>();

  for (const event of snapshot.resources.messages.events) {
    versions.set(getMessageTypeKey(event.id as string, 'event'), event.version as string);
  }
  for (const command of snapshot.resources.messages.commands) {
    versions.set(getMessageTypeKey(command.id as string, 'command'), command.version as string);
  }
  for (const query of snapshot.resources.messages.queries) {
    versions.set(getMessageTypeKey(query.id as string, 'query'), query.version as string);
  }

  return versions;
};

const getTargetMessageVersion = (resourceChange: ResourceChange): string => {
  if (resourceChange.changeType === 'versioned') {
    return resourceChange.newVersion || resourceChange.version;
  }
  return resourceChange.version;
};

const pointerTargetsChangedVersion = (
  pointer: { id: string; version?: string },
  resourceChange: ResourceChange,
  latestMessageVersions: Map<string, string>
): boolean => {
  if (pointer.id !== resourceChange.resourceId) return false;

  const targetVersion = getTargetMessageVersion(resourceChange);
  const pointerVersion = pointer.version;

  if (!pointerVersion || pointerVersion === 'latest') {
    const latestVersion = latestMessageVersions.get(getMessageTypeKey(resourceChange.resourceId, resourceChange.type));
    if (!latestVersion) return true;
    return latestVersion === targetVersion;
  }

  if (validRange(pointerVersion)) {
    try {
      return satisfies(targetVersion, pointerVersion);
    } catch {
      return false;
    }
  }

  return pointerVersion === targetVersion;
};

const getServicesForSchemaChange = (
  snapshot: CatalogSnapshot,
  direction: 'sends' | 'receives',
  resourceChange: ResourceChange,
  latestMessageVersions: Map<string, string>
): ServiceEntry[] => {
  const matches: ServiceEntry[] = [];

  for (const service of snapshot.resources.services) {
    const pointers = service[direction] as Array<{ id: string; version?: string }> | undefined;
    if (!pointers) continue;

    const hasMatch = pointers.some((pointer) => pointerTargetsChangedVersion(pointer, resourceChange, latestMessageVersions));
    if (!hasMatch) continue;

    const entry: ServiceEntry = {
      id: service.id as string,
      version: service.version as string,
    };

    if (service.owners && Array.isArray(service.owners) && service.owners.length > 0) {
      entry.owners = service.owners as string[];
    }

    matches.push(entry);
  }

  return matches;
};

const matchesSchemaChangeResource = (schemaChange: SchemaChange, resources: string[]): boolean => {
  return resources.some((resource) => {
    if (resource === '*') return true;
    if (resource.startsWith('message:')) return schemaChange.resourceChange.resourceId === resource.slice(8);
    if (resource.startsWith('consumes:'))
      return schemaChange.consumerServices.some((service) => service.id === resource.slice(9));
    if (resource.startsWith('produces:'))
      return schemaChange.producerServices.some((service) => service.id === resource.slice(9));
    if (resource.startsWith('service:')) return schemaChange.producerServices.some((service) => service.id === resource.slice(8));
    return false;
  });
};

const evaluateDeprecationRules = (
  diff: SnapshotDiff,
  config: GovernanceConfig,
  targetSnapshot: CatalogSnapshot,
  targetMessageSets: ServiceMessageSets,
  baseSnapshot?: CatalogSnapshot
): GovernanceResult[] => {
  const deprecationRules = config.rules.filter((rule) => rule.when.includes('message_deprecated'));
  if (deprecationRules.length === 0) return [];

  const targetMessages = buildMessageMap(targetSnapshot);
  const baseMessages = baseSnapshot ? buildMessageMap(baseSnapshot) : undefined;
  const producerIndex = buildServiceIndex(targetSnapshot, 'sends');

  // Find messages that were newly deprecated
  const deprecatedResources = diff.resources.filter((rc) => {
    if (!MESSAGE_RESOURCE_TYPES.has(rc.type)) return false;
    if (!rc.changedFields?.includes('deprecated')) return false;

    // Confirm the message is deprecated in the target (not un-deprecated)
    const targetMessage = targetMessages.get(rc.resourceId);
    if (!targetMessage || !targetMessage.deprecated) return false;

    // Confirm it was NOT deprecated in the base
    if (baseMessages) {
      const baseMessage = baseMessages.get(rc.resourceId);
      if (baseMessage && baseMessage.deprecated) return false;
    }

    return true;
  });

  if (deprecatedResources.length === 0) return [];

  const results: GovernanceResult[] = [];

  for (const rule of deprecationRules) {
    const matched: DeprecationChange[] = [];

    for (const rc of deprecatedResources) {
      if (!matchesResourceId(rc.resourceId, undefined, rule.resources, targetMessageSets)) continue;

      const producers = producerIndex.get(rc.resourceId) || [];
      matched.push({ resourceChange: rc, producerServices: producers });
    }

    if (matched.length > 0) {
      results.push({ rule, trigger: 'message_deprecated', matchedChanges: [], deprecationChanges: matched });
    }
  }

  return results;
};

const evaluateSchemaChangeRules = (
  diff: SnapshotDiff,
  config: GovernanceConfig,
  targetSnapshot: CatalogSnapshot
): GovernanceResult[] => {
  const schemaRules = config.rules.filter((rule) => rule.when.includes('schema_changed'));
  if (schemaRules.length === 0) return [];

  const schemaChangedResources = diff.resources.filter((rc) => {
    if (!MESSAGE_RESOURCE_TYPES.has(rc.type)) return false;
    return rc.changedFields?.includes('schemaHash');
  });

  if (schemaChangedResources.length === 0) return [];

  const latestMessageVersions = buildLatestMessageVersionMap(targetSnapshot);
  const schemaChanges = schemaChangedResources.map((resourceChange) => ({
    resourceChange,
    producerServices: getServicesForSchemaChange(targetSnapshot, 'sends', resourceChange, latestMessageVersions),
    consumerServices: getServicesForSchemaChange(targetSnapshot, 'receives', resourceChange, latestMessageVersions),
  }));

  const results: GovernanceResult[] = [];

  for (const rule of schemaRules) {
    const matched = schemaChanges.filter((schemaChange) => matchesSchemaChangeResource(schemaChange, rule.resources));

    if (matched.length > 0) {
      results.push({ rule, trigger: 'schema_changed', matchedChanges: [], schemaChanges: matched });
    }
  }

  return results;
};

export const evaluateGovernanceRules = (
  diff: SnapshotDiff,
  config: GovernanceConfig,
  targetSnapshot?: CatalogSnapshot,
  baseSnapshot?: CatalogSnapshot
): GovernanceResult[] => {
  const results: GovernanceResult[] = [];
  const targetMessageSets = targetSnapshot ? buildServiceMessageSets(targetSnapshot) : undefined;
  const baseMessageSets = baseSnapshot ? buildServiceMessageSets(baseSnapshot) : undefined;

  for (const rule of config.rules) {
    for (const trigger of rule.when) {
      const filter = TRIGGER_FILTERS[trigger];
      if (!filter) continue;

      // For removed triggers, resolve produces:/consumes: prefixes against
      // the base snapshot where the relationship still existed.
      const messageSets = REMOVED_TRIGGERS.has(trigger) && baseMessageSets ? baseMessageSets : targetMessageSets;

      const matchedChanges = diff.relationships.filter(
        (c) => filter(c) && matchesResourceId(c.resourceId, c.serviceId, rule.resources, messageSets)
      );

      if (matchedChanges.length > 0) {
        results.push({ rule, trigger, matchedChanges });
      }
    }
  }

  // Evaluate deprecation rules separately (they operate on resource changes, not relationship changes)
  if (targetSnapshot && targetMessageSets) {
    results.push(...evaluateDeprecationRules(diff, config, targetSnapshot, targetMessageSets, baseSnapshot));
    results.push(...evaluateSchemaChangeRules(diff, config, targetSnapshot));
  }

  return results;
};

const PRODUCER_TRIGGERS: Set<GovernanceTrigger> = new Set(['producer_added', 'producer_removed']);

export const isProducerTrigger = (trigger: GovernanceTrigger): boolean => PRODUCER_TRIGGERS.has(trigger);

export const getChangeVerb = (trigger: GovernanceTrigger, changeType: 'added' | 'removed'): string => {
  const producer = isProducerTrigger(trigger);
  return changeType === 'added'
    ? producer
      ? 'now producing'
      : 'now consuming'
    : producer
      ? 'no longer producing'
      : 'no longer consuming';
};

export const resolveEnvVars = (value: string): string => {
  return value.replace(/\$([A-Z_][A-Z0-9_]*)/g, (match, varName) => {
    const envValue = process.env[varName];
    if (envValue === undefined) {
      throw new Error(`Environment variable ${varName} is not set`);
    }
    return envValue;
  });
};

type SDK = ReturnType<typeof createSDK>;

const readSchemaDetails = async (
  sdk: SDK,
  resourceId: string,
  version: string,
  type: string
): Promise<{ content?: string; schemaPath?: string; schemaHash?: string }> => {
  if (!MESSAGE_RESOURCE_TYPES.has(type)) return {};
  try {
    const schema = await sdk.getSchemaForMessage(resourceId, version);
    if (!schema) return {};
    return {
      content: schema.schema,
      schemaPath: schema.fileName,
      schemaHash: createHash('sha256').update(schema.schema).digest('hex'),
    };
  } catch {
    return {};
  }
};

export const enrichSchemaContent = async (
  results: GovernanceResult[],
  baseCatalogDir: string,
  targetCatalogDir: string
): Promise<void> => {
  const baseSDK = createSDK(baseCatalogDir);
  const targetSDK = createSDK(targetCatalogDir);

  const promises: Promise<void>[] = [];

  for (const result of results) {
    if (!result.schemaChanges) continue;
    for (const sc of result.schemaChanges) {
      const { resourceId, version, type, changeType, previousVersion, newVersion } = sc.resourceChange;
      const baseVersion = changeType === 'versioned' ? previousVersion || version : version;
      const targetVersion = changeType === 'versioned' ? newVersion || version : version;
      promises.push(
        (async () => {
          const [before, after] = await Promise.all([
            readSchemaDetails(baseSDK, resourceId, baseVersion, type),
            readSchemaDetails(targetSDK, resourceId, targetVersion, type),
          ]);
          sc.before = before.content;
          sc.after = after.content;
          sc.beforeSchemaPath = before.schemaPath;
          sc.afterSchemaPath = after.schemaPath;
          sc.beforeSchemaHash = before.schemaHash;
          sc.afterSchemaHash = after.schemaHash;
        })()
      );
    }
  }

  await Promise.all(promises);
};
