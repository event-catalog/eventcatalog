import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { parseProtobufSchema } from '@utils/protobuf-schema';
import AvroSchemaViewer from './AvroSchemaViewer';
import JSONSchemaViewer from './JSONSchemaViewer';
import ProtobufSchemaViewer from './ProtobufSchemaViewer';

const PROPERTY_HOVER_CLASS = 'hover:bg-[rgb(var(--ec-content-hover))]';

describe('schema viewer property hover states', () => {
  it('adds a hover background to JSON Schema properties', () => {
    const html = renderToStaticMarkup(
      <JSONSchemaViewer schema={{ type: 'object', properties: { id: { type: 'string' } } }} search={false} />
    );

    expect(html).toContain(PROPERTY_HOVER_CLASS);
  });

  it('adds a hover background to Avro fields', () => {
    const html = renderToStaticMarkup(
      <AvroSchemaViewer schema={{ type: 'record', name: 'Example', fields: [{ name: 'id', type: 'string' }] }} search={false} />
    );

    expect(html).toContain(PROPERTY_HOVER_CLASS);
  });

  it('adds a hover background to Protobuf fields', () => {
    const schema = parseProtobufSchema('syntax = "proto3"; message Example { string id = 1; }');
    const html = renderToStaticMarkup(<ProtobufSchemaViewer schema={schema} search={false} />);

    expect(html).toContain(PROPERTY_HOVER_CLASS);
  });
});
