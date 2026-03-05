import { expect, it, describe, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import {
  loadGovernanceConfig,
  evaluateGovernanceRules,
  resolveEnvVars,
  formatGovernanceOutput,
  executeGovernanceActions,
  buildMessageTypeMap,
  buildServiceOwnersMap,
} from '../cli/governance';
import type { GovernanceConfig, MessageTypeMap, ServiceOwnersMap, GovernanceActionOptions } from '../cli/governance';
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
    sends?: Array<{ id: string }>;
    receives?: Array<{ id: string }>;
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

  describe('formatGovernanceOutput - message_deprecated', () => {
    it('formats deprecation results with producer names', () => {
      const results = [
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
      const results = [
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
      const results = [
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
      const results = [
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
});
