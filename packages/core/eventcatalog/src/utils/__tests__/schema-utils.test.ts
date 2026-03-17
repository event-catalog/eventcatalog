import { describe, it, expect } from 'vitest';
import { extractSchemaProperties } from '../schema-utils';

describe('extractSchemaProperties', () => {
  describe('when given empty or invalid content', () => {
    it('returns an empty array when content is empty', () => {
      expect(extractSchemaProperties('', 'json')).toEqual([]);
    });

    it('returns an empty array when JSON is malformed', () => {
      expect(extractSchemaProperties('{ broken json', 'json')).toEqual([]);
    });

    it('returns an empty array when JSON has no properties or fields', () => {
      expect(extractSchemaProperties('{"type": "object"}', 'json')).toEqual([]);
    });
  });

  describe('when parsing a JSON Schema', () => {
    it('extracts field names, types, and descriptions from properties', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Unique order identifier' },
          amount: { type: 'number', description: 'Total amount' },
        },
      });

      const result = extractSchemaProperties(schema, 'json');

      expect(result).toEqual([
        { name: 'orderId', type: 'string', description: 'Unique order identifier', required: false },
        { name: 'amount', type: 'number', description: 'Total amount', required: false },
      ]);
    });

    it('marks fields listed in the required array as required', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'Unique order identifier' },
          notes: { type: 'string', description: 'Optional notes' },
        },
        required: ['orderId'],
      });

      const result = extractSchemaProperties(schema, 'json');

      expect(result[0].required).toBe(true);
      expect(result[1].required).toBe(false);
    });

    it('defaults description to empty string when not provided', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          orderId: { type: 'string' },
        },
      });

      const result = extractSchemaProperties(schema, 'json');

      expect(result[0].description).toBe('');
    });

    it('detects enum types when no explicit type is set', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          status: { enum: ['active', 'inactive'], description: 'Current status' },
        },
      });

      const result = extractSchemaProperties(schema, 'json');

      expect(result[0].type).toBe('enum');
    });

    it('detects $ref types when no explicit type is set', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          address: { $ref: '#/definitions/Address', description: 'Shipping address' },
        },
      });

      const result = extractSchemaProperties(schema, 'json');

      expect(result[0].type).toBe('$ref');
    });

    it('falls back to object type when no type, enum, or $ref is set', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          metadata: { description: 'Extra metadata' },
        },
      });

      const result = extractSchemaProperties(schema, 'json');

      expect(result[0].type).toBe('object');
    });
  });

  describe('when parsing an Avro schema', () => {
    it('extracts field names, types, and doc descriptions', () => {
      const schema = JSON.stringify({
        type: 'record',
        name: 'OrderEvent',
        fields: [
          { name: 'orderId', type: 'string', doc: 'The order ID' },
          { name: 'totalAmount', type: 'double', doc: 'Total order amount' },
        ],
      });

      const result = extractSchemaProperties(schema, 'avro');

      expect(result).toEqual([
        { name: 'orderId', type: 'string', description: 'The order ID', required: true },
        { name: 'totalAmount', type: 'double', description: 'Total order amount', required: true },
      ]);
    });

    it('treats simple-typed fields as required', () => {
      const schema = JSON.stringify({
        type: 'record',
        name: 'Event',
        fields: [{ name: 'id', type: 'string' }],
      });

      const result = extractSchemaProperties(schema, 'avro');

      expect(result[0].required).toBe(true);
    });

    it('treats union types that include null as optional', () => {
      const schema = JSON.stringify({
        type: 'record',
        name: 'Event',
        fields: [{ name: 'notes', type: ['null', 'string'], doc: 'Optional notes' }],
      });

      const result = extractSchemaProperties(schema, 'avro');

      expect(result[0].required).toBe(false);
      expect(result[0].type).toBe('null | string');
    });

    it('treats union types without null as required', () => {
      const schema = JSON.stringify({
        type: 'record',
        name: 'Event',
        fields: [{ name: 'payload', type: ['string', 'int'] }],
      });

      const result = extractSchemaProperties(schema, 'avro');

      expect(result[0].required).toBe(true);
      expect(result[0].type).toBe('string | int');
    });

    it('formats array types as array<itemType>', () => {
      const schema = JSON.stringify({
        type: 'record',
        name: 'Event',
        fields: [
          {
            name: 'tags',
            type: { type: 'array', items: 'string' },
            doc: 'List of tags',
          },
        ],
      });

      const result = extractSchemaProperties(schema, 'avro');

      expect(result[0].type).toBe('array<string>');
    });

    it('formats nested record types using the record type name', () => {
      const schema = JSON.stringify({
        type: 'record',
        name: 'Event',
        fields: [
          {
            name: 'address',
            type: { type: 'record', name: 'Address', fields: [] },
            doc: 'Shipping address',
          },
        ],
      });

      const result = extractSchemaProperties(schema, 'avro');

      expect(result[0].type).toBe('record');
    });

    it('defaults description to empty string when doc is not provided', () => {
      const schema = JSON.stringify({
        type: 'record',
        name: 'Event',
        fields: [{ name: 'id', type: 'string' }],
      });

      const result = extractSchemaProperties(schema, 'avro');

      expect(result[0].description).toBe('');
    });
  });

  describe('when parsing a Protobuf schema', () => {
    it('extracts field names and types from message definitions', () => {
      const proto = `
syntax = "proto3";

message PaymentEvent {
  string transaction_id = 1;
  double amount = 2;
  string currency = 3;
}`;

      const result = extractSchemaProperties(proto, 'proto');

      expect(result).toEqual([
        { name: 'transaction_id', type: 'string', description: '', required: false },
        { name: 'amount', type: 'double', description: '', required: false },
        { name: 'currency', type: 'string', description: '', required: false },
      ]);
    });

    it('captures inline comments as field descriptions', () => {
      const proto = `
message Event {
  string id = 1; // Unique event identifier
  int32 priority = 2; // Processing priority level
}`;

      const result = extractSchemaProperties(proto, 'proto');

      expect(result[0].description).toBe('Unique event identifier');
      expect(result[1].description).toBe('Processing priority level');
    });

    it('includes the modifier in the type for repeated fields', () => {
      const proto = `
message Event {
  repeated string tags = 1;
}`;

      const result = extractSchemaProperties(proto, 'proto');

      expect(result[0].type).toBe('repeated string');
    });

    it('includes the modifier in the type for optional fields', () => {
      const proto = `
message Event {
  optional string notes = 1;
}`;

      const result = extractSchemaProperties(proto, 'proto');

      expect(result[0].type).toBe('optional string');
    });

    it('returns an empty array when there are no field definitions', () => {
      const proto = `
syntax = "proto3";

message Empty {
}`;

      const result = extractSchemaProperties(proto, 'proto');

      expect(result).toEqual([]);
    });
  });

  describe('when the format is unknown', () => {
    it('attempts JSON parsing and returns results if valid', () => {
      const schema = JSON.stringify({
        type: 'object',
        properties: {
          id: { type: 'string', description: 'An ID' },
        },
      });

      const result = extractSchemaProperties(schema, 'yaml');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('id');
    });

    it('returns an empty array if content is not valid JSON', () => {
      expect(extractSchemaProperties('not json', 'xml')).toEqual([]);
    });
  });
});
