import { describe, expect, it } from 'vitest';
import { parseProtobufSchema } from '../protobuf-schema';

describe('parseProtobufSchema', () => {
  it('parses a simple proto3 message', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      package com.example.frauddetection;

      message FraudCheckCompleted {
        string transactionId = 1;
        int32 riskScore = 2;
        repeated string reasons = 3;
        double confidence = 4;
      }
    `);

    expect(schema.syntax).toBe('proto3');
    expect(schema.package).toBe('com.example.frauddetection');
    expect(schema.messages).toHaveLength(1);

    const message = schema.messages[0];
    expect(message.name).toBe('FraudCheckCompleted');
    expect(message.fields).toEqual([
      { name: 'transactionId', type: 'string', number: 1, label: undefined, oneof: undefined, doc: undefined },
      { name: 'riskScore', type: 'int32', number: 2, label: undefined, oneof: undefined, doc: undefined },
      { name: 'reasons', type: 'string', number: 3, label: 'repeated', oneof: undefined, doc: undefined },
      { name: 'confidence', type: 'double', number: 4, label: undefined, oneof: undefined, doc: undefined },
    ]);
  });

  it('parses multiple top-level messages', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      message OrderPlaced {
        string order_id = 1;
      }

      message OrderCancelled {
        string order_id = 1;
        string reason = 2;
      }
    `);

    expect(schema.messages.map((m) => m.name)).toEqual(['OrderPlaced', 'OrderCancelled']);
  });

  it('parses nested messages and enums', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      message Order {
        message LineItem {
          string sku = 1;
          int32 quantity = 2;
        }

        enum Status {
          PENDING = 0;
          CONFIRMED = 1;
        }

        string order_id = 1;
        repeated LineItem items = 2;
        Status status = 3;
      }
    `);

    const order = schema.messages[0];
    expect(order.messages).toHaveLength(1);
    expect(order.messages[0].name).toBe('LineItem');
    expect(order.messages[0].fields.map((f) => f.name)).toEqual(['sku', 'quantity']);
    expect(order.enums).toHaveLength(1);
    expect(order.enums[0].name).toBe('Status');
    expect(order.enums[0].values).toEqual([
      { name: 'PENDING', value: 0, doc: undefined },
      { name: 'CONFIRMED', value: 1, doc: undefined },
    ]);
    expect(order.fields.map((f) => f.type)).toEqual(['string', 'LineItem', 'Status']);
  });

  it('captures leading and trailing comments as field docs', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      // Emitted when a fraud check completes.
      message FraudCheckCompleted {
        // The unique transaction identifier.
        string transaction_id = 1;
        int32 risk_score = 2; // Score between 0 and 100
        /**
         * The decision made by the fraud engine.
         */
        string decision = 3;
      }
    `);

    const message = schema.messages[0];
    expect(message.doc).toBe('Emitted when a fraud check completes.');
    expect(message.fields[0].doc).toBe('The unique transaction identifier.');
    expect(message.fields[1].doc).toBe('Score between 0 and 100');
    expect(message.fields[2].doc).toBe('The decision made by the fraud engine.');
  });

  it('parses map fields', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      message Order {
        map<string, int32> quantities = 1;
      }
    `);

    const field = schema.messages[0].fields[0];
    expect(field.name).toBe('quantities');
    expect(field.type).toBe('map<string, int32>');
    expect(field.map).toEqual({ keyType: 'string', valueType: 'int32' });
  });

  it('parses oneof fields', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      message Payment {
        oneof payment_method {
          string card_token = 1;
          string paypal_id = 2;
        }
        string currency = 3;
      }
    `);

    const fields = schema.messages[0].fields;
    expect(fields[0]).toMatchObject({ name: 'card_token', oneof: 'payment_method' });
    expect(fields[1]).toMatchObject({ name: 'paypal_id', oneof: 'payment_method' });
    expect(fields[2].oneof).toBeUndefined();
  });

  it('parses proto2 required and optional labels', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto2";

      message User {
        required string id = 1;
        optional string nickname = 2;
      }
    `);

    const fields = schema.messages[0].fields;
    expect(fields[0].label).toBe('required');
    expect(fields[1].label).toBe('optional');
  });

  it('parses top-level enums', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      // The decision outcome.
      enum Decision {
        APPROVED = 0;
        DECLINED = 1; // Transaction was declined
        MANUAL_REVIEW = 2;
      }
    `);

    expect(schema.enums).toHaveLength(1);
    expect(schema.enums[0].doc).toBe('The decision outcome.');
    expect(schema.enums[0].values[1]).toEqual({ name: 'DECLINED', value: 1, doc: 'Transaction was declined' });
  });

  it('ignores imports, options, reserved fields, field options and services', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      import "google/protobuf/timestamp.proto";

      option java_package = "com.example";
      option (custom.aggregate) = { foo: 1 };

      message Order {
        option deprecated = true;
        reserved 4, 5;
        reserved "old_field";
        string order_id = 1 [deprecated = true];
        google.protobuf.Timestamp created_at = 2;
      }

      service OrderService {
        rpc GetOrder (GetOrderRequest) returns (Order);
      }
    `);

    const order = schema.messages[0];
    expect(order.fields.map((f) => f.name)).toEqual(['order_id', 'created_at']);
    expect(order.fields[1].type).toBe('google.protobuf.Timestamp');
  });

  it('throws on empty content', () => {
    expect(() => parseProtobufSchema('')).toThrow('Protobuf schema is empty');
  });

  it('throws on non-protobuf content', () => {
    expect(() => parseProtobufSchema('{"type": "object", "properties": {}}')).toThrow();
  });

  it('throws on an unclosed message', () => {
    expect(() =>
      parseProtobufSchema(`
        syntax = "proto3";
        message Order {
          string order_id = 1;
      `)
    ).toThrow('Unexpected end of message "Order"');
  });
});
