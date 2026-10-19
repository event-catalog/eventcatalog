// Event rule: the OrderCreated schema must define and require the fields every consumer relies on.
// Reads the event's JSON schema through the catalog.
//
// This file lives in the OrderCreated folder, so `resource` is the latest OrderCreated event
// (a fitness/ folder inside versioned/<version>/ would get that version instead).
import { defineFitnessFunction } from '@eventcatalog/fitness';

const REQUIRED_FIELDS = ['orderId', 'customerId', 'total', 'currency'];

export default defineFitnessFunction({
  id: 'order-created-schema-has-required-fields',
  name: 'Schema requires the fields consumers rely on',

  async run({ resource, catalog }) {
    if (resource?.type !== 'event') throw new Error('Expected to run alongside an event');
    const event = { type: 'event', id: resource.id, version: resource.version };

    const file = await catalog.getSchemaForMessage(resource.id, resource.version);
    if (!file) {
      return [
        { message: `${resource.name} has no schema`, resources: [event], suggestion: 'Add a JSON schema and set `schemaPath`.' },
      ];
    }

    const schema = JSON.parse(file.schema) as { properties?: Record<string, unknown>; required?: string[] };
    const properties = Object.keys(schema.properties ?? {});
    const required = schema.required ?? [];

    return REQUIRED_FIELDS.filter((field) => !properties.includes(field) || !required.includes(field)).map((field) => ({
      message: properties.includes(field)
        ? `${resource.name} defines '${field}' but doesn't require it`
        : `${resource.name} has no '${field}' field`,
      resources: [event],
      details: `Checked ${file.fileName}`,
      suggestion: `Add '${field}' to the schema's properties and to \`required\`.`,
    }));
  },
});
