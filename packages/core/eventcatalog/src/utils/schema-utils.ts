export interface SchemaProperty {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

function getAvroTypeName(type: any): string {
  if (typeof type === 'string') return type;
  if (Array.isArray(type)) {
    return type.map((t) => (typeof t === 'string' ? t : t.type || 'complex')).join(' | ');
  }
  if (typeof type === 'object' && type !== null) {
    if (type.type === 'array' && type.items) {
      return `array<${getAvroTypeName(type.items)}>`;
    }
    return type.type || 'complex';
  }
  return 'unknown';
}

function parseProtoFields(content: string): SchemaProperty[] {
  const properties: SchemaProperty[] = [];
  // Match lines like: string field_name = 1; // optional comment
  // or: repeated string field_name = 2;
  const fieldRegex = /^\s*(repeated\s+|optional\s+|required\s+)?(\w+)\s+(\w+)\s*=\s*\d+\s*;(?:\s*\/\/\s*(.*))?/gm;
  let match;
  while ((match = fieldRegex.exec(content)) !== null) {
    const modifier = (match[1] || '').trim();
    const type = modifier ? `${modifier} ${match[2]}` : match[2];
    properties.push({
      name: match[3],
      type,
      description: match[4]?.trim() || '',
      required: false,
    });
  }
  return properties;
}

export function extractSchemaProperties(content: string, format: string): SchemaProperty[] {
  if (!content) return [];

  if (format === 'proto') {
    return parseProtoFields(content);
  }

  // JSON Schema and Avro are both JSON-based
  try {
    const schema = JSON.parse(content);

    // Avro: has top-level "fields" array
    if (schema.fields && Array.isArray(schema.fields)) {
      return schema.fields.map((field: any) => ({
        name: field.name,
        type: getAvroTypeName(field.type),
        description: field.doc || '',
        required: !Array.isArray(field.type) || !field.type.includes('null'),
      }));
    }

    // JSON Schema: has "properties" object
    if (schema.properties) {
      const required = schema.required || [];
      return Object.entries(schema.properties).map(([name, prop]: [string, any]) => ({
        name,
        type: prop.type || (prop.enum ? 'enum' : prop.$ref ? '$ref' : 'object'),
        description: prop.description || '',
        required: required.includes(name),
      }));
    }
  } catch {
    // Failed to parse, return empty
  }

  return [];
}
