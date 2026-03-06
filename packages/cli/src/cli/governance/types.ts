import type { RelationshipChange, ResourceChange } from '@eventcatalog/sdk';

export type GovernanceTrigger =
  | 'consumer_added'
  | 'consumer_removed'
  | 'producer_added'
  | 'producer_removed'
  | 'message_deprecated'
  | 'schema_changed';

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

export type DeprecationChange = {
  resourceChange: ResourceChange;
  producerServices: Array<{ id: string; version: string; owners?: string[] }>;
};

export type SchemaChange = {
  resourceChange: ResourceChange;
  consumerServices: Array<{ id: string; version: string; owners?: string[] }>;
  producerServices: Array<{ id: string; version: string; owners?: string[] }>;
  before?: string;
  after?: string;
  beforeSchemaPath?: string;
  afterSchemaPath?: string;
  beforeSchemaHash?: string;
  afterSchemaHash?: string;
};

export type GovernanceResult = {
  rule: GovernanceRule;
  trigger: GovernanceTrigger;
  matchedChanges: RelationshipChange[];
  deprecationChanges?: DeprecationChange[];
  schemaChanges?: SchemaChange[];
};
