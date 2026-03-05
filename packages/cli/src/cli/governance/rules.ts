import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { SnapshotDiff, RelationshipChange, CatalogSnapshot } from '@eventcatalog/sdk';
import type { GovernanceConfig, GovernanceTrigger, GovernanceResult } from './types';

export const loadGovernanceConfig = (catalogDir: string): GovernanceConfig => {
  const configPath = path.join(catalogDir, 'governance.yaml');

  if (!fs.existsSync(configPath)) {
    return { rules: [] };
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  const parsed = yaml.load(content) as GovernanceConfig;
  return { rules: parsed?.rules || [] };
};

const TRIGGER_FILTERS: Record<GovernanceTrigger, (change: RelationshipChange) => boolean> = {
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

const matchesResource = (change: RelationshipChange, resources: string[], messageSets?: ServiceMessageSets): boolean => {
  return resources.some((r) => {
    if (r === '*') return true;
    if (r.startsWith('service:')) return change.serviceId === r.slice(8);
    if (r.startsWith('message:')) return change.resourceId === r.slice(8);
    if (r.startsWith('produces:')) return messageSets?.produces.get(r.slice(9))?.has(change.resourceId) ?? false;
    if (r.startsWith('consumes:')) return messageSets?.consumes.get(r.slice(9))?.has(change.resourceId) ?? false;
    return false;
  });
};

const REMOVED_TRIGGERS: Set<GovernanceTrigger> = new Set(['consumer_removed', 'producer_removed']);

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

      const matchedChanges = diff.relationships.filter((c) => filter(c) && matchesResource(c, rule.resources, messageSets));

      if (matchedChanges.length > 0) {
        results.push({ rule, trigger, matchedChanges });
      }
    }
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
