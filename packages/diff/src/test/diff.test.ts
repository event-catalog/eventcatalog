import { describe, expect, it } from 'vitest';
import { diff } from '../index';
import { domain, event, index, receives, resource, schema, sends, service } from './fixtures/builders';

/**
 * Behavioural specification for @eventcatalog/diff.
 *
 * Each `describe` names a business rule. Each test reads as given / when / then and
 * asserts the WHOLE ArchitectureDiff document, so you can see exactly what a consumer
 * of the diff receives.
 */

// ---------------------------------------------------------------------------
// A small catalog used throughout: Orders publishes OrderCreated, Payments subscribes.
// ---------------------------------------------------------------------------

const orderCreatedSchema = schema({
  type: 'object',
  required: ['customerId'],
  properties: { customerId: { type: 'string' } },
});

const orderCreatedSchemaWithOptionalTotal = schema({
  type: 'object',
  required: ['customerId'],
  properties: { customerId: { type: 'string' }, orderTotal: { type: 'number' } },
});

const orderCreatedSchemaWithRequiredTotal = schema({
  type: 'object',
  required: ['customerId', 'orderTotal'],
  properties: { customerId: { type: 'string' }, orderTotal: { type: 'number' } },
});

const orderCreatedSchemaWithoutCustomerId = schema({
  type: 'object',
  required: [],
  properties: {},
});

const ordersService = service('orders-service', '3.1.0', { owners: ['team-orders'], sends: [sends('order-created', '1.0.0')] });
const paymentService = service('payment-service', '2.0.0', {
  owners: ['team-payments'],
  receives: [receives('order-created', '1.0.0')],
});
const orderCreated = event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchema] });

const catalog = [ordersService, paymentService, orderCreated];

describe('@eventcatalog/diff', () => {
  describe('the diff document', () => {
    it('is versioned, records where each side came from, and defaults to the full strategy', () => {
      // Given a baseline built from main and a candidate built from a PR commit
      const a = index({ source: 'acme/catalog', commit: 'abc1234' });
      const b = index({ source: 'acme/catalog', commit: 'def5678' });

      // When they are compared with no options
      const result = diff(a, b);

      // Then this is the complete document a consumer receives
      expect(result).toEqual({
        schemaVersion: 1,
        refs: {
          a: { source: 'acme/catalog', commit: 'abc1234' },
          b: { source: 'acme/catalog', commit: 'def5678' },
        },
        compatibility: { strategy: 'full' },
        summary: {
          breaking: false,
          resourcesAdded: 0,
          resourcesRemoved: 0,
          resourcesChanged: 0,
          edgesAdded: 0,
          edgesRemoved: 0,
          schemaChanges: 0,
          schemaBreaking: 0,
          schemaUnknown: 0,
        },
        resources: { added: [], removed: [], changed: [] },
        edges: { added: [], removed: [] },
        schemaChanges: [],
        impact: [],
      });
    });

    it('records the strategy the caller asks for', () => {
      // Given the caller only cares that existing consumers keep working
      // When two indexes are compared
      const result = diff(index(), index(), { strategy: 'forward' });

      // Then the strategy is on the document so consumers know how verdicts were reached
      expect(result).toEqual({
        schemaVersion: 1,
        refs: {
          a: { source: 'acme/catalog', commit: 'abc1234' },
          b: { source: 'acme/catalog', commit: 'abc1234' },
        },
        compatibility: { strategy: 'forward' },
        summary: {
          breaking: false,
          resourcesAdded: 0,
          resourcesRemoved: 0,
          resourcesChanged: 0,
          edgesAdded: 0,
          edgesRemoved: 0,
          schemaChanges: 0,
          schemaBreaking: 0,
          schemaUnknown: 0,
        },
        resources: { added: [], removed: [], changed: [] },
        edges: { added: [], removed: [] },
        schemaChanges: [],
        impact: [],
      });
    });

    it('never modifies the indexes it is given', () => {
      // Given two indexes
      const a = index({ commit: 'abc1234', resources: catalog });
      const b = index({ commit: 'def5678', resources: catalog });
      const aBefore = structuredClone(a);
      const bBefore = structuredClone(b);

      // When they are compared
      diff(a, b);

      // Then the inputs are untouched
      expect(a).toEqual(aBefore);
      expect(b).toEqual(bBefore);
    });
  });

  describe('when nothing has changed between the two catalogs', () => {
    it('reports nothing added, removed, changed or breaking', () => {
      // Given the same catalog indexed at two different commits
      const a = index({ commit: 'abc1234', resources: catalog });
      const b = index({ commit: 'def5678', resources: catalog });

      // When they are compared
      const result = diff(a, b);

      // Then every section is empty and the diff is not breaking
      expect(result).toEqual({
        schemaVersion: 1,
        refs: {
          a: { source: 'acme/catalog', commit: 'abc1234' },
          b: { source: 'acme/catalog', commit: 'def5678' },
        },
        compatibility: { strategy: 'full' },
        summary: {
          breaking: false,
          resourcesAdded: 0,
          resourcesRemoved: 0,
          resourcesChanged: 0,
          edgesAdded: 0,
          edgesRemoved: 0,
          schemaChanges: 0,
          schemaBreaking: 0,
          schemaUnknown: 0,
        },
        resources: { added: [], removed: [], changed: [] },
        edges: { added: [], removed: [] },
        schemaChanges: [],
        impact: [],
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Schemas, end to end through diff(). The full set of JSON Schema rules lives in
  // json-schema/json-schema.test.ts; these check that a schema change in a catalog
  // surfaces in the diff document with the right verdict, and that impact names
  // the producers and consumers who are hurt.
  // ---------------------------------------------------------------------------

  describe('schemas', () => {
    describe('when a required property is removed from an event, in place, without a version bump', () => {
      // Given OrderCreated 1.0.0 had a required customerId in the baseline
      const a = index({ commit: 'abc1234', resources: catalog });

      // And the candidate removes it from the same version
      const b = index({
        commit: 'def5678',
        resources: [
          ordersService,
          paymentService,
          event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchemaWithoutCustomerId] }),
        ],
      });

      it('is breaking under the default (full) strategy, and impact names Payments as the consumer that is hurt', () => {
        // When they are compared with no strategy given
        const result = diff(a, b);

        // Then the document is breaking, says which op caused it, which direction broke,
        // and who produces and consumes the message, with their owners
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'full' },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 1,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '1.0.0' } },
              change: 'modified',
              before: { path: 'schema.json', hash: orderCreatedSchema.hash },
              after: { path: 'schema.json', hash: orderCreatedSchemaWithoutCustomerId.hash },
              strategy: 'full',
              breaking: true,
              direction: 'forward',
              ops: [
                {
                  op: 'remove',
                  path: '/properties/customerId',
                  kind: 'property.removed',
                  reason: 'property removed',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/customerId',
                  kind: 'required.removed',
                  reason: 'property is no longer required',
                  breaking: true,
                },
              ],
            },
          ],
          impact: [
            {
              message: { type: 'event', id: 'order-created', version: '1.0.0' },
              reason: 'schema_breaking_change',
              direction: 'forward',
              producers: [{ type: 'service', id: 'orders-service', version: '3.1.0', owners: ['team-orders'] }],
              consumers: [{ type: 'service', id: 'payment-service', version: '2.0.0', owners: ['team-payments'] }],
            },
          ],
        });
      });

      it('is breaking under forward, because a consumer on the old schema insists on the field', () => {
        const result = diff(a, b, { strategy: 'forward' });

        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'forward' },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 1,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '1.0.0' } },
              change: 'modified',
              before: { path: 'schema.json', hash: orderCreatedSchema.hash },
              after: { path: 'schema.json', hash: orderCreatedSchemaWithoutCustomerId.hash },
              strategy: 'forward',
              breaking: true,
              direction: 'forward',
              ops: [
                {
                  op: 'remove',
                  path: '/properties/customerId',
                  kind: 'property.removed',
                  reason: 'property removed',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/customerId',
                  kind: 'required.removed',
                  reason: 'property is no longer required',
                  breaking: true,
                },
              ],
            },
          ],
          impact: [
            {
              message: { type: 'event', id: 'order-created', version: '1.0.0' },
              reason: 'schema_breaking_change',
              direction: 'forward',
              producers: [{ type: 'service', id: 'orders-service', version: '3.1.0', owners: ['team-orders'] }],
              consumers: [{ type: 'service', id: 'payment-service', version: '2.0.0', owners: ['team-payments'] }],
            },
          ],
        });
      });

      it('is not breaking under backward, because old messages still carry the field, so nobody is impacted', () => {
        const result = diff(a, b, { strategy: 'backward' });

        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'backward' },
          summary: {
            breaking: false,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 0,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '1.0.0' } },
              change: 'modified',
              before: { path: 'schema.json', hash: orderCreatedSchema.hash },
              after: { path: 'schema.json', hash: orderCreatedSchemaWithoutCustomerId.hash },
              strategy: 'backward',
              breaking: false,
              direction: null,
              ops: [
                {
                  op: 'remove',
                  path: '/properties/customerId',
                  kind: 'property.removed',
                  reason: 'property removed',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/customerId',
                  kind: 'required.removed',
                  reason: 'property is no longer required',
                  breaking: false,
                },
              ],
            },
          ],
          impact: [],
        });
      });

      it('is still reported under none, but nothing is breaking and nobody is impacted', () => {
        const result = diff(a, b, { strategy: 'none' });

        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'none' },
          summary: {
            breaking: false,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 0,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '1.0.0' } },
              change: 'modified',
              before: { path: 'schema.json', hash: orderCreatedSchema.hash },
              after: { path: 'schema.json', hash: orderCreatedSchemaWithoutCustomerId.hash },
              strategy: 'none',
              breaking: false,
              direction: null,
              ops: [
                {
                  op: 'remove',
                  path: '/properties/customerId',
                  kind: 'property.removed',
                  reason: 'property removed',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/customerId',
                  kind: 'required.removed',
                  reason: 'property is no longer required',
                  breaking: false,
                },
              ],
            },
          ],
          impact: [],
        });
      });
    });

    describe('when an optional property is added to an event', () => {
      it('is reported as a schema change but is not breaking, so nobody is impacted', () => {
        // Given OrderCreated gains an optional orderTotal
        const a = index({ commit: 'abc1234', resources: catalog });
        const b = index({
          commit: 'def5678',
          resources: [
            ordersService,
            paymentService,
            event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchemaWithOptionalTotal] }),
          ],
        });

        // When they are compared
        const result = diff(a, b);

        // Then the change is visible but safe
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'full' },
          summary: {
            breaking: false,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 0,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '1.0.0' } },
              change: 'modified',
              before: { path: 'schema.json', hash: orderCreatedSchema.hash },
              after: { path: 'schema.json', hash: orderCreatedSchemaWithOptionalTotal.hash },
              strategy: 'full',
              breaking: false,
              direction: null,
              ops: [
                {
                  op: 'add',
                  path: '/properties/orderTotal',
                  kind: 'property.added',
                  reason: 'property added',
                  breaking: false,
                },
              ],
            },
          ],
          impact: [],
        });
      });
    });

    describe('when a required property is added to an event', () => {
      const a = index({ commit: 'abc1234', resources: catalog });
      const b = index({
        commit: 'def5678',
        resources: [
          ordersService,
          paymentService,
          event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchemaWithRequiredTotal] }),
        ],
      });

      it('is breaking under backward, and impact says the backward direction broke: consumers cannot replay old messages', () => {
        const result = diff(a, b, { strategy: 'backward' });

        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'backward' },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 1,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '1.0.0' } },
              change: 'modified',
              before: { path: 'schema.json', hash: orderCreatedSchema.hash },
              after: { path: 'schema.json', hash: orderCreatedSchemaWithRequiredTotal.hash },
              strategy: 'backward',
              breaking: true,
              direction: 'backward',
              ops: [
                {
                  op: 'add',
                  path: '/properties/orderTotal',
                  kind: 'property.added',
                  reason: 'property added',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/orderTotal',
                  kind: 'required.added',
                  reason: 'property became required',
                  breaking: true,
                },
              ],
            },
          ],
          impact: [
            {
              message: { type: 'event', id: 'order-created', version: '1.0.0' },
              reason: 'schema_breaking_change',
              direction: 'backward',
              producers: [{ type: 'service', id: 'orders-service', version: '3.1.0', owners: ['team-orders'] }],
              consumers: [{ type: 'service', id: 'payment-service', version: '2.0.0', owners: ['team-payments'] }],
            },
          ],
        });
      });

      it('is not breaking under forward, because existing consumers ignore the new field, so nobody is impacted', () => {
        const result = diff(a, b, { strategy: 'forward' });

        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'forward' },
          summary: {
            breaking: false,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 0,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '1.0.0' } },
              change: 'modified',
              before: { path: 'schema.json', hash: orderCreatedSchema.hash },
              after: { path: 'schema.json', hash: orderCreatedSchemaWithRequiredTotal.hash },
              strategy: 'forward',
              breaking: false,
              direction: null,
              ops: [
                {
                  op: 'add',
                  path: '/properties/orderTotal',
                  kind: 'property.added',
                  reason: 'property added',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/orderTotal',
                  kind: 'required.added',
                  reason: 'property became required',
                  breaking: false,
                },
              ],
            },
          ],
          impact: [],
        });
      });
    });

    describe('when a change breaks both directions under the full strategy', () => {
      it('reports the direction as both, and impact lists every producer and consumer', () => {
        // Given OrderCreated drops the required customerId (breaks forward) and adds a required orderTotal (breaks backward)
        const a = index({ commit: 'abc1234', resources: catalog });
        const swappedRequired = schema({
          type: 'object',
          required: ['orderTotal'],
          properties: { orderTotal: { type: 'number' } },
        });
        const b = index({
          commit: 'def5678',
          resources: [
            ordersService,
            paymentService,
            event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [swappedRequired] }),
          ],
        });

        // When they are compared with the default strategy
        const result = diff(a, b);

        // Then both directions are reported as broken
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'full' },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 1,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '1.0.0' } },
              change: 'modified',
              before: { path: 'schema.json', hash: orderCreatedSchema.hash },
              after: { path: 'schema.json', hash: swappedRequired.hash },
              strategy: 'full',
              breaking: true,
              direction: 'both',
              ops: [
                {
                  op: 'remove',
                  path: '/properties/customerId',
                  kind: 'property.removed',
                  reason: 'property removed',
                  breaking: false,
                },
                {
                  op: 'add',
                  path: '/properties/orderTotal',
                  kind: 'property.added',
                  reason: 'property added',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/orderTotal',
                  kind: 'required.added',
                  reason: 'property became required',
                  breaking: true,
                },
                {
                  op: 'replace',
                  path: '/properties/customerId',
                  kind: 'required.removed',
                  reason: 'property is no longer required',
                  breaking: true,
                },
              ],
            },
          ],
          impact: [
            {
              message: { type: 'event', id: 'order-created', version: '1.0.0' },
              reason: 'schema_breaking_change',
              direction: 'both',
              producers: [{ type: 'service', id: 'orders-service', version: '3.1.0', owners: ['team-orders'] }],
              consumers: [{ type: 'service', id: 'payment-service', version: '2.0.0', owners: ['team-payments'] }],
            },
          ],
        });
      });
    });

    describe('when the caller asks for schema content to be included', () => {
      it('copies the raw before and after schema text onto the change, so a UI can render a side-by-side diff', () => {
        // Given OrderCreated gains an optional orderTotal
        const a = index({ commit: 'abc1234', resources: catalog });
        const b = index({
          commit: 'def5678',
          resources: [
            ordersService,
            paymentService,
            event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchemaWithOptionalTotal] }),
          ],
        });

        // When they are compared with includeSchemaContent
        const result = diff(a, b, { includeSchemaContent: true });

        // Then both sides of the change carry the schema text exactly as it was in the index
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'full' },
          summary: {
            breaking: false,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 0,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '1.0.0' } },
              change: 'modified',
              before: {
                path: 'schema.json',
                hash: orderCreatedSchema.hash,
                content: '{"type":"object","required":["customerId"],"properties":{"customerId":{"type":"string"}}}',
              },
              after: {
                path: 'schema.json',
                hash: orderCreatedSchemaWithOptionalTotal.hash,
                content:
                  '{"type":"object","required":["customerId"],"properties":{"customerId":{"type":"string"},"orderTotal":{"type":"number"}}}',
              },
              strategy: 'full',
              breaking: false,
              direction: null,
              ops: [
                {
                  op: 'add',
                  path: '/properties/orderTotal',
                  kind: 'property.added',
                  reason: 'property added',
                  breaking: false,
                },
              ],
            },
          ],
          impact: [],
        });
      });
    });

    describe('when a message is bumped to a new version with a different schema', () => {
      it('compares the latest version on each side, records both versions, and impacts the consumers of the old version', () => {
        // Given the baseline has OrderCreated 1.0.0
        const a = index({ commit: 'abc1234', resources: catalog });

        // And the candidate keeps 1.0.0 on disk and adds 2.0.0 with customerId removed
        const b = index({
          commit: 'def5678',
          resources: [
            ...catalog,
            event('order-created', '2.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchemaWithoutCustomerId] }),
          ],
        });

        // When they are compared
        const result = diff(a, b);

        // Then 1.0.0 is compared against 2.0.0, not against the untouched 1.0.0 copy
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'full' },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 1,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 1,
            schemaUnknown: 0,
          },
          resources: {
            added: [],
            removed: [],
            changed: [{ type: 'event', id: 'order-created', version: { a: '1.0.0', b: '2.0.0' }, fields: ['version'] }],
          },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '2.0.0' } },
              change: 'modified',
              before: { path: 'schema.json', hash: orderCreatedSchema.hash },
              after: { path: 'schema.json', hash: orderCreatedSchemaWithoutCustomerId.hash },
              strategy: 'full',
              breaking: true,
              direction: 'forward',
              ops: [
                {
                  op: 'remove',
                  path: '/properties/customerId',
                  kind: 'property.removed',
                  reason: 'property removed',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/customerId',
                  kind: 'required.removed',
                  reason: 'property is no longer required',
                  breaking: true,
                },
              ],
            },
          ],
          impact: [
            {
              message: { type: 'event', id: 'order-created', version: '1.0.0' },
              reason: 'schema_breaking_change',
              direction: 'forward',
              producers: [{ type: 'service', id: 'orders-service', version: '3.1.0', owners: ['team-orders'] }],
              consumers: [{ type: 'service', id: 'payment-service', version: '2.0.0', owners: ['team-payments'] }],
            },
          ],
        });
      });
    });

    describe('when the index was built without schema content', () => {
      it('reports the change by hash with an unknown (null) verdict and no ops, does not mark the diff breaking, and impacts nobody', () => {
        // Given both indexes only carry hashes, as buildIndex() does by default
        const { content: _beforeContent, ...orderCreatedSchemaHashOnly } = orderCreatedSchema;
        const { content: _afterContent, ...orderCreatedSchemaWithoutCustomerIdHashOnly } = orderCreatedSchemaWithoutCustomerId;

        const a = index({
          commit: 'abc1234',
          resources: [
            ordersService,
            paymentService,
            event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchemaHashOnly] }),
          ],
        });
        const b = index({
          commit: 'def5678',
          resources: [
            ordersService,
            paymentService,
            event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchemaWithoutCustomerIdHashOnly] }),
          ],
        });

        // When they are compared
        const result = diff(a, b);

        // Then we know the schema changed but cannot say whether it is safe
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'full' },
          summary: {
            breaking: false,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 0,
            schemaUnknown: 1,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '1.0.0' } },
              change: 'modified',
              before: { path: 'schema.json', hash: orderCreatedSchema.hash },
              after: { path: 'schema.json', hash: orderCreatedSchemaWithoutCustomerId.hash },
              strategy: 'full',
              breaking: null,
              direction: null,
              ops: [],
            },
          ],
          impact: [],
        });
      });
    });

    describe('when the schema file is renamed in the same change', () => {
      it('still pairs the two files, because each side has exactly one schema, and reports the content change', () => {
        // Given the schema moves from schema.json to order-created.json and loses customerId
        const renamed = { ...orderCreatedSchemaWithoutCustomerId, path: 'order-created.json' };
        const a = index({ commit: 'abc1234', resources: catalog });
        const b = index({
          commit: 'def5678',
          resources: [
            ordersService,
            paymentService,
            event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [renamed] }),
          ],
        });

        // When they are compared
        const result = diff(a, b);

        // Then the rename does not hide the breaking change
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'full' },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 1,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '1.0.0' } },
              change: 'modified',
              before: { path: 'schema.json', hash: orderCreatedSchema.hash },
              after: { path: 'order-created.json', hash: orderCreatedSchemaWithoutCustomerId.hash },
              strategy: 'full',
              breaking: true,
              direction: 'forward',
              ops: [
                {
                  op: 'remove',
                  path: '/properties/customerId',
                  kind: 'property.removed',
                  reason: 'property removed',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/customerId',
                  kind: 'required.removed',
                  reason: 'property is no longer required',
                  breaking: true,
                },
              ],
            },
          ],
          impact: [
            {
              message: { type: 'event', id: 'order-created', version: '1.0.0' },
              reason: 'schema_breaking_change',
              direction: 'forward',
              producers: [{ type: 'service', id: 'orders-service', version: '3.1.0', owners: ['team-orders'] }],
              consumers: [{ type: 'service', id: 'payment-service', version: '2.0.0', owners: ['team-payments'] }],
            },
          ],
        });
      });
    });

    describe('when a schema file is removed from a message', () => {
      it('is reported as a removed schema with no verdict, and counted as unknown so it is never silent', () => {
        // Given OrderCreated loses its schema entirely
        const a = index({ commit: 'abc1234', resources: catalog });
        const b = index({
          commit: 'def5678',
          resources: [ordersService, paymentService, event('order-created', '1.0.0', { owners: ['team-orders'] })],
        });

        // When they are compared
        const result = diff(a, b);

        // Then we cannot say it is safe, and the summary says so
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'full' },
          summary: {
            breaking: false,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 0,
            schemaUnknown: 1,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '1.0.0' } },
              change: 'removed',
              before: { path: 'schema.json', hash: orderCreatedSchema.hash },
              strategy: 'full',
              breaking: null,
              direction: null,
              ops: [],
            },
          ],
          impact: [],
        });
      });
    });

    describe('when a schema file is added to a message that had none', () => {
      it('is reported as an added schema with no verdict', () => {
        const a = index({
          commit: 'abc1234',
          resources: [ordersService, paymentService, event('order-created', '1.0.0', { owners: ['team-orders'] })],
        });
        const b = index({ commit: 'def5678', resources: catalog });

        const result = diff(a, b);

        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: {
              source: 'acme/catalog',
              commit: 'abc1234',
            },
            b: {
              source: 'acme/catalog',
              commit: 'def5678',
            },
          },
          compatibility: {
            strategy: 'full',
          },
          summary: {
            breaking: false,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 0,
            schemaUnknown: 1,
          },
          resources: {
            added: [],
            removed: [],
            changed: [],
          },
          edges: {
            added: [],
            removed: [],
          },
          schemaChanges: [
            {
              message: {
                type: 'event',
                id: 'order-created',
                version: {
                  a: '1.0.0',
                  b: '1.0.0',
                },
              },
              change: 'added',
              after: {
                path: 'schema.json',
                hash: orderCreatedSchema.hash,
              },
              strategy: 'full',
              breaking: null,
              direction: null,
              ops: [],
            },
          ],
          impact: [],
        });
      });
    });

    describe('when an older version is patched while a newer version exists', () => {
      it('the older version is still compared against itself, so the change is not hidden behind the latest', () => {
        // Given OrderCreated exists at 1.0.0 and 2.0.0, and the PR edits 1.0.0 only
        const orderCreatedV2 = event('order-created', '2.0.0', {
          owners: ['team-orders'],
          schemas: [orderCreatedSchemaWithOptionalTotal],
        });
        const a = index({ commit: 'abc1234', resources: [ordersService, paymentService, orderCreated, orderCreatedV2] });
        const b = index({
          commit: 'def5678',
          resources: [
            ordersService,
            paymentService,
            event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchemaWithoutCustomerId] }),
            orderCreatedV2,
          ],
        });

        // When they are compared
        const result = diff(a, b);

        // Then the 1.0.0 edit is reported, 2.0.0 is untouched, and Payments (on 1.0.0) is impacted
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: {
              source: 'acme/catalog',
              commit: 'abc1234',
            },
            b: {
              source: 'acme/catalog',
              commit: 'def5678',
            },
          },
          compatibility: {
            strategy: 'full',
          },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 1,
            schemaUnknown: 0,
          },
          resources: {
            added: [],
            removed: [],
            changed: [],
          },
          edges: {
            added: [],
            removed: [],
          },
          schemaChanges: [
            {
              message: {
                type: 'event',
                id: 'order-created',
                version: {
                  a: '1.0.0',
                  b: '1.0.0',
                },
              },
              change: 'modified',
              before: {
                path: 'schema.json',
                hash: orderCreatedSchema.hash,
              },
              after: {
                path: 'schema.json',
                hash: orderCreatedSchemaWithoutCustomerId.hash,
              },
              strategy: 'full',
              breaking: true,
              direction: 'forward',
              ops: [
                {
                  op: 'remove',
                  path: '/properties/customerId',
                  kind: 'property.removed',
                  reason: 'property removed',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/customerId',
                  kind: 'required.removed',
                  reason: 'property is no longer required',
                  breaking: true,
                },
              ],
            },
          ],
          impact: [
            {
              message: {
                type: 'event',
                id: 'order-created',
                version: '1.0.0',
              },
              reason: 'schema_breaking_change',
              direction: 'forward',
              producers: [
                {
                  type: 'service',
                  id: 'orders-service',
                  version: '3.1.0',
                  owners: ['team-orders'],
                },
              ],
              consumers: [
                {
                  type: 'service',
                  id: 'payment-service',
                  version: '2.0.0',
                  owners: ['team-payments'],
                },
              ],
            },
          ],
        });
      });
    });

    describe('when a .json schema file has no declared format and does not look like a schema', () => {
      it('is reported by hash with no verdict rather than walked as if it were a schema', () => {
        // Given an example payload stored as schema.json, with no `format` in frontmatter
        const payloadBefore = schema('{"orderId":"ord_1","customerId":"cus_1"}', { format: undefined });
        const payloadAfter = schema('{"orderId":"ord_1"}', { format: undefined });
        const a = index({
          commit: 'abc1234',
          resources: [
            ordersService,
            paymentService,
            event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [payloadBefore] }),
          ],
        });
        const b = index({
          commit: 'def5678',
          resources: [
            ordersService,
            paymentService,
            event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [payloadAfter] }),
          ],
        });

        // When they are compared
        const result = diff(a, b);

        // Then we do not pretend to understand it
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: {
              source: 'acme/catalog',
              commit: 'abc1234',
            },
            b: {
              source: 'acme/catalog',
              commit: 'def5678',
            },
          },
          compatibility: {
            strategy: 'full',
          },
          summary: {
            breaking: false,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 0,
            schemaUnknown: 1,
          },
          resources: {
            added: [],
            removed: [],
            changed: [],
          },
          edges: {
            added: [],
            removed: [],
          },
          schemaChanges: [
            {
              message: {
                type: 'event',
                id: 'order-created',
                version: {
                  a: '1.0.0',
                  b: '1.0.0',
                },
              },
              change: 'modified',
              before: {
                path: 'schema.json',
                hash: payloadBefore.hash,
              },
              after: {
                path: 'schema.json',
                hash: payloadAfter.hash,
              },
              strategy: 'full',
              breaking: null,
              direction: null,
              ops: [],
            },
          ],
          impact: [],
        });
      });
    });

    describe('when a message only exists on one side', () => {
      it('is not a schema change, because there is nothing to compare it against', () => {
        // Given the candidate adds a brand new event
        const a = index({ commit: 'abc1234', resources: catalog });
        const b = index({
          commit: 'def5678',
          resources: [...catalog, event('order-shipped', '1.0.0', { schemas: [schema({ type: 'object' })] })],
        });

        // When they are compared
        const result = diff(a, b);

        // Then it is a resource addition, not a schema change
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'full' },
          summary: {
            breaking: false,
            resourcesAdded: 1,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 0,
            schemaBreaking: 0,
            schemaUnknown: 0,
          },
          resources: { added: [{ type: 'event', id: 'order-shipped', version: '1.0.0' }], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [],
          impact: [],
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Impact: who is hurt. Derived from the baseline graph so consumers of the diff
  // never walk edges themselves.
  // ---------------------------------------------------------------------------

  describe('impact', () => {
    describe('when a breaking change hits a message nobody consumes', () => {
      it('still lists the producer, with an empty consumers list, so policy can decide that nobody is affected', () => {
        // Given OrderCreated is published by Orders but nobody subscribes
        const a = index({ commit: 'abc1234', resources: [ordersService, orderCreated] });
        const b = index({
          commit: 'def5678',
          resources: [
            ordersService,
            event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchemaWithoutCustomerId] }),
          ],
        });

        // When they are compared
        const result = diff(a, b);

        // Then the change is still breaking, but the impact entry shows no consumers
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'full' },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 1,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '1.0.0' } },
              change: 'modified',
              before: { path: 'schema.json', hash: orderCreatedSchema.hash },
              after: { path: 'schema.json', hash: orderCreatedSchemaWithoutCustomerId.hash },
              strategy: 'full',
              breaking: true,
              direction: 'forward',
              ops: [
                {
                  op: 'remove',
                  path: '/properties/customerId',
                  kind: 'property.removed',
                  reason: 'property removed',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/customerId',
                  kind: 'required.removed',
                  reason: 'property is no longer required',
                  breaking: true,
                },
              ],
            },
          ],
          impact: [
            {
              message: { type: 'event', id: 'order-created', version: '1.0.0' },
              reason: 'schema_breaking_change',
              direction: 'forward',
              producers: [{ type: 'service', id: 'orders-service', version: '3.1.0', owners: ['team-orders'] }],
              consumers: [],
            },
          ],
        });
      });
    });

    describe('when a message has several consumers', () => {
      it('lists every consumer, sorted by id, each with its own owners', () => {
        // Given Payments, Shipping and Analytics all subscribe to OrderCreated
        const shippingService = service('shipping-service', '1.2.0', {
          owners: ['team-fulfilment'],
          receives: [receives('order-created', '1.0.0')],
        });
        const analyticsService = service('analytics-service', '0.9.0', {
          owners: ['team-data', 'team-platform'],
          receives: [receives('order-created', '1.0.0')],
        });
        const a = index({
          commit: 'abc1234',
          resources: [ordersService, paymentService, shippingService, analyticsService, orderCreated],
        });
        const b = index({
          commit: 'def5678',
          resources: [
            ordersService,
            paymentService,
            shippingService,
            analyticsService,
            event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchemaWithoutCustomerId] }),
          ],
        });

        // When they are compared with forward, the strategy that asks "do existing consumers keep working?"
        const result = diff(a, b, { strategy: 'forward' });

        // Then all three consumers are named
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'forward' },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 1,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '1.0.0' } },
              change: 'modified',
              before: { path: 'schema.json', hash: orderCreatedSchema.hash },
              after: { path: 'schema.json', hash: orderCreatedSchemaWithoutCustomerId.hash },
              strategy: 'forward',
              breaking: true,
              direction: 'forward',
              ops: [
                {
                  op: 'remove',
                  path: '/properties/customerId',
                  kind: 'property.removed',
                  reason: 'property removed',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/customerId',
                  kind: 'required.removed',
                  reason: 'property is no longer required',
                  breaking: true,
                },
              ],
            },
          ],
          impact: [
            {
              message: { type: 'event', id: 'order-created', version: '1.0.0' },
              reason: 'schema_breaking_change',
              direction: 'forward',
              producers: [{ type: 'service', id: 'orders-service', version: '3.1.0', owners: ['team-orders'] }],
              consumers: [
                { type: 'service', id: 'analytics-service', version: '0.9.0', owners: ['team-data', 'team-platform'] },
                { type: 'service', id: 'payment-service', version: '2.0.0', owners: ['team-payments'] },
                { type: 'service', id: 'shipping-service', version: '1.2.0', owners: ['team-fulfilment'] },
              ],
            },
          ],
        });
      });
    });

    describe('when a consumer subscribes to "latest" rather than a pinned version', () => {
      // Given Payments follows whatever the latest OrderCreated is, and Shipping gives no version at all (same thing)
      const paymentOnLatest = service('payment-service', '2.0.0', {
        owners: ['team-payments'],
        receives: [receives('order-created', 'latest')],
      });
      const shippingNoVersion = service('shipping-service', '1.2.0', {
        owners: ['team-fulfilment'],
        receives: [{ id: 'order-created' }],
      });

      it('is listed when the latest version is edited in place, because latest resolves to the version that changed', () => {
        const a = index({ commit: 'abc1234', resources: [ordersService, paymentOnLatest, shippingNoVersion, orderCreated] });
        const b = index({
          commit: 'def5678',
          resources: [
            ordersService,
            paymentOnLatest,
            shippingNoVersion,
            event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchemaWithoutCustomerId] }),
          ],
        });

        const result = diff(a, b);

        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: {
              source: 'acme/catalog',
              commit: 'abc1234',
            },
            b: {
              source: 'acme/catalog',
              commit: 'def5678',
            },
          },
          compatibility: {
            strategy: 'full',
          },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 1,
            schemaUnknown: 0,
          },
          resources: {
            added: [],
            removed: [],
            changed: [],
          },
          edges: {
            added: [],
            removed: [],
          },
          schemaChanges: [
            {
              message: {
                type: 'event',
                id: 'order-created',
                version: {
                  a: '1.0.0',
                  b: '1.0.0',
                },
              },
              change: 'modified',
              before: {
                path: 'schema.json',
                hash: orderCreatedSchema.hash,
              },
              after: {
                path: 'schema.json',
                hash: orderCreatedSchemaWithoutCustomerId.hash,
              },
              strategy: 'full',
              breaking: true,
              direction: 'forward',
              ops: [
                {
                  op: 'remove',
                  path: '/properties/customerId',
                  kind: 'property.removed',
                  reason: 'property removed',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/customerId',
                  kind: 'required.removed',
                  reason: 'property is no longer required',
                  breaking: true,
                },
              ],
            },
          ],
          impact: [
            {
              message: {
                type: 'event',
                id: 'order-created',
                version: '1.0.0',
              },
              reason: 'schema_breaking_change',
              direction: 'forward',
              producers: [
                {
                  type: 'service',
                  id: 'orders-service',
                  version: '3.1.0',
                  owners: ['team-orders'],
                },
              ],
              consumers: [
                {
                  type: 'service',
                  id: 'payment-service',
                  version: '2.0.0',
                  owners: ['team-payments'],
                },
                {
                  type: 'service',
                  id: 'shipping-service',
                  version: '1.2.0',
                  owners: ['team-fulfilment'],
                },
              ],
            },
          ],
        });
      });

      it('is listed when the message is bumped to a new version, because a latest subscriber moves to the new version automatically', () => {
        // Given the candidate adds OrderCreated 2.0.0; a consumer on latest silently starts receiving 2.0.0
        const a = index({ commit: 'abc1234', resources: [ordersService, paymentOnLatest, shippingNoVersion, orderCreated] });
        const b = index({
          commit: 'def5678',
          resources: [
            ordersService,
            paymentOnLatest,
            shippingNoVersion,
            orderCreated,
            event('order-created', '2.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchemaWithoutCustomerId] }),
          ],
        });

        const result = diff(a, b);

        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: {
              source: 'acme/catalog',
              commit: 'abc1234',
            },
            b: {
              source: 'acme/catalog',
              commit: 'def5678',
            },
          },
          compatibility: {
            strategy: 'full',
          },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 1,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 1,
            schemaUnknown: 0,
          },
          resources: {
            added: [],
            removed: [],
            changed: [
              {
                type: 'event',
                id: 'order-created',
                version: {
                  a: '1.0.0',
                  b: '2.0.0',
                },
                fields: ['version'],
              },
            ],
          },
          edges: {
            added: [],
            removed: [],
          },
          schemaChanges: [
            {
              message: {
                type: 'event',
                id: 'order-created',
                version: {
                  a: '1.0.0',
                  b: '2.0.0',
                },
              },
              change: 'modified',
              before: {
                path: 'schema.json',
                hash: orderCreatedSchema.hash,
              },
              after: {
                path: 'schema.json',
                hash: orderCreatedSchemaWithoutCustomerId.hash,
              },
              strategy: 'full',
              breaking: true,
              direction: 'forward',
              ops: [
                {
                  op: 'remove',
                  path: '/properties/customerId',
                  kind: 'property.removed',
                  reason: 'property removed',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/customerId',
                  kind: 'required.removed',
                  reason: 'property is no longer required',
                  breaking: true,
                },
              ],
            },
          ],
          impact: [
            {
              message: {
                type: 'event',
                id: 'order-created',
                version: '1.0.0',
              },
              reason: 'schema_breaking_change',
              direction: 'forward',
              producers: [
                {
                  type: 'service',
                  id: 'orders-service',
                  version: '3.1.0',
                  owners: ['team-orders'],
                },
              ],
              consumers: [
                {
                  type: 'service',
                  id: 'payment-service',
                  version: '2.0.0',
                  owners: ['team-payments'],
                },
                {
                  type: 'service',
                  id: 'shipping-service',
                  version: '1.2.0',
                  owners: ['team-fulfilment'],
                },
              ],
            },
          ],
        });
      });

      it('is NOT listed when an older, non-latest version is patched, because latest never pointed at it', () => {
        // Given OrderCreated exists at 1.0.0 and 2.0.0, latest subscribers are on 2.0.0, and 1.0.0 is patched
        const orderCreatedV2 = event('order-created', '2.0.0', {
          owners: ['team-orders'],
          schemas: [orderCreatedSchemaWithOptionalTotal],
        });
        const a = index({
          commit: 'abc1234',
          resources: [ordersService, paymentOnLatest, shippingNoVersion, orderCreated, orderCreatedV2],
        });
        const b = index({
          commit: 'def5678',
          resources: [
            ordersService,
            paymentOnLatest,
            shippingNoVersion,
            event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchemaWithoutCustomerId] }),
            orderCreatedV2,
          ],
        });

        const result = diff(a, b);

        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: {
              source: 'acme/catalog',
              commit: 'abc1234',
            },
            b: {
              source: 'acme/catalog',
              commit: 'def5678',
            },
          },
          compatibility: {
            strategy: 'full',
          },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 1,
            schemaUnknown: 0,
          },
          resources: {
            added: [],
            removed: [],
            changed: [],
          },
          edges: {
            added: [],
            removed: [],
          },
          schemaChanges: [
            {
              message: {
                type: 'event',
                id: 'order-created',
                version: {
                  a: '1.0.0',
                  b: '1.0.0',
                },
              },
              change: 'modified',
              before: {
                path: 'schema.json',
                hash: orderCreatedSchema.hash,
              },
              after: {
                path: 'schema.json',
                hash: orderCreatedSchemaWithoutCustomerId.hash,
              },
              strategy: 'full',
              breaking: true,
              direction: 'forward',
              ops: [
                {
                  op: 'remove',
                  path: '/properties/customerId',
                  kind: 'property.removed',
                  reason: 'property removed',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/customerId',
                  kind: 'required.removed',
                  reason: 'property is no longer required',
                  breaking: true,
                },
              ],
            },
          ],
          impact: [
            {
              message: {
                type: 'event',
                id: 'order-created',
                version: '1.0.0',
              },
              reason: 'schema_breaking_change',
              direction: 'forward',
              producers: [
                {
                  type: 'service',
                  id: 'orders-service',
                  version: '3.1.0',
                  owners: ['team-orders'],
                },
              ],
              consumers: [],
            },
          ],
        });
      });
    });

    describe('when the producer or consumer is not a service', () => {
      it('lists domains and agents that send or receive the message, with their own type', () => {
        // Given a domain publishes OrderCreated at the domain level, and an AI agent consumes it
        const shoppingDomain = domain('shopping', '1.0.0', {
          owners: ['team-shopping'],
          sends: [sends('order-created', '1.0.0')],
        });
        const fraudAgent = resource('agent', 'fraud-agent', '0.3.0', {
          owners: ['team-risk'],
          receives: [receives('order-created', '1.0.0')],
        });
        const a = index({ commit: 'abc1234', resources: [shoppingDomain, fraudAgent, paymentService, orderCreated] });
        const b = index({
          commit: 'def5678',
          resources: [
            shoppingDomain,
            fraudAgent,
            paymentService,
            event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchemaWithoutCustomerId] }),
          ],
        });

        // When they are compared
        const result = diff(a, b);

        // Then every party appears, typed as what it is
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'full' },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 1,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '1.0.0' } },
              change: 'modified',
              before: { path: 'schema.json', hash: orderCreatedSchema.hash },
              after: { path: 'schema.json', hash: orderCreatedSchemaWithoutCustomerId.hash },
              strategy: 'full',
              breaking: true,
              direction: 'forward',
              ops: [
                {
                  op: 'remove',
                  path: '/properties/customerId',
                  kind: 'property.removed',
                  reason: 'property removed',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/customerId',
                  kind: 'required.removed',
                  reason: 'property is no longer required',
                  breaking: true,
                },
              ],
            },
          ],
          impact: [
            {
              message: { type: 'event', id: 'order-created', version: '1.0.0' },
              reason: 'schema_breaking_change',
              direction: 'forward',
              producers: [{ type: 'domain', id: 'shopping', version: '1.0.0', owners: ['team-shopping'] }],
              consumers: [
                { type: 'agent', id: 'fraud-agent', version: '0.3.0', owners: ['team-risk'] },
                { type: 'service', id: 'payment-service', version: '2.0.0', owners: ['team-payments'] },
              ],
            },
          ],
        });
      });

      it('lists a domain as a removed consumer when it stops receiving a message', () => {
        const shoppingListening = domain('shopping', '1.0.0', {
          owners: ['team-shopping'],
          receives: [receives('order-created', '1.0.0')],
        });
        const shoppingNotListening = domain('shopping', '1.0.0', { owners: ['team-shopping'] });
        const a = index({ commit: 'abc1234', resources: [...catalog, shoppingListening] });
        const b = index({ commit: 'def5678', resources: [...catalog, shoppingNotListening] });

        const result = diff(a, b);

        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'full' },
          summary: {
            breaking: false,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 1,
            schemaChanges: 0,
            schemaBreaking: 0,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: {
            added: [],
            removed: [
              {
                direction: 'receives',
                from: { type: 'domain', id: 'shopping', version: '1.0.0' },
                to: { type: 'event', id: 'order-created', version: '1.0.0' },
              },
            ],
          },
          schemaChanges: [],
          impact: [
            {
              message: { type: 'event', id: 'order-created' },
              reason: 'consumer_removed',
              producers: [],
              consumers: [{ type: 'domain', id: 'shopping', version: '1.0.0', owners: ['team-shopping'] }],
            },
          ],
        });
      });
    });

    describe('when a consumer subscribes with a semver range', () => {
      it('is listed when the version the range resolves to is the one that changed', () => {
        // Given Payments accepts any 1.x, which today resolves to 1.0.0, and 1.0.0 is bumped to 2.0.0
        const paymentOnRange = service('payment-service', '2.0.0', {
          owners: ['team-payments'],
          receives: [receives('order-created', '^1.0.0')],
        });
        const a = index({ commit: 'abc1234', resources: [ordersService, paymentOnRange, orderCreated] });
        const b = index({
          commit: 'def5678',
          resources: [
            ordersService,
            paymentOnRange,
            orderCreated,
            event('order-created', '2.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchemaWithoutCustomerId] }),
          ],
        });

        const result = diff(a, b);

        // Then Payments is listed: the catalog cannot know whether the producer keeps publishing 1.x, so it errs on inclusion
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: {
              source: 'acme/catalog',
              commit: 'abc1234',
            },
            b: {
              source: 'acme/catalog',
              commit: 'def5678',
            },
          },
          compatibility: {
            strategy: 'full',
          },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 1,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 1,
            schemaUnknown: 0,
          },
          resources: {
            added: [],
            removed: [],
            changed: [
              {
                type: 'event',
                id: 'order-created',
                version: {
                  a: '1.0.0',
                  b: '2.0.0',
                },
                fields: ['version'],
              },
            ],
          },
          edges: {
            added: [],
            removed: [],
          },
          schemaChanges: [
            {
              message: {
                type: 'event',
                id: 'order-created',
                version: {
                  a: '1.0.0',
                  b: '2.0.0',
                },
              },
              change: 'modified',
              before: {
                path: 'schema.json',
                hash: orderCreatedSchema.hash,
              },
              after: {
                path: 'schema.json',
                hash: orderCreatedSchemaWithoutCustomerId.hash,
              },
              strategy: 'full',
              breaking: true,
              direction: 'forward',
              ops: [
                {
                  op: 'remove',
                  path: '/properties/customerId',
                  kind: 'property.removed',
                  reason: 'property removed',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/customerId',
                  kind: 'required.removed',
                  reason: 'property is no longer required',
                  breaking: true,
                },
              ],
            },
          ],
          impact: [
            {
              message: {
                type: 'event',
                id: 'order-created',
                version: '1.0.0',
              },
              reason: 'schema_breaking_change',
              direction: 'forward',
              producers: [
                {
                  type: 'service',
                  id: 'orders-service',
                  version: '3.1.0',
                  owners: ['team-orders'],
                },
              ],
              consumers: [
                {
                  type: 'service',
                  id: 'payment-service',
                  version: '2.0.0',
                  owners: ['team-payments'],
                },
              ],
            },
          ],
        });
      });
    });

    describe('when a consumer is pinned to an older version of the message', () => {
      it('is not listed, because a change to the newer version does not reach it', () => {
        // Given OrderCreated exists at 0.6.0 and 1.0.0, Payments still consumes 0.6.0, and 1.0.0 changes
        const legacyOrderCreated = event('order-created', '0.6.0', { owners: ['team-orders'], schemas: [orderCreatedSchema] });
        const legacyPaymentService = service('payment-service', '1.0.0', {
          owners: ['team-payments'],
          receives: [receives('order-created', '0.6.0')],
        });
        const a = index({
          commit: 'abc1234',
          resources: [ordersService, legacyPaymentService, legacyOrderCreated, orderCreated],
        });
        const b = index({
          commit: 'def5678',
          resources: [
            ordersService,
            legacyPaymentService,
            legacyOrderCreated,
            event('order-created', '1.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchemaWithoutCustomerId] }),
          ],
        });

        // When they are compared
        const result = diff(a, b);

        // Then only the producer on 1.0.0 is listed
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'full' },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 1,
            schemaBreaking: 1,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: { added: [], removed: [] },
          schemaChanges: [
            {
              message: { type: 'event', id: 'order-created', version: { a: '1.0.0', b: '1.0.0' } },
              change: 'modified',
              before: { path: 'schema.json', hash: orderCreatedSchema.hash },
              after: { path: 'schema.json', hash: orderCreatedSchemaWithoutCustomerId.hash },
              strategy: 'full',
              breaking: true,
              direction: 'forward',
              ops: [
                {
                  op: 'remove',
                  path: '/properties/customerId',
                  kind: 'property.removed',
                  reason: 'property removed',
                  breaking: false,
                },
                {
                  op: 'replace',
                  path: '/properties/customerId',
                  kind: 'required.removed',
                  reason: 'property is no longer required',
                  breaking: true,
                },
              ],
            },
          ],
          impact: [
            {
              message: { type: 'event', id: 'order-created', version: '1.0.0' },
              reason: 'schema_breaking_change',
              direction: 'forward',
              producers: [{ type: 'service', id: 'orders-service', version: '3.1.0', owners: ['team-orders'] }],
              consumers: [],
            },
          ],
        });
      });
    });

    describe('when a message that services still use is removed', () => {
      it('is breaking, and impact names everyone who still produced or consumed it', () => {
        // Given OrderCreated is deleted while Orders still sends it and Payments still receives it
        const a = index({ commit: 'abc1234', resources: catalog });
        const b = index({ commit: 'def5678', resources: [ordersService, paymentService] });

        // When they are compared
        const result = diff(a, b);

        // Then the removal, the orphaned edges and the impact are all in the document
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'full' },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 1,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 2,
            schemaChanges: 0,
            schemaBreaking: 0,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [{ type: 'event', id: 'order-created', version: '1.0.0' }], changed: [] },
          edges: {
            added: [],
            removed: [
              {
                direction: 'receives',
                from: { type: 'service', id: 'payment-service', version: '2.0.0' },
                to: { type: 'event', id: 'order-created', version: '1.0.0' },
              },
              {
                direction: 'sends',
                from: { type: 'service', id: 'orders-service', version: '3.1.0' },
                to: { type: 'event', id: 'order-created', version: '1.0.0' },
              },
            ],
          },
          schemaChanges: [],
          impact: [
            {
              message: { type: 'event', id: 'order-created', version: '1.0.0' },
              reason: 'message_removed',
              producers: [{ type: 'service', id: 'orders-service', version: '3.1.0', owners: ['team-orders'] }],
              consumers: [{ type: 'service', id: 'payment-service', version: '2.0.0', owners: ['team-payments'] }],
            },
          ],
        });
      });

      it('is a plain removal with no impact when nobody used it any more', () => {
        // Given an orphaned event with no producers or consumers is deleted
        const orphan = event('legacy-ping', '1.0.0', { owners: ['team-orders'] });
        const a = index({ commit: 'abc1234', resources: [...catalog, orphan] });
        const b = index({ commit: 'def5678', resources: catalog });

        const result = diff(a, b);

        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: {
              source: 'acme/catalog',
              commit: 'abc1234',
            },
            b: {
              source: 'acme/catalog',
              commit: 'def5678',
            },
          },
          compatibility: {
            strategy: 'full',
          },
          summary: {
            breaking: false,
            resourcesAdded: 0,
            resourcesRemoved: 1,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 0,
            schemaChanges: 0,
            schemaBreaking: 0,
            schemaUnknown: 0,
          },
          resources: {
            added: [],
            removed: [
              {
                type: 'event',
                id: 'legacy-ping',
                version: '1.0.0',
              },
            ],
            changed: [],
          },
          edges: {
            added: [],
            removed: [],
          },
          schemaChanges: [],
          impact: [],
        });
      });

      it('an old version that a consumer is still pinned to is reported when it is deleted', () => {
        // Given OrderCreated 0.6.0 and 1.0.0 both exist, a legacy consumer is pinned to 0.6.0, and 0.6.0 is deleted
        const legacyOrderCreated = event('order-created', '0.6.0', { owners: ['team-orders'], schemas: [orderCreatedSchema] });
        const legacyPaymentService = service('payment-service', '1.0.0', {
          owners: ['team-payments'],
          receives: [receives('order-created', '0.6.0')],
        });
        const a = index({
          commit: 'abc1234',
          resources: [ordersService, legacyPaymentService, legacyOrderCreated, orderCreated],
        });
        const b = index({ commit: 'def5678', resources: [ordersService, legacyPaymentService, orderCreated] });

        const result = diff(a, b);

        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: {
              source: 'acme/catalog',
              commit: 'abc1234',
            },
            b: {
              source: 'acme/catalog',
              commit: 'def5678',
            },
          },
          compatibility: {
            strategy: 'full',
          },
          summary: {
            breaking: true,
            resourcesAdded: 0,
            resourcesRemoved: 1,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 1,
            schemaChanges: 0,
            schemaBreaking: 0,
            schemaUnknown: 0,
          },
          resources: {
            added: [],
            removed: [
              {
                type: 'event',
                id: 'order-created',
                version: '0.6.0',
              },
            ],
            changed: [],
          },
          edges: {
            added: [],
            removed: [
              {
                direction: 'receives',
                from: {
                  type: 'service',
                  id: 'payment-service',
                  version: '1.0.0',
                },
                to: {
                  type: 'event',
                  id: 'order-created',
                  version: '0.6.0',
                },
              },
            ],
          },
          schemaChanges: [],
          impact: [
            {
              message: {
                type: 'event',
                id: 'order-created',
                version: '0.6.0',
              },
              reason: 'message_removed',
              producers: [],
              consumers: [
                {
                  type: 'service',
                  id: 'payment-service',
                  version: '1.0.0',
                  owners: ['team-payments'],
                },
              ],
            },
          ],
        });
      });
    });

    describe('when a service stops receiving a message that still exists', () => {
      it("is listed as a removed consumer, and is not breaking, because dropping a subscription is the consumer's own choice", () => {
        // Given Payments no longer receives OrderCreated
        const paymentNoLongerListening = service('payment-service', '2.0.0', { owners: ['team-payments'] });
        const a = index({ commit: 'abc1234', resources: catalog });
        const b = index({ commit: 'def5678', resources: [ordersService, paymentNoLongerListening, orderCreated] });

        // When they are compared
        const result = diff(a, b);

        // Then the edge is gone and impact says who left
        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: { source: 'acme/catalog', commit: 'abc1234' },
            b: { source: 'acme/catalog', commit: 'def5678' },
          },
          compatibility: { strategy: 'full' },
          summary: {
            breaking: false,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 1,
            schemaChanges: 0,
            schemaBreaking: 0,
            schemaUnknown: 0,
          },
          resources: { added: [], removed: [], changed: [] },
          edges: {
            added: [],
            removed: [
              {
                direction: 'receives',
                from: { type: 'service', id: 'payment-service', version: '2.0.0' },
                to: { type: 'event', id: 'order-created', version: '1.0.0' },
              },
            ],
          },
          schemaChanges: [],
          impact: [
            {
              message: { type: 'event', id: 'order-created' },
              reason: 'consumer_removed',
              producers: [],
              consumers: [{ type: 'service', id: 'payment-service', version: '2.0.0', owners: ['team-payments'] }],
            },
          ],
        });
      });
    });

    describe('when a service stops sending a message that still exists', () => {
      it('is listed as a removed producer', () => {
        const ordersNoLongerSending = service('orders-service', '3.1.0', { owners: ['team-orders'] });
        const a = index({ commit: 'abc1234', resources: catalog });
        const b = index({ commit: 'def5678', resources: [ordersNoLongerSending, paymentService, orderCreated] });

        const result = diff(a, b);

        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: {
              source: 'acme/catalog',
              commit: 'abc1234',
            },
            b: {
              source: 'acme/catalog',
              commit: 'def5678',
            },
          },
          compatibility: {
            strategy: 'full',
          },
          summary: {
            breaking: false,
            resourcesAdded: 0,
            resourcesRemoved: 0,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 1,
            schemaChanges: 0,
            schemaBreaking: 0,
            schemaUnknown: 0,
          },
          resources: {
            added: [],
            removed: [],
            changed: [],
          },
          edges: {
            added: [],
            removed: [
              {
                direction: 'sends',
                from: {
                  type: 'service',
                  id: 'orders-service',
                  version: '3.1.0',
                },
                to: {
                  type: 'event',
                  id: 'order-created',
                  version: '1.0.0',
                },
              },
            ],
          },
          schemaChanges: [],
          impact: [
            {
              message: {
                type: 'event',
                id: 'order-created',
              },
              reason: 'producer_removed',
              producers: [
                {
                  type: 'service',
                  id: 'orders-service',
                  version: '3.1.0',
                  owners: ['team-orders'],
                },
              ],
              consumers: [],
            },
          ],
        });
      });
    });

    describe('when a whole consuming service is deleted', () => {
      it('reports the service removed, its edge removed, and it as a removed consumer', () => {
        const a = index({ commit: 'abc1234', resources: catalog });
        const b = index({ commit: 'def5678', resources: [ordersService, orderCreated] });

        const result = diff(a, b);

        expect(result).toEqual({
          schemaVersion: 1,
          refs: {
            a: {
              source: 'acme/catalog',
              commit: 'abc1234',
            },
            b: {
              source: 'acme/catalog',
              commit: 'def5678',
            },
          },
          compatibility: {
            strategy: 'full',
          },
          summary: {
            breaking: false,
            resourcesAdded: 0,
            resourcesRemoved: 1,
            resourcesChanged: 0,
            edgesAdded: 0,
            edgesRemoved: 1,
            schemaChanges: 0,
            schemaBreaking: 0,
            schemaUnknown: 0,
          },
          resources: {
            added: [],
            removed: [
              {
                type: 'service',
                id: 'payment-service',
                version: '2.0.0',
              },
            ],
            changed: [],
          },
          edges: {
            added: [],
            removed: [
              {
                direction: 'receives',
                from: {
                  type: 'service',
                  id: 'payment-service',
                  version: '2.0.0',
                },
                to: {
                  type: 'event',
                  id: 'order-created',
                  version: '1.0.0',
                },
              },
            ],
          },
          schemaChanges: [],
          impact: [
            {
              message: {
                type: 'event',
                id: 'order-created',
              },
              reason: 'consumer_removed',
              producers: [],
              consumers: [
                {
                  type: 'service',
                  id: 'payment-service',
                  version: '2.0.0',
                  owners: ['team-payments'],
                },
              ],
            },
          ],
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Resources: what was added, removed or changed. Identity is type + id.
  // ---------------------------------------------------------------------------

  describe('resources', () => {
    it('a resource present only in the candidate is reported as added', () => {
      // Given a new service appears, sending a new command
      const a = index({ commit: 'abc1234', resources: catalog });
      const b = index({
        commit: 'def5678',
        resources: [
          ...catalog,
          service('inventory-service', '1.0.0', { owners: ['team-warehouse'], sends: [sends('stock-reserved', '1.0.0')] }),
          event('stock-reserved', '1.0.0', { owners: ['team-warehouse'] }),
        ],
      });

      const result = diff(a, b);

      expect(result).toEqual({
        schemaVersion: 1,
        refs: {
          a: { source: 'acme/catalog', commit: 'abc1234' },
          b: { source: 'acme/catalog', commit: 'def5678' },
        },
        compatibility: { strategy: 'full' },
        summary: {
          breaking: false,
          resourcesAdded: 2,
          resourcesRemoved: 0,
          resourcesChanged: 0,
          edgesAdded: 1,
          edgesRemoved: 0,
          schemaChanges: 0,
          schemaBreaking: 0,
          schemaUnknown: 0,
        },
        resources: {
          added: [
            { type: 'event', id: 'stock-reserved', version: '1.0.0' },
            { type: 'service', id: 'inventory-service', version: '1.0.0' },
          ],
          removed: [],
          changed: [],
        },
        edges: {
          added: [
            {
              direction: 'sends',
              from: { type: 'service', id: 'inventory-service', version: '1.0.0' },
              to: { type: 'event', id: 'stock-reserved', version: '1.0.0' },
            },
          ],
          removed: [],
        },
        schemaChanges: [],
        impact: [],
      });
    });

    it('a resource present only in the baseline is reported as removed', () => {
      const a = index({ commit: 'abc1234', resources: [...catalog, domain('shopping', '1.0.0')] });
      const b = index({ commit: 'def5678', resources: catalog });

      const result = diff(a, b);

      expect(result).toEqual({
        schemaVersion: 1,
        refs: {
          a: {
            source: 'acme/catalog',
            commit: 'abc1234',
          },
          b: {
            source: 'acme/catalog',
            commit: 'def5678',
          },
        },
        compatibility: {
          strategy: 'full',
        },
        summary: {
          breaking: false,
          resourcesAdded: 0,
          resourcesRemoved: 1,
          resourcesChanged: 0,
          edgesAdded: 0,
          edgesRemoved: 0,
          schemaChanges: 0,
          schemaBreaking: 0,
          schemaUnknown: 0,
        },
        resources: {
          added: [],
          removed: [
            {
              type: 'domain',
              id: 'shopping',
              version: '1.0.0',
            },
          ],
          changed: [],
        },
        edges: {
          added: [],
          removed: [],
        },
        schemaChanges: [],
        impact: [],
      });
    });

    it('a resource whose version changed is reported as changed, not as removed plus added', () => {
      // Given Orders bumps from 3.1.0 to 4.0.0 with the same edges
      const ordersV4 = service('orders-service', '4.0.0', { owners: ['team-orders'], sends: [sends('order-created', '1.0.0')] });
      const a = index({ commit: 'abc1234', resources: catalog });
      const b = index({ commit: 'def5678', resources: [ordersV4, paymentService, orderCreated] });

      const result = diff(a, b);

      expect(result).toEqual({
        schemaVersion: 1,
        refs: {
          a: {
            source: 'acme/catalog',
            commit: 'abc1234',
          },
          b: {
            source: 'acme/catalog',
            commit: 'def5678',
          },
        },
        compatibility: {
          strategy: 'full',
        },
        summary: {
          breaking: false,
          resourcesAdded: 0,
          resourcesRemoved: 0,
          resourcesChanged: 1,
          edgesAdded: 0,
          edgesRemoved: 0,
          schemaChanges: 0,
          schemaBreaking: 0,
          schemaUnknown: 0,
        },
        resources: {
          added: [],
          removed: [],
          changed: [
            {
              type: 'service',
              id: 'orders-service',
              version: {
                a: '3.1.0',
                b: '4.0.0',
              },
              fields: ['version'],
            },
          ],
        },
        edges: {
          added: [],
          removed: [],
        },
        schemaChanges: [],
        impact: [],
      });
    });

    it('a resource is identified by its type and id, so an event and a service with the same id are different resources', () => {
      // Given a service called "orders" is added while an event called "orders" already exists
      const a = index({ commit: 'abc1234', resources: [event('orders', '1.0.0')] });
      const b = index({ commit: 'def5678', resources: [event('orders', '1.0.0'), service('orders', '1.0.0')] });

      const result = diff(a, b);

      expect(result).toEqual({
        schemaVersion: 1,
        refs: {
          a: {
            source: 'acme/catalog',
            commit: 'abc1234',
          },
          b: {
            source: 'acme/catalog',
            commit: 'def5678',
          },
        },
        compatibility: {
          strategy: 'full',
        },
        summary: {
          breaking: false,
          resourcesAdded: 1,
          resourcesRemoved: 0,
          resourcesChanged: 0,
          edgesAdded: 0,
          edgesRemoved: 0,
          schemaChanges: 0,
          schemaBreaking: 0,
          schemaUnknown: 0,
        },
        resources: {
          added: [
            {
              type: 'service',
              id: 'orders',
              version: '1.0.0',
            },
          ],
          removed: [],
          changed: [],
        },
        edges: {
          added: [],
          removed: [],
        },
        schemaChanges: [],
        impact: [],
      });
    });

    it('a resource whose owners changed is reported as changed, with the field named', () => {
      const reassigned = service('payment-service', '2.0.0', {
        owners: ['team-checkout'],
        receives: [receives('order-created', '1.0.0')],
      });
      const a = index({ commit: 'abc1234', resources: catalog });
      const b = index({ commit: 'def5678', resources: [ordersService, reassigned, orderCreated] });

      const result = diff(a, b);

      expect(result).toEqual({
        schemaVersion: 1,
        refs: {
          a: {
            source: 'acme/catalog',
            commit: 'abc1234',
          },
          b: {
            source: 'acme/catalog',
            commit: 'def5678',
          },
        },
        compatibility: {
          strategy: 'full',
        },
        summary: {
          breaking: false,
          resourcesAdded: 0,
          resourcesRemoved: 0,
          resourcesChanged: 1,
          edgesAdded: 0,
          edgesRemoved: 0,
          schemaChanges: 0,
          schemaBreaking: 0,
          schemaUnknown: 0,
        },
        resources: {
          added: [],
          removed: [],
          changed: [
            {
              type: 'service',
              id: 'payment-service',
              version: {
                a: '2.0.0',
                b: '2.0.0',
              },
              fields: ['owners'],
            },
          ],
        },
        edges: {
          added: [],
          removed: [],
        },
        schemaChanges: [],
        impact: [],
      });
    });

    it('a resource that became deprecated is reported as changed, with the field named', () => {
      const deprecated = event('order-created', '1.0.0', {
        owners: ['team-orders'],
        schemas: [orderCreatedSchema],
        deprecated: { date: '2026-12-31', message: 'Use OrderPlaced' },
      });
      const a = index({ commit: 'abc1234', resources: catalog });
      const b = index({ commit: 'def5678', resources: [ordersService, paymentService, deprecated] });

      const result = diff(a, b);

      expect(result).toEqual({
        schemaVersion: 1,
        refs: {
          a: {
            source: 'acme/catalog',
            commit: 'abc1234',
          },
          b: {
            source: 'acme/catalog',
            commit: 'def5678',
          },
        },
        compatibility: {
          strategy: 'full',
        },
        summary: {
          breaking: false,
          resourcesAdded: 0,
          resourcesRemoved: 0,
          resourcesChanged: 1,
          edgesAdded: 0,
          edgesRemoved: 0,
          schemaChanges: 0,
          schemaBreaking: 0,
          schemaUnknown: 0,
        },
        resources: {
          added: [],
          removed: [],
          changed: [
            {
              type: 'event',
              id: 'order-created',
              version: {
                a: '1.0.0',
                b: '1.0.0',
              },
              fields: ['deprecated'],
            },
          ],
        },
        edges: {
          added: [],
          removed: [],
        },
        schemaChanges: [],
        impact: [],
      });
    });

    it('a version bump that also changes owners names both fields', () => {
      const ordersV4 = service('orders-service', '4.0.0', {
        owners: ['team-orders', 'team-platform'],
        sends: [sends('order-created', '1.0.0')],
      });
      const a = index({ commit: 'abc1234', resources: catalog });
      const b = index({ commit: 'def5678', resources: [ordersV4, paymentService, orderCreated] });

      const result = diff(a, b);

      expect(result).toEqual({
        schemaVersion: 1,
        refs: {
          a: {
            source: 'acme/catalog',
            commit: 'abc1234',
          },
          b: {
            source: 'acme/catalog',
            commit: 'def5678',
          },
        },
        compatibility: {
          strategy: 'full',
        },
        summary: {
          breaking: false,
          resourcesAdded: 0,
          resourcesRemoved: 0,
          resourcesChanged: 1,
          edgesAdded: 0,
          edgesRemoved: 0,
          schemaChanges: 0,
          schemaBreaking: 0,
          schemaUnknown: 0,
        },
        resources: {
          added: [],
          removed: [],
          changed: [
            {
              type: 'service',
              id: 'orders-service',
              version: {
                a: '3.1.0',
                b: '4.0.0',
              },
              fields: ['version', 'owners'],
            },
          ],
        },
        edges: {
          added: [],
          removed: [],
        },
        schemaChanges: [],
        impact: [],
      });
    });

    it('a markdown-only edit is not a resource change', () => {
      // Given only the mdx content hash differs
      const a = index({ commit: 'abc1234', resources: catalog });
      const b = index({
        commit: 'def5678',
        resources: catalog.map((r) => (r.id === 'order-created' ? { ...r, contentHash: 'sha256:' + 'f'.repeat(64) } : r)),
      });

      const result = diff(a, b);

      expect(result).toEqual({
        schemaVersion: 1,
        refs: {
          a: {
            source: 'acme/catalog',
            commit: 'abc1234',
          },
          b: {
            source: 'acme/catalog',
            commit: 'def5678',
          },
        },
        compatibility: {
          strategy: 'full',
        },
        summary: {
          breaking: false,
          resourcesAdded: 0,
          resourcesRemoved: 0,
          resourcesChanged: 0,
          edgesAdded: 0,
          edgesRemoved: 0,
          schemaChanges: 0,
          schemaBreaking: 0,
          schemaUnknown: 0,
        },
        resources: {
          added: [],
          removed: [],
          changed: [],
        },
        edges: {
          added: [],
          removed: [],
        },
        schemaChanges: [],
        impact: [],
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Edges: relationships that appeared or disappeared. Identity ignores versions.
  // ---------------------------------------------------------------------------

  describe('edges', () => {
    it('a service that starts sending a message adds a sends edge', () => {
      // Given Payments starts publishing PaymentTaken
      const paymentTaken = event('payment-taken', '1.0.0', { owners: ['team-payments'] });
      const paymentNowSending = service('payment-service', '2.0.0', {
        owners: ['team-payments'],
        receives: [receives('order-created', '1.0.0')],
        sends: [sends('payment-taken', '1.0.0')],
      });
      const a = index({ commit: 'abc1234', resources: [...catalog, paymentTaken] });
      const b = index({ commit: 'def5678', resources: [ordersService, paymentNowSending, orderCreated, paymentTaken] });

      const result = diff(a, b);

      expect(result).toEqual({
        schemaVersion: 1,
        refs: {
          a: {
            source: 'acme/catalog',
            commit: 'abc1234',
          },
          b: {
            source: 'acme/catalog',
            commit: 'def5678',
          },
        },
        compatibility: {
          strategy: 'full',
        },
        summary: {
          breaking: false,
          resourcesAdded: 0,
          resourcesRemoved: 0,
          resourcesChanged: 0,
          edgesAdded: 1,
          edgesRemoved: 0,
          schemaChanges: 0,
          schemaBreaking: 0,
          schemaUnknown: 0,
        },
        resources: {
          added: [],
          removed: [],
          changed: [],
        },
        edges: {
          added: [
            {
              direction: 'sends',
              from: {
                type: 'service',
                id: 'payment-service',
                version: '2.0.0',
              },
              to: {
                type: 'event',
                id: 'payment-taken',
                version: '1.0.0',
              },
            },
          ],
          removed: [],
        },
        schemaChanges: [],
        impact: [],
      });
    });

    it('a service that stops receiving a message removes a receives edge', () => {
      const paymentNoLongerListening = service('payment-service', '2.0.0', { owners: ['team-payments'] });
      const a = index({ commit: 'abc1234', resources: catalog });
      const b = index({ commit: 'def5678', resources: [ordersService, paymentNoLongerListening, orderCreated] });

      const result = diff(a, b);

      expect(result).toEqual({
        schemaVersion: 1,
        refs: {
          a: {
            source: 'acme/catalog',
            commit: 'abc1234',
          },
          b: {
            source: 'acme/catalog',
            commit: 'def5678',
          },
        },
        compatibility: {
          strategy: 'full',
        },
        summary: {
          breaking: false,
          resourcesAdded: 0,
          resourcesRemoved: 0,
          resourcesChanged: 0,
          edgesAdded: 0,
          edgesRemoved: 1,
          schemaChanges: 0,
          schemaBreaking: 0,
          schemaUnknown: 0,
        },
        resources: {
          added: [],
          removed: [],
          changed: [],
        },
        edges: {
          added: [],
          removed: [
            {
              direction: 'receives',
              from: {
                type: 'service',
                id: 'payment-service',
                version: '2.0.0',
              },
              to: {
                type: 'event',
                id: 'order-created',
                version: '1.0.0',
              },
            },
          ],
        },
        schemaChanges: [],
        impact: [
          {
            message: {
              type: 'event',
              id: 'order-created',
            },
            reason: 'consumer_removed',
            producers: [],
            consumers: [
              {
                type: 'service',
                id: 'payment-service',
                version: '2.0.0',
                owners: ['team-payments'],
              },
            ],
          },
        ],
      });
    });

    it('a pointer to latest is resolved before comparing, so bumping a message version does not churn edges', () => {
      // Given Payments follows latest, and OrderCreated is bumped to 2.0.0 with the same schema
      const paymentOnLatest = service('payment-service', '2.0.0', {
        owners: ['team-payments'],
        receives: [receives('order-created', 'latest')],
      });
      const a = index({ commit: 'abc1234', resources: [ordersService, paymentOnLatest, orderCreated] });
      const b = index({
        commit: 'def5678',
        resources: [
          ordersService,
          paymentOnLatest,
          orderCreated,
          event('order-created', '2.0.0', { owners: ['team-orders'], schemas: [orderCreatedSchema] }),
        ],
      });

      const result = diff(a, b);

      // Then the only thing reported is the version change itself
      expect(result).toEqual({
        schemaVersion: 1,
        refs: {
          a: {
            source: 'acme/catalog',
            commit: 'abc1234',
          },
          b: {
            source: 'acme/catalog',
            commit: 'def5678',
          },
        },
        compatibility: {
          strategy: 'full',
        },
        summary: {
          breaking: false,
          resourcesAdded: 0,
          resourcesRemoved: 0,
          resourcesChanged: 1,
          edgesAdded: 0,
          edgesRemoved: 0,
          schemaChanges: 0,
          schemaBreaking: 0,
          schemaUnknown: 0,
        },
        resources: {
          added: [],
          removed: [],
          changed: [
            {
              type: 'event',
              id: 'order-created',
              version: {
                a: '1.0.0',
                b: '2.0.0',
              },
              fields: ['version'],
            },
          ],
        },
        edges: {
          added: [],
          removed: [],
        },
        schemaChanges: [],
        impact: [],
      });
    });

    it('every direction the SDK resolves is compared, not only sends and receives', () => {
      // Given Orders starts writing to a database and a domain starts containing it
      const ordersDb = resource('container', 'orders-db', '1.0.0', { owners: ['team-orders'] });
      const ordersWriting = service('orders-service', '3.1.0', {
        owners: ['team-orders'],
        sends: [sends('order-created', '1.0.0')],
        writesTo: [{ id: 'orders-db' }],
      });
      const shopping = domain('shopping', '1.0.0', { services: [{ id: 'orders-service', version: '3.1.0' }] });
      const a = index({ commit: 'abc1234', resources: [...catalog, ordersDb] });
      const b = index({ commit: 'def5678', resources: [ordersWriting, paymentService, orderCreated, ordersDb, shopping] });

      const result = diff(a, b);

      expect(result).toEqual({
        schemaVersion: 1,
        refs: {
          a: {
            source: 'acme/catalog',
            commit: 'abc1234',
          },
          b: {
            source: 'acme/catalog',
            commit: 'def5678',
          },
        },
        compatibility: {
          strategy: 'full',
        },
        summary: {
          breaking: false,
          resourcesAdded: 1,
          resourcesRemoved: 0,
          resourcesChanged: 0,
          edgesAdded: 2,
          edgesRemoved: 0,
          schemaChanges: 0,
          schemaBreaking: 0,
          schemaUnknown: 0,
        },
        resources: {
          added: [
            {
              type: 'domain',
              id: 'shopping',
              version: '1.0.0',
            },
          ],
          removed: [],
          changed: [],
        },
        edges: {
          added: [
            {
              direction: 'contains',
              from: {
                type: 'domain',
                id: 'shopping',
                version: '1.0.0',
              },
              to: {
                type: 'service',
                id: 'orders-service',
                version: '3.1.0',
              },
              via: 'services',
            },
            {
              direction: 'writesTo',
              from: {
                type: 'service',
                id: 'orders-service',
                version: '3.1.0',
              },
              to: {
                type: 'container',
                id: 'orders-db',
                version: '1.0.0',
              },
            },
          ],
          removed: [],
        },
        schemaChanges: [],
        impact: [],
      });
    });

    it('an edge to something that is not in the catalog is still reported, without a type', () => {
      // Given Payments starts receiving an event nobody has documented
      const paymentListeningToUnknown = service('payment-service', '2.0.0', {
        owners: ['team-payments'],
        receives: [receives('order-created', '1.0.0'), receives('fraud-flagged', '1.0.0')],
      });
      const a = index({ commit: 'abc1234', resources: catalog });
      const b = index({ commit: 'def5678', resources: [ordersService, paymentListeningToUnknown, orderCreated] });

      const result = diff(a, b);

      expect(result).toEqual({
        schemaVersion: 1,
        refs: {
          a: {
            source: 'acme/catalog',
            commit: 'abc1234',
          },
          b: {
            source: 'acme/catalog',
            commit: 'def5678',
          },
        },
        compatibility: {
          strategy: 'full',
        },
        summary: {
          breaking: false,
          resourcesAdded: 0,
          resourcesRemoved: 0,
          resourcesChanged: 0,
          edgesAdded: 1,
          edgesRemoved: 0,
          schemaChanges: 0,
          schemaBreaking: 0,
          schemaUnknown: 0,
        },
        resources: {
          added: [],
          removed: [],
          changed: [],
        },
        edges: {
          added: [
            {
              direction: 'receives',
              from: {
                type: 'service',
                id: 'payment-service',
                version: '2.0.0',
              },
              to: {
                id: 'fraud-flagged',
              },
            },
          ],
          removed: [],
        },
        schemaChanges: [],
        impact: [],
      });
    });
  });
});
