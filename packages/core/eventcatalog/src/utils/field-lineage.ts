import type { SchemaProperty } from '@utils/schema-utils';

export type FieldLineageConsumer = {
  resourceId: string;
  resourceName: string;
  resourceVersion: string;
  direction: 'receives' | 'sends';
};

export type FieldLineageRow = {
  field: string;
  consumers: FieldLineageConsumer[];
  schema?: SchemaProperty;
};

/**
 * Split declared consumer fields into rows that exist in the schema and rows
 * that do not. Every schema path is listed, including paths with no consumers.
 * When no schema properties were extracted, declared fields stay in the matched
 * table so usage is still visible without type metadata.
 */
export const classifyFieldLineage = (
  schemaProperties: Map<string, SchemaProperty>,
  declaredFields: Map<string, FieldLineageConsumer[]>
): { matched: FieldLineageRow[]; unmatched: FieldLineageRow[] } => {
  const fieldMap = new Map<string, FieldLineageConsumer[]>(declaredFields);

  for (const name of schemaProperties.keys()) {
    if (!fieldMap.has(name)) fieldMap.set(name, []);
  }

  const hasSchema = schemaProperties.size > 0;
  const matched: FieldLineageRow[] = [];
  const unmatched: FieldLineageRow[] = [];

  for (const [field, consumers] of fieldMap) {
    const schema = schemaProperties.get(field);
    if (!hasSchema || schema) {
      matched.push({ field, consumers, schema });
    } else if (consumers.length > 0) {
      unmatched.push({ field, consumers });
    }
  }

  matched.sort((a, b) => a.field.localeCompare(b.field));
  unmatched.sort((a, b) => a.field.localeCompare(b.field));

  return { matched, unmatched };
};
