import { describe, expect, it } from 'vitest';
import { toSchemaViewerSchemas } from '../schema-viewer';

const jsonSchema = JSON.stringify({ type: 'object', properties: { orderId: { type: 'string' } } });
const avroSchema = JSON.stringify({ type: 'record', name: 'OrderCreated', fields: [{ name: 'orderId', type: 'string' }] });
const protoSchema = `syntax = "proto3";
message OrderCreated {
  string order_id = 1;
}`;

describe('toSchemaViewerSchemas', () => {
  it.each([
    ['jsonschema', jsonSchema, 'json', 'json'],
    ['avro', avroSchema, 'avro', 'json'],
    ['protobuf', protoSchema, 'protobuf', 'protobuf'],
  ])('parses schemas with the %s format for the viewer, like files with that extension', (format, code, kind, language) => {
    expect(toSchemaViewerSchemas([{ format, code }])[0]).toMatchObject({ kind, format, language, code });
  });

  it('takes the format from the file extension when the schema only has a path', () => {
    expect(toSchemaViewerSchemas([{ url: '/generated/events/OrderCreated/schema.avsc', code: avroSchema }])).toEqual([
      { kind: 'avro', schema: JSON.parse(avroSchema), format: 'avsc', language: 'json', code: avroSchema },
    ]);
  });

  it('highlights formats without a viewer, such as XML Schema, in their own language', () => {
    expect(toSchemaViewerSchemas([{ url: '/generated/events/OrderCreated/schema.xsd', code: '<xs:schema />' }])[0]).toMatchObject(
      { kind: 'code', language: 'xml' }
    );
  });

  it('names each schema when there is more than one, so the view can switch between them', () => {
    const schemas = toSchemaViewerSchemas([
      { name: 'OrderCreated (JSON)', format: 'jsonschema', code: jsonSchema },
      { url: '/generated/events/OrderCreated/order-created.proto', code: protoSchema },
    ]);

    expect(schemas.map((schema) => [schema.name, schema.kind])).toEqual([
      ['OrderCreated (JSON)', 'json'],
      ['order-created.proto', 'protobuf'],
    ]);
  });
});
