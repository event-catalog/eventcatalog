import { fromJsonSchema, type JsonSchemaType, type StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import { asSchema, type FlexibleSchema } from 'ai';
import { z } from 'zod';

type ValidationResult = Awaited<ReturnType<NonNullable<ReturnType<typeof asSchema>['validate']>>>;

/** A custom tool's input, as the MCP SDK takes it */
export type CustomToolInput = {
  inputSchema: StandardSchemaWithJSON;
  /** Parses the arguments with the tool's own schema (its defaults and transforms), when the SDK only has its JSON Schema */
  parse?: (params: unknown) => Promise<ValidationResult>;
};

/** Zod 4.2+ (and other Standard JSON Schema) schemas, which the MCP SDK lists and validates itself */
const hasJsonSchema = (schema: unknown): schema is StandardSchemaWithJSON =>
  typeof schema === 'object' &&
  schema !== null &&
  typeof (schema as { '~standard'?: { jsonSchema?: { input?: unknown } } })['~standard']?.jsonSchema?.input === 'function';

/**
 * A custom tool's input schema (eventcatalog.chat.js, in the AI SDK's format) for the MCP SDK. Zod 4.2+ schemas are
 * used as they are. The others the AI SDK takes (zod 3, jsonSchema()) are listed from their JSON Schema and their
 * arguments parsed by the schema itself: MCP SDK 2 can't list zod 3 schemas, and one failed tools/list for every tool.
 */
export const toCustomToolInput = async (schema: unknown): Promise<CustomToolInput> => {
  if (!schema) return { inputSchema: z.object({}) };
  if (hasJsonSchema(schema)) return { inputSchema: schema };

  const { jsonSchema, validate } = asSchema(schema as FlexibleSchema<unknown>);
  return {
    inputSchema: fromJsonSchema((await jsonSchema) as JsonSchemaType),
    ...(validate && { parse: async (params: unknown) => validate(params) }),
  };
};
