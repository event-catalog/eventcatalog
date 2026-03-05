import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { SnapshotDiff, RelationshipChange, CatalogSnapshot } from '@eventcatalog/sdk';
import type { GovernanceConfig, GovernanceTrigger, GovernanceResult, DeprecationChange } from './types';

export const loadGovernanceConfig = (catalogDir: string): GovernanceConfig => {
  const configPath = path.join(catalogDir, 'governance.yaml');

  if (!fs.existsSync(configPath)) {
    return { rules: [] };
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  const parsed = yaml.load(content) as GovernanceConfig;
  return { rules: parsed?.rules || [] };
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

const buildProducerIndex = (
  snapshot: CatalogSnapshot
): Map<string, Array<{ id: string; version: string; owners?: string[] }>> => {
  const index = new Map<string, Array<{ id: string; version: string; owners?: string[] }>>();
  for (const service of snapshot.resources.services) {
    if (!service.sends) continue;
    for (const s of service.sends as Array<{ id: string }>) {
      let producers = index.get(s.id);
      if (!producers) {
        producers = [];
        index.set(s.id, producers);
      }
      const entry: { id: string; version: string; owners?: string[] } = {
        id: service.id as string,
        version: service.version as string,
      };
      if (service.owners && Array.isArray(service.owners) && service.owners.length > 0) {
        entry.owners = service.owners as string[];
      }
      producers.push(entry);
    }
  }
  return index;
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
  const producerIndex = buildProducerIndex(targetSnapshot);

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
