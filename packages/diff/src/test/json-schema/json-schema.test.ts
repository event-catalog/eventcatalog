import { describe, expect, it } from 'vitest';
import { checkJsonSchemaCompatibility } from '../../json-schema';

/**
 * JSON Schema compatibility scenarios.
 *
 * One file, organised by strategy, every schema written out in full. This is the
 * place to reproduce a user-reported scenario: find the strategy they run, copy the
 * closest test, paste their before and after schema, state the verdict you expect.
 *
 *   backward  a consumer on the NEW schema reads OLD messages   (consumers upgrade first)
 *   forward   a consumer on the OLD schema reads NEW messages   (producers upgrade first)
 *   full      both directions must hold
 *   none      nothing is ever breaking, changes are still reported
 *
 * The one question behind every verdict: does the reader's schema accept everything
 * the writer's schema could have produced?
 *   - a change that makes the schema accept MORE is safe backward, breaking forward
 *   - a change that makes the schema accept LESS is breaking backward, safe forward
 *
 * Schemas use the open content model (unknown properties are accepted), which is
 * the JSON Schema default.
 */

describe('JSON Schema compatibility', () => {
  // ===========================================================================
  // backward: a consumer on the NEW schema must be able to read OLD messages
  // ===========================================================================
  describe('backward: a consumer on the new schema reads old messages', () => {
    describe('properties', () => {
      it('adding an optional property is not breaking, because old messages simply do not have it', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' } },
          required: ['orderId'],
        };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId'],
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          { op: 'add', path: '/properties/customerId', kind: 'property.added', reason: 'property added', breaking: false },
        ]);
      });

      it('adding a required property is breaking, because old messages do not have it and the new consumer insists on it', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' } },
          required: ['orderId'],
        };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId', 'customerId'],
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.direction).toBe('backward');
        expect(result.ops).toEqual([
          { op: 'add', path: '/properties/customerId', kind: 'property.added', reason: 'property added', breaking: false },
          {
            op: 'replace',
            path: '/properties/customerId',
            kind: 'required.added',
            reason: 'property became required',
            breaking: true,
          },
        ]);
      });

      it('adding a required property WITH a default is not breaking, because the new consumer fills the gap with the default', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' } },
          required: ['orderId'],
        };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' }, currency: { type: 'string', default: 'GBP' } },
          required: ['orderId', 'currency'],
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          { op: 'add', path: '/properties/currency', kind: 'property.added', reason: 'property added', breaking: false },
          {
            op: 'replace',
            path: '/properties/currency',
            kind: 'required.added-with-default',
            reason: 'property became required but has a default',
            breaking: false,
          },
        ]);
      });

      it('removing an optional property is not breaking, because old messages may carry it and the open model ignores it', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' }, note: { type: 'string' } },
          required: ['orderId'],
        };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' } },
          required: ['orderId'],
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          { op: 'remove', path: '/properties/note', kind: 'property.removed', reason: 'property removed', breaking: false },
        ]);
      });

      it('removing a required property is not breaking, because old messages carry it and the new consumer no longer cares', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId', 'customerId'],
        };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' } },
          required: ['orderId'],
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
      });

      it('making an optional property required is breaking, because old messages may omit it', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId'],
        };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId', 'customerId'],
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/customerId',
            kind: 'required.added',
            reason: 'property became required',
            breaking: true,
          },
        ]);
      });

      it('making a required property optional is not breaking, because old messages always carry it', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId', 'customerId'],
        };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId'],
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
      });

      it('renaming a required property is breaking, because old messages use the old name and the new consumer requires the new one', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId', 'customerId'],
        };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customer_id: { type: 'string' } },
          required: ['orderId', 'customer_id'],
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          { op: 'remove', path: '/properties/customerId', kind: 'property.removed', reason: 'property removed', breaking: false },
          { op: 'add', path: '/properties/customer_id', kind: 'property.added', reason: 'property added', breaking: false },
          {
            op: 'replace',
            path: '/properties/customer_id',
            kind: 'required.added',
            reason: 'property became required',
            breaking: true,
          },
          {
            op: 'replace',
            path: '/properties/customerId',
            kind: 'required.removed',
            reason: 'property is no longer required',
            breaking: false,
          },
        ]);
      });

      it('making a property required inside a nested object is breaking, and the path says exactly where', () => {
        const before = {
          type: 'object',
          properties: {
            customer: {
              type: 'object',
              properties: { id: { type: 'string' }, email: { type: 'string' } },
              required: ['id'],
            },
          },
          required: ['customer'],
        };
        const after = {
          type: 'object',
          properties: {
            customer: {
              type: 'object',
              properties: { id: { type: 'string' }, email: { type: 'string' } },
              required: ['id', 'email'],
            },
          },
          required: ['customer'],
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/customer/properties/email',
            kind: 'required.added',
            reason: 'property became required',
            breaking: true,
          },
        ]);
      });
    });

    describe('types', () => {
      it('widening integer to number is not breaking, because every old integer is a valid number', () => {
        const before = { type: 'object', properties: { quantity: { type: 'integer' } } };
        const after = { type: 'object', properties: { quantity: { type: 'number' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/quantity/type',
            kind: 'type.widened',
            reason: 'type widened from integer to number',
            breaking: false,
          },
        ]);
      });

      it('narrowing number to integer is breaking, because old messages may carry 2.5', () => {
        const before = { type: 'object', properties: { quantity: { type: 'number' } } };
        const after = { type: 'object', properties: { quantity: { type: 'integer' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/quantity/type',
            kind: 'type.narrowed',
            reason: 'type narrowed from number to integer',
            breaking: true,
          },
        ]);
      });

      it('changing string to number is breaking, because old messages carry strings the new consumer rejects', () => {
        const before = { type: 'object', properties: { orderId: { type: 'string' } } };
        const after = { type: 'object', properties: { orderId: { type: 'number' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/orderId/type',
            kind: 'type.changed',
            reason: 'type changed from string to number',
            breaking: true,
          },
        ]);
      });

      it('making a property nullable is not breaking, because old messages always carry a string', () => {
        const before = { type: 'object', properties: { note: { type: 'string' } } };
        const after = { type: 'object', properties: { note: { type: ['string', 'null'] } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/note/type',
            kind: 'type.widened',
            reason: 'type widened from string to ["string","null"]',
            breaking: false,
          },
        ]);
      });

      it('removing null from a nullable property is breaking, because old messages may carry null', () => {
        const before = { type: 'object', properties: { note: { type: ['string', 'null'] } } };
        const after = { type: 'object', properties: { note: { type: 'string' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/note/type',
            kind: 'type.narrowed',
            reason: 'type narrowed from ["string","null"] to string',
            breaking: true,
          },
        ]);
      });

      it('removing the type entirely is not breaking, because the property now accepts anything', () => {
        const before = { type: 'object', properties: { payload: { type: 'string' } } };
        const after = { type: 'object', properties: { payload: {} } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/payload/type',
            kind: 'type.widened',
            reason: 'type widened from string to any',
            breaking: false,
          },
        ]);
      });

      it('adding a type where there was none is breaking, because old messages could have carried anything', () => {
        const before = { type: 'object', properties: { payload: {} } };
        const after = { type: 'object', properties: { payload: { type: 'string' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/payload/type',
            kind: 'type.narrowed',
            reason: 'type narrowed from any to string',
            breaking: true,
          },
        ]);
      });

      it('changing the root from object to array is breaking', () => {
        const before = { type: 'object', properties: { orderId: { type: 'string' } } };
        const after = { type: 'array', items: { type: 'string' } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          { op: 'replace', path: '/type', kind: 'type.changed', reason: 'type changed from object to array', breaking: true },
          { op: 'remove', path: '/properties/orderId', kind: 'property.removed', reason: 'property removed', breaking: false },
          { op: 'replace', path: '/items', kind: 'schema.restricted', reason: 'schema now accepts fewer values', breaking: true },
        ]);
      });
    });

    describe('enums', () => {
      it('adding an enum value is not breaking, because old messages only ever used the old values', () => {
        const before = { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'paid'] } } };
        const after = { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'paid', 'refunded'] } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          {
            op: 'add',
            path: '/properties/status/enum',
            kind: 'enum.value.added',
            reason: 'enum value refunded added',
            breaking: false,
          },
        ]);
      });

      it('removing an enum value is breaking, because old messages may carry it', () => {
        const before = { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'paid', 'refunded'] } } };
        const after = { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'paid'] } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'remove',
            path: '/properties/status/enum',
            kind: 'enum.value.removed',
            reason: 'enum value refunded removed',
            breaking: true,
          },
        ]);
      });

      it('restricting a free string to an enum is breaking, because old messages may carry any string', () => {
        const before = { type: 'object', properties: { status: { type: 'string' } } };
        const after = { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'paid'] } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'add',
            path: '/properties/status/enum',
            kind: 'enum.added',
            reason: 'values restricted to ["pending","paid"]',
            breaking: true,
          },
        ]);
      });

      it('lifting an enum restriction is not breaking, because every old value is still accepted', () => {
        const before = { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'paid'] } } };
        const after = { type: 'object', properties: { status: { type: 'string' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          {
            op: 'remove',
            path: '/properties/status/enum',
            kind: 'enum.removed',
            reason: 'enum restriction removed',
            breaking: false,
          },
        ]);
      });

      it('changing a const is breaking, because old messages carry the old value', () => {
        const before = { type: 'object', properties: { eventType: { const: 'OrderCreated' } } };
        const after = { type: 'object', properties: { eventType: { const: 'OrderPlaced' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'add',
            path: '/properties/eventType/enum',
            kind: 'enum.value.added',
            reason: 'enum value OrderPlaced added',
            breaking: false,
          },
          {
            op: 'remove',
            path: '/properties/eventType/enum',
            kind: 'enum.value.removed',
            reason: 'enum value OrderCreated removed',
            breaking: true,
          },
        ]);
      });

      it('reordering enum values is not a change at all', () => {
        const before = { type: 'object', properties: { status: { enum: ['pending', 'paid'] } } };
        const after = { type: 'object', properties: { status: { enum: ['paid', 'pending'] } } };

        expect(checkJsonSchemaCompatibility(before, after, 'backward')).toEqual({ breaking: false, direction: null, ops: [] });
      });
    });

    describe('constraints', () => {
      it('raising minLength is breaking, because old messages may carry shorter strings', () => {
        const before = { type: 'object', properties: { sku: { type: 'string', minLength: 1 } } };
        const after = { type: 'object', properties: { sku: { type: 'string', minLength: 3 } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/sku/minLength',
            kind: 'constraint.tightened',
            reason: 'minLength tightened from 1 to 3',
            breaking: true,
          },
        ]);
      });

      it('lowering minLength is not breaking, because every old string still qualifies', () => {
        const before = { type: 'object', properties: { sku: { type: 'string', minLength: 3 } } };
        const after = { type: 'object', properties: { sku: { type: 'string', minLength: 1 } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/sku/minLength',
            kind: 'constraint.loosened',
            reason: 'minLength loosened from 3 to 1',
            breaking: false,
          },
        ]);
      });

      it('adding a minLength where there was none is breaking', () => {
        const before = { type: 'object', properties: { sku: { type: 'string' } } };
        const after = { type: 'object', properties: { sku: { type: 'string', minLength: 3 } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'add',
            path: '/properties/sku/minLength',
            kind: 'constraint.tightened',
            reason: 'minLength added (3)',
            breaking: true,
          },
        ]);
      });

      it('lowering maxLength is breaking, because old messages may carry longer strings', () => {
        const before = { type: 'object', properties: { note: { type: 'string', maxLength: 100 } } };
        const after = { type: 'object', properties: { note: { type: 'string', maxLength: 50 } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/note/maxLength',
            kind: 'constraint.tightened',
            reason: 'maxLength tightened from 100 to 50',
            breaking: true,
          },
        ]);
      });

      it('raising maximum is not breaking, because every old number still fits', () => {
        const before = { type: 'object', properties: { quantity: { type: 'integer', maximum: 100 } } };
        const after = { type: 'object', properties: { quantity: { type: 'integer', maximum: 200 } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/quantity/maximum',
            kind: 'constraint.loosened',
            reason: 'maximum loosened from 100 to 200',
            breaking: false,
          },
        ]);
      });

      it('adding a pattern is breaking, because old messages were never checked against it', () => {
        const before = { type: 'object', properties: { sku: { type: 'string' } } };
        const after = { type: 'object', properties: { sku: { type: 'string', pattern: '^[A-Z]{3}-[0-9]+$' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'add',
            path: '/properties/sku/pattern',
            kind: 'constraint.tightened',
            reason: 'pattern added (^[A-Z]{3}-[0-9]+$)',
            breaking: true,
          },
        ]);
      });

      it('removing a pattern is not breaking', () => {
        const before = { type: 'object', properties: { sku: { type: 'string', pattern: '^[A-Z]{3}-[0-9]+$' } } };
        const after = { type: 'object', properties: { sku: { type: 'string' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          {
            op: 'remove',
            path: '/properties/sku/pattern',
            kind: 'constraint.loosened',
            reason: 'pattern removed',
            breaking: false,
          },
        ]);
      });

      it('changing a pattern is breaking, because we cannot tell whether the new one accepts every old value', () => {
        const before = { type: 'object', properties: { sku: { type: 'string', pattern: '^[A-Z]+$' } } };
        const after = { type: 'object', properties: { sku: { type: 'string', pattern: '^[A-Z0-9]+$' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/sku/pattern',
            kind: 'constraint.changed',
            reason: 'pattern changed from ^[A-Z]+$ to ^[A-Z0-9]+$',
            breaking: true,
          },
        ]);
      });

      it('adding a format is breaking, because old messages were never checked against it', () => {
        const before = { type: 'object', properties: { email: { type: 'string' } } };
        const after = { type: 'object', properties: { email: { type: 'string', format: 'email' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'add',
            path: '/properties/email/format',
            kind: 'constraint.tightened',
            reason: 'format added (email)',
            breaking: true,
          },
        ]);
      });

      it('requiring unique array items is breaking, because old messages may contain duplicates', () => {
        const before = { type: 'object', properties: { tags: { type: 'array', items: { type: 'string' } } } };
        const after = { type: 'object', properties: { tags: { type: 'array', items: { type: 'string' }, uniqueItems: true } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/tags/uniqueItems',
            kind: 'constraint.tightened',
            reason: 'uniqueItems tightened from false to true',
            breaking: true,
          },
        ]);
      });

      it('adding minItems is breaking, because old messages may carry empty arrays', () => {
        const before = { type: 'object', properties: { lines: { type: 'array', items: { type: 'object' } } } };
        const after = { type: 'object', properties: { lines: { type: 'array', items: { type: 'object' }, minItems: 1 } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'add',
            path: '/properties/lines/minItems',
            kind: 'constraint.tightened',
            reason: 'minItems added (1)',
            breaking: true,
          },
        ]);
      });

      it('changing multipleOf is breaking, because we cannot tell whether every old value is still a multiple', () => {
        const before = { type: 'object', properties: { amount: { type: 'number', multipleOf: 0.01 } } };
        const after = { type: 'object', properties: { amount: { type: 'number', multipleOf: 0.05 } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/amount/multipleOf',
            kind: 'constraint.changed',
            reason: 'multipleOf changed from 0.01 to 0.05',
            breaking: true,
          },
        ]);
      });
    });

    describe('closed objects (additionalProperties: false)', () => {
      it('adding an optional property to a closed object is not breaking, because old messages never had it', () => {
        const before = { type: 'object', properties: { orderId: { type: 'string' } }, additionalProperties: false };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          additionalProperties: false,
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          {
            op: 'add',
            path: '/properties/customerId',
            kind: 'property.added-to-closed-object',
            reason: 'property added to a closed object (old readers reject unknown properties)',
            breaking: false,
          },
        ]);
      });

      it('removing a property from a closed object is breaking, because old messages still carry it and the new closed reader rejects it', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' }, note: { type: 'string' } },
          additionalProperties: false,
        };
        const after = { type: 'object', properties: { orderId: { type: 'string' } }, additionalProperties: false };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'remove',
            path: '/properties/note',
            kind: 'property.removed-from-closed-object',
            reason: 'property removed from a closed object (new readers reject old messages that still carry it)',
            breaking: true,
          },
        ]);
      });

      it('removing a property while also opening the object is not breaking, because the new reader now accepts the stray field', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' }, note: { type: 'string' } },
          additionalProperties: false,
        };
        const after = { type: 'object', properties: { orderId: { type: 'string' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          { op: 'remove', path: '/properties/note', kind: 'property.removed', reason: 'property removed', breaking: false },
          {
            op: 'replace',
            path: '/additionalProperties',
            kind: 'additionalProperties.opened',
            reason: 'additional properties are now allowed',
            breaking: false,
          },
        ]);
      });
    });

    describe('additional properties (content model)', () => {
      it('closing an open object with additionalProperties false is breaking, because old messages may carry extra fields', () => {
        const before = { type: 'object', properties: { orderId: { type: 'string' } } };
        const after = { type: 'object', properties: { orderId: { type: 'string' } }, additionalProperties: false };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/additionalProperties',
            kind: 'additionalProperties.closed',
            reason: 'additional properties are no longer allowed',
            breaking: true,
          },
        ]);
      });

      it('opening a closed object is not breaking, because old messages never had extra fields', () => {
        const before = { type: 'object', properties: { orderId: { type: 'string' } }, additionalProperties: false };
        const after = { type: 'object', properties: { orderId: { type: 'string' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/additionalProperties',
            kind: 'additionalProperties.opened',
            reason: 'additional properties are now allowed',
            breaking: false,
          },
        ]);
      });

      it('constraining the type of additional properties is breaking, because old extra fields could have been anything', () => {
        const before = { type: 'object', properties: { orderId: { type: 'string' } } };
        const after = { type: 'object', properties: { orderId: { type: 'string' } }, additionalProperties: { type: 'string' } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/additionalProperties',
            kind: 'schema.restricted',
            reason: 'schema now accepts fewer values',
            breaking: true,
          },
        ]);
      });
    });

    describe('arrays', () => {
      it('narrowing the item type is breaking, and the path points inside items', () => {
        const before = { type: 'object', properties: { amounts: { type: 'array', items: { type: 'number' } } } };
        const after = { type: 'object', properties: { amounts: { type: 'array', items: { type: 'integer' } } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/amounts/items/type',
            kind: 'type.narrowed',
            reason: 'type narrowed from number to integer',
            breaking: true,
          },
        ]);
      });

      it('widening the item type is not breaking', () => {
        const before = { type: 'object', properties: { amounts: { type: 'array', items: { type: 'integer' } } } };
        const after = { type: 'object', properties: { amounts: { type: 'array', items: { type: 'number' } } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
      });

      it('making an item property required is breaking, and the path walks through items', () => {
        const before = {
          type: 'object',
          properties: {
            lines: {
              type: 'array',
              items: { type: 'object', properties: { sku: { type: 'string' }, qty: { type: 'integer' } } },
            },
          },
        };
        const after = {
          type: 'object',
          properties: {
            lines: {
              type: 'array',
              items: { type: 'object', properties: { sku: { type: 'string' }, qty: { type: 'integer' } }, required: ['sku'] },
            },
          },
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/lines/items/properties/sku',
            kind: 'required.added',
            reason: 'property became required',
            breaking: true,
          },
        ]);
      });

      it('constraining a new tuple position (draft-07 items array) is breaking, because old tuples had anything there', () => {
        const before = { type: 'object', properties: { point: { type: 'array', items: [{ type: 'number' }] } } };
        const after = {
          type: 'object',
          properties: { point: { type: 'array', items: [{ type: 'number' }, { type: 'number' }] } },
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'add',
            path: '/properties/point/items/1',
            kind: 'tuple.item.added',
            reason: 'tuple position is now constrained',
            breaking: true,
          },
        ]);
      });

      it('constraining a new tuple position (2020-12 prefixItems) is breaking', () => {
        const before = { type: 'object', properties: { point: { type: 'array', prefixItems: [{ type: 'number' }] } } };
        const after = {
          type: 'object',
          properties: { point: { type: 'array', prefixItems: [{ type: 'number' }, { type: 'number' }] } },
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'add',
            path: '/properties/point/prefixItems/1',
            kind: 'tuple.item.added',
            reason: 'tuple position is now constrained',
            breaking: true,
          },
        ]);
      });

      it('dropping a tuple position is not breaking', () => {
        const before = {
          type: 'object',
          properties: { point: { type: 'array', items: [{ type: 'number' }, { type: 'number' }] } },
        };
        const after = { type: 'object', properties: { point: { type: 'array', items: [{ type: 'number' }] } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          {
            op: 'remove',
            path: '/properties/point/items/1',
            kind: 'tuple.item.removed',
            reason: 'tuple position is no longer constrained',
            breaking: false,
          },
        ]);
      });
    });

    describe('composition (oneOf, anyOf, allOf)', () => {
      it('adding a oneOf branch is not breaking, because every old message matched one of the old branches', () => {
        const before = { oneOf: [{ type: 'string' }, { type: 'number' }] };
        const after = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          { op: 'add', path: '/oneOf/2', kind: 'union.branch.added', reason: 'oneOf branch added', breaking: false },
        ]);
      });

      it('removing a oneOf branch is breaking, because old messages may have matched it', () => {
        const before = { oneOf: [{ type: 'string' }, { type: 'number' }] };
        const after = { oneOf: [{ type: 'string' }] };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          { op: 'remove', path: '/oneOf/1', kind: 'union.branch.removed', reason: 'oneOf branch removed', breaking: true },
        ]);
      });

      it('narrowing a type inside a oneOf branch is breaking, and the path points into that branch', () => {
        const before = {
          type: 'object',
          properties: { payment: { oneOf: [{ type: 'object', properties: { amount: { type: 'number' } } }, { type: 'null' }] } },
        };
        const after = {
          type: 'object',
          properties: { payment: { oneOf: [{ type: 'object', properties: { amount: { type: 'integer' } } }, { type: 'null' }] } },
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/payment/oneOf/0/properties/amount/type',
            kind: 'type.narrowed',
            reason: 'type narrowed from number to integer',
            breaking: true,
          },
        ]);
      });

      it('removing an anyOf branch is breaking', () => {
        const before = { type: 'object', properties: { id: { anyOf: [{ type: 'string' }, { type: 'integer' }] } } };
        const after = { type: 'object', properties: { id: { anyOf: [{ type: 'string' }] } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'remove',
            path: '/properties/id/anyOf/1',
            kind: 'union.branch.removed',
            reason: 'anyOf branch removed',
            breaking: true,
          },
        ]);
      });

      it('wrapping a plain type in a oneOf is breaking, because the value must now match a branch', () => {
        const before = { type: 'object', properties: { id: { type: 'string' } } };
        const after = { type: 'object', properties: { id: { type: 'string', oneOf: [{ minLength: 1 }, { const: 'unknown' }] } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'add',
            path: '/properties/id/oneOf',
            kind: 'constraint.tightened',
            reason: 'oneOf added ([{"minLength":1},{"const":"unknown"}])',
            breaking: true,
          },
        ]);
      });

      it('reordering oneOf branches is not a change', () => {
        const card = {
          type: 'object',
          required: ['method', 'last4'],
          properties: { method: { const: 'card' }, last4: { type: 'string' } },
        };
        const paypal = {
          type: 'object',
          required: ['method', 'payerId'],
          properties: { method: { const: 'paypal' }, payerId: { type: 'string' } },
        };
        const before = { type: 'object', properties: { payment: { oneOf: [card, paypal] } } };
        const after = { type: 'object', properties: { payment: { oneOf: [paypal, card] } } };

        expect(checkJsonSchemaCompatibility(before, after, 'backward')).toEqual({ breaking: false, direction: null, ops: [] });
      });

      it('editing one branch while reordering the others still reports the edit precisely, at its new position', () => {
        const card = {
          type: 'object',
          required: ['method', 'last4'],
          properties: { method: { const: 'card' }, last4: { type: 'string' } },
        };
        const paypal = {
          type: 'object',
          required: ['method', 'payerId'],
          properties: { method: { const: 'paypal' }, payerId: { type: 'string' } },
        };
        const paypalWithEmail = {
          type: 'object',
          required: ['method', 'payerId', 'email'],
          properties: { method: { const: 'paypal' }, payerId: { type: 'string' }, email: { type: 'string' } },
        };
        const before = { type: 'object', properties: { payment: { oneOf: [card, paypal] } } };
        const after = { type: 'object', properties: { payment: { oneOf: [paypalWithEmail, card] } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'add',
            path: '/properties/payment/oneOf/0/properties/email',
            kind: 'property.added',
            reason: 'property added',
            breaking: false,
          },
          {
            op: 'replace',
            path: '/properties/payment/oneOf/0/properties/email',
            kind: 'required.added',
            reason: 'property became required',
            breaking: true,
          },
        ]);
      });

      it('adding an allOf branch is breaking, because it adds a constraint old messages never met', () => {
        const before = { allOf: [{ type: 'object', properties: { id: { type: 'string' } } }] };
        const after = { allOf: [{ type: 'object', properties: { id: { type: 'string' } } }, { required: ['id'] }] };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          { op: 'add', path: '/allOf/1', kind: 'allOf.branch.added', reason: 'allOf branch added', breaking: true },
        ]);
      });

      it('removing an allOf branch is not breaking', () => {
        const before = { allOf: [{ type: 'object', properties: { id: { type: 'string' } } }, { required: ['id'] }] };
        const after = { allOf: [{ type: 'object', properties: { id: { type: 'string' } } }] };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          { op: 'remove', path: '/allOf/1', kind: 'allOf.branch.removed', reason: 'allOf branch removed', breaking: false },
        ]);
      });
    });

    describe('$ref (local definitions)', () => {
      it('a change inside a shared definition is reported once, at the definition, not once per property that uses it', () => {
        const before = {
          type: 'object',
          properties: {
            billingAddress: { $ref: '#/definitions/Address' },
            shippingAddress: { $ref: '#/definitions/Address' },
          },
          definitions: {
            Address: { type: 'object', properties: { street: { type: 'string' } }, required: ['street'] },
          },
        };
        const after = {
          type: 'object',
          properties: {
            billingAddress: { $ref: '#/definitions/Address' },
            shippingAddress: { $ref: '#/definitions/Address' },
          },
          definitions: {
            Address: {
              type: 'object',
              properties: { street: { type: 'string' }, postcode: { type: 'string' } },
              required: ['street', 'postcode'],
            },
          },
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'add',
            path: '/definitions/Address/properties/postcode',
            kind: 'property.added',
            reason: 'property added',
            breaking: false,
          },
          {
            op: 'replace',
            path: '/definitions/Address/properties/postcode',
            kind: 'required.added',
            reason: 'property became required',
            breaking: true,
          },
        ]);
      });

      it('a recursive definition is compared once and terminates', () => {
        const before = {
          type: 'object',
          properties: { root: { $ref: '#/$defs/Node' } },
          $defs: {
            Node: {
              type: 'object',
              properties: { value: { type: 'string' }, children: { type: 'array', items: { $ref: '#/$defs/Node' } } },
            },
          },
        };
        const after = {
          type: 'object',
          properties: { root: { $ref: '#/$defs/Node' } },
          $defs: {
            Node: {
              type: 'object',
              properties: { value: { type: 'number' }, children: { type: 'array', items: { $ref: '#/$defs/Node' } } },
            },
          },
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/$defs/Node/properties/value/type',
            kind: 'type.changed',
            reason: 'type changed from string to number',
            breaking: true,
          },
        ]);
      });

      it('extracting an inline object into a definition with identical content is not a change', () => {
        const before = {
          type: 'object',
          properties: { address: { type: 'object', properties: { street: { type: 'string' } }, required: ['street'] } },
        };
        const after = {
          type: 'object',
          properties: { address: { $ref: '#/definitions/Address' } },
          definitions: { Address: { type: 'object', properties: { street: { type: 'string' } }, required: ['street'] } },
        };

        expect(checkJsonSchemaCompatibility(before, after, 'backward')).toEqual({ breaking: false, direction: null, ops: [] });
      });

      it('a ref that points at another ref is followed to the end', () => {
        const before = {
          type: 'object',
          properties: { address: { $ref: '#/definitions/Address' } },
          definitions: {
            Address: { $ref: '#/definitions/PostalAddress' },
            PostalAddress: { type: 'object', properties: { street: { type: 'string' } } },
          },
        };
        const after = {
          type: 'object',
          properties: { address: { $ref: '#/definitions/Address' } },
          definitions: {
            Address: { $ref: '#/definitions/PostalAddress' },
            PostalAddress: { type: 'object', properties: { street: { type: 'string' } }, required: ['street'] },
          },
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/definitions/Address/properties/street',
            kind: 'required.added',
            reason: 'property became required',
            breaking: true,
          },
        ]);
      });

      it('changing an external $ref is reported as breaking, because we cannot see what it points at', () => {
        const before = { type: 'object', properties: { address: { $ref: './common.json#/Address' } } };
        const after = { type: 'object', properties: { address: { $ref: './common-v2.json#/Address' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/address/$ref',
            kind: 'keyword.changed',
            reason: '$ref changed, compatibility cannot be determined',
            breaking: true,
          },
        ]);
      });

      it('an unchanged external $ref is not a change', () => {
        const before = { type: 'object', properties: { address: { $ref: './common.json#/Address' } } };
        const after = { type: 'object', properties: { address: { $ref: './common.json#/Address' } } };

        expect(checkJsonSchemaCompatibility(before, after, 'backward')).toEqual({ breaking: false, direction: null, ops: [] });
      });

      it('renaming a definition with identical content is not a change', () => {
        const before = {
          type: 'object',
          properties: { address: { $ref: '#/definitions/Addr' } },
          definitions: { Addr: { type: 'object', properties: { street: { type: 'string' } } } },
        };
        const after = {
          type: 'object',
          properties: { address: { $ref: '#/definitions/Address' } },
          definitions: { Address: { type: 'object', properties: { street: { type: 'string' } } } },
        };

        expect(checkJsonSchemaCompatibility(before, after, 'backward')).toEqual({ breaking: false, direction: null, ops: [] });
      });
    });

    describe('boolean schemas', () => {
      it('replacing an accept-anything property (true) with a real schema is breaking', () => {
        const before = { type: 'object', properties: { metadata: true } };
        const after = { type: 'object', properties: { metadata: { type: 'object' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/metadata',
            kind: 'schema.restricted',
            reason: 'schema now accepts fewer values',
            breaking: true,
          },
        ]);
      });

      it('replacing a real schema with accept-anything (true) is not breaking', () => {
        const before = { type: 'object', properties: { metadata: { type: 'object' } } };
        const after = { type: 'object', properties: { metadata: true } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/metadata',
            kind: 'schema.relaxed',
            reason: 'schema now accepts more values',
            breaking: false,
          },
        ]);
      });
    });

    describe('keywords we cannot reason about', () => {
      it('changing patternProperties is reported as breaking, because we refuse to call it safe without understanding it', () => {
        const before = { type: 'object', properties: { orderId: { type: 'string' } } };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' } },
          patternProperties: { '^x-': { type: 'string' } },
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'add',
            path: '/patternProperties',
            kind: 'keyword.changed',
            reason: 'patternProperties changed, compatibility cannot be determined',
            breaking: true,
          },
        ]);
      });

      it('adding an if/then is reported as breaking for the same reason', () => {
        const before = { type: 'object', properties: { country: { type: 'string' }, postcode: { type: 'string' } } };
        const after = {
          type: 'object',
          properties: { country: { type: 'string' }, postcode: { type: 'string' } },
          if: { properties: { country: { const: 'UK' } } },
          then: { required: ['postcode'] },
        };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(true);
        expect(result.ops.map((op) => op.kind)).toEqual(['keyword.changed', 'keyword.changed']);
        expect(result.ops.map((op) => op.path)).toEqual(['/if', '/then']);
      });
    });

    describe('changes that are never breaking', () => {
      it('marking a property deprecated is reported so a UI can show it, but is not breaking', () => {
        const before = { type: 'object', properties: { legacyId: { type: 'string' } } };
        const after = { type: 'object', properties: { legacyId: { type: 'string', deprecated: true } } };

        const result = checkJsonSchemaCompatibility(before, after, 'backward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/legacyId',
            kind: 'schema.deprecated',
            reason: 'marked as deprecated',
            breaking: false,
          },
        ]);
      });

      it('changing only title, description, examples or $comment produces no ops at all', () => {
        const before = {
          title: 'Order Created',
          description: 'Raised when an order is placed',
          type: 'object',
          properties: { orderId: { type: 'string', description: 'The order id', examples: ['ord_1'] } },
          required: ['orderId'],
        };
        const after = {
          title: 'OrderCreated',
          description: 'Raised when a customer places an order',
          $comment: 'owned by team-orders',
          type: 'object',
          properties: { orderId: { type: 'string', description: 'Unique order identifier', examples: ['ord_123'] } },
          required: ['orderId'],
        };

        expect(checkJsonSchemaCompatibility(before, after, 'backward')).toEqual({ breaking: false, direction: null, ops: [] });
      });

      it('reordering properties and required entries is not a change', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId', 'customerId'],
        };
        const after = {
          type: 'object',
          properties: { customerId: { type: 'string' }, orderId: { type: 'string' } },
          required: ['customerId', 'orderId'],
        };

        expect(checkJsonSchemaCompatibility(before, after, 'backward')).toEqual({ breaking: false, direction: null, ops: [] });
      });
    });
  });

  // ===========================================================================
  // forward: a consumer on the OLD schema must be able to read NEW messages
  // Every verdict here is the mirror of the backward one above.
  // ===========================================================================
  describe('forward: a consumer on the old schema reads new messages', () => {
    describe('properties', () => {
      it('adding an optional property is not breaking, because the old consumer ignores properties it does not know', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' } },
          required: ['orderId'],
        };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId'],
        };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(false);
      });

      it('adding a required property is not breaking, because the old consumer still ignores it', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' } },
          required: ['orderId'],
        };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId', 'customerId'],
        };

        const result = checkJsonSchemaCompatibility(before, after, 'forward');

        expect(result.breaking).toBe(false);
        expect(result.ops).toEqual([
          { op: 'add', path: '/properties/customerId', kind: 'property.added', reason: 'property added', breaking: false },
          {
            op: 'replace',
            path: '/properties/customerId',
            kind: 'required.added',
            reason: 'property became required',
            breaking: false,
          },
        ]);
      });

      it('removing an optional property is not breaking, because the old consumer never relied on it being there', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' }, note: { type: 'string' } },
          required: ['orderId'],
        };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' } },
          required: ['orderId'],
        };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(false);
      });

      it('removing a required property is breaking, because new messages no longer carry a field the old consumer insists on', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId', 'customerId'],
        };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' } },
          required: ['orderId'],
        };

        const result = checkJsonSchemaCompatibility(before, after, 'forward');

        expect(result.breaking).toBe(true);
        expect(result.direction).toBe('forward');
        expect(result.ops).toEqual([
          { op: 'remove', path: '/properties/customerId', kind: 'property.removed', reason: 'property removed', breaking: false },
          {
            op: 'replace',
            path: '/properties/customerId',
            kind: 'required.removed',
            reason: 'property is no longer required',
            breaking: true,
          },
        ]);
      });

      it('making an optional property required is not breaking, because new messages always carry it', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId'],
        };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId', 'customerId'],
        };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(false);
      });

      it('making a required property optional is breaking, because new messages may omit a field the old consumer insists on', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId', 'customerId'],
        };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId'],
        };

        const result = checkJsonSchemaCompatibility(before, after, 'forward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/customerId',
            kind: 'required.removed',
            reason: 'property is no longer required',
            breaking: true,
          },
        ]);
      });

      it('renaming a required property is breaking, because new messages no longer carry the old name', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          required: ['orderId', 'customerId'],
        };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customer_id: { type: 'string' } },
          required: ['orderId', 'customer_id'],
        };

        const result = checkJsonSchemaCompatibility(before, after, 'forward');

        expect(result.breaking).toBe(true);
        expect(result.ops.filter((op) => op.breaking)).toEqual([
          {
            op: 'replace',
            path: '/properties/customerId',
            kind: 'required.removed',
            reason: 'property is no longer required',
            breaking: true,
          },
        ]);
      });

      it('removing a required property from a nested object is breaking', () => {
        const before = {
          type: 'object',
          properties: {
            customer: {
              type: 'object',
              properties: { id: { type: 'string' }, email: { type: 'string' } },
              required: ['id', 'email'],
            },
          },
          required: ['customer'],
        };
        const after = {
          type: 'object',
          properties: {
            customer: {
              type: 'object',
              properties: { id: { type: 'string' } },
              required: ['id'],
            },
          },
          required: ['customer'],
        };

        const result = checkJsonSchemaCompatibility(before, after, 'forward');

        expect(result.breaking).toBe(true);
        expect(result.ops.filter((op) => op.breaking)).toEqual([
          {
            op: 'replace',
            path: '/properties/customer/properties/email',
            kind: 'required.removed',
            reason: 'property is no longer required',
            breaking: true,
          },
        ]);
      });
    });

    describe('types', () => {
      it('widening integer to number is breaking, because new messages may carry 2.5 and the old consumer expects integers', () => {
        const before = { type: 'object', properties: { quantity: { type: 'integer' } } };
        const after = { type: 'object', properties: { quantity: { type: 'number' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'forward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/quantity/type',
            kind: 'type.widened',
            reason: 'type widened from integer to number',
            breaking: true,
          },
        ]);
      });

      it('narrowing number to integer is not breaking, because every new integer is a valid number', () => {
        const before = { type: 'object', properties: { quantity: { type: 'number' } } };
        const after = { type: 'object', properties: { quantity: { type: 'integer' } } };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(false);
      });

      it('changing string to number is breaking', () => {
        const before = { type: 'object', properties: { orderId: { type: 'string' } } };
        const after = { type: 'object', properties: { orderId: { type: 'number' } } };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(true);
      });

      it('making a property nullable is breaking, because new messages may carry null and the old consumer expects a string', () => {
        const before = { type: 'object', properties: { note: { type: 'string' } } };
        const after = { type: 'object', properties: { note: { type: ['string', 'null'] } } };

        const result = checkJsonSchemaCompatibility(before, after, 'forward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/note/type',
            kind: 'type.widened',
            reason: 'type widened from string to ["string","null"]',
            breaking: true,
          },
        ]);
      });

      it('removing null from a nullable property is not breaking', () => {
        const before = { type: 'object', properties: { note: { type: ['string', 'null'] } } };
        const after = { type: 'object', properties: { note: { type: 'string' } } };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(false);
      });

      it('removing the type entirely is breaking, because new messages may carry anything', () => {
        const before = { type: 'object', properties: { payload: { type: 'string' } } };
        const after = { type: 'object', properties: { payload: {} } };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(true);
      });
    });

    describe('enums', () => {
      it('adding an enum value is breaking, because new messages may carry a value the old consumer has never seen', () => {
        const before = { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'paid'] } } };
        const after = { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'paid', 'refunded'] } } };

        const result = checkJsonSchemaCompatibility(before, after, 'forward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'add',
            path: '/properties/status/enum',
            kind: 'enum.value.added',
            reason: 'enum value refunded added',
            breaking: true,
          },
        ]);
      });

      it('removing an enum value is not breaking, because new messages only use values the old consumer knows', () => {
        const before = { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'paid', 'refunded'] } } };
        const after = { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'paid'] } } };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(false);
      });

      it('restricting a free string to an enum is not breaking', () => {
        const before = { type: 'object', properties: { status: { type: 'string' } } };
        const after = { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'paid'] } } };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(false);
      });

      it('lifting an enum restriction is breaking, because new messages may carry any string', () => {
        const before = { type: 'object', properties: { status: { type: 'string', enum: ['pending', 'paid'] } } };
        const after = { type: 'object', properties: { status: { type: 'string' } } };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(true);
      });
    });

    describe('constraints', () => {
      it('raising minLength is not breaking, because every new string still satisfies the old bound', () => {
        const before = { type: 'object', properties: { sku: { type: 'string', minLength: 1 } } };
        const after = { type: 'object', properties: { sku: { type: 'string', minLength: 3 } } };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(false);
      });

      it('lowering minLength is breaking, because new messages may carry strings the old consumer rejects', () => {
        const before = { type: 'object', properties: { sku: { type: 'string', minLength: 3 } } };
        const after = { type: 'object', properties: { sku: { type: 'string', minLength: 1 } } };

        const result = checkJsonSchemaCompatibility(before, after, 'forward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/sku/minLength',
            kind: 'constraint.loosened',
            reason: 'minLength loosened from 3 to 1',
            breaking: true,
          },
        ]);
      });

      it('raising maximum is breaking, because new messages may carry numbers above the old bound', () => {
        const before = { type: 'object', properties: { quantity: { type: 'integer', maximum: 100 } } };
        const after = { type: 'object', properties: { quantity: { type: 'integer', maximum: 200 } } };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(true);
      });

      it('removing a pattern is breaking, because new messages are no longer held to it', () => {
        const before = { type: 'object', properties: { sku: { type: 'string', pattern: '^[A-Z]{3}-[0-9]+$' } } };
        const after = { type: 'object', properties: { sku: { type: 'string' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'forward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'remove',
            path: '/properties/sku/pattern',
            kind: 'constraint.loosened',
            reason: 'pattern removed',
            breaking: true,
          },
        ]);
      });

      it('adding a pattern is not breaking', () => {
        const before = { type: 'object', properties: { sku: { type: 'string' } } };
        const after = { type: 'object', properties: { sku: { type: 'string', pattern: '^[A-Z]{3}-[0-9]+$' } } };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(false);
      });

      it('changing a pattern is breaking, because we cannot tell whether the old one accepts every new value', () => {
        const before = { type: 'object', properties: { sku: { type: 'string', pattern: '^[A-Z]+$' } } };
        const after = { type: 'object', properties: { sku: { type: 'string', pattern: '^[A-Z0-9]+$' } } };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(true);
      });

      it('dropping uniqueItems is breaking, because new messages may contain duplicates', () => {
        const before = { type: 'object', properties: { tags: { type: 'array', items: { type: 'string' }, uniqueItems: true } } };
        const after = { type: 'object', properties: { tags: { type: 'array', items: { type: 'string' } } } };

        const result = checkJsonSchemaCompatibility(before, after, 'forward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/tags/uniqueItems',
            kind: 'constraint.loosened',
            reason: 'uniqueItems loosened from true to false',
            breaking: true,
          },
        ]);
      });
    });

    describe('closed objects (additionalProperties: false)', () => {
      it('adding an optional property to a closed object IS breaking, because the old closed reader rejects the unknown field', () => {
        const before = { type: 'object', properties: { orderId: { type: 'string' } }, additionalProperties: false };
        const after = {
          type: 'object',
          properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
          additionalProperties: false,
        };

        const result = checkJsonSchemaCompatibility(before, after, 'forward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'add',
            path: '/properties/customerId',
            kind: 'property.added-to-closed-object',
            reason: 'property added to a closed object (old readers reject unknown properties)',
            breaking: true,
          },
        ]);
      });

      it('removing an optional property from a closed object is not breaking, because new messages simply lack it', () => {
        const before = {
          type: 'object',
          properties: { orderId: { type: 'string' }, note: { type: 'string' } },
          additionalProperties: false,
        };
        const after = { type: 'object', properties: { orderId: { type: 'string' } }, additionalProperties: false };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(false);
      });
    });

    describe('additional properties (content model)', () => {
      it('closing an open object is not breaking, because new messages carry fewer surprises', () => {
        const before = { type: 'object', properties: { orderId: { type: 'string' } } };
        const after = { type: 'object', properties: { orderId: { type: 'string' } }, additionalProperties: false };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(false);
      });

      it('opening a closed object is breaking, because new messages may carry fields the old consumer rejects', () => {
        const before = { type: 'object', properties: { orderId: { type: 'string' } }, additionalProperties: false };
        const after = { type: 'object', properties: { orderId: { type: 'string' } } };

        const result = checkJsonSchemaCompatibility(before, after, 'forward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/additionalProperties',
            kind: 'additionalProperties.opened',
            reason: 'additional properties are now allowed',
            breaking: true,
          },
        ]);
      });
    });

    describe('arrays', () => {
      it('widening the item type is breaking', () => {
        const before = { type: 'object', properties: { amounts: { type: 'array', items: { type: 'integer' } } } };
        const after = { type: 'object', properties: { amounts: { type: 'array', items: { type: 'number' } } } };

        const result = checkJsonSchemaCompatibility(before, after, 'forward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'replace',
            path: '/properties/amounts/items/type',
            kind: 'type.widened',
            reason: 'type widened from integer to number',
            breaking: true,
          },
        ]);
      });

      it('narrowing the item type is not breaking', () => {
        const before = { type: 'object', properties: { amounts: { type: 'array', items: { type: 'number' } } } };
        const after = { type: 'object', properties: { amounts: { type: 'array', items: { type: 'integer' } } } };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(false);
      });

      it('dropping a tuple position is breaking, because new messages may carry anything there', () => {
        const before = {
          type: 'object',
          properties: { point: { type: 'array', items: [{ type: 'number' }, { type: 'number' }] } },
        };
        const after = { type: 'object', properties: { point: { type: 'array', items: [{ type: 'number' }] } } };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(true);
      });
    });

    describe('composition (oneOf, anyOf, allOf)', () => {
      it('adding a oneOf branch is breaking, because new messages may match a shape the old consumer has never seen', () => {
        const before = { oneOf: [{ type: 'string' }, { type: 'number' }] };
        const after = { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] };

        const result = checkJsonSchemaCompatibility(before, after, 'forward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          { op: 'add', path: '/oneOf/2', kind: 'union.branch.added', reason: 'oneOf branch added', breaking: true },
        ]);
      });

      it('removing a oneOf branch is not breaking', () => {
        const before = { oneOf: [{ type: 'string' }, { type: 'number' }] };
        const after = { oneOf: [{ type: 'string' }] };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(false);
      });

      it('adding an allOf branch is not breaking, because new messages satisfy more constraints, not fewer', () => {
        const before = { allOf: [{ type: 'object', properties: { id: { type: 'string' } } }] };
        const after = { allOf: [{ type: 'object', properties: { id: { type: 'string' } } }, { required: ['id'] }] };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(false);
      });

      it('removing an allOf branch is breaking', () => {
        const before = { allOf: [{ type: 'object', properties: { id: { type: 'string' } } }, { required: ['id'] }] };
        const after = { allOf: [{ type: 'object', properties: { id: { type: 'string' } } }] };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(true);
      });
    });

    describe('boolean schemas', () => {
      it('replacing a real schema with accept-anything (true) is breaking, because new messages may carry anything', () => {
        const before = { type: 'object', properties: { metadata: { type: 'object' } } };
        const after = { type: 'object', properties: { metadata: true } };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(true);
      });

      it('replacing accept-anything (true) with a real schema is not breaking', () => {
        const before = { type: 'object', properties: { metadata: true } };
        const after = { type: 'object', properties: { metadata: { type: 'object' } } };

        expect(checkJsonSchemaCompatibility(before, after, 'forward').breaking).toBe(false);
      });
    });

    describe('keywords we cannot reason about', () => {
      it('changing patternProperties is reported as breaking here too', () => {
        const before = { type: 'object', patternProperties: { '^x-': { type: 'string' } } };
        const after = { type: 'object' };

        const result = checkJsonSchemaCompatibility(before, after, 'forward');

        expect(result.breaking).toBe(true);
        expect(result.ops).toEqual([
          {
            op: 'remove',
            path: '/patternProperties',
            kind: 'keyword.changed',
            reason: 'patternProperties changed, compatibility cannot be determined',
            breaking: true,
          },
        ]);
      });
    });
  });

  // ===========================================================================
  // full: both directions must hold
  // ===========================================================================
  describe('full: both directions must hold', () => {
    it('adding an optional property is not breaking, because neither direction cares', () => {
      const before = { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] };
      const after = {
        type: 'object',
        properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
        required: ['orderId'],
      };

      expect(checkJsonSchemaCompatibility(before, after, 'full')).toEqual({
        breaking: false,
        direction: null,
        ops: [{ op: 'add', path: '/properties/customerId', kind: 'property.added', reason: 'property added', breaking: false }],
      });
    });

    it('adding a required property with a default is not breaking, because neither direction cares', () => {
      const before = { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] };
      const after = {
        type: 'object',
        properties: { orderId: { type: 'string' }, currency: { type: 'string', default: 'GBP' } },
        required: ['orderId', 'currency'],
      };

      expect(checkJsonSchemaCompatibility(before, after, 'full').breaking).toBe(false);
    });

    it('adding a required property is breaking in the backward direction only', () => {
      const before = { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] };
      const after = {
        type: 'object',
        properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
        required: ['orderId', 'customerId'],
      };

      const result = checkJsonSchemaCompatibility(before, after, 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('backward');
    });

    it('removing a required property is breaking in the forward direction only', () => {
      const before = {
        type: 'object',
        properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
        required: ['orderId', 'customerId'],
      };
      const after = { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] };

      const result = checkJsonSchemaCompatibility(before, after, 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('forward');
    });

    it('widening a type is breaking in the forward direction only', () => {
      const before = { type: 'object', properties: { quantity: { type: 'integer' } } };
      const after = { type: 'object', properties: { quantity: { type: 'number' } } };

      const result = checkJsonSchemaCompatibility(before, after, 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('forward');
    });

    it('changing a type outright breaks both directions', () => {
      const before = { type: 'object', properties: { orderId: { type: 'string' } } };
      const after = { type: 'object', properties: { orderId: { type: 'number' } } };

      const result = checkJsonSchemaCompatibility(before, after, 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('both');
    });

    it('changing a const breaks both directions: the old value is gone (backward) and a new value appears (forward)', () => {
      const before = { type: 'object', properties: { eventType: { const: 'OrderCreated' } } };
      const after = { type: 'object', properties: { eventType: { const: 'OrderPlaced' } } };

      const result = checkJsonSchemaCompatibility(before, after, 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('both');
      expect(result.ops).toEqual([
        {
          op: 'add',
          path: '/properties/eventType/enum',
          kind: 'enum.value.added',
          reason: 'enum value OrderPlaced added',
          breaking: true,
        },
        {
          op: 'remove',
          path: '/properties/eventType/enum',
          kind: 'enum.value.removed',
          reason: 'enum value OrderCreated removed',
          breaking: true,
        },
      ]);
    });

    it('renaming a required property breaks both directions', () => {
      const before = {
        type: 'object',
        properties: { orderId: { type: 'string' }, customerId: { type: 'string' } },
        required: ['orderId', 'customerId'],
      };
      const after = {
        type: 'object',
        properties: { orderId: { type: 'string' }, customer_id: { type: 'string' } },
        required: ['orderId', 'customer_id'],
      };

      const result = checkJsonSchemaCompatibility(before, after, 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('both');
    });

    it('changing a pattern breaks both directions, because neither side can be trusted to accept the other', () => {
      const before = { type: 'object', properties: { sku: { type: 'string', pattern: '^[A-Z]+$' } } };
      const after = { type: 'object', properties: { sku: { type: 'string', pattern: '^[A-Z0-9]+$' } } };

      const result = checkJsonSchemaCompatibility(before, after, 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('both');
    });

    it('a keyword we cannot reason about breaks both directions', () => {
      const before = { type: 'object' };
      const after = { type: 'object', propertyNames: { pattern: '^[a-z]+$' } };

      const result = checkJsonSchemaCompatibility(before, after, 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('both');
    });

    it('a realistic event evolution: optional field added, description updated, enum value added, is breaking forward only', () => {
      const before = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        title: 'OrderCreated',
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'paid'] },
          lines: {
            type: 'array',
            items: {
              type: 'object',
              properties: { sku: { type: 'string' }, qty: { type: 'integer' } },
              required: ['sku', 'qty'],
            },
          },
        },
        required: ['orderId', 'status', 'lines'],
      };
      const after = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        title: 'OrderCreated',
        description: 'Raised when a customer completes checkout',
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'paid', 'refunded'] },
          lines: {
            type: 'array',
            items: {
              type: 'object',
              properties: { sku: { type: 'string' }, qty: { type: 'integer' }, unitPrice: { type: 'number' } },
              required: ['sku', 'qty'],
            },
          },
          placedAt: { type: 'string', format: 'date-time' },
        },
        required: ['orderId', 'status', 'lines'],
      };

      const result = checkJsonSchemaCompatibility(before, after, 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('forward');
      expect(result.ops).toEqual([
        {
          op: 'add',
          path: '/properties/status/enum',
          kind: 'enum.value.added',
          reason: 'enum value refunded added',
          breaking: true,
        },
        {
          op: 'add',
          path: '/properties/lines/items/properties/unitPrice',
          kind: 'property.added',
          reason: 'property added',
          breaking: false,
        },
        { op: 'add', path: '/properties/placedAt', kind: 'property.added', reason: 'property added', breaking: false },
      ]);
    });
  });

  // ===========================================================================
  // none: nothing is breaking, but every change is still reported
  // ===========================================================================
  describe('none: compatibility is not checked', () => {
    it('is not breaking even when a type changes outright, but the change is still reported', () => {
      const before = { type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] };
      const after = { type: 'object', properties: { orderId: { type: 'number' } }, required: ['orderId'] };

      expect(checkJsonSchemaCompatibility(before, after, 'none')).toEqual({
        breaking: false,
        direction: null,
        ops: [
          {
            op: 'replace',
            path: '/properties/orderId/type',
            kind: 'type.changed',
            reason: 'type changed from string to number',
            breaking: false,
          },
        ],
      });
    });
  });

  // ===========================================================================
  // complex and deeply nested schemas
  // Real event schemas are big. These check that a single change buried several
  // levels down is found, reported once, with a path that leads straight to it,
  // and that everything around it is left alone.
  // ===========================================================================
  describe('complex and deeply nested schemas', () => {
    /**
     * A realistic OrderCreated: customer with addresses and geo, order lines with
     * product variants, a payment union, shipment tracking events, free metadata.
     * Typed loosely so tests can mutate any node to describe a change.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type LooseSchema = { [keyword: string]: any };
    const orderCreated = (): LooseSchema => ({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://acme.example/schemas/order-created.json',
      title: 'OrderCreated',
      type: 'object',
      additionalProperties: false,
      required: ['orderId', 'customer', 'lines', 'payment', 'placedAt'],
      properties: {
        orderId: { type: 'string', pattern: '^ord_[a-z0-9]+$' },
        placedAt: { type: 'string', format: 'date-time' },
        currency: { type: 'string', enum: ['GBP', 'EUR', 'USD'], default: 'GBP' },
        customer: {
          type: 'object',
          required: ['id', 'email'],
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: {
              type: 'object',
              properties: { first: { type: 'string' }, last: { type: 'string' } },
              required: ['first', 'last'],
            },
            addresses: {
              type: 'array',
              minItems: 1,
              items: { $ref: '#/$defs/Address' },
            },
          },
        },
        lines: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['sku', 'quantity', 'product'],
            properties: {
              sku: { type: 'string' },
              quantity: { type: 'integer', minimum: 1 },
              unitPrice: { $ref: '#/$defs/Money' },
              product: {
                type: 'object',
                required: ['id', 'variant'],
                properties: {
                  id: { type: 'string' },
                  variant: {
                    oneOf: [
                      {
                        type: 'object',
                        required: ['kind', 'size'],
                        properties: { kind: { const: 'apparel' }, size: { enum: ['S', 'M', 'L'] }, colour: { type: 'string' } },
                      },
                      {
                        type: 'object',
                        required: ['kind', 'weightGrams'],
                        properties: { kind: { const: 'grocery' }, weightGrams: { type: 'integer', minimum: 1 } },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        payment: {
          oneOf: [
            {
              type: 'object',
              required: ['method', 'last4'],
              properties: { method: { const: 'card' }, last4: { type: 'string', pattern: '^[0-9]{4}$' } },
            },
            {
              type: 'object',
              required: ['method', 'payerId'],
              properties: { method: { const: 'paypal' }, payerId: { type: 'string' } },
            },
          ],
        },
        shipments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              carrier: { type: 'string' },
              events: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['status', 'at'],
                  properties: {
                    status: { enum: ['dispatched', 'in_transit', 'delivered'] },
                    at: { type: 'string', format: 'date-time' },
                    location: { $ref: '#/$defs/GeoPoint' },
                  },
                },
              },
            },
          },
        },
        metadata: { type: 'object', additionalProperties: { type: 'string' } },
      },
      $defs: {
        Money: {
          type: 'object',
          required: ['amount', 'currency'],
          properties: { amount: { type: 'number', multipleOf: 0.01 }, currency: { type: 'string', enum: ['GBP', 'EUR', 'USD'] } },
        },
        GeoPoint: {
          type: 'object',
          required: ['lat', 'lng'],
          properties: {
            lat: { type: 'number', minimum: -90, maximum: 90 },
            lng: { type: 'number', minimum: -180, maximum: 180 },
          },
        },
        Address: {
          type: 'object',
          required: ['line1', 'postcode', 'country'],
          properties: {
            line1: { type: 'string' },
            line2: { type: 'string' },
            postcode: { type: 'string' },
            country: { type: 'string', minLength: 2, maxLength: 2 },
            geo: { $ref: '#/$defs/GeoPoint' },
          },
        },
      },
    });

    it('an identical complex schema reports nothing', () => {
      expect(checkJsonSchemaCompatibility(orderCreated(), orderCreated(), 'full')).toEqual({
        breaking: false,
        direction: null,
        ops: [],
      });
    });

    it('a single change six levels deep is found, reported once, and nothing else is touched', () => {
      // Given the apparel variant size enum, inside lines > items > product > variant > oneOf[0], gains XL
      const before = orderCreated();
      const after = orderCreated();
      after.properties.lines.items.properties.product.properties.variant.oneOf[0]!.properties.size = {
        enum: ['S', 'M', 'L', 'XL'],
      };

      const result = checkJsonSchemaCompatibility(before, after, 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('forward');
      expect(result.ops).toEqual([
        {
          op: 'add',
          path: '/properties/lines/items/properties/product/properties/variant/oneOf/0/properties/size/enum',
          kind: 'enum.value.added',
          reason: 'enum value XL added',
          breaking: true,
        },
      ]);
    });

    it('a change in a definition reached through two levels of $ref is reported once, at the inner definition', () => {
      // Given GeoPoint is used directly by shipment events and indirectly via Address > geo, and its bounds loosen
      const before = orderCreated();
      const after = orderCreated();
      after.$defs.GeoPoint.properties.lat = { type: 'number' };

      const result = checkJsonSchemaCompatibility(before, after, 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('forward');
      expect(result.ops).toEqual([
        {
          op: 'remove',
          path: '/$defs/GeoPoint/properties/lat/minimum',
          kind: 'constraint.loosened',
          reason: 'minimum removed',
          breaking: true,
        },
        {
          op: 'remove',
          path: '/$defs/GeoPoint/properties/lat/maximum',
          kind: 'constraint.loosened',
          reason: 'maximum removed',
          breaking: true,
        },
      ]);
    });

    it('a required property added to a definition used inside an array inside a nested object is found', () => {
      // Given Address (used by customer > addresses > items) gains a required city
      const before = orderCreated();
      const after = orderCreated();
      after.$defs.Address.properties = { ...after.$defs.Address.properties, city: { type: 'string' } };
      after.$defs.Address.required = ['line1', 'postcode', 'country', 'city'];

      const result = checkJsonSchemaCompatibility(before, after, 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('backward');
      expect(result.ops).toEqual([
        { op: 'add', path: '/$defs/Address/properties/city', kind: 'property.added', reason: 'property added', breaking: false },
        {
          op: 'replace',
          path: '/$defs/Address/properties/city',
          kind: 'required.added',
          reason: 'property became required',
          breaking: true,
        },
      ]);
    });

    it('a new payment method (oneOf branch) plus a tightened card pattern are both found at their own depth', () => {
      const before = orderCreated();
      const after = orderCreated();
      after.properties.payment.oneOf = [
        {
          type: 'object',
          required: ['method', 'last4'],
          properties: { method: { const: 'card' }, last4: { type: 'string', pattern: '^[0-9]{4}$' } },
        },
        {
          type: 'object',
          required: ['method', 'payerId'],
          properties: { method: { const: 'paypal' }, payerId: { type: 'string' } },
        },
        {
          type: 'object',
          required: ['method', 'walletId'],
          properties: { method: { const: 'apple_pay' }, walletId: { type: 'string' } },
        },
      ];

      const result = checkJsonSchemaCompatibility(before, after, 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('forward');
      expect(result.ops).toEqual([
        {
          op: 'add',
          path: '/properties/payment/oneOf/2',
          kind: 'union.branch.added',
          reason: 'oneOf branch added',
          breaking: true,
        },
      ]);
    });

    it('several changes at different depths are all reported, and the directions combine to both', () => {
      const before = orderCreated();
      const after = orderCreated();
      // 1. root: currency becomes required (has a default, so safe)
      after.required = ['orderId', 'customer', 'lines', 'payment', 'placedAt', 'currency'];
      // 2. customer.name.last is no longer required (breaks forward)
      after.properties.customer.properties.name.required = ['first'];
      // 3. lines.items.quantity minimum raised (breaks backward)
      after.properties.lines.items.properties.quantity = { type: 'integer', minimum: 2 };
      // 4. shipments.items.events.items.status loses a value (breaks backward)
      after.properties.shipments.items.properties.events.items.properties.status = { enum: ['dispatched', 'delivered'] };
      // 5. metadata values can now be anything (breaks forward)
      after.properties.metadata = { type: 'object', additionalProperties: true };
      // 6. Money.amount loses multipleOf (breaks forward)
      after.$defs.Money.properties.amount = { type: 'number' };

      const result = checkJsonSchemaCompatibility(before, after, 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('both');
      expect(result.ops).toEqual([
        {
          op: 'replace',
          path: '/properties/customer/properties/name/properties/last',
          kind: 'required.removed',
          reason: 'property is no longer required',
          breaking: true,
        },
        {
          op: 'replace',
          path: '/properties/lines/items/properties/quantity/minimum',
          kind: 'constraint.tightened',
          reason: 'minimum tightened from 1 to 2',
          breaking: true,
        },
        {
          op: 'remove',
          path: '/$defs/Money/properties/amount/multipleOf',
          kind: 'constraint.loosened',
          reason: 'multipleOf removed',
          breaking: true,
        },
        {
          op: 'remove',
          path: '/properties/shipments/items/properties/events/items/properties/status/enum',
          kind: 'enum.value.removed',
          reason: 'enum value in_transit removed',
          breaking: true,
        },
        {
          op: 'replace',
          path: '/properties/metadata/additionalProperties',
          kind: 'schema.relaxed',
          reason: 'schema now accepts more values',
          breaking: true,
        },
        {
          op: 'replace',
          path: '/properties/currency',
          kind: 'required.added-with-default',
          reason: 'property became required but has a default',
          breaking: false,
        },
      ]);
    });

    it('an array of arrays: changing the inner item type is found at items/items', () => {
      const before = {
        type: 'object',
        properties: { matrix: { type: 'array', items: { type: 'array', items: { type: 'integer' } } } },
      };
      const after = {
        type: 'object',
        properties: { matrix: { type: 'array', items: { type: 'array', items: { type: 'number' } } } },
      };

      const result = checkJsonSchemaCompatibility(before, after, 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('forward');
      expect(result.ops).toEqual([
        {
          op: 'replace',
          path: '/properties/matrix/items/items/type',
          kind: 'type.widened',
          reason: 'type widened from integer to number',
          breaking: true,
        },
      ]);
    });

    it('a definition that references a definition that references itself terminates and reports the one real change', () => {
      const tree = (leafType: string) => ({
        type: 'object',
        properties: { root: { $ref: '#/$defs/Category' } },
        $defs: {
          Category: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string' },
              products: { type: 'array', items: { $ref: '#/$defs/Product' } },
              children: { type: 'array', items: { $ref: '#/$defs/Category' } },
            },
          },
          Product: {
            type: 'object',
            properties: { sku: { type: leafType }, category: { $ref: '#/$defs/Category' } },
          },
        },
      });

      const result = checkJsonSchemaCompatibility(tree('string'), tree('integer'), 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('both');
      expect(result.ops).toEqual([
        {
          op: 'replace',
          path: '/$defs/Product/properties/sku/type',
          kind: 'type.changed',
          reason: 'type changed from string to integer',
          breaking: true,
        },
      ]);
    });

    it('moving a nested inline object into a definition, unchanged, is not a change even when it is deep', () => {
      const before = orderCreated();
      const after = orderCreated();
      const name = after.properties.customer.properties.name;
      after.properties.customer.properties.name = { $ref: '#/$defs/PersonName' };
      after.$defs.PersonName = name;

      expect(checkJsonSchemaCompatibility(before, after, 'full')).toEqual({ breaking: false, direction: null, ops: [] });
    });

    it('a wholesale rewrite of a deep subtree reports every difference under that subtree', () => {
      // Given shipment events are restructured: status becomes a typed string, location is inlined, a required carrier code is added
      const before = orderCreated();
      const after = orderCreated();
      after.properties.shipments.items = {
        type: 'object',
        required: ['carrierCode'],
        properties: {
          carrierCode: { type: 'string', minLength: 2 },
          events: {
            type: 'array',
            items: {
              type: 'object',
              required: ['status', 'at'],
              properties: {
                status: { type: 'string' },
                at: { type: 'string', format: 'date-time' },
                location: {
                  type: 'object',
                  required: ['lat', 'lng'],
                  properties: { lat: { type: 'number' }, lng: { type: 'number' } },
                },
              },
            },
          },
        },
      };

      const result = checkJsonSchemaCompatibility(before, after, 'full');

      expect(result.breaking).toBe(true);
      expect(result.direction).toBe('both');
      expect(result.ops).toEqual([
        {
          op: 'remove',
          path: '/properties/shipments/items/properties/carrier',
          kind: 'property.removed',
          reason: 'property removed',
          breaking: false,
        },
        {
          op: 'replace',
          path: '/properties/shipments/items/properties/events/items/properties/status/type',
          kind: 'type.narrowed',
          reason: 'type narrowed from any to string',
          breaking: true,
        },
        {
          op: 'remove',
          path: '/properties/shipments/items/properties/events/items/properties/status/enum',
          kind: 'enum.removed',
          reason: 'enum restriction removed',
          breaking: true,
        },
        {
          op: 'remove',
          path: '/properties/shipments/items/properties/events/items/properties/location/properties/lat/minimum',
          kind: 'constraint.loosened',
          reason: 'minimum removed',
          breaking: true,
        },
        {
          op: 'remove',
          path: '/properties/shipments/items/properties/events/items/properties/location/properties/lat/maximum',
          kind: 'constraint.loosened',
          reason: 'maximum removed',
          breaking: true,
        },
        {
          op: 'remove',
          path: '/properties/shipments/items/properties/events/items/properties/location/properties/lng/minimum',
          kind: 'constraint.loosened',
          reason: 'minimum removed',
          breaking: true,
        },
        {
          op: 'remove',
          path: '/properties/shipments/items/properties/events/items/properties/location/properties/lng/maximum',
          kind: 'constraint.loosened',
          reason: 'maximum removed',
          breaking: true,
        },
        {
          op: 'add',
          path: '/properties/shipments/items/properties/carrierCode',
          kind: 'property.added',
          reason: 'property added',
          breaking: false,
        },
        {
          op: 'replace',
          path: '/properties/shipments/items/properties/carrierCode',
          kind: 'required.added',
          reason: 'property became required',
          breaking: true,
        },
      ]);
    });
  });

  // ===========================================================================
  // sanity
  // ===========================================================================
  describe('identical schemas', () => {
    it('reports nothing under any strategy', () => {
      const schema = {
        type: 'object',
        properties: {
          orderId: { type: 'string', minLength: 1 },
          status: { enum: ['pending', 'paid'] },
          lines: { type: 'array', items: { $ref: '#/definitions/Line' } },
        },
        required: ['orderId'],
        additionalProperties: false,
        definitions: { Line: { type: 'object', properties: { sku: { type: 'string' } } } },
      };

      for (const strategy of ['backward', 'forward', 'full', 'none'] as const) {
        expect(checkJsonSchemaCompatibility(schema, schema, strategy)).toEqual({ breaking: false, direction: null, ops: [] });
      }
    });
  });
});
