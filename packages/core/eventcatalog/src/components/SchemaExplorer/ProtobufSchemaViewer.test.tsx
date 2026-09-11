import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { parseProtobufSchema } from '@utils/protobuf-schema';
import ProtobufSchemaViewer from './ProtobufSchemaViewer';

describe('ProtobufSchemaViewer', () => {
  it('renders Protovalidate required and constraint annotations', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      enum Status {
        STATUS_UNSPECIFIED = 0;
        STATUS_ACTIVE = 1;
      }

      message Journey {
        string id = 1 [
          (buf.validate.field).required = true,
          (buf.validate.field).string.uuid = true
        ];
        uint32 passenger_count = 2 [(buf.validate.field).uint32 = { gte: 1, lte: 20 }];
        Status status = 3 [(buf.validate.field).enum = { defined_only: true, not_in: [0] }];
        repeated string stops = 4 [(buf.validate.field).repeated = {
          min_items: 2
          unique: true
          items: { string: { min_len: 3 } }
        }];
        planning.model.v1.TrainServiceReference train_service = 5;
        optional string description = 6 [(datahub.v1.gdpr_rule).string = true];
      }
    `);

    const html = renderToStaticMarkup(<ProtobufSchemaViewer schema={schema} />);
    const statusField = html.slice(html.indexOf('>status</span>'), html.indexOf('>stops</span>'));

    expect(html).toContain('required');
    expect(html).toContain('Format');
    expect(html).toContain('UUID');
    expect(html).toContain('Minimum');
    expect(html).toContain('Maximum');
    expect(html).toContain('Defined enum values only');
    expect(html).toContain('Excluded values');
    expect(html).toContain('Minimum items');
    expect(html).toContain('Unique items');
    expect(html).toContain('Item minimum length');
    expect(html).toContain('title="planning.model.v1.TrainServiceReference"');
    expect(html).toContain('>TrainServiceReference</span>');
    expect(statusField).not.toContain('STATUS_UNSPECIFIED');
    expect(statusField).toContain('STATUS_ACTIVE');
    expect(html).toContain('Annotation:');
    expect(html).toContain('(datahub.v1.gdpr_rule).string');
    expect(html).toContain('>true</code>');
  });

  it('filters enum values using repeated-item and map-value constraints', () => {
    const schema = parseProtobufSchema(`
      syntax = "proto3";

      enum Status {
        STATUS_UNSPECIFIED = 0;
        STATUS_ACTIVE = 1;
        STATUS_ARCHIVED = 2;
      }

      message Journey {
        repeated Status statuses = 1 [(buf.validate.field).repeated = {
          items: { enum: { in: [1] } }
        }];
        map<string, Status> status_by_key = 2 [(buf.validate.field).map = {
          values: { enum: { not_in: [0, 2] } }
        }];
        Status status = 3 [(buf.validate.field).enum.const = 2];
      }
    `);

    const html = renderToStaticMarkup(<ProtobufSchemaViewer schema={schema} />);
    const repeatedField = html.slice(html.indexOf('>statuses</span>'), html.indexOf('>status_by_key</span>'));
    const mapField = html.slice(html.indexOf('>status_by_key</span>'), html.indexOf('>status</span>'));
    const directField = html.slice(html.indexOf('>status</span>'), html.indexOf('>Enum:</span>'));

    expect(repeatedField).toContain('STATUS_ACTIVE');
    expect(repeatedField).not.toContain('STATUS_UNSPECIFIED');
    expect(repeatedField).not.toContain('STATUS_ARCHIVED');
    expect(mapField).toContain('STATUS_ACTIVE');
    expect(mapField).not.toContain('STATUS_UNSPECIFIED');
    expect(mapField).not.toContain('STATUS_ARCHIVED');
    expect(directField).toContain('STATUS_ARCHIVED');
    expect(directField).not.toContain('STATUS_UNSPECIFIED');
    expect(directField).not.toContain('STATUS_ACTIVE');
  });
});
