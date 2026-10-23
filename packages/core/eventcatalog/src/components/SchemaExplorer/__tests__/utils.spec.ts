import { describe, expect, it } from 'vitest';
import { getFormatOptions, getSchemaDisplayLabel, getSchemaFormat, getSchemaIconUrl } from '../utils';

describe('Schema Explorer utils', () => {
  describe('getSchemaIconUrl', () => {
    it('uses the custom icon of a generic specification', () => {
      expect(getSchemaIconUrl({ specType: 'generic', schemaExtension: 'xml', specIcon: '/icons/soap.svg' })).toBe(
        '/icons/soap.svg'
      );
      expect(getSchemaIconUrl({ specType: 'generic', schemaExtension: 'xml', specIcon: 'https://example.com/soap.svg' })).toBe(
        'https://example.com/soap.svg'
      );
    });

    it('uses the default specification icon for a generic specification without one, whatever its format', () => {
      expect(getSchemaIconUrl({ specType: 'generic', schemaExtension: 'json' })).toBe('/icons/specification.svg');
    });

    it('keeps the icons of other schemas and specifications', () => {
      expect(getSchemaIconUrl({ specType: 'openapi', schemaExtension: 'openapi', specIcon: '/icons/soap.svg' })).toBe(
        '/icons/openapi.svg'
      );
      expect(getSchemaIconUrl({ schemaExtension: 'json' })).toBe('/icons/json-schema.svg');
      expect(getSchemaIconUrl({ schemaExtension: 'yaml' })).toBeUndefined();
    });
  });

  describe('getSchemaDisplayLabel', () => {
    it.each([
      { schemaExtension: 'json', label: 'JSON' },
      { schemaExtension: 'yaml', label: 'YAML' },
      { schemaExtension: 'xml', label: 'XML' },
      { schemaExtension: 'text', label: 'Text' },
    ])('labels a generic $schemaExtension specification as $label', ({ schemaExtension, label }) => {
      expect(getSchemaDisplayLabel({ specType: 'generic', schemaExtension })).toBe(label);
    });

    it('labels other schemas by their format', () => {
      expect(getSchemaDisplayLabel({ schemaExtension: 'json' })).toBe('JSON Schema');
      expect(getSchemaDisplayLabel({ specType: 'openapi', schemaExtension: 'openapi' })).toBe('OpenAPI');
    });
  });

  describe('getSchemaFormat', () => {
    it.each([
      { message: { schemaExtension: 'json' }, format: 'json' },
      { message: { schemaExtension: 'yml' }, format: 'yaml' },
      { message: { schemaExtension: 'gql' }, format: 'graphql' },
      { message: { schemaExtension: 'avsc' }, format: 'avro' },
      { message: { schemaExtension: 'protobuf' }, format: 'proto' },
      { message: { schemaExtension: 'XSD' }, format: 'xsd' },
      { message: { specType: 'openapi', schemaExtension: 'openapi' }, format: 'openapi' },
      { message: { specType: 'generic', schemaExtension: 'xml' }, format: 'xml' },
      { message: { specType: 'generic', schemaExtension: 'json' }, format: 'json-document' },
      { message: { specType: 'generic', schemaExtension: 'text' }, format: 'text' },
      { message: {}, format: undefined },
    ])('files $message under $format', ({ message, format }) => {
      expect(getSchemaFormat(message)).toBe(format);
    });
  });

  describe('getFormatOptions', () => {
    const messages = [
      { schemaExtension: 'json' },
      { schemaExtension: 'json' },
      { schemaExtension: 'yml' },
      { schemaExtension: 'yaml' },
      { specType: 'generic', schemaExtension: 'xml' },
      { specType: 'generic', schemaExtension: 'json' },
      { specType: 'openapi', schemaExtension: 'openapi' },
    ];

    it('counts each format, merging extensions of the same format, most used first', () => {
      expect(getFormatOptions(messages)).toEqual([
        { format: 'json', count: 2 },
        { format: 'yaml', count: 2 },
        { format: 'json-document', count: 1 },
        { format: 'openapi', count: 1 },
        { format: 'xml', count: 1 },
      ]);
    });

    it('keeps the selected format when none of the schemas use it, so it can be cleared', () => {
      expect(getFormatOptions([{ schemaExtension: 'json' }], 'xml')).toEqual([
        { format: 'json', count: 1 },
        { format: 'xml', count: 0 },
      ]);
    });
  });
});
