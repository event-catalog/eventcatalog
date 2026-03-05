import type { RelationshipChange } from '@eventcatalog/sdk';

export type GovernanceTrigger = 'consumer_added' | 'consumer_removed' | 'producer_added' | 'producer_removed';

export type GovernanceAction = { type: 'console' } | { type: 'webhook'; url: string; headers?: Record<string, string> };

export type GovernanceRule = {
  name: string;
  when: GovernanceTrigger[];
  resources: string[];
  actions: GovernanceAction[];
};

export type GovernanceConfig = {
  rules: GovernanceRule[];
};

export type GovernanceResult = {
  rule: GovernanceRule;
  trigger: GovernanceTrigger;
  matchedChanges: RelationshipChange[];
};
