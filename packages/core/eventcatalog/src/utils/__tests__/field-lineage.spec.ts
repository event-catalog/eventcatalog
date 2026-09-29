import { describe, expect, it } from 'vitest';
import { classifyFieldLineage, type FieldLineageConsumer } from '@utils/field-lineage';
import { extractSchemaProperties } from '@utils/schema-utils';

const shippingService: FieldLineageConsumer = {
  resourceId: 'ShippingService',
  resourceName: 'Shipping Service',
  resourceVersion: '1.0.0',
  direction: 'receives',
};

const orderPlacedSchema = JSON.stringify({
  type: 'object',
  required: ['orderId', 'shippingAddress'],
  properties: {
    orderId: { type: 'string', description: 'Unique order identifier' },
    shippingAddress: {
      type: 'object',
      description: 'Destination address',
      properties: {
        country: { type: 'string', description: 'ISO country code' },
      },
      required: ['country'],
    },
    contact: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Contact email' },
      },
    },
    lineItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'Stock keeping unit' },
        },
      },
    },
  },
});

const propertiesByName = (schema: string, format = 'json') => {
  const properties = new Map(extractSchemaProperties(schema, format).map((property) => [property.name, property]));
  return properties;
};

describe('classifyFieldLineage', () => {
  it('matches nested dotted paths and array item paths, and reports paths that are not in the schema', () => {
    const schemaProperties = propertiesByName(orderPlacedSchema);
    const declared = new Map([
      ['orderId', [shippingService]],
      ['shippingAddress.country', [shippingService]],
      ['contact.email', [shippingService]],
      ['lineItems[].sku', [shippingService]],
      ['shippingAddress.countrty', [shippingService]],
      ['notARealField', [shippingService]],
    ]);

    const { matched, unmatched } = classifyFieldLineage(schemaProperties, declared);

    const country = matched.find((row) => row.field === 'shippingAddress.country');
    expect(country?.schema).toMatchObject({ type: 'string', description: 'ISO country code', required: true });
    expect(country?.consumers).toEqual([shippingService]);

    const email = matched.find((row) => row.field === 'contact.email');
    expect(email?.schema).toMatchObject({ type: 'string', description: 'Contact email' });

    const sku = matched.find((row) => row.field === 'lineItems[].sku');
    expect(sku?.schema).toMatchObject({ type: 'string', description: 'Stock keeping unit' });

    const orderId = matched.find((row) => row.field === 'orderId');
    expect(orderId?.schema).toMatchObject({ type: 'string', description: 'Unique order identifier', required: true });
    expect(orderId?.consumers).toEqual([shippingService]);

    expect(matched.map((row) => row.field)).toEqual([
      'contact',
      'contact.email',
      'lineItems',
      'lineItems[].sku',
      'orderId',
      'shippingAddress',
      'shippingAddress.country',
    ]);
    expect(matched.find((row) => row.field === 'shippingAddress')?.consumers).toEqual([]);

    expect(unmatched.map((row) => row.field)).toEqual(['notARealField', 'shippingAddress.countrty']);
    expect(unmatched.every((row) => row.schema === undefined)).toBe(true);
    expect(unmatched.every((row) => row.consumers.length === 1)).toBe(true);
  });

  it('keeps declared fields in the matched table when the message has no schema properties', () => {
    const declared = new Map([['orderId', [shippingService]]]);
    const { matched, unmatched } = classifyFieldLineage(new Map(), declared);

    expect(matched).toEqual([{ field: 'orderId', consumers: [shippingService], schema: undefined }]);
    expect(unmatched).toEqual([]);
  });
});
