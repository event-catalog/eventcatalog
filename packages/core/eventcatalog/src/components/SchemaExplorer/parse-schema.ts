import { parseProtobufSchema, type ProtobufSchema } from '@utils/protobuf-schema';

/** A schema, parsed for the viewer that shows its properties. Other formats are only shown as code. */
export type ViewableSchema =
  | { kind: 'json'; schema: Record<string, any> }
  | { kind: 'avro'; schema: Record<string, any> }
  | { kind: 'protobuf'; schema: ProtobufSchema }
  | { kind: 'code' };

const parseJson = (content: string) => {
  try {
    return JSON.parse(content);
  } catch {
    return undefined;
  }
};

/**
 * Parses a schema for the JSON Schema, Avro or Protobuf viewer, from its file extension.
 * Used by the Schema Explorer and the MCP server's schema viewer, so both show the same schemas as properties.
 */
export function parseSchemaForViewer(extension: string | undefined, content: string | undefined): ViewableSchema {
  if (!content?.trim()) return { kind: 'code' };

  switch (extension?.toLowerCase()) {
    case 'json': {
      const schema = parseJson(content);
      return schema && (schema.properties || schema.$schema || schema.type) ? { kind: 'json', schema } : { kind: 'code' };
    }
    case 'avro':
    case 'avsc': {
      const schema = parseJson(content);
      return schema?.type ? { kind: 'avro', schema } : { kind: 'code' };
    }
    // The extension falls back to the schema format when the schema has no file path, so accept both
    case 'proto':
    case 'protobuf':
      try {
        return { kind: 'protobuf', schema: parseProtobufSchema(content) };
      } catch {
        return { kind: 'code' };
      }
    default:
      return { kind: 'code' };
  }
}
