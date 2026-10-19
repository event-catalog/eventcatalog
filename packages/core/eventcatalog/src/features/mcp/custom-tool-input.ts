import { fromJsonSchema, type JsonSchemaType, type StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import { asSchema, type FlexibleSchema } from 'ai';
import { z } from 'zod';

/** Zod 4.2+ (and other Standard JSON Schema) schemas, which the MCP SDK lists and validates itself */
const hasJsonSchema = (schema: unknown): schema is StandardSchemaWithJSON =>
  typeof schema === 'object' &&
  schema !== null &&
  typeof (schema as { '~standard'?: { jsonSchema?: { input?: unknown } } })['~standard']?.jsonSchema?.input === 'function';

/**
 * A custom tool's input schema (eventcatalog.chat.js, in the AI SDK's format) for the MCP SDK. Zod 4.2+ schemas are
 * used as they are. The others the AI SDK takes (zod 3, jsonSchema()) are listed from their JSON Schema and validated
 * by the schema itself, so coercion, defaults and transforms work as before: checking the JSON Schema first would turn
 * away input the schema accepts, such as "5" for a coerced number. MCP SDK 2 can't list zod 3 schemas, and one failed
 * tools/list for every tool.
 */
export const toCustomToolInput = async (schema: unknown): Promise<StandardSchemaWithJSON> => {
  if (!schema) return z.object({});
  if (hasJsonSchema(schema)) return schema;

  const { jsonSchema, validate } = asSchema(schema as FlexibleSchema<unknown>);
  const json = (await jsonSchema) as JsonSchemaType;
  // jsonSchema() can leave out a validator, and then the arguments are checked against the JSON Schema
  if (!validate) return fromJsonSchema(json);

  return {
    '~standard': {
      version: 1,
      vendor: 'eventcatalog',
      jsonSchema: { input: () => json, output: () => json },
      validate: async (value) => {
        const result = await validate(value);
        return result.success ? { value: result.value } : { issues: [{ message: result.error.message }] };
      },
    },
  };
};
