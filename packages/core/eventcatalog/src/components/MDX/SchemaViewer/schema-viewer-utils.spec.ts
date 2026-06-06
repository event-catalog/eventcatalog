import { describe, expect, it } from 'vitest';
import { resolveSchemaViewer } from './schema-viewer-utils';

const currentMessageSchema = {
  id: 'schema:events:OrderPlaced:1.0.0:git://contracts/events/OrderPlaced.schema.json',
  data: {
    ref: 'git://contracts/events/OrderPlaced.schema.json',
    format: 'jsonschema',
    content: '{"type":"object","title":"OrderPlaced"}',
    default: true,
    message: {
      collection: 'events',
      id: 'OrderPlaced',
      version: '1.0.0',
    },
  },
};

describe('resolveSchemaViewer', () => {
  it('uses the current message default schema when no file is set', async () => {
    const schema = await resolveSchemaViewer({
      id: 'OrderPlaced',
      version: '1.0.0',
      collection: 'events',
      filePath: 'events/OrderPlaced/index.mdx',
      schemaViewerProps: {},
      collectionSchemas: [currentMessageSchema],
      index: 0,
    });

    expect(schema.exists).toBe(true);
    expect(schema.schema.title).toBe('OrderPlaced');
    expect(schema.schemaPath).toBe('git://contracts/events/OrderPlaced.schema.json');
  });

  it('does not use the schema collection when a file is set and missing', async () => {
    const schema = await resolveSchemaViewer({
      id: 'OrderPlaced',
      version: '1.0.0',
      collection: 'events',
      filePath: 'events/OrderPlaced/index.mdx',
      schemaViewerProps: {
        file: 'missing-schema.json',
      },
      collectionSchemas: [currentMessageSchema],
      index: 0,
    });

    expect(schema.exists).toBe(false);
    expect(schema.schema).toBeUndefined();
    expect(schema.schemaKey).toBe('missing-schema.json');
  });
});
