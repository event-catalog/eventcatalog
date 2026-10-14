import { describe, expect, it } from 'vitest';
import { parseSchemaForViewer } from '../parse-schema';

const jsonSchema = JSON.stringify({ type: 'object', properties: { orderId: { type: 'string' } }, required: ['orderId'] });
const avroSchema = JSON.stringify({ type: 'record', name: 'OrderCreated', fields: [{ name: 'orderId', type: 'string' }] });
const protoSchema = `syntax = "proto3";
package orders;

// Raised when an order is placed
message OrderCreated {
  string order_id = 1;
}`;

describe('parseSchemaForViewer', () => {
  it('shows .json schemas in the JSON Schema viewer', () => {
    expect(parseSchemaForViewer('json', jsonSchema)).toEqual({ kind: 'json', schema: JSON.parse(jsonSchema) });
  });

  it.each(['avsc', 'avro'])('shows .%s schemas in the Avro viewer', (extension) => {
    expect(parseSchemaForViewer(extension, avroSchema)).toEqual({ kind: 'avro', schema: JSON.parse(avroSchema) });
  });

  it.each(['proto', 'protobuf'])('parses .%s schemas for the Protobuf viewer', (extension) => {
    const viewable = parseSchemaForViewer(extension, protoSchema);

    expect(viewable.kind).toBe('protobuf');
    expect(viewable.kind === 'protobuf' && viewable.schema.messages[0]).toMatchObject({
      name: 'OrderCreated',
      fields: [expect.objectContaining({ name: 'order_id', type: 'string' })],
    });
  });

  it('ignores the case of the extension', () => {
    expect(parseSchemaForViewer('JSON', jsonSchema).kind).toBe('json');
  });

  it('only shows JSON that is not a schema as code', () => {
    expect(parseSchemaForViewer('json', '{"orderId": "123"}')).toEqual({ kind: 'code' });
  });

  it('only shows schemas that do not parse as code', () => {
    expect(parseSchemaForViewer('json', '{ not json')).toEqual({ kind: 'code' });
    expect(parseSchemaForViewer('avsc', '{"name": "missing a type"}')).toEqual({ kind: 'code' });
  });

  it('only shows formats without a viewer, such as XML Schema, and empty schemas as code', () => {
    expect(parseSchemaForViewer('xsd', '<xs:schema />')).toEqual({ kind: 'code' });
    expect(parseSchemaForViewer('json', '  ')).toEqual({ kind: 'code' });
    expect(parseSchemaForViewer(undefined, jsonSchema)).toEqual({ kind: 'code' });
  });
});
