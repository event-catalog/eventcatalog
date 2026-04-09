/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import { describe, it, expect } from 'vitest';
import { extractSchemaFieldsDeep } from './field-extractor';

describe('extractSchemaFieldsDeep', () => {
  describe('JSON Schema', () => {
    it('extracts top-level properties with their types', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'The order ID' },
          amount: { type: 'number' },
        },
      });
      const fields = extractSchemaFieldsDeep(schema, 'json-schema');
      expect(fields).toEqual([
        { path: 'orderId', type: 'string', description: 'The order ID', required: false },
        { path: 'amount', type: 'number', description: '', required: false },
      ]);
    });

    it('marks fields as required when listed in the JSON Schema required array', () => {
      const schema = JSON.stringify({
        type: 'object',
        required: ['orderId'],
        properties: {
          orderId: { type: 'string' },
          notes: { type: 'string' },
        },
      });
      const fields = extractSchemaFieldsDeep(schema, 'json-schema');
      expect(fields[0].required).toBe(true);
      expect(fields[1].required).toBe(false);
    });

    it('extracts nested object fields with dot-notation paths', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
            },
          },
        },
      });
      const fields = extractSchemaFieldsDeep(schema, 'json-schema');
      expect(fields.map((f) => f.path)).toEqual(['address', 'address.street', 'address.city']);
    });

    it('uses bracket notation for array item fields', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                quantity: { type: 'integer' },
              },
            },
          },
        },
      });
      const fields = extractSchemaFieldsDeep(schema, 'json-schema');
      expect(fields.map((f) => f.path)).toEqual(['items', 'items[].productId', 'items[].quantity']);
    });

    it('resolves local $ref references within the same schema', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          billing: { $ref: '#/definitions/Address' },
        },
        definitions: {
          Address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              zip: { type: 'string' },
            },
          },
        },
      });
      const fields = extractSchemaFieldsDeep(schema, 'json-schema');
      expect(fields.map((f) => f.path)).toEqual(['billing', 'billing.street', 'billing.zip']);
    });

    it('skips external $ref references and returns only local fields', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          orderId: { type: 'string' },
          customer: { $ref: './common.json#/definitions/Customer' },
        },
      });
      const fields = extractSchemaFieldsDeep(schema, 'json-schema');
      expect(fields).toHaveLength(2);
      expect(fields[0].path).toBe('orderId');
      expect(fields[1].path).toBe('customer');
      expect(fields[1].type).toBe('$ref');
    });

    it('merges allOf schemas and extracts combined properties', () => {
      const schema = JSON.stringify({
        allOf: [
          { type: 'object', properties: { id: { type: 'string' } } },
          { type: 'object', properties: { name: { type: 'string' } } },
        ],
      });
      const fields = extractSchemaFieldsDeep(schema, 'json-schema');
      expect(fields.map((f) => f.path)).toEqual(['id', 'name']);
    });

    it('converts array type values to a sorted pipe-separated string (e.g. nullable fields)', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'identifier for a user' },
          cancellationReason: { type: ['string', 'null'], description: 'optional reason' },
          renewalDate: { type: ['null', 'integer'], description: 'unix timestamp or null' },
        },
      });
      const fields = extractSchemaFieldsDeep(schema, 'json-schema');
      expect(fields).toEqual([
        { path: 'userId', type: 'string', description: 'identifier for a user', required: false },
        { path: 'cancellationReason', type: 'null | string', description: 'optional reason', required: false },
        { path: 'renewalDate', type: 'integer | null', description: 'unix timestamp or null', required: false },
      ]);
    });

    it('recurses into nested properties when object type is nullable', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          metadata: {
            type: ['object', 'null'],
            properties: {
              source: { type: 'string' },
              version: { type: 'integer' },
            },
          },
        },
      });
      const fields = extractSchemaFieldsDeep(schema, 'json-schema');
      expect(fields.map((f) => f.path)).toEqual(['metadata', 'metadata.source', 'metadata.version']);
      expect(fields[0].type).toBe('null | object');
    });

    it('recurses into array items when array type is nullable', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          tags: {
            type: ['array', 'null'],
            items: {
              type: 'object',
              properties: {
                key: { type: 'string' },
                value: { type: 'string' },
              },
            },
          },
        },
      });
      const fields = extractSchemaFieldsDeep(schema, 'json-schema');
      expect(fields.map((f) => f.path)).toEqual(['tags', 'tags[].key', 'tags[].value']);
      expect(fields[0].type).toBe('array | null'); // already sorted alphabetically
    });

    it('returns empty array when schema content is malformed JSON', () => {
      const fields = extractSchemaFieldsDeep('not valid json{{{', 'json-schema');
      expect(fields).toEqual([]);
    });

    it('returns empty array when schema content is empty', () => {
      const fields = extractSchemaFieldsDeep('', 'json-schema');
      expect(fields).toEqual([]);
    });
  });

  describe('Avro', () => {
    it('extracts fields from a simple Avro record', () => {
      const schema = JSON.stringify({
        type: 'record',
        name: 'Order',
        fields: [
          { name: 'orderId', type: 'string', doc: 'The order identifier' },
          { name: 'amount', type: 'double' },
        ],
      });
      const fields = extractSchemaFieldsDeep(schema, 'avro');
      expect(fields).toEqual([
        { path: 'orderId', type: 'string', description: 'The order identifier', required: true },
        { path: 'amount', type: 'double', description: '', required: true },
      ]);
    });

    it('handles Avro union types containing null as optional fields', () => {
      const schema = JSON.stringify({
        type: 'record',
        name: 'Customer',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'nickname', type: ['null', 'string'] },
        ],
      });
      const fields = extractSchemaFieldsDeep(schema, 'avro');
      expect(fields[0].required).toBe(true);
      expect(fields[1].required).toBe(false);
      expect(fields[1].type).toBe('null | string');
    });

    it('extracts nested record fields with dot-notation paths', () => {
      const schema = JSON.stringify({
        type: 'record',
        name: 'Order',
        fields: [
          {
            name: 'customer',
            type: {
              type: 'record',
              name: 'Customer',
              fields: [
                { name: 'name', type: 'string' },
                { name: 'email', type: 'string' },
              ],
            },
          },
        ],
      });
      const fields = extractSchemaFieldsDeep(schema, 'avro');
      expect(fields.map((f) => f.path)).toEqual(['customer', 'customer.name', 'customer.email']);
    });

    it('uses bracket notation for Avro array items', () => {
      const schema = JSON.stringify({
        type: 'record',
        name: 'Order',
        fields: [
          {
            name: 'items',
            type: {
              type: 'array',
              items: {
                type: 'record',
                name: 'Item',
                fields: [
                  { name: 'productId', type: 'string' },
                  { name: 'qty', type: 'int' },
                ],
              },
            },
          },
        ],
      });
      const fields = extractSchemaFieldsDeep(schema, 'avro');
      expect(fields.map((f) => f.path)).toEqual(['items', 'items[].productId', 'items[].qty']);
    });
  });

  describe('Protobuf', () => {
    it('extracts fields from a simple proto3 message', () => {
      const proto = `
        syntax = "proto3";
        message Order {
          string order_id = 1;
          double amount = 2; // total amount
        }
      `;
      const fields = extractSchemaFieldsDeep(proto, 'proto');
      expect(fields).toEqual([
        { path: 'order_id', type: 'string', description: '', required: false },
        { path: 'amount', type: 'double', description: 'total amount', required: false },
      ]);
    });

    it('marks repeated fields with their modifier in the type', () => {
      const proto = `
        syntax = "proto3";
        message Order {
          repeated string tags = 1;
        }
      `;
      const fields = extractSchemaFieldsDeep(proto, 'proto');
      expect(fields[0].type).toBe('repeated string');
    });

    it('returns empty array for empty proto content', () => {
      const fields = extractSchemaFieldsDeep('', 'proto');
      expect(fields).toEqual([]);
    });
  });
});
