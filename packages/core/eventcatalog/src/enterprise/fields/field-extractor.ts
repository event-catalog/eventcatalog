/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

export interface DeepSchemaField {
  path: string;
  type: string;
  description: string;
  required: boolean;
}

export function extractSchemaFieldsDeep(content: string, format: string): DeepSchemaField[] {
  if (!content) return [];

  if (format === 'json-schema') {
    return extractJsonSchemaFields(content);
  }

  if (format === 'avro') {
    return extractAvroFields(content);
  }

  if (format === 'proto') {
    return extractProtoFields(content);
  }

  return [];
}

function extractProtoFields(content: string): DeepSchemaField[] {
  if (!content) return [];
  const fields: DeepSchemaField[] = [];
  const fieldRegex = /^\s*(repeated\s+|optional\s+|required\s+)?(\w+)\s+(\w+)\s*=\s*\d+\s*;(?:\s*\/\/\s*(.*))?/gm;
  let match;
  while ((match = fieldRegex.exec(content)) !== null) {
    const modifier = (match[1] || '').trim();
    const type = modifier ? `${modifier} ${match[2]}` : match[2];
    fields.push({
      path: match[3],
      type,
      description: match[4]?.trim() || '',
      required: modifier === 'required',
    });
  }
  return fields;
}

function extractAvroFields(content: string): DeepSchemaField[] {
  try {
    const schema = JSON.parse(content);
    const fields: DeepSchemaField[] = [];
    walkAvroRecord(schema, '', fields);
    return fields;
  } catch {
    return [];
  }
}

function getAvroTypeName(type: any): string {
  if (typeof type === 'string') return type;
  if (Array.isArray(type)) {
    return type.map((t) => (typeof t === 'string' ? t : t.type || 'complex')).join(' | ');
  }
  if (typeof type === 'object' && type !== null) {
    if (type.type === 'array' && type.items) return `array<${getAvroTypeName(type.items)}>`;
    if (type.type === 'record') return type.name || 'record';
    return type.type || 'complex';
  }
  return 'unknown';
}

function walkAvroRecord(schema: any, prefix: string, fields: DeepSchemaField[]): void {
  if (!schema.fields || !Array.isArray(schema.fields)) return;

  for (const field of schema.fields) {
    const path = prefix ? `${prefix}.${field.name}` : field.name;
    const isOptional = Array.isArray(field.type) && field.type.includes('null');
    const typeName = getAvroTypeName(field.type);

    fields.push({
      path,
      type: typeName,
      description: field.doc || '',
      required: !isOptional,
    });

    // Recurse into nested records
    const innerType = Array.isArray(field.type)
      ? field.type.find((t: any) => typeof t === 'object' && t.type === 'record')
      : typeof field.type === 'object' && field.type.type === 'record'
        ? field.type
        : null;

    if (innerType) {
      walkAvroRecord(innerType, path, fields);
    }

    // Recurse into array items that are records
    const arrayType = Array.isArray(field.type)
      ? field.type.find((t: any) => typeof t === 'object' && t.type === 'array')
      : typeof field.type === 'object' && field.type.type === 'array'
        ? field.type
        : null;

    if (arrayType && typeof arrayType.items === 'object' && arrayType.items.type === 'record') {
      walkAvroRecord(arrayType.items, `${path}[]`, fields);
    }
  }
}

function extractJsonSchemaFields(content: string): DeepSchemaField[] {
  try {
    const schema = JSON.parse(content);
    const fields: DeepSchemaField[] = [];
    walkJsonSchema(schema, '', schema.required || [], schema, fields);
    return fields;
  } catch {
    return [];
  }
}

function walkJsonSchema(node: any, prefix: string, requiredList: string[], rootSchema: any, fields: DeepSchemaField[]): void {
  // Handle allOf by merging (resolve $ref entries first)
  if (node.allOf && Array.isArray(node.allOf)) {
    const merged: any = { type: 'object', properties: {}, required: [] };
    for (let sub of node.allOf) {
      if (sub.$ref) {
        const resolved = resolveLocalRef(sub.$ref, rootSchema);
        if (resolved) sub = resolved;
        else continue;
      }
      Object.assign(merged.properties, sub.properties || {});
      merged.required.push(...(sub.required || []));
    }
    walkJsonSchema(merged, prefix, merged.required, rootSchema, fields);
    return;
  }

  if (!node.properties) return;

  for (const [name, prop] of Object.entries(node.properties) as [string, any][]) {
    const path = prefix ? `${prefix}.${name}` : name;
    const isRequired = requiredList.includes(name);

    // Resolve $ref
    if (prop.$ref) {
      const resolved = resolveLocalRef(prop.$ref, rootSchema);
      if (resolved) {
        const rawRefType = resolved.type || 'object';
        const type = Array.isArray(rawRefType) ? [...rawRefType].sort().join(' | ') : rawRefType;
        fields.push({ path, type, description: resolved.description || '', required: isRequired });
        if (resolved.properties) {
          walkJsonSchema(resolved, path, resolved.required || [], rootSchema, fields);
        }
      } else {
        // External ref — add as-is
        fields.push({ path, type: '$ref', description: '', required: isRequired });
      }
      continue;
    }

    const rawType = prop.type || (prop.enum ? 'enum' : prop.$ref ? '$ref' : 'object');
    const typeList = Array.isArray(rawType) ? rawType : [rawType];
    const type = Array.isArray(rawType) ? [...rawType].sort().join(' | ') : rawType;
    fields.push({ path, type, description: prop.description || '', required: isRequired });

    // Recurse into nested objects (handles both "type": "object" and "type": ["object", "null"])
    if (typeList.includes('object') && prop.properties) {
      walkJsonSchema(prop, path, prop.required || [], rootSchema, fields);
    }

    // Recurse into array items (handles both "type": "array" and "type": ["array", "null"])
    if (typeList.includes('array') && prop.items) {
      if (prop.items.type === 'object' && prop.items.properties) {
        walkJsonSchema(prop.items, `${path}[]`, prop.items.required || [], rootSchema, fields);
      }
    }
  }
}

function resolveLocalRef(ref: string, rootSchema: any): any {
  if (!ref.startsWith('#/')) return null;
  const parts = ref.replace('#/', '').split('/');
  let current = rootSchema;
  for (const part of parts) {
    current = current?.[part];
    if (!current) return null;
  }
  return current;
}
