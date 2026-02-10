import { getSchemasFromResource } from '@utils/collections/schemas';

import { getSchemaURL, getSchemaFormatFromURL } from '@utils/collections/schemas';

describe('schemas', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset the environment before each test
    // @ts-ignore
    global.__EC_TRAILING_SLASH__ = false;
    process.env = { ...originalEnv };
  });

  describe('getSchemaURL', () => {
    it('returns the schema URL for a given resource', () => {
      const schemaURL = getSchemaURL({
        collection: 'services',
        data: {
          id: 'MyService',
          version: '1.0.0',
          name: 'MyService',
          schemaPath: 'schemas/service',
        },
        // @ts-ignore
        catalog: {
          publicPath: '/catalog/services/MyService',
        },
      });
      expect(schemaURL).toEqual('/catalog/services/MyService/schemas/service');
    });
  });

  describe('getSchemaFormatFromURL', () => {
    it('returns the format of a given schema URL', () => {
      const format = getSchemaFormatFromURL('random-url.com/schemas/service.json');
      expect(format).toEqual('json');
    });
  });

  describe('getSchemasFromResource', () => {
    describe('services', () => {
      it('returns an openapi, and asyncapi schema if both are present', () => {
        const schemas = getSchemasFromResource({
          collection: 'services',
          data: {
            id: 'MyService',
            version: '1.0.0',
            name: 'MyService',
            schemaPath: 'schemas/service',
            specifications: {
              asyncapiPath: 'schemas/service.asyncapi.json',
              openapiPath: 'schemas/service.openapi.json',
            },
          },
          // @ts-ignore
          catalog: { publicPath: '/catalog/services/MyService' },
        });
        expect(schemas).toEqual([
          { url: '/catalog/services/MyService/schemas/service.asyncapi.json', format: 'asyncapi' },
          { url: '/catalog/services/MyService/schemas/service.openapi.json', format: 'openapi' },
        ]);
      });

      it('returns an asyncapi schema if only asyncapi is present', () => {
        const schemas = getSchemasFromResource({
          collection: 'services',
          data: {
            id: 'MyService',
            version: '1.0.0',
            name: 'MyService',
            schemaPath: 'schemas/service',
            specifications: {
              asyncapiPath: 'schemas/service.asyncapi.json',
            },
          },
          // @ts-ignore
          catalog: { publicPath: '/catalog/services/MyService' },
        });
        expect(schemas).toEqual([{ url: '/catalog/services/MyService/schemas/service.asyncapi.json', format: 'asyncapi' }]);
      });

      it('returns an openapi schema if only openapi is present', () => {
        const schemas = getSchemasFromResource({
          collection: 'services',
          data: {
            id: 'MyService',
            version: '1.0.0',
            name: 'MyService',
            schemaPath: 'schemas/service',
            specifications: {
              openapiPath: 'schemas/service.openapi.json',
            },
          },
          // @ts-ignore
          catalog: { publicPath: '/catalog/services/MyService' },
        });
        expect(schemas).toEqual([{ url: '/catalog/services/MyService/schemas/service.openapi.json', format: 'openapi' }]);
      });

      it('returns an empty array if no schemas are present', () => {
        const schemas = getSchemasFromResource({
          collection: 'services',
          data: {
            id: 'MyService',
            version: '1.0.0',
            name: 'MyService',
            schemaPath: 'schemas/service',
          },
          // @ts-ignore
          catalog: { publicPath: '/catalog/services/MyService' },
        });
        expect(schemas).toEqual([]);
      });
    });

    describe('all resources (excluding services)', () => {
      it('returns a single schema if only one is present', () => {
        const schemas = getSchemasFromResource({
          collection: 'events',
          data: {
            id: 'MyEvent',
            version: '1.0.0',
            name: 'MyEvent',
            schemaPath: 'schemas/event.json',
          },
          // @ts-ignore
          catalog: { publicPath: '/catalog/events/MyEvent' },
        });
        expect(schemas).toEqual([{ url: '/catalog/events/MyEvent/schemas/event.json', format: 'json' }]);
      });

      it('returns an empty array if no schemas are present', () => {
        const schemas = getSchemasFromResource({
          collection: 'events',
          data: {
            id: 'MyEvent',
            version: '1.0.0',
            name: 'MyEvent',
          },
          // @ts-ignore
          catalog: { publicPath: '/catalog/events/MyEvent' },
        });
        expect(schemas).toEqual([]);
      });
    });
  });
});
