import { expect, it, describe, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import {
  loadGovernanceConfig,
  evaluateGovernanceRules,
  resolveEnvVars,
  formatGovernanceOutput,
  executeGovernanceActions,
  buildMessageTypeMap,
  buildServiceOwnersMap,
  enrichSchemaContent,
} from '../cli/governance';
import type {
  GovernanceConfig,
  MessageTypeMap,
  ServiceOwnersMap,
  GovernanceActionOptions,
  GovernanceResult,
} from '../cli/governance';
import type { SnapshotDiff, RelationshipChange, ResourceChange, CatalogSnapshot } from '@eventcatalog/sdk';

const TEMP_DIR = path.join(__dirname, 'governance-temp');

beforeEach(() => {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
});

afterEach(() => {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const makeDiff = (relationships: RelationshipChange[], resources: ResourceChange[] = []): SnapshotDiff => ({
  snapshotA: { label: 'before', createdAt: '2026-03-04T12:00:00Z' },
  snapshotB: { label: 'after', createdAt: '2026-03-04T13:00:00Z' },
  summary: {
    totalChanges: relationships.length + resources.length,
    resourcesAdded: 0,
    resourcesRemoved: 0,
    resourcesModified: resources.length,
    resourcesVersioned: 0,
    relationshipsAdded: relationships.filter((r) => r.changeType === 'added').length,
    relationshipsRemoved: relationships.filter((r) => r.changeType === 'removed').length,
  },
  resources,
  relationships,
});

type SnapshotMessages = {
  events?: Array<Record<string, any>>;
  commands?: Array<Record<string, any>>;
  queries?: Array<Record<string, any>>;
};

const makeSnapshot = (
  services: Array<{
    id: string;
    sends?: Array<{ id: string; version?: string }>;
    receives?: Array<{ id: string; version?: string }>;
    owners?: string[];
  }>,
  messages?: SnapshotMessages
): CatalogSnapshot => ({
  snapshotVersion: '1.0.0',
  catalogVersion: '1.0.0',
  label: 'test',
  createdAt: '2026-03-04T12:00:00Z',
  resources: {
    domains: [],
    services: services.map((s) => ({ ...s, version: '1.0.0', name: s.id })),
    messages: {
      events: messages?.events || [],
      commands: messages?.commands || [],
      queries: messages?.queries || [],
    },
    channels: [],
  },
});

describe('Governance', () => {
  describe('loadGovernanceConfig', () => {
    it('returns empty rules when no governance.yaml exists', () => {
      const config = loadGovernanceConfig(TEMP_DIR);
      expect(config.rules).toEqual([]);
    });

    it('throws when governance.yaml contains invalid YAML', () => {
      fs.writeFileSync(path.join(TEMP_DIR, 'governance.yaml'), 'rules:\n  - name: test\n    bad:\n  indent: broken\n\t\tmixed');

      expect(() => loadGovernanceConfig(TEMP_DIR)).toThrow();
    });

    it('parses a valid governance.yaml file', () => {
      fs.writeFileSync(
        path.join(TEMP_DIR, 'governance.yaml'),
        `rules:
  - name: notify-consumer-added
    when:
      - consumer_added
    resources:
      - "*"
    actions:
      - type: console
`
      );

      const config = loadGovernanceConfig(TEMP_DIR);

      expect(config.rules).toHaveLength(1);
      expect(config.rules[0].name).toBe('notify-consumer-added');
      expect(config.rules[0].when).toEqual(['consumer_added']);
      expect(config.rules[0].resources).toEqual(['*']);
      expect(config.rules[0].actions).toEqual([{ type: 'console' }]);
    });

    it('parses a valid governance.yml file', () => {
      fs.writeFileSync(
        path.join(TEMP_DIR, 'governance.yml'),
        `rules:
  - name: notify-consumer-added
    when:
      - consumer_added
    resources:
      - "*"
    actions:
      - type: console
`
      );

      const config = loadGovernanceConfig(TEMP_DIR);

      expect(config.rules).toHaveLength(1);
      expect(config.rules[0].name).toBe('notify-consumer-added');
    });

    it('prefers governance.yaml over governance.yml when both exist', () => {
      fs.writeFileSync(
        path.join(TEMP_DIR, 'governance.yaml'),
        `rules:
  - name: from-yaml
    when:
      - consumer_added
    resources:
      - "*"
    actions:
      - type: console
`
      );
      fs.writeFileSync(
        path.join(TEMP_DIR, 'governance.yml'),
        `rules:
  - name: from-yml
    when:
      - consumer_added
    resources:
      - "*"
    actions:
      - type: console
`
      );

      const config = loadGovernanceConfig(TEMP_DIR);
      expect(config.rules[0].name).toBe('from-yaml');
    });

    it('parses rules with webhook actions including headers', () => {
      fs.writeFileSync(
        path.join(TEMP_DIR, 'governance.yaml'),
        `rules:
  - name: webhook-rule
    when:
      - consumer_added
    resources:
      - OrderCreated
    actions:
      - type: webhook
        url: https://hooks.slack.com/test
        headers:
          Authorization: Bearer token123
          Content-Type: application/json
`
      );

      const config = loadGovernanceConfig(TEMP_DIR);

      expect(config.rules[0].actions[0]).toEqual({
        type: 'webhook',
        url: 'https://hooks.slack.com/test',
        headers: {
          Authorization: 'Bearer token123',
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('evaluateGovernanceRules', () => {
    it('matches consumer_added when a service starts receiving a message', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'consumer-added-rule',
            when: ['consumer_added'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff([
        {
          serviceId: 'PaymentService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'added',
        },
      ]);

      const results = evaluateGovernanceRules(diff, config);

      expect(results).toHaveLength(1);
      expect(results[0].trigger).toBe('consumer_added');
      expect(results[0].matchedChanges).toHaveLength(1);
      expect(results[0].matchedChanges[0].serviceId).toBe('PaymentService');
    });

    it('matches consumer_removed when a service stops receiving a message', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'consumer-removed-rule',
            when: ['consumer_removed'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff([
        {
          serviceId: 'LegacyService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'removed',
        },
      ]);

      const results = evaluateGovernanceRules(diff, config);

      expect(results).toHaveLength(1);
      expect(results[0].trigger).toBe('consumer_removed');
      expect(results[0].matchedChanges[0].serviceId).toBe('LegacyService');
    });

    it('does not match consumer_added for sends relationship changes', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'consumer-added-rule',
            when: ['consumer_added'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff([
        {
          serviceId: 'OrdersService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'sends',
          changeType: 'added',
        },
      ]);

      const results = evaluateGovernanceRules(diff, config);

      expect(results).toHaveLength(0);
    });

    it('filters by specific resource ID', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'order-created-only',
            when: ['consumer_added'],
            resources: ['message:OrderCreated'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff([
        {
          serviceId: 'PaymentService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'added',
        },
        {
          serviceId: 'ShippingService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderShipped',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'added',
        },
      ]);

      const results = evaluateGovernanceRules(diff, config);

      expect(results).toHaveLength(1);
      expect(results[0].matchedChanges).toHaveLength(1);
      expect(results[0].matchedChanges[0].resourceId).toBe('OrderCreated');
    });

    it('filters by multiple specific resource IDs', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'multi-resource',
            when: ['consumer_added'],
            resources: ['message:OrderCreated', 'message:OrderShipped'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff([
        {
          serviceId: 'PaymentService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'added',
        },
        {
          serviceId: 'ShippingService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderShipped',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'added',
        },
        {
          serviceId: 'AnalyticsService',
          serviceVersion: '1.0.0',
          resourceId: 'UserSignedUp',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'added',
        },
      ]);

      const results = evaluateGovernanceRules(diff, config);

      expect(results).toHaveLength(1);
      expect(results[0].matchedChanges).toHaveLength(2);
    });

    it('filters by service: prefix matching serviceId', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'service-filter',
            when: ['consumer_added'],
            resources: ['service:PaymentService'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff([
        {
          serviceId: 'PaymentService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'added',
        },
        {
          serviceId: 'ShippingService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'added',
        },
      ]);

      const results = evaluateGovernanceRules(diff, config);

      expect(results).toHaveLength(1);
      expect(results[0].matchedChanges).toHaveLength(1);
      expect(results[0].matchedChanges[0].serviceId).toBe('PaymentService');
    });

    it('ignores bare strings without a prefix', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'bare-string',
            when: ['consumer_added'],
            resources: ['OrderCreated'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff([
        {
          serviceId: 'PaymentService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'added',
        },
      ]);

      const results = evaluateGovernanceRules(diff, config);

      expect(results).toHaveLength(0);
    });

    it('produces: prefix matches changes involving messages a service sends', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'notify-ordersservice-consumers',
            when: ['consumer_added'],
            resources: ['produces:OrdersService'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const snapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }, { id: 'OrderShipped' }] }]);

      const diff = makeDiff([
        {
          serviceId: 'PaymentService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'added',
        },
        {
          serviceId: 'AnalyticsService',
          serviceVersion: '1.0.0',
          resourceId: 'UserSignedUp',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'added',
        },
      ]);

      const results = evaluateGovernanceRules(diff, config, snapshot);

      expect(results).toHaveLength(1);
      expect(results[0].matchedChanges).toHaveLength(1);
      expect(results[0].matchedChanges[0].resourceId).toBe('OrderCreated');
    });

    it('consumes: prefix matches changes involving messages a service receives', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'notify-payment-deps-removed',
            when: ['producer_removed'],
            resources: ['consumes:PaymentService'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const snapshot = makeSnapshot([{ id: 'PaymentService', receives: [{ id: 'OrderCreated' }, { id: 'OrderConfirmed' }] }]);

      const diff = makeDiff([
        {
          serviceId: 'OrdersService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'sends',
          changeType: 'removed',
        },
        {
          serviceId: 'ShippingService',
          serviceVersion: '1.0.0',
          resourceId: 'ShipmentCreated',
          resourceVersion: '1.0.0',
          direction: 'sends',
          changeType: 'removed',
        },
      ]);

      const results = evaluateGovernanceRules(diff, config, snapshot);

      expect(results).toHaveLength(1);
      expect(results[0].matchedChanges).toHaveLength(1);
      expect(results[0].matchedChanges[0].resourceId).toBe('OrderCreated');
    });

    it('produces: returns no matches when snapshot is not provided', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'no-snapshot',
            when: ['consumer_added'],
            resources: ['produces:OrdersService'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff([
        {
          serviceId: 'PaymentService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'added',
        },
      ]);

      const results = evaluateGovernanceRules(diff, config);

      expect(results).toHaveLength(0);
    });

    it('handles a rule with multiple triggers in when[]', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'both-triggers',
            when: ['consumer_added', 'consumer_removed'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff([
        {
          serviceId: 'PaymentService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'added',
        },
        {
          serviceId: 'LegacyService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'removed',
        },
      ]);

      const results = evaluateGovernanceRules(diff, config);

      expect(results).toHaveLength(2);
      expect(results.find((r) => r.trigger === 'consumer_added')).toBeDefined();
      expect(results.find((r) => r.trigger === 'consumer_removed')).toBeDefined();
    });

    it('returns empty results when no rules match', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'consumer-added-rule',
            when: ['consumer_added'],
            resources: ['message:OrderCreated'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff([
        {
          serviceId: 'PaymentService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderShipped',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'removed',
        },
      ]);

      const results = evaluateGovernanceRules(diff, config);

      expect(results).toHaveLength(0);
    });

    it('multiple rules can match the same change', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'rule-one',
            when: ['consumer_added'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
          {
            name: 'rule-two',
            when: ['consumer_added'],
            resources: ['message:OrderCreated'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff([
        {
          serviceId: 'PaymentService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'added',
        },
      ]);

      const results = evaluateGovernanceRules(diff, config);

      expect(results).toHaveLength(2);
      expect(results[0].rule.name).toBe('rule-one');
      expect(results[1].rule.name).toBe('rule-two');
    });

    it('matches producer_added when a service starts sending a message', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'producer-added-rule',
            when: ['producer_added'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff([
        {
          serviceId: 'OrdersService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'sends',
          changeType: 'added',
        },
      ]);

      const results = evaluateGovernanceRules(diff, config);

      expect(results).toHaveLength(1);
      expect(results[0].trigger).toBe('producer_added');
      expect(results[0].matchedChanges).toHaveLength(1);
      expect(results[0].matchedChanges[0].serviceId).toBe('OrdersService');
    });

    it('matches producer_removed when a service stops sending a message', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'producer-removed-rule',
            when: ['producer_removed'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff([
        {
          serviceId: 'OrdersService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'sends',
          changeType: 'removed',
        },
      ]);

      const results = evaluateGovernanceRules(diff, config);

      expect(results).toHaveLength(1);
      expect(results[0].trigger).toBe('producer_removed');
      expect(results[0].matchedChanges[0].serviceId).toBe('OrdersService');
    });

    it('does not match producer_added for receives relationship changes', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'producer-added-rule',
            when: ['producer_added'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff([
        {
          serviceId: 'PaymentService',
          serviceVersion: '1.0.0',
          resourceId: 'OrderCreated',
          resourceVersion: '1.0.0',
          direction: 'receives',
          changeType: 'added',
        },
      ]);

      const results = evaluateGovernanceRules(diff, config);

      expect(results).toHaveLength(0);
    });

    it('returns empty results when diff has no relationship changes', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'consumer-added-rule',
            when: ['consumer_added'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff([]);

      const results = evaluateGovernanceRules(diff, config);

      expect(results).toHaveLength(0);
    });
  });

  describe('evaluateGovernanceRules - message_deprecated', () => {
    it('fires when a message is newly deprecated with wildcard resource', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'deprecation-rule',
            when: ['message_deprecated'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['deprecated'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }], {
        events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated', deprecated: true }],
      });
      const baseSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }], {
        events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated' }],
      });

      const results = evaluateGovernanceRules(diff, config, targetSnapshot, baseSnapshot);

      expect(results).toHaveLength(1);
      expect(results[0].trigger).toBe('message_deprecated');
      expect(results[0].deprecationChanges).toHaveLength(1);
      expect(results[0].deprecationChanges![0].resourceChange.resourceId).toBe('OrderCreated');
      expect(results[0].deprecationChanges![0].producerServices).toHaveLength(1);
      expect(results[0].deprecationChanges![0].producerServices[0].id).toBe('OrdersService');
    });

    it('does not fire when message was already deprecated in base', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'deprecation-rule',
            when: ['message_deprecated'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['deprecated'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }], {
        events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated', deprecated: true }],
      });
      const baseSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }], {
        events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated', deprecated: true }],
      });

      const results = evaluateGovernanceRules(diff, config, targetSnapshot, baseSnapshot);

      expect(results).toHaveLength(0);
    });

    it('does not fire when deprecated field is removed (un-deprecation)', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'deprecation-rule',
            when: ['message_deprecated'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['deprecated'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }], {
        events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated' }],
      });
      const baseSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }], {
        events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated', deprecated: true }],
      });

      const results = evaluateGovernanceRules(diff, config, targetSnapshot, baseSnapshot);

      expect(results).toHaveLength(0);
    });

    it('supports deprecated as an object with date and message', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'deprecation-rule',
            when: ['message_deprecated'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['deprecated'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }], {
        events: [
          {
            id: 'OrderCreated',
            version: '1.0.0',
            name: 'OrderCreated',
            deprecated: { date: '2026-06-01', message: 'Use OrderCreatedV2 instead' },
          },
        ],
      });
      const baseSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }], {
        events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated' }],
      });

      const results = evaluateGovernanceRules(diff, config, targetSnapshot, baseSnapshot);

      expect(results).toHaveLength(1);
      expect(results[0].deprecationChanges![0].resourceChange.resourceId).toBe('OrderCreated');
    });

    it('filters by message: prefix', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'specific-message',
            when: ['message_deprecated'],
            resources: ['message:OrderCreated'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['deprecated'],
          },
          {
            resourceId: 'OrderShipped',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['deprecated'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }, { id: 'OrderShipped' }] }], {
        events: [
          { id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated', deprecated: true },
          { id: 'OrderShipped', version: '1.0.0', name: 'OrderShipped', deprecated: true },
        ],
      });
      const baseSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }, { id: 'OrderShipped' }] }], {
        events: [
          { id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated' },
          { id: 'OrderShipped', version: '1.0.0', name: 'OrderShipped' },
        ],
      });

      const results = evaluateGovernanceRules(diff, config, targetSnapshot, baseSnapshot);

      expect(results).toHaveLength(1);
      expect(results[0].deprecationChanges).toHaveLength(1);
      expect(results[0].deprecationChanges![0].resourceChange.resourceId).toBe('OrderCreated');
    });

    it('filters by consumes: prefix to notify consuming services', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'consumer-deprecation-alert',
            when: ['message_deprecated'],
            resources: ['consumes:PaymentService'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['deprecated'],
          },
          {
            resourceId: 'UserSignedUp',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['deprecated'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot(
        [
          { id: 'OrdersService', sends: [{ id: 'OrderCreated' }] },
          { id: 'PaymentService', receives: [{ id: 'OrderCreated' }] },
          { id: 'AuthService', sends: [{ id: 'UserSignedUp' }] },
        ],
        {
          events: [
            { id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated', deprecated: true },
            { id: 'UserSignedUp', version: '1.0.0', name: 'UserSignedUp', deprecated: true },
          ],
        }
      );
      const baseSnapshot = makeSnapshot(
        [
          { id: 'OrdersService', sends: [{ id: 'OrderCreated' }] },
          { id: 'PaymentService', receives: [{ id: 'OrderCreated' }] },
          { id: 'AuthService', sends: [{ id: 'UserSignedUp' }] },
        ],
        {
          events: [
            { id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated' },
            { id: 'UserSignedUp', version: '1.0.0', name: 'UserSignedUp' },
          ],
        }
      );

      const results = evaluateGovernanceRules(diff, config, targetSnapshot, baseSnapshot);

      expect(results).toHaveLength(1);
      expect(results[0].deprecationChanges).toHaveLength(1);
      expect(results[0].deprecationChanges![0].resourceChange.resourceId).toBe('OrderCreated');
    });

    it('includes producer service owners in deprecation changes', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'deprecation-rule',
            when: ['message_deprecated'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['deprecated'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }], owners: ['team-orders'] }], {
        events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated', deprecated: true }],
      });
      const baseSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }], owners: ['team-orders'] }], {
        events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated' }],
      });

      const results = evaluateGovernanceRules(diff, config, targetSnapshot, baseSnapshot);

      expect(results[0].deprecationChanges![0].producerServices[0].owners).toEqual(['team-orders']);
    });

    it('works with commands and queries, not just events', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'deprecation-rule',
            when: ['message_deprecated'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'PlaceOrder',
            version: '1.0.0',
            type: 'command',
            changeType: 'modified',
            changedFields: ['deprecated'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'PlaceOrder' }] }], {
        commands: [{ id: 'PlaceOrder', version: '1.0.0', name: 'PlaceOrder', deprecated: true }],
      });
      const baseSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'PlaceOrder' }] }], {
        commands: [{ id: 'PlaceOrder', version: '1.0.0', name: 'PlaceOrder' }],
      });

      const results = evaluateGovernanceRules(diff, config, targetSnapshot, baseSnapshot);

      expect(results).toHaveLength(1);
      expect(results[0].deprecationChanges![0].resourceChange.type).toBe('command');
    });

    it('ignores non-message resource types like service', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'deprecation-rule',
            when: ['message_deprecated'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrdersService',
            version: '1.0.0',
            type: 'service',
            changeType: 'modified',
            changedFields: ['deprecated'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [] }]);

      const results = evaluateGovernanceRules(diff, config, targetSnapshot);

      expect(results).toHaveLength(0);
    });
  });

  describe('evaluateGovernanceRules - schema_changed', () => {
    it('when a message schema hash changes, the schema_changed rule triggers for that message', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'schema-change-rule',
            when: ['schema_changed'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }], {
        events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated' }],
      });
      const baseSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }], {
        events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated' }],
      });

      const results = evaluateGovernanceRules(diff, config, targetSnapshot, baseSnapshot);

      expect(results).toHaveLength(1);
      expect(results[0].trigger).toBe('schema_changed');
      expect(results[0].schemaChanges).toHaveLength(1);
      expect(results[0].schemaChanges![0].resourceChange.resourceId).toBe('OrderCreated');
    });

    it('when a resource changes without changing schemaHash, the schema_changed rule does not trigger', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'schema-change-rule',
            when: ['schema_changed'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['name'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }]);
      const baseSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }]);

      const results = evaluateGovernanceRules(diff, config, targetSnapshot, baseSnapshot);

      expect(results).toHaveLength(0);
    });

    it('when a rule targets message:OrderCreated, it ignores schema changes for other messages', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'specific-schema-rule',
            when: ['schema_changed'],
            resources: ['message:OrderCreated'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
          {
            resourceId: 'PaymentProcessed',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated' }] }]);

      const results = evaluateGovernanceRules(diff, config, targetSnapshot);

      expect(results).toHaveLength(1);
      expect(results[0].schemaChanges).toHaveLength(1);
      expect(results[0].schemaChanges![0].resourceChange.resourceId).toBe('OrderCreated');
    });

    it('when a rule targets consumes:PaymentService, it triggers for schema changes on messages consumed by that service', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'consumer-schema-rule',
            when: ['schema_changed'],
            resources: ['consumes:PaymentService'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
          {
            resourceId: 'UserRegistered',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([
        { id: 'PaymentService', receives: [{ id: 'OrderCreated' }] },
        { id: 'OrdersService', sends: [{ id: 'OrderCreated' }] },
      ]);

      const results = evaluateGovernanceRules(diff, config, targetSnapshot);

      expect(results).toHaveLength(1);
      expect(results[0].schemaChanges).toHaveLength(1);
      expect(results[0].schemaChanges![0].resourceChange.resourceId).toBe('OrderCreated');
    });

    it('when a rule targets produces:OrdersService, it triggers for schema changes on messages produced by that service', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'producer-schema-rule',
            when: ['schema_changed'],
            resources: ['produces:OrdersService'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
          {
            resourceId: 'UserRegistered',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([
        { id: 'OrdersService', sends: [{ id: 'OrderCreated' }] },
        { id: 'UserService', sends: [{ id: 'UserRegistered' }] },
      ]);

      const results = evaluateGovernanceRules(diff, config, targetSnapshot);

      expect(results).toHaveLength(1);
      expect(results[0].schemaChanges).toHaveLength(1);
      expect(results[0].schemaChanges![0].resourceChange.resourceId).toBe('OrderCreated');
    });

    it('when a schema change is matched, it includes impacted consumer and producer services in the result', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'schema-change-rule',
            when: ['schema_changed'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '1.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([
        { id: 'OrdersService', sends: [{ id: 'OrderCreated' }], owners: ['team-orders'] },
        { id: 'PaymentService', receives: [{ id: 'OrderCreated' }], owners: ['team-payments'] },
        { id: 'NotificationService', receives: [{ id: 'OrderCreated' }] },
      ]);

      const results = evaluateGovernanceRules(diff, config, targetSnapshot);

      expect(results).toHaveLength(1);
      const sc = results[0].schemaChanges![0];
      expect(sc.producerServices).toHaveLength(1);
      expect(sc.producerServices[0]).toEqual({ id: 'OrdersService', version: '1.0.0', owners: ['team-orders'] });
      expect(sc.consumerServices).toHaveLength(2);
      expect(sc.consumerServices.find((c) => c.id === 'PaymentService')).toEqual({
        id: 'PaymentService',
        version: '1.0.0',
        owners: ['team-payments'],
      });
      expect(sc.consumerServices.find((c) => c.id === 'NotificationService')).toEqual({
        id: 'NotificationService',
        version: '1.0.0',
      });
    });

    it('when a schema changes for version 2.0.0, only services pinned to version 2.0.0 are included as impacted consumers and producers', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'schema-change-rule',
            when: ['schema_changed'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '2.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot(
        [
          { id: 'OrdersV1Producer', sends: [{ id: 'OrderCreated', version: '1.0.0' }] },
          { id: 'OrdersV2Producer', sends: [{ id: 'OrderCreated', version: '2.0.0' }] },
          { id: 'BillingV1Consumer', receives: [{ id: 'OrderCreated', version: '1.0.0' }] },
          { id: 'BillingV2Consumer', receives: [{ id: 'OrderCreated', version: '2.0.0' }] },
        ],
        {
          events: [{ id: 'OrderCreated', version: '2.0.0', name: 'OrderCreated' }],
        }
      );

      const results = evaluateGovernanceRules(diff, config, targetSnapshot);

      expect(results).toHaveLength(1);
      expect(results[0].schemaChanges).toHaveLength(1);
      expect(results[0].schemaChanges![0].producerServices).toEqual([{ id: 'OrdersV2Producer', version: '1.0.0' }]);
      expect(results[0].schemaChanges![0].consumerServices).toEqual([{ id: 'BillingV2Consumer', version: '1.0.0' }]);
    });

    it('when a schema changes for the latest version, services with no version are treated as consuming and producing latest', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'schema-change-rule',
            when: ['schema_changed'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '2.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot(
        [
          { id: 'OrdersLatestProducer', sends: [{ id: 'OrderCreated' }] },
          { id: 'BillingLatestConsumer', receives: [{ id: 'OrderCreated' }] },
        ],
        {
          events: [{ id: 'OrderCreated', version: '2.0.0', name: 'OrderCreated' }],
        }
      );

      const results = evaluateGovernanceRules(diff, config, targetSnapshot);

      expect(results).toHaveLength(1);
      expect(results[0].schemaChanges).toHaveLength(1);
      expect(results[0].schemaChanges![0].producerServices).toEqual([{ id: 'OrdersLatestProducer', version: '1.0.0' }]);
      expect(results[0].schemaChanges![0].consumerServices).toEqual([{ id: 'BillingLatestConsumer', version: '1.0.0' }]);
    });

    it('when a schema changes for version 2.0.0, services with no version are not included if 2.0.0 is not the latest version in the target snapshot', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'schema-change-rule',
            when: ['schema_changed'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '2.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot(
        [
          { id: 'OrdersLatestProducer', sends: [{ id: 'OrderCreated' }] },
          { id: 'BillingLatestConsumer', receives: [{ id: 'OrderCreated' }] },
          { id: 'OrdersV2Producer', sends: [{ id: 'OrderCreated', version: '2.0.0' }] },
          { id: 'BillingV2Consumer', receives: [{ id: 'OrderCreated', version: '2.0.0' }] },
        ],
        {
          events: [{ id: 'OrderCreated', version: '3.0.0', name: 'OrderCreated' }],
        }
      );

      const results = evaluateGovernanceRules(diff, config, targetSnapshot);

      expect(results).toHaveLength(1);
      expect(results[0].schemaChanges).toHaveLength(1);
      expect(results[0].schemaChanges![0].producerServices).toEqual([{ id: 'OrdersV2Producer', version: '1.0.0' }]);
      expect(results[0].schemaChanges![0].consumerServices).toEqual([{ id: 'BillingV2Consumer', version: '1.0.0' }]);
    });

    it('when a rule targets consumes:BillingService, it does not trigger for a schema change on a version BillingService does not consume', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'schema-change-rule',
            when: ['schema_changed'],
            resources: ['consumes:BillingService'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '2.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([{ id: 'BillingService', receives: [{ id: 'OrderCreated', version: '1.0.0' }] }], {
        events: [{ id: 'OrderCreated', version: '2.0.0', name: 'OrderCreated' }],
      });

      const results = evaluateGovernanceRules(diff, config, targetSnapshot);

      expect(results).toHaveLength(0);
    });

    it('when a rule targets produces:OrdersService, it does not trigger for a schema change on a version OrdersService does not produce', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'schema-change-rule',
            when: ['schema_changed'],
            resources: ['produces:OrdersService'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '2.0.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'OrderCreated', version: '1.0.0' }] }], {
        events: [{ id: 'OrderCreated', version: '2.0.0', name: 'OrderCreated' }],
      });

      const results = evaluateGovernanceRules(diff, config, targetSnapshot);

      expect(results).toHaveLength(0);
    });

    it('when a service uses a caret semver range, it is included when the changed schema version satisfies that range', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'schema-change-rule',
            when: ['schema_changed'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '1.2.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot(
        [
          { id: 'OrdersCaretProducer', sends: [{ id: 'OrderCreated', version: '^1.0.0' }] },
          { id: 'BillingCaretConsumer', receives: [{ id: 'OrderCreated', version: '^1.0.0' }] },
        ],
        {
          events: [{ id: 'OrderCreated', version: '2.0.0', name: 'OrderCreated' }],
        }
      );

      const results = evaluateGovernanceRules(diff, config, targetSnapshot);

      expect(results).toHaveLength(1);
      expect(results[0].schemaChanges).toHaveLength(1);
      expect(results[0].schemaChanges![0].producerServices).toEqual([{ id: 'OrdersCaretProducer', version: '1.0.0' }]);
      expect(results[0].schemaChanges![0].consumerServices).toEqual([{ id: 'BillingCaretConsumer', version: '1.0.0' }]);
    });

    it('when a service uses a tilde semver range, it is included for compatible patch releases and excluded for incompatible minor releases', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'schema-change-rule',
            when: ['schema_changed'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const patchDiff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '1.2.5',
            type: 'event',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
        ]
      );

      const incompatibleMinorDiff = makeDiff(
        [],
        [
          {
            resourceId: 'OrderCreated',
            version: '1.3.0',
            type: 'event',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot(
        [
          { id: 'OrdersTildeProducer', sends: [{ id: 'OrderCreated', version: '~1.2.0' }] },
          { id: 'BillingTildeConsumer', receives: [{ id: 'OrderCreated', version: '~1.2.0' }] },
        ],
        {
          events: [{ id: 'OrderCreated', version: '2.0.0', name: 'OrderCreated' }],
        }
      );

      const patchResults = evaluateGovernanceRules(patchDiff, config, targetSnapshot);
      const incompatibleMinorResults = evaluateGovernanceRules(incompatibleMinorDiff, config, targetSnapshot);

      expect(patchResults).toHaveLength(1);
      expect(patchResults[0].schemaChanges).toHaveLength(1);
      expect(patchResults[0].schemaChanges![0].producerServices).toEqual([{ id: 'OrdersTildeProducer', version: '1.0.0' }]);
      expect(patchResults[0].schemaChanges![0].consumerServices).toEqual([{ id: 'BillingTildeConsumer', version: '1.0.0' }]);

      expect(incompatibleMinorResults).toHaveLength(1);
      expect(incompatibleMinorResults[0].schemaChanges).toHaveLength(1);
      expect(incompatibleMinorResults[0].schemaChanges![0].producerServices).toEqual([]);
      expect(incompatibleMinorResults[0].schemaChanges![0].consumerServices).toEqual([]);
    });

    it('when schemaHash changes on commands and queries, the schema_changed rule treats them as supported message types', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'schema-change-rule',
            when: ['schema_changed'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'ProcessPayment',
            version: '1.0.0',
            type: 'command',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
          {
            resourceId: 'GetOrder',
            version: '1.0.0',
            type: 'query',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([{ id: 'OrdersService', sends: [{ id: 'ProcessPayment' }, { id: 'GetOrder' }] }]);

      const results = evaluateGovernanceRules(diff, config, targetSnapshot);

      expect(results).toHaveLength(1);
      expect(results[0].schemaChanges).toHaveLength(2);
    });

    it('when schemaHash changes on non-message resources, the schema_changed rule ignores those changes', () => {
      const config: GovernanceConfig = {
        rules: [
          {
            name: 'schema-change-rule',
            when: ['schema_changed'],
            resources: ['*'],
            actions: [{ type: 'console' }],
          },
        ],
      };

      const diff = makeDiff(
        [],
        [
          {
            resourceId: 'OrdersService',
            version: '1.0.0',
            type: 'service',
            changeType: 'modified',
            changedFields: ['schemaHash'],
          },
        ]
      );

      const targetSnapshot = makeSnapshot([{ id: 'OrdersService' }]);

      const results = evaluateGovernanceRules(diff, config, targetSnapshot);

      expect(results).toHaveLength(0);
    });
  });

  describe('formatGovernanceOutput - schema_changed', () => {
    it('when formatting schema_changed output, it includes the changed message type and impacted consumer names', () => {
      const results: GovernanceResult[] = [
        {
          rule: {
            name: 'schema-change-rule',
            when: ['schema_changed' as const],
            resources: ['*'],
            actions: [{ type: 'console' as const }],
          },
          trigger: 'schema_changed' as const,
          matchedChanges: [],
          schemaChanges: [
            {
              resourceChange: {
                resourceId: 'OrderCreated',
                version: '1.0.0',
                type: 'event' as const,
                changeType: 'modified' as const,
                changedFields: ['schemaHash'],
              },
              consumerServices: [
                { id: 'PaymentService', version: '1.0.0' },
                { id: 'NotificationService', version: '1.0.0' },
              ],
              producerServices: [{ id: 'OrdersService', version: '1.0.0' }],
            },
          ],
        },
      ];

      const output = formatGovernanceOutput(results);

      expect(output).toContain('schema-change-rule');
      expect(output).toContain('schema_changed');
      expect(output).toContain('OrderCreated');
      expect(output).toContain('event');
      expect(output).toContain('PaymentService');
      expect(output).toContain('NotificationService');
    });
  });

  describe('formatGovernanceOutput - message_deprecated', () => {
    it('formats deprecation results with producer names', () => {
      const results: GovernanceResult[] = [
        {
          rule: {
            name: 'deprecation-rule',
            when: ['message_deprecated' as const],
            resources: ['*'],
            actions: [{ type: 'console' as const }],
          },
          trigger: 'message_deprecated' as const,
          matchedChanges: [],
          deprecationChanges: [
            {
              resourceChange: {
                resourceId: 'OrderCreated',
                version: '1.0.0',
                type: 'event' as const,
                changeType: 'modified' as const,
                changedFields: ['deprecated'],
              },
              producerServices: [
                { id: 'OrdersService', version: '1.0.0' },
                { id: 'LegacyService', version: '2.0.0' },
              ],
            },
          ],
        },
      ];

      const output = formatGovernanceOutput(results);

      expect(output).toContain('deprecation-rule');
      expect(output).toContain('message_deprecated');
      expect(output).toContain('! OrderCreated (event) deprecated by OrdersService, LegacyService');
    });

    it('shows unknown producer when no producer services found', () => {
      const results: GovernanceResult[] = [
        {
          rule: {
            name: 'deprecation-rule',
            when: ['message_deprecated' as const],
            resources: ['*'],
            actions: [{ type: 'console' as const }],
          },
          trigger: 'message_deprecated' as const,
          matchedChanges: [],
          deprecationChanges: [
            {
              resourceChange: {
                resourceId: 'OrphanEvent',
                version: '1.0.0',
                type: 'event' as const,
                changeType: 'modified' as const,
                changedFields: ['deprecated'],
              },
              producerServices: [],
            },
          ],
        },
      ];

      const output = formatGovernanceOutput(results);

      expect(output).toContain('! OrphanEvent (event) deprecated by unknown producer');
    });
  });

  describe('resolveEnvVars', () => {
    it('replaces $VAR_NAME with environment variable value', () => {
      vi.stubEnv('MY_WEBHOOK_URL', 'https://hooks.slack.com/test');

      expect(resolveEnvVars('$MY_WEBHOOK_URL')).toBe('https://hooks.slack.com/test');
    });

    it('replaces $VAR within a larger string', () => {
      vi.stubEnv('API_TOKEN', 'secret123');

      expect(resolveEnvVars('Bearer $API_TOKEN')).toBe('Bearer secret123');
    });

    it('throws when an environment variable is not set', () => {
      delete process.env.MISSING_VAR;

      expect(() => resolveEnvVars('$MISSING_VAR')).toThrow('MISSING_VAR');
    });

    it('returns string unchanged when no $VAR patterns present', () => {
      expect(resolveEnvVars('https://example.com')).toBe('https://example.com');
    });
  });

  describe('formatGovernanceOutput', () => {
    it('formats consumer_added results as human-readable text', () => {
      const results: GovernanceResult[] = [
        {
          rule: {
            name: 'consumer-added-rule',
            when: ['consumer_added' as const],
            resources: ['*'],
            actions: [{ type: 'console' as const }],
          },
          trigger: 'consumer_added' as const,
          matchedChanges: [
            {
              serviceId: 'PaymentService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'receives' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      const output = formatGovernanceOutput(results);

      expect(output).toContain('consumer-added-rule');
      expect(output).toContain('PaymentService');
      expect(output).toContain('OrderCreated');
    });

    it('returns compliant message when no results', () => {
      const output = formatGovernanceOutput([]);

      expect(output).toContain('No governance rules triggered');
    });

    it('formats producer_added results with producing verb', () => {
      const results: GovernanceResult[] = [
        {
          rule: {
            name: 'producer-added-rule',
            when: ['producer_added' as const],
            resources: ['*'],
            actions: [{ type: 'console' as const }],
          },
          trigger: 'producer_added' as const,
          matchedChanges: [
            {
              serviceId: 'OrdersService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'sends' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      const output = formatGovernanceOutput(results);

      expect(output).toContain('+ OrdersService is now producing OrderCreated');
    });

    it('formats producer_removed results with no longer producing verb', () => {
      const results = [
        {
          rule: {
            name: 'producer-removed-rule',
            when: ['producer_removed' as const],
            resources: ['*'],
            actions: [{ type: 'console' as const }],
          },
          trigger: 'producer_removed' as const,
          matchedChanges: [
            {
              serviceId: 'OrdersService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'sends' as const,
              changeType: 'removed' as const,
            },
          ],
        },
      ];

      const output = formatGovernanceOutput(results);

      expect(output).toContain('- OrdersService is no longer producing OrderCreated');
    });

    it('formats consumer_removed results correctly', () => {
      const results = [
        {
          rule: {
            name: 'consumer-removed-rule',
            when: ['consumer_removed' as const],
            resources: ['*'],
            actions: [{ type: 'console' as const }],
          },
          trigger: 'consumer_removed' as const,
          matchedChanges: [
            {
              serviceId: 'LegacyService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'receives' as const,
              changeType: 'removed' as const,
            },
          ],
        },
      ];

      const output = formatGovernanceOutput(results);

      expect(output).toContain('- LegacyService is no longer consuming OrderCreated');
    });
  });

  describe('executeGovernanceActions', () => {
    const eventMessageTypes: MessageTypeMap = new Map([['OrderCreated', 'event']]);

    it('returns empty output for console-only actions', async () => {
      const results = [
        {
          rule: {
            name: 'console-rule',
            when: ['consumer_added' as const],
            resources: ['*'],
            actions: [{ type: 'console' as const }],
          },
          trigger: 'consumer_added' as const,
          matchedChanges: [
            {
              serviceId: 'PaymentService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'receives' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      const output = await executeGovernanceActions(results);

      expect(output).toEqual([]);
    });

    it('sends one webhook per change with CloudEvents envelope', async () => {
      vi.stubEnv('TEST_WEBHOOK_URL', 'https://hooks.example.com/webhook');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'webhook-rule',
            when: ['consumer_added' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$TEST_WEBHOOK_URL' }],
          },
          trigger: 'consumer_added' as const,
          matchedChanges: [
            {
              serviceId: 'PaymentService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'receives' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      const output = await executeGovernanceActions(results, { messageTypes: eventMessageTypes });

      expect(fetchSpy).toHaveBeenCalledOnce();

      const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body.specversion).toBe('1.0');
      expect(body.type).toBe('eventcatalog.governance.consumer_added');
      expect(body.source).toBe('eventcatalog/governance');
      expect(body.id).toBeDefined();
      expect(body.time).toBeDefined();
      expect(body.datacontenttype).toBe('application/json');
      expect(body.data).toEqual({
        schemaVersion: 1,
        summary: 'PaymentService is now consuming the event OrderCreated',
        consumer: { id: 'PaymentService', version: '1.0.0' },
        message: { id: 'OrderCreated', version: '1.0.0', type: 'event' },
      });
      expect(output).toEqual(['  Webhook sent: $TEST_WEBHOOK_URL ✓']);
    });

    it('includes status in payload when provided', async () => {
      vi.stubEnv('STATUS_URL', 'https://status.example.com');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'status-test',
            when: ['consumer_added' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$STATUS_URL' }],
          },
          trigger: 'consumer_added' as const,
          matchedChanges: [
            {
              serviceId: 'PaymentService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'receives' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      await executeGovernanceActions(results, { messageTypes: eventMessageTypes, status: 'proposed' });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body.data.status).toBe('proposed');
    });

    it('omits status from payload when not provided', async () => {
      vi.stubEnv('NO_STATUS_URL', 'https://nostatus.example.com');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'no-status-test',
            when: ['consumer_added' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$NO_STATUS_URL' }],
          },
          trigger: 'consumer_added' as const,
          matchedChanges: [
            {
              serviceId: 'PaymentService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'receives' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      await executeGovernanceActions(results, { messageTypes: eventMessageTypes });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body.data.status).toBeUndefined();
    });

    it('includes message type from the message type map', async () => {
      vi.stubEnv('TYPE_URL', 'https://type.example.com');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));
      const commandTypes: MessageTypeMap = new Map([['PlaceOrder', 'command']]);

      const results = [
        {
          rule: {
            name: 'type-test',
            when: ['consumer_added' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$TYPE_URL' }],
          },
          trigger: 'consumer_added' as const,
          matchedChanges: [
            {
              serviceId: 'OrdersService',
              serviceVersion: '1.0.0',
              resourceId: 'PlaceOrder',
              resourceVersion: '2.0.0',
              direction: 'receives' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      await executeGovernanceActions(results, { messageTypes: commandTypes });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body.data.message.type).toBe('command');
    });

    it('defaults message type to "message" when no type map provided', async () => {
      vi.stubEnv('NO_MAP_URL', 'https://nomap.example.com');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'no-map',
            when: ['consumer_added' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$NO_MAP_URL' }],
          },
          trigger: 'consumer_added' as const,
          matchedChanges: [
            {
              serviceId: 'SomeService',
              serviceVersion: '1.0.0',
              resourceId: 'UnknownMessage',
              resourceVersion: '1.0.0',
              direction: 'receives' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      await executeGovernanceActions(results);

      const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body.data.message.type).toBe('message');
    });

    it('sends separate webhooks for each matched change', async () => {
      vi.stubEnv('MULTI_URL', 'https://multi.example.com');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'multi-change',
            when: ['consumer_added' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$MULTI_URL' }],
          },
          trigger: 'consumer_added' as const,
          matchedChanges: [
            {
              serviceId: 'PaymentService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'receives' as const,
              changeType: 'added' as const,
            },
            {
              serviceId: 'ShippingService',
              serviceVersion: '2.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'receives' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      await executeGovernanceActions(results, { messageTypes: eventMessageTypes });

      expect(fetchSpy).toHaveBeenCalledTimes(2);

      const body1 = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body1.data.summary).toBe('PaymentService is now consuming the event OrderCreated');
      expect(body1.data.consumer.id).toBe('PaymentService');

      const body2 = JSON.parse(fetchSpy.mock.calls[1][1]!.body as string);
      expect(body2.data.summary).toBe('ShippingService is now consuming the event OrderCreated');
      expect(body2.data.consumer.id).toBe('ShippingService');

      // Each webhook gets a unique CloudEvents id
      expect(body1.id).not.toBe(body2.id);
    });

    it('sends webhook with custom headers resolved from env vars', async () => {
      vi.stubEnv('WEBHOOK_URL', 'https://api.example.com/notify');
      vi.stubEnv('API_TOKEN', 'my-secret-token');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'webhook-with-headers',
            when: ['consumer_added' as const],
            resources: ['*'],
            actions: [
              {
                type: 'webhook' as const,
                url: '$WEBHOOK_URL',
                headers: {
                  Authorization: 'Bearer $API_TOKEN',
                  'X-Custom': 'static-value',
                },
              },
            ],
          },
          trigger: 'consumer_added' as const,
          matchedChanges: [
            {
              serviceId: 'PaymentService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'receives' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      await executeGovernanceActions(results);

      expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer my-secret-token',
          'X-Custom': 'static-value',
        },
        body: expect.any(String),
      });
    });

    it('reports failure when a webhook request throws', async () => {
      vi.stubEnv('FAIL_URL', 'https://fail.example.com');

      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection refused'));

      const results = [
        {
          rule: {
            name: 'failing-webhook',
            when: ['consumer_added' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$FAIL_URL' }],
          },
          trigger: 'consumer_added' as const,
          matchedChanges: [
            {
              serviceId: 'PaymentService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'receives' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      const output = await executeGovernanceActions(results);

      expect(output).toHaveLength(1);
      expect(output[0]).toContain('$FAIL_URL');
      expect(output[0]).toContain('✗');
      expect(output[0]).toContain('Connection refused');
    });

    it('reports failure when webhook returns non-2xx status', async () => {
      vi.stubEnv('NON2XX_URL', 'https://non2xx.example.com');

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Forbidden', { status: 403 }));

      const results = [
        {
          rule: {
            name: 'non2xx-webhook',
            when: ['consumer_added' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$NON2XX_URL' }],
          },
          trigger: 'consumer_added' as const,
          matchedChanges: [
            {
              serviceId: 'PaymentService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'receives' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      const output = await executeGovernanceActions(results);

      expect(output).toHaveLength(1);
      expect(output[0]).toContain('$NON2XX_URL');
      expect(output[0]).toContain('✗');
      expect(output[0]).toContain('HTTP 403');
    });

    it('consumer_removed payload uses correct summary verb', async () => {
      vi.stubEnv('REMOVED_URL', 'https://removed.example.com');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'removed-rule',
            when: ['consumer_removed' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$REMOVED_URL' }],
          },
          trigger: 'consumer_removed' as const,
          matchedChanges: [
            {
              serviceId: 'LegacyService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'receives' as const,
              changeType: 'removed' as const,
            },
          ],
        },
      ];

      await executeGovernanceActions(results, { messageTypes: eventMessageTypes });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body.type).toBe('eventcatalog.governance.consumer_removed');
      expect(body.data.summary).toBe('LegacyService is no longer consuming the event OrderCreated');
      expect(body.data.consumer.id).toBe('LegacyService');
    });

    it('producer_added payload uses producer field instead of consumer', async () => {
      vi.stubEnv('PRODUCER_URL', 'https://producer.example.com');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'producer-webhook',
            when: ['producer_added' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$PRODUCER_URL' }],
          },
          trigger: 'producer_added' as const,
          matchedChanges: [
            {
              serviceId: 'OrdersService',
              serviceVersion: '2.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'sends' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      await executeGovernanceActions(results, { messageTypes: eventMessageTypes });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body.type).toBe('eventcatalog.governance.producer_added');
      expect(body.data.summary).toBe('OrdersService is now producing the event OrderCreated');
      expect(body.data.producer).toEqual({ id: 'OrdersService', version: '2.0.0' });
      expect(body.data.consumer).toBeUndefined();
      expect(body.data.message).toEqual({ id: 'OrderCreated', version: '1.0.0', type: 'event' });
    });

    it('producer_removed payload uses correct summary verb', async () => {
      vi.stubEnv('PROD_REMOVED_URL', 'https://prod-removed.example.com');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'producer-removed-webhook',
            when: ['producer_removed' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$PROD_REMOVED_URL' }],
          },
          trigger: 'producer_removed' as const,
          matchedChanges: [
            {
              serviceId: 'OrdersService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'sends' as const,
              changeType: 'removed' as const,
            },
          ],
        },
      ];

      await executeGovernanceActions(results, { messageTypes: eventMessageTypes });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body.type).toBe('eventcatalog.governance.producer_removed');
      expect(body.data.summary).toBe('OrdersService is no longer producing the event OrderCreated');
      expect(body.data.producer).toEqual({ id: 'OrdersService', version: '1.0.0' });
      expect(body.data.consumer).toBeUndefined();
    });

    it('includes owners in payload when service has owners', async () => {
      vi.stubEnv('OWNER_URL', 'https://owner.example.com');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'test-owners',
            when: ['consumer_added' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$OWNER_URL' }],
          },
          trigger: 'consumer_added' as const,
          matchedChanges: [
            {
              serviceId: 'PaymentService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'receives' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      const serviceOwners: ServiceOwnersMap = new Map([['PaymentService', ['team-payments', 'team-platform']]]);

      await executeGovernanceActions(results, { serviceOwners });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.data.consumer.owners).toEqual(['team-payments', 'team-platform']);
    });

    it('omits owners from payload when service has no owners', async () => {
      vi.stubEnv('NO_OWNER_URL', 'https://no-owner.example.com');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'test-no-owners',
            when: ['consumer_added' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$NO_OWNER_URL' }],
          },
          trigger: 'consumer_added' as const,
          matchedChanges: [
            {
              serviceId: 'UnownedService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'receives' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      const serviceOwners: ServiceOwnersMap = new Map();

      await executeGovernanceActions(results, { serviceOwners });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.data.consumer.owners).toBeUndefined();
    });

    it('includes owners in producer payload', async () => {
      vi.stubEnv('PROD_OWNER_URL', 'https://prod-owner.example.com');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'test-producer-owners',
            when: ['producer_added' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$PROD_OWNER_URL' }],
          },
          trigger: 'producer_added' as const,
          matchedChanges: [
            {
              serviceId: 'OrdersService',
              serviceVersion: '2.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'sends' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      const serviceOwners: ServiceOwnersMap = new Map([['OrdersService', ['team-orders']]]);

      await executeGovernanceActions(results, { serviceOwners });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.data.producer.owners).toEqual(['team-orders']);
      expect(body.data.consumer).toBeUndefined();
    });

    it('sends deprecation webhook with CloudEvents envelope per producer', async () => {
      vi.stubEnv('DEPR_WEBHOOK_URL', 'https://deprecation.example.com');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'deprecation-webhook',
            when: ['message_deprecated' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$DEPR_WEBHOOK_URL' }],
          },
          trigger: 'message_deprecated' as const,
          matchedChanges: [],
          deprecationChanges: [
            {
              resourceChange: {
                resourceId: 'OrderCreated',
                version: '1.0.0',
                type: 'event' as const,
                changeType: 'modified' as const,
                changedFields: ['deprecated'],
              },
              producerServices: [
                { id: 'OrdersService', version: '2.0.0', owners: ['team-orders'] },
                { id: 'LegacyService', version: '1.0.0' },
              ],
            },
          ],
        },
      ];

      const eventTypes: MessageTypeMap = new Map([['OrderCreated', 'event']]);
      const output = await executeGovernanceActions(results, { messageTypes: eventTypes });

      expect(fetchSpy).toHaveBeenCalledTimes(2);

      const body1 = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body1.specversion).toBe('1.0');
      expect(body1.type).toBe('eventcatalog.governance.message_deprecated');
      expect(body1.source).toBe('eventcatalog/governance');
      expect(body1.data.summary).toBe('OrderCreated (event) has been deprecated by OrdersService');
      expect(body1.data.producer).toEqual({ id: 'OrdersService', version: '2.0.0', owners: ['team-orders'] });
      expect(body1.data.message).toEqual({ id: 'OrderCreated', version: '1.0.0', type: 'event' });

      const body2 = JSON.parse(fetchSpy.mock.calls[1][1]!.body as string);
      expect(body2.data.producer).toEqual({ id: 'LegacyService', version: '1.0.0' });
      expect(body2.data.producer.owners).toBeUndefined();

      expect(body1.id).not.toBe(body2.id);
      expect(output).toHaveLength(2);
      expect(output[0]).toContain('✓');
    });

    it('sends fallback deprecation webhook when producerServices is empty', async () => {
      vi.stubEnv('DEPR_WEBHOOK_URL', 'https://deprecation.example.com');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'deprecation-webhook',
            when: ['message_deprecated' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$DEPR_WEBHOOK_URL' }],
          },
          trigger: 'message_deprecated' as const,
          matchedChanges: [],
          deprecationChanges: [
            {
              resourceChange: {
                resourceId: 'OrphanEvent',
                version: '1.0.0',
                type: 'event' as const,
                changeType: 'modified' as const,
                changedFields: ['deprecated'],
              },
              producerServices: [],
            },
          ],
        },
      ];

      const eventTypes: MessageTypeMap = new Map([['OrphanEvent', 'event']]);
      const output = await executeGovernanceActions(results, { messageTypes: eventTypes });

      expect(fetchSpy).toHaveBeenCalledOnce();

      const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body.type).toBe('eventcatalog.governance.message_deprecated');
      expect(body.data.summary).toBe('OrphanEvent (event) has been deprecated by unknown');
      expect(body.data.producer).toEqual({ id: 'unknown', version: 'unknown' });
      expect(body.data.message).toEqual({ id: 'OrphanEvent', version: '1.0.0', type: 'event' });
      expect(output).toHaveLength(1);
      expect(output[0]).toContain('✓');
    });

    it('sends schema_changed webhook with schema hashes, schema paths, impacted services, and refs instead of raw schema bodies', async () => {
      vi.stubEnv('SCHEMA_WEBHOOK_URL', 'https://schema.example.com/hook');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'schema-change-webhook',
            when: ['schema_changed' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$SCHEMA_WEBHOOK_URL' }],
          },
          trigger: 'schema_changed' as const,
          matchedChanges: [],
          schemaChanges: [
            {
              resourceChange: {
                resourceId: 'OrderCreated',
                version: '1.0.0',
                type: 'event' as const,
                changeType: 'modified' as const,
                changedFields: ['schemaHash'],
              },
              consumerServices: [{ id: 'PaymentService', version: '1.0.0', owners: ['team-payments'] }],
              producerServices: [{ id: 'OrdersService', version: '1.0.0', owners: ['team-orders'] }],
              beforeSchemaHash: 'before-hash',
              afterSchemaHash: 'after-hash',
              beforeSchemaPath: 'schemas/order-created.v1.json',
              afterSchemaPath: 'schemas/order-created.v2.json',
            },
          ],
        },
      ];

      const eventTypes: MessageTypeMap = new Map([['OrderCreated', 'event']]);
      await executeGovernanceActions(results, {
        messageTypes: eventTypes,
        baseRef: 'main',
        targetRef: 'working-directory',
      });

      expect(fetchSpy).toHaveBeenCalledOnce();

      const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body.specversion).toBe('1.0');
      expect(body.type).toBe('eventcatalog.governance.schema_changed');
      expect(body.source).toBe('eventcatalog/governance');
      expect(body.data.summary).toContain('OrderCreated');
      expect(body.data.message).toEqual({ id: 'OrderCreated', version: '1.0.0', type: 'event' });
      expect(body.data.schema).toEqual({
        beforeHash: 'before-hash',
        afterHash: 'after-hash',
        beforePath: 'schemas/order-created.v1.json',
        afterPath: 'schemas/order-created.v2.json',
      });
      expect(body.data.refs).toEqual({ base: 'main', target: 'working-directory' });
      expect(body.data.consumers).toEqual([{ id: 'PaymentService', version: '1.0.0', owners: ['team-payments'] }]);
      expect(body.data.producers).toEqual([{ id: 'OrdersService', version: '1.0.0', owners: ['team-orders'] }]);
    });

    it('sends schema_changed webhook with null schema metadata on the missing side when a schema is newly added', async () => {
      vi.stubEnv('SCHEMA_WEBHOOK_URL', 'https://schema.example.com/hook');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'schema-change-webhook',
            when: ['schema_changed' as const],
            resources: ['*'],
            actions: [{ type: 'webhook' as const, url: '$SCHEMA_WEBHOOK_URL' }],
          },
          trigger: 'schema_changed' as const,
          matchedChanges: [],
          schemaChanges: [
            {
              resourceChange: {
                resourceId: 'OrderCreated',
                version: '1.0.0',
                type: 'event' as const,
                changeType: 'modified' as const,
                changedFields: ['schemaHash'],
              },
              consumerServices: [],
              producerServices: [],
              afterSchemaHash: 'new-hash',
              afterSchemaPath: 'schema.json',
            },
          ],
        },
      ];

      const eventTypes: MessageTypeMap = new Map([['OrderCreated', 'event']]);
      await executeGovernanceActions(results, { messageTypes: eventTypes });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
      expect(body.data.schema).toEqual({
        beforeHash: null,
        afterHash: 'new-hash',
        beforePath: null,
        afterPath: 'schema.json',
      });
    });

    it('skips console actions and only executes webhooks', async () => {
      vi.stubEnv('MIX_URL', 'https://mix.example.com');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));

      const results = [
        {
          rule: {
            name: 'mixed-actions',
            when: ['consumer_added' as const],
            resources: ['*'],
            actions: [{ type: 'console' as const }, { type: 'webhook' as const, url: '$MIX_URL' }],
          },
          trigger: 'consumer_added' as const,
          matchedChanges: [
            {
              serviceId: 'PaymentService',
              serviceVersion: '1.0.0',
              resourceId: 'OrderCreated',
              resourceVersion: '1.0.0',
              direction: 'receives' as const,
              changeType: 'added' as const,
            },
          ],
        },
      ];

      const output = await executeGovernanceActions(results);

      expect(fetchSpy).toHaveBeenCalledOnce();
      expect(output).toHaveLength(1);
      expect(output[0]).toContain('✓');
    });
  });

  describe('enrichSchemaContent', () => {
    const createCatalogWithSchema = (baseDir: string, resourceId: string, version: string, schemaContent: string) => {
      const resourceDir = path.join(baseDir, 'events', resourceId);
      fs.mkdirSync(resourceDir, { recursive: true });
      fs.writeFileSync(
        path.join(resourceDir, 'index.mdx'),
        `---\nid: ${resourceId}\nversion: ${version}\nname: ${resourceId}\nschemaPath: schema.json\n---\n`
      );
      fs.writeFileSync(path.join(resourceDir, 'schema.json'), schemaContent);
    };

    it('populates schema content, schema paths, and schema hashes from the base and target catalog directories', async () => {
      const baseCatalog = path.join(TEMP_DIR, 'base');
      const targetCatalog = path.join(TEMP_DIR, 'target');

      const beforeSchema = '{"type":"object","properties":{"orderId":{"type":"string"}}}';
      const afterSchema = '{"type":"object","properties":{"orderId":{"type":"string"},"amount":{"type":"number"}}}';

      createCatalogWithSchema(baseCatalog, 'OrderCreated', '1.0.0', beforeSchema);
      createCatalogWithSchema(targetCatalog, 'OrderCreated', '1.0.0', afterSchema);

      const results = [
        {
          rule: { name: 'test', when: ['schema_changed' as const], resources: ['*'], actions: [] },
          trigger: 'schema_changed' as const,
          matchedChanges: [],
          schemaChanges: [
            {
              resourceChange: {
                resourceId: 'OrderCreated',
                version: '1.0.0',
                type: 'event' as const,
                changeType: 'modified' as const,
                changedFields: ['schemaHash'],
              },
              consumerServices: [],
              producerServices: [],
            },
          ],
        },
      ];

      await enrichSchemaContent(results, baseCatalog, targetCatalog);

      expect(results[0].schemaChanges![0].before).toBe(beforeSchema);
      expect(results[0].schemaChanges![0].after).toBe(afterSchema);
      expect(results[0].schemaChanges![0].beforeSchemaPath).toBe('schema.json');
      expect(results[0].schemaChanges![0].afterSchemaPath).toBe('schema.json');
      expect(results[0].schemaChanges![0].beforeSchemaHash).toBe(createHash('sha256').update(beforeSchema).digest('hex'));
      expect(results[0].schemaChanges![0].afterSchemaHash).toBe(createHash('sha256').update(afterSchema).digest('hex'));
    });

    it('sets before to undefined when schema does not exist in the base catalog', async () => {
      const baseCatalog = path.join(TEMP_DIR, 'base');
      const targetCatalog = path.join(TEMP_DIR, 'target');

      fs.mkdirSync(baseCatalog, { recursive: true });
      createCatalogWithSchema(targetCatalog, 'OrderCreated', '1.0.0', '{"type":"object"}');

      const results = [
        {
          rule: { name: 'test', when: ['schema_changed' as const], resources: ['*'], actions: [] },
          trigger: 'schema_changed' as const,
          matchedChanges: [],
          schemaChanges: [
            {
              resourceChange: {
                resourceId: 'OrderCreated',
                version: '1.0.0',
                type: 'event' as const,
                changeType: 'modified' as const,
                changedFields: ['schemaHash'],
              },
              consumerServices: [],
              producerServices: [],
            },
          ],
        },
      ];

      await enrichSchemaContent(results, baseCatalog, targetCatalog);

      expect(results[0].schemaChanges![0].before).toBeUndefined();
      expect(results[0].schemaChanges![0].after).toBe('{"type":"object"}');
    });

    it('sets after to undefined when schema does not exist in the target catalog', async () => {
      const baseCatalog = path.join(TEMP_DIR, 'base');
      const targetCatalog = path.join(TEMP_DIR, 'target');

      createCatalogWithSchema(baseCatalog, 'OrderCreated', '1.0.0', '{"old":"schema"}');
      fs.mkdirSync(targetCatalog, { recursive: true });

      const results = [
        {
          rule: { name: 'test', when: ['schema_changed' as const], resources: ['*'], actions: [] },
          trigger: 'schema_changed' as const,
          matchedChanges: [],
          schemaChanges: [
            {
              resourceChange: {
                resourceId: 'OrderCreated',
                version: '1.0.0',
                type: 'event' as const,
                changeType: 'modified' as const,
                changedFields: ['schemaHash'],
              },
              consumerServices: [],
              producerServices: [],
            },
          ],
        },
      ];

      await enrichSchemaContent(results, baseCatalog, targetCatalog);

      expect(results[0].schemaChanges![0].before).toBe('{"old":"schema"}');
      expect(results[0].schemaChanges![0].after).toBeUndefined();
    });

    it('handles versioned resource directories', async () => {
      const baseCatalog = path.join(TEMP_DIR, 'base');
      const targetCatalog = path.join(TEMP_DIR, 'target');

      // Versioned: resource may be in events/OrderCreated/versioned/1.0.0/
      const versionedDir = path.join(baseCatalog, 'events', 'OrderCreated', 'versioned', '1.0.0');
      fs.mkdirSync(versionedDir, { recursive: true });
      fs.writeFileSync(
        path.join(versionedDir, 'index.mdx'),
        '---\nid: OrderCreated\nversion: 1.0.0\nname: OrderCreated\nschemaPath: schema.json\n---\n'
      );
      fs.writeFileSync(path.join(versionedDir, 'schema.json'), '{"versioned":"base"}');

      createCatalogWithSchema(targetCatalog, 'OrderCreated', '1.0.0', '{"versioned":"target"}');

      const results = [
        {
          rule: { name: 'test', when: ['schema_changed' as const], resources: ['*'], actions: [] },
          trigger: 'schema_changed' as const,
          matchedChanges: [],
          schemaChanges: [
            {
              resourceChange: {
                resourceId: 'OrderCreated',
                version: '1.0.0',
                type: 'event' as const,
                changeType: 'modified' as const,
                changedFields: ['schemaHash'],
              },
              consumerServices: [],
              producerServices: [],
            },
          ],
        },
      ];

      await enrichSchemaContent(results, baseCatalog, targetCatalog);

      expect(results[0].schemaChanges![0].before).toBe('{"versioned":"base"}');
      expect(results[0].schemaChanges![0].after).toBe('{"versioned":"target"}');
    });

    it('uses previousVersion for base and newVersion for target on versioned schema changes', async () => {
      const baseCatalog = path.join(TEMP_DIR, 'base');
      const targetCatalog = path.join(TEMP_DIR, 'target');

      createCatalogWithSchema(baseCatalog, 'OrderCreated', '1.0.0', '{"version":"1.0.0"}');
      createCatalogWithSchema(targetCatalog, 'OrderCreated', '2.0.0', '{"version":"2.0.0"}');

      const results = [
        {
          rule: { name: 'test', when: ['schema_changed' as const], resources: ['*'], actions: [] },
          trigger: 'schema_changed' as const,
          matchedChanges: [],
          schemaChanges: [
            {
              resourceChange: {
                resourceId: 'OrderCreated',
                version: '2.0.0',
                type: 'event' as const,
                changeType: 'versioned' as const,
                previousVersion: '1.0.0',
                newVersion: '2.0.0',
                changedFields: ['schemaHash'],
              },
              consumerServices: [],
              producerServices: [],
            },
          ],
        },
      ];

      await enrichSchemaContent(results, baseCatalog, targetCatalog);

      expect(results[0].schemaChanges![0].before).toBe('{"version":"1.0.0"}');
      expect(results[0].schemaChanges![0].after).toBe('{"version":"2.0.0"}');
    });

    it('skips results that have no schemaChanges', async () => {
      const baseCatalog = path.join(TEMP_DIR, 'base');
      const targetCatalog = path.join(TEMP_DIR, 'target');
      fs.mkdirSync(baseCatalog, { recursive: true });
      fs.mkdirSync(targetCatalog, { recursive: true });

      const results = [
        {
          rule: { name: 'test', when: ['consumer_added' as const], resources: ['*'], actions: [] },
          trigger: 'consumer_added' as const,
          matchedChanges: [],
        },
      ];

      // Should not throw
      await enrichSchemaContent(results, baseCatalog, targetCatalog);
      expect(results[0]).not.toHaveProperty('schemaChanges');
    });
  });
});
