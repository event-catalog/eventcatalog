import { describe, expect, it } from 'vitest';
import {
  getFormatOptions,
  getSchemaDisplayLabel,
  getSchemaDownloadExtension,
  getSchemaFormat,
  getSchemaIconUrl,
  normalizeSchemaFormat,
} from '../utils';

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

  describe('normalizeSchemaFormat', () => {
    it.each([
      ['avsc', 'avro'],
      ['protobuf', 'proto'],
      ['yml', 'yaml'],
      ['GQL', 'graphql'],
      ['json', 'json'],
      ['json-document', 'json-document'],
    ])('keeps a filter saved as %s selecting %s', (saved, format) => {
      expect(normalizeSchemaFormat(saved)).toBe(format);
    });
  });

  describe('getSchemaDownloadExtension', () => {
    const data = { id: 'carrier-adapter', name: 'Carrier Adapter', version: '1.0.0' };

    it("downloads a generic specification with its own file's extension", () => {
      expect(
        getSchemaDownloadExtension({
          specType: 'generic',
          schemaExtension: 'xml',
          data: { ...data, schemaPath: 'specs/carrier.wsdl' },
        })
      ).toBe('wsdl');
      expect(
        getSchemaDownloadExtension({ specType: 'generic', schemaExtension: 'xml', data: { ...data, schemaPath: 'shipment.xsd' } })
      ).toBe('xsd');
    });

    it('downloads other schemas with their extension, and JSON when they have none', () => {
      expect(getSchemaDownloadExtension({ schemaExtension: 'avsc', data: { ...data, schemaPath: 'schema.avsc' } })).toBe('avsc');
      expect(getSchemaDownloadExtension({ specType: 'openapi', schemaExtension: 'openapi', data })).toBe('openapi');
      expect(getSchemaDownloadExtension({ data })).toBe('json');
    });
  });
});
