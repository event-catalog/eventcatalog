import { describe, expect, it } from 'vitest';
import type { ProtobufField } from '@utils/protobuf-schema';
import {
  formatProtobufOptionValue,
  formatProtovalidateRule,
  getCustomFieldAnnotations,
  getProtovalidateRules,
  isProtovalidateRequired,
} from './protobuf-validation';

describe('protobuf validation helpers', () => {
  it('flattens direct and aggregate Protovalidate options', () => {
    const field: ProtobufField = {
      name: 'status',
      type: 'Status',
      options: [
        { name: '(buf.validate.field).required', value: true },
        {
          name: '(buf.validate.field).enum',
          value: { defined_only: true, not_in: [0] },
        },
      ],
    };

    expect(getProtovalidateRules(field)).toEqual([
      { path: 'required', value: true },
      { path: 'enum.defined_only', value: true },
      { path: 'enum.not_in', value: [0] },
    ]);
    expect(isProtovalidateRequired(field)).toBe(true);
  });

  it('ignores non-Protovalidate custom options', () => {
    const field: ProtobufField = {
      name: 'description',
      type: 'string',
      options: [{ name: '(datahub.v1.gdpr_rule).string', value: true }],
    };

    expect(getProtovalidateRules(field)).toEqual([]);
    expect(isProtovalidateRequired(field)).toBe(false);
    expect(getCustomFieldAnnotations(field)).toEqual([{ name: '(datahub.v1.gdpr_rule).string', value: true }]);
  });

  it('only treats extension options as custom annotations and formats aggregate values', () => {
    const field: ProtobufField = {
      name: 'description',
      type: 'string',
      options: [
        { name: 'deprecated', value: true },
        { name: '(buf.validate.field).string.min_len', value: 1 },
        { name: '(datahub.v1.classification)', value: { level: 'personal', encrypted: true } },
      ],
    };

    expect(getCustomFieldAnnotations(field)).toEqual([
      {
        name: '(datahub.v1.classification)',
        value: { level: 'personal', encrypted: true },
      },
    ]);
    expect(formatProtobufOptionValue(getCustomFieldAnnotations(field)[0].value)).toBe('{"level":"personal","encrypted":true}');
  });

  it('formats common rules for display', () => {
    expect(formatProtovalidateRule({ path: 'string.email', value: true })).toEqual({ label: 'Format', value: 'Email' });
    expect(formatProtovalidateRule({ path: 'uint32.gte', value: 1 })).toEqual({ label: 'Minimum', value: '1' });
    expect(formatProtovalidateRule({ path: 'enum.defined_only', value: true })).toEqual({
      label: 'Defined enum values only',
    });
    expect(formatProtovalidateRule({ path: 'enum.not_in', value: [0] })).toEqual({
      label: 'Excluded values',
      value: '0',
    });
    expect(formatProtovalidateRule({ path: 'repeated.items.string.min_len', value: 3 })).toEqual({
      label: 'Item minimum length',
      value: '3',
    });
    expect(formatProtovalidateRule({ path: 'map.values.string.max_len', value: 100 })).toEqual({
      label: 'Value maximum length',
      value: '100',
    });
  });
});
