import { describe, expect, it } from 'vitest';
import { getSchemaDisplayLabel, getSchemaIconUrl } from '../utils';

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
});
