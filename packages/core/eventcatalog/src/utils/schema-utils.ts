import { extractSchemaFieldsDeep } from '@enterprise/fields/field-extractor';

export interface SchemaProperty {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

/**
 * Formats the deep extractor understands. File extensions and catalog format
 * labels are normalized onto these before parsing.
 */
const toDeepSchemaFormats = (format: string): string[] => {
  const normalized = format.toLowerCase().replace(/^\./, '');

  if (normalized === 'proto' || normalized === 'protobuf') return ['proto'];
  if (normalized === 'avro' || normalized === 'avsc') return ['avro', 'json-schema'];

  // json, jsonschema, yaml, and unknown labels: JSON Schema first, then Avro
  // records that were stored as JSON.
  return ['json-schema', 'avro'];
};

/**
 * Schema properties used by the Field Usage page.
 * Names are dotted paths (`shippingAddress.country`) and array items use `[]`
 * (`lineItems[].sku`), matching the Fields Explorer extractor.
 */
export function extractSchemaProperties(content: string, format: string): SchemaProperty[] {
  if (!content) return [];

  for (const deepFormat of toDeepSchemaFormats(format)) {
    const fields = extractSchemaFieldsDeep(content, deepFormat);
    if (fields.length === 0) continue;

    return fields.map((field) => ({
      name: field.path,
      type: field.type,
      description: field.description,
      required: field.required,
    }));
  }

  return [];
}
