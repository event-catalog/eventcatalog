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

  it('parses direct and aggregate field options', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      message Journey {
        string id = 1 [
          (buf.validate.field).required = true,
          (buf.validate.field).string.uuid = true
        ];
        Status status = 2 [(buf.validate.field).enum = {
          defined_only: true
          not_in: [0]
        }];
      }

      enum Status {
        STATUS_UNSPECIFIED = 0;
        STATUS_ACTIVE = 1;
      }
    `);

    expect(schema.messages[0].fields[0].options).toEqual([
      { name: '(buf.validate.field).required', value: true },
      { name: '(buf.validate.field).string.uuid', value: true },
    ]);
    expect(schema.messages[0].fields[1].options).toEqual([
      {
        name: '(buf.validate.field).enum',
        value: { defined_only: true, not_in: [0] },
      },
    ]);
  });

  it('parses nested repeated and map validation options', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      message Journey {
        repeated string stops = 1 [(buf.validate.field).repeated = {
          min_items: 2
          max_items: 10
          unique: true
          items: { string: { min_len: 3 } }
        }];
        map<string, string> labels = 2 [(buf.validate.field).map = {
          max_pairs: 5
          keys: { string: { min_len: 1 } }
          values: { string: { max_len: 100 } }
        }];
      }
    `);

    expect(schema.messages[0].fields[0].options).toEqual([
      {
        name: '(buf.validate.field).repeated',
        value: {
          min_items: 2,
          max_items: 10,
          unique: true,
          items: { string: { min_len: 3 } },
        },
      },
    ]);
    expect(schema.messages[0].fields[1].options).toEqual([
      {
        name: '(buf.validate.field).map',
        value: {
          max_pairs: 5,
          keys: { string: { min_len: 1 } },
          values: { string: { max_len: 100 } },
        },
      },
    ]);
  });

  it('preserves precise integers and parses signed option values', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      message Measurement {
        int64 sequence = 1 [(buf.validate.field).int64.const = 9223372036854775807];
        double score = 2 [(buf.validate.field).double = { gte: -1.5, lt: +inf }];
      }
    `);

    expect(schema.messages[0].fields[0].options).toEqual([
      { name: '(buf.validate.field).int64.const', value: '9223372036854775807' },
    ]);
    expect(schema.messages[0].fields[1].options).toEqual([
      {
        name: '(buf.validate.field).double',
        value: { gte: -1.5, lt: '+inf' },
      },
    ]);
  });

  it('concatenates adjacent string literals in field option values', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      message Journey {
        string reference = 1 [json_name = "journey_" "reference"];
      }
    `);

    expect(schema.messages[0].fields[0].options).toEqual([{ name: 'json_name', value: 'journey_reference' }]);
  });

  it('decodes protobuf escape sequences in string option values', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      message Journey {
        string note = 1 [(rule).const = "line\\nbreak " "\\x41\\101\\u0042\\U00000043"];
        string destination = 2 [(rule).const = "\\303\\251"];
        bytes opaque = 3 [(rule).const = "\\377"];
      }
    `);

    expect(schema.messages[0].fields[0].options).toEqual([{ name: '(rule).const', value: 'line\nbreak AABC' }]);
    expect(schema.messages[0].fields[1].options).toEqual([{ name: '(rule).const', value: 'é' }]);
    expect(schema.messages[0].fields[2].options).toEqual([{ name: '(rule).const', value: '\\377' }]);
  });

  it('parses integer field options using protobuf radix rules', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      message Journey {
        int32 duration = 1 [(rule).gte = 020, (rule).lte = 0x20];
      }
    `);

    expect(schema.messages[0].fields[0].options).toEqual([
      { name: '(rule).gte', value: 16 },
      { name: '(rule).lte', value: 32 },
    ]);
  });

  it('parses bracketed extension keys in aggregate field options', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      message Journey {
        string reference = 1 [(datahub.v1.gdpr_rule) = {
          [datahub.v1.classification]: "personal"
        }];
      }
    `);

    expect(schema.messages[0].fields[0].options).toEqual([
      {
        name: '(datahub.v1.gdpr_rule)',
        value: { '[datahub.v1.classification]': 'personal' },
      },
    ]);
  });

  it('parses fully-qualified type names with a leading dot', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      package com.example;

      message Order {
        .google.protobuf.Timestamp created_at = 1;
        .com.example.LineItem item = 2;
      }

      message LineItem {
        string sku = 1;
      }
    `);

    const order = schema.messages[0];
    expect(order.fields[0].type).toBe('.google.protobuf.Timestamp');
    expect(order.fields[1].type).toBe('.com.example.LineItem');
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
