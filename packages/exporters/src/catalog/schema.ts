import { load as loadYaml } from 'js-yaml';
import type { Attribute, AttributeVariant, ParsedSchema } from './model';
import {
  parseProtobufSchema,
  type ProtobufEnum,
  type ProtobufField,
  type ProtobufMessage,
  type ProtobufSchema,
} from './vendor/protobuf-schema';
import {
  formatProtobufOptionValue,
  formatProtovalidateRule,
  getCustomFieldAnnotations,
  getProtovalidateRules,
  isProtovalidateRequired,
} from './vendor/protobuf-validation';

/**
 * Turns a message schema into the attributes the reference lists. The rules follow the catalog's
 * own schema viewers (JSONSchemaViewer, AvroSchemaViewer, ProtobufSchemaViewer in core) so a field
 * reads the same in the exported document as it does in EventCatalog.
 */

const MAX_DEPTH = 8;

type JsonSchema = Record<string, any>;

const isObject = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);
const stringify = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v));
const hasType = (type: unknown, candidate: string) => (Array.isArray(type) ? type.includes(candidate) : type === candidate);

// ---------- JSON Schema ----------

const resolvePointer = (root: JsonSchema, ref: string): JsonSchema | undefined => {
  if (!ref.startsWith('#/')) return undefined;
  let node: any = root;
  for (const part of ref.slice(2).split('/')) {
    const key = decodeURIComponent(part).replace(/~1/g, '/').replace(/~0/g, '~');
    if (!isObject(node) && !Array.isArray(node)) return undefined;
    node = (node as any)[key];
  }
  return isObject(node) ? node : undefined;
};

/** Properties a variant rules out with `not: { required: [...] }`. */
const forbiddenVariantProperties = (variant: JsonSchema): string[] => {
  const forbidden = variant?.not?.required;
  if (Array.isArray(forbidden)) return forbidden;
  if (Array.isArray(variant?.not?.anyOf))
    return variant.not.anyOf.flatMap((s: JsonSchema) => (Array.isArray(s?.required) ? s.required : []));
  return [];
};

/**
 * Resolves $ref (definitions, $defs, components/schemas or any local pointer), merges allOf and
 * expands oneOf/anyOf into variants. Mirrors processSchema in core's JSONSchemaViewer.
 */
const processJsonSchema = (schema: JsonSchema, root: JsonSchema, seen: Set<string>, depth = 0): JsonSchema => {
  if (!isObject(schema) || depth > MAX_DEPTH) return schema;

  if (typeof schema.$ref === 'string') {
    const ref = schema.$ref;
    const name = ref.split('/').pop() || ref;
    if (seen.has(ref)) return { type: 'object', title: name, description: schema.description, _circular: true };
    const target = resolvePointer(root, ref);
    if (!target) return { type: 'string', title: name, description: `Reference to ${ref} (definition not found in the schema)` };
    const { $ref, ...siblings } = schema;
    const resolved = processJsonSchema(target, root, new Set(seen).add(ref), depth + 1);
    return { ...resolved, ...siblings, _refName: name };
  }

  if (Array.isArray(schema.allOf)) {
    const merged: JsonSchema = {
      ...schema,
      properties: { ...(schema.properties || {}) },
      required: [...(schema.required || [])],
    };
    delete merged.allOf;
    for (const part of schema.allOf) {
      const p = processJsonSchema(part, root, seen, depth + 1);
      Object.assign(merged.properties, p.properties || {});
      merged.required.push(...(p.required || []));
      if (!merged.type && p.type) merged.type = p.type;
      if (!merged.description && p.description) merged.description = p.description;
      if (!merged._refName && p._refName) merged._refName = p._refName;
    }
    return processJsonSchema(merged, root, seen, depth + 1);
  }

  const out: JsonSchema = { ...schema };
  if (isObject(schema.properties)) {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([k, v]) => [k, processJsonSchema(v as JsonSchema, root, seen, depth + 1)])
    );
  }
  if (hasType(schema.type, 'array') && isObject(schema.items)) out.items = processJsonSchema(schema.items, root, seen, depth + 1);

  const variants = schema.oneOf || schema.anyOf;
  if (Array.isArray(variants)) {
    out.variantType = schema.oneOf ? 'oneOf' : 'anyOf';
    out.variants = variants.map((v: JsonSchema, i: number) => {
      const pv = processJsonSchema(v, root, seen, depth + 1);
      const forbidden = new Set(forbiddenVariantProperties(pv));
      const properties = Object.fromEntries(
        Object.entries({ ...(out.properties || {}), ...(pv.properties || {}) }).filter(([k]) => !forbidden.has(k))
      );
      return {
        ...pv,
        title: pv.title || v.title || pv._refName || pv.$id || `Option ${i + 1}`,
        required: [...new Set([...(schema.required || []), ...(pv.required || [])])],
        properties,
      };
    });
  }
  return out;
};

const jsonTypeLabel = (s: JsonSchema): string => {
  if (s.variants) return s.variantType;
  if (s.const !== undefined && !s.type) return typeof s.const;
  let type = Array.isArray(s.type) ? s.type.filter((t: string) => t !== 'null').join(' | ') : s.type;
  if (!type) type = s.properties ? 'object' : s.enum ? (typeof s.enum[0] === 'number' ? 'number' : 'string') : 'any';
  if (type === 'array') {
    const items = isObject(s.items) ? s.items : {};
    const itemType = items._refName || items.title || (items.variants ? items.variantType : jsonTypeLabel(items));
    return `array of ${itemType}`;
  }
  if (type === 'object' && s._refName) return `object ${s._refName}`;
  return type;
};

const jsonConstraints = (s: JsonSchema): Attribute['constraints'] => {
  const out: { label: string; value?: string }[] = [];
  const add = (label: string, value: unknown) => value !== undefined && out.push({ label, value: stringify(value) });
  add('Constant', s.const);
  add('Pattern', s.pattern);
  add('Minimum', s.minimum);
  add('Maximum', s.maximum);
  add('Greater than', s.exclusiveMinimum);
  add('Less than', s.exclusiveMaximum);
  add('Multiple of', s.multipleOf);
  add('Min length', s.minLength);
  add('Max length', s.maxLength);
  add('Min items', s.minItems);
  add('Max items', s.maxItems);
  if (s.uniqueItems) out.push({ label: 'Unique items' });
  if (s.readOnly) out.push({ label: 'Read only' });
  if (s.writeOnly) out.push({ label: 'Write only' });
  if (Array.isArray(s.type) && s.type.includes('null')) out.push({ label: 'Nullable' });
  if (s.nullable === true) out.push({ label: 'Nullable' });
  return out.length ? out : undefined;
};

const jsonVariants = (s: JsonSchema, depth: number): AttributeVariant[] | undefined =>
  Array.isArray(s.variants)
    ? s.variants.map((v: JsonSchema) => ({
        title: String(v.title),
        description: v.description,
        children: jsonAttributes(v, depth + 1),
      }))
    : undefined;

const jsonAttributes = (s: JsonSchema, depth: number): Attribute[] => {
  if (!isObject(s?.properties) || depth > MAX_DEPTH) return [];
  const required = new Set<string>(Array.isArray(s.required) ? s.required : []);

  return Object.entries(s.properties).map(([name, raw]) => {
    const p: JsonSchema = isObject(raw) ? raw : {};
    const attr: Attribute = { name, type: jsonTypeLabel(p), required: required.has(name) };
    const items: JsonSchema = isObject(p.items) ? p.items : {};

    if (p.format || items.format) attr.format = p.format || items.format;
    if (p.description) attr.description = p.description;
    if (p.title && p.title !== p.description && p.title !== p._refName) attr.title = p.title;
    if (p.deprecated) attr.deprecated = true;
    const enumValues = p.enum || items.enum;
    if (Array.isArray(enumValues)) {
      attr.enum = enumValues.map(stringify);
      // Keep numbers, booleans and null as themselves in the generated TypeScript
      if (enumValues.some((v) => typeof v !== 'string')) attr.enumLiterals = enumValues.map((v) => JSON.stringify(v));
    }
    const example = Array.isArray(p.examples) ? p.examples[0] : p.example;
    if (example !== undefined && !isObject(example) && !Array.isArray(example)) attr.example = stringify(example);
    if (p.default !== undefined) attr.default = stringify(p.default);
    attr.constraints = jsonConstraints(p);

    const nested = p.variants ? undefined : hasType(p.type, 'array') ? items : p;
    const children = nested ? jsonAttributes(nested, depth + 1) : [];
    if (children.length) attr.children = children;
    const variants = jsonVariants(p.variants ? p : items, depth);
    if (variants) {
      attr.variants = variants;
      attr.variantType = (p.variants ? p : items).variantType;
    }
    return attr;
  });
};

const exampleFromJsonSchema = (s: JsonSchema, depth = 0): unknown => {
  if (!isObject(s)) return null;
  if (Array.isArray(s.examples) && s.examples.length) return s.examples[0];
  if (s.example !== undefined) return s.example;
  if (s.const !== undefined) return s.const;
  if (s.default !== undefined) return s.default;
  if (Array.isArray(s.enum) && s.enum.length) return s.enum[0];
  if (depth > MAX_DEPTH) return null;
  if (Array.isArray(s.variants) && s.variants.length) return exampleFromJsonSchema(s.variants[0], depth + 1);

  const type = Array.isArray(s.type) ? s.type.find((t: string) => t !== 'null') : s.type || (s.properties ? 'object' : undefined);
  switch (type) {
    case 'object':
      return Object.fromEntries(
        Object.entries(s.properties || {}).map(([k, v]) => [k, exampleFromJsonSchema(v as JsonSchema, depth + 1)])
      );
    case 'array':
      return [exampleFromJsonSchema(s.items, depth + 1)];
    case 'integer':
    case 'number':
      return typeof s.minimum === 'number' ? s.minimum : 0;
    case 'boolean':
      return true;
    case 'string':
      return exampleString(s.format);
    default:
      return null;
  }
};

const exampleString = (format?: string) => {
  switch (format) {
    case 'date-time':
      return '2026-01-01T12:00:00Z';
    case 'date':
      return '2026-01-01';
    case 'time':
      return '12:00:00';
    case 'uuid':
      return '3f6b2b8e-9a4c-4f0e-8f2a-1c2d3e4f5a6b';
    case 'email':
      return 'jane@example.com';
    case 'uri':
    case 'url':
      return 'https://example.com';
    default:
      return 'string';
  }
};

// ---------- Avro (mirrors AvroSchemaViewer) ----------

const formatAvroType = (type: any): string => {
  if (typeof type === 'string') return type;
  if (Array.isArray(type)) return type.map(formatAvroType).join(' | ');
  if (isObject(type)) {
    if (type.type === 'array') return `array<${formatAvroType(type.items)}>`;
    if (type.type === 'map') return `map<${formatAvroType(type.values)}>`;
    if (type.type === 'record') return `record: ${type.name || 'unnamed'}`;
    if (type.type === 'enum') return `enum: ${type.name || 'unnamed'}`;
    if (type.type === 'fixed') return `fixed: ${type.name || 'unnamed'} (${type.size} bytes)`;
    if (type.logicalType) return `${type.type} (${type.logicalType})`;
    return type.type || 'unknown';
  }
  return 'unknown';
};

/** Finds a record or enum nested in arrays, maps and unions. */
const nestedAvroType = (type: any, target: 'record' | 'enum'): any => {
  if (Array.isArray(type)) {
    for (const t of type) {
      const found = nestedAvroType(t, target);
      if (found) return found;
    }
    return null;
  }
  if (!isObject(type)) return null;
  if (type.type === target) return type;
  if (type.type === 'array') return nestedAvroType(type.items, target);
  if (type.type === 'map') return nestedAvroType(type.values, target);
  return null;
};

/** A field is optional when it has a default or its type is (or includes) null. */
const isAvroFieldRequired = (field: any) =>
  !('default' in field) && field.type !== 'null' && !(Array.isArray(field.type) && field.type.includes('null'));

const avroAttributes = (record: any, depth: number, ancestors: string[] = []): Attribute[] => {
  if (!isObject(record) || !Array.isArray(record.fields) || depth > MAX_DEPTH) return [];
  return record.fields.map((f: any) => {
    const attr: Attribute = { name: f.name, type: formatAvroType(f.type), required: isAvroFieldRequired(f) };
    if (f.doc) attr.description = f.doc;
    if ('default' in f) attr.default = stringify(f.default);
    if (f.deprecated) attr.deprecated = true;
    const enumType = nestedAvroType(f.type, 'enum');
    if (enumType?.symbols) attr.enum = enumType.symbols;
    if (Array.isArray(f.aliases) && f.aliases.length) attr.constraints = [{ label: 'Aliases', value: f.aliases.join(', ') }];
    const recordType = nestedAvroType(f.type, 'record');
    if (recordType && !ancestors.includes(recordType.name)) {
      const children = avroAttributes(recordType, depth + 1, [...ancestors, recordType.name]);
      if (children.length) attr.children = children;
    }
    return attr;
  });
};

// ---------- Protobuf (mirrors ProtobufSchemaViewer) ----------

interface TypeRegistry {
  messages: Map<string, ProtobufMessage>;
  enums: Map<string, ProtobufEnum>;
}

const buildTypeRegistry = (schema: ProtobufSchema): TypeRegistry => {
  const registry: TypeRegistry = { messages: new Map(), enums: new Map() };
  const register = <T>(map: Map<string, T>, qualified: string, simple: string, value: T) => {
    map.set(qualified, value);
    if (!map.has(simple)) map.set(simple, value);
  };
  const walk = (messages: ProtobufMessage[], enums: ProtobufEnum[], prefix: string) => {
    enums.forEach((e) => register(registry.enums, prefix ? `${prefix}.${e.name}` : e.name, e.name, e));
    messages.forEach((m) => {
      const qualified = prefix ? `${prefix}.${m.name}` : m.name;
      register(registry.messages, qualified, m.name, m);
      walk(m.messages, m.enums, qualified);
    });
  };
  walk(schema.messages, schema.enums, '');
  return registry;
};

const lookupType = <T>(map: Map<string, T>, typeName: string, packageName?: string): T | undefined => {
  const normalized = typeName.startsWith('.') ? typeName.slice(1) : typeName;
  const candidates = [normalized];
  if (packageName && normalized.startsWith(`${packageName}.`)) candidates.push(normalized.slice(packageName.length + 1));
  const last = normalized.split('.').pop();
  if (last && last !== normalized) candidates.push(last);
  for (const c of candidates) {
    const match = map.get(c);
    if (match) return match;
  }
  return undefined;
};

const compactTypeName = (typeName: string) =>
  (typeName.startsWith('.') ? typeName.slice(1) : typeName).split('.').pop() || typeName;

const protobufAttributes = (
  message: ProtobufMessage,
  registry: TypeRegistry,
  pkg: string | undefined,
  depth: number,
  ancestors: string[]
): Attribute[] => {
  if (depth > MAX_DEPTH) return [];
  return message.fields.map((field: ProtobufField) => {
    const target = field.map ? field.map.valueType : field.type;
    const nestedMessage = lookupType(registry.messages, target, pkg);
    const nestedEnum = nestedMessage ? undefined : lookupType(registry.enums, target, pkg);
    const base = field.map ? `map<${field.map.keyType}, ${compactTypeName(field.map.valueType)}>` : compactTypeName(field.type);
    const rules = getProtovalidateRules(field).filter((r) => r.path !== 'required');

    const attr: Attribute = {
      name: field.name,
      type: field.label ? `${field.label} ${base}` : base,
      required: isProtovalidateRequired(field) || field.label === 'required',
    };
    if (field.doc) attr.description = field.doc;
    if (nestedEnum) attr.enum = nestedEnum.values.map((v) => v.name);
    const constraints = [
      ...(field.number !== undefined ? [{ label: 'Field number', value: String(field.number) }] : []),
      ...(field.oneof ? [{ label: 'One of', value: field.oneof }] : []),
      ...rules.map(formatProtovalidateRule),
      ...getCustomFieldAnnotations(field).map((a) => ({ label: a.name, value: formatProtobufOptionValue(a.value) })),
    ];
    if (field.options?.some((o) => o.name === 'deprecated' && o.value === true)) attr.deprecated = true;
    if (constraints.length) attr.constraints = constraints;
    if (nestedMessage && !ancestors.includes(nestedMessage.name)) {
      const children = protobufAttributes(nestedMessage, registry, pkg, depth + 1, [...ancestors, nestedMessage.name]);
      if (children.length) attr.children = children;
    }
    return attr;
  });
};

/** The message the schema describes: the one named like the catalog message, else the first top-level message. */
const rootProtobufMessage = (schema: ProtobufSchema, typeName: string) => {
  const wanted = toTypeName(typeName).toLowerCase();
  return schema.messages.find((m) => m.name.toLowerCase() === wanted) || schema.messages[0];
};

// ---------- TypeScript ----------

const TS_PRIMITIVES: Record<string, string> = {
  integer: 'number',
  number: 'number',
  string: 'string',
  boolean: 'boolean',
  null: 'null',
  long: 'number',
  int: 'number',
  float: 'number',
  double: 'number',
  bytes: 'string',
};

/** 'string (date-time)' -> 'string'. Plain string work, so odd type names can't make it slow. */
const withoutFormat = (type: string) => {
  const open = type.lastIndexOf(' (');
  return open !== -1 && type.endsWith(')') ? type.slice(0, open) : type;
};

const tsType = (a: Attribute, indent: string): string => {
  // JSON Schema: 'array of string', Protobuf: 'repeated string', Avro: 'array<string>'
  const avroItems = a.type.startsWith('array<') && a.type.endsWith('>') ? a.type.slice(6, -1) : undefined;
  const isArray = avroItems !== undefined || a.type.startsWith('array of ') || a.type.startsWith('repeated ');
  const base = avroItems ?? a.type.replace(/^(array of |repeated )/, '');
  let t: string;
  if (a.enum?.length) t = (a.enumLiterals ?? a.enum.map((v) => JSON.stringify(v))).join(' | ');
  else if (a.children?.length) t = tsObject(a.children, indent);
  else if (a.variants?.length)
    t = a.variants.map((v) => (v.children.length ? tsObject(v.children, indent) : 'unknown')).join(' | ');
  else
    t = base
      .split(' | ')
      .map((p) => TS_PRIMITIVES[withoutFormat(p)] || 'unknown')
      .join(' | ');
  return isArray ? (t.includes(' | ') ? `(${t})[]` : `${t}[]`) : t;
};

const tsObject = (attrs: Attribute[], indent: string): string => {
  const inner = indent + '  ';
  const lines = attrs.map((a) => {
    const doc = a.description ? `${inner}/** ${a.description.replace(/\*\//g, '*\\/').replace(/\s+/g, ' ').trim()} */\n` : '';
    const key = /^[A-Za-z_$][\w$]*$/.test(a.name) ? a.name : JSON.stringify(a.name);
    return `${doc}${inner}${key}${a.required ? '' : '?'}: ${tsType(a, inner)};`;
  });
  return `{\n${lines.join('\n')}\n${indent}}`;
};

export const toTypeName = (id: string) =>
  id
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('') || 'Message';

export const attributesToTypeScript = (name: string, attrs: Attribute[], doc?: string) => {
  const header = doc ? `/** ${doc.replace(/\*\//g, '*\\/').replace(/\s+/g, ' ').trim()} */\n` : '';
  return `${header}export interface ${toTypeName(name)} ${tsObject(attrs, '')}`;
};

// ---------- entry point ----------

const parseStructured = (ext: string, content: string): any => {
  try {
    if (ext === 'json' || ext === 'avsc' || ext === 'avro') return JSON.parse(content);
    if (ext === 'yaml' || ext === 'yml') return loadYaml(content);
  } catch {
    return undefined;
  }
  return undefined;
};

/**
 * Parses a message schema file into attributes, an example payload and a TypeScript type.
 * Formats the catalog cannot show as properties keep their raw text so the reference still shows them.
 */
export const parseSchema = (fileName: string, content: string, typeName: string, summary?: string): ParsedSchema => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const typescript = (attributes: Attribute[], doc?: string) =>
    attributes.length ? attributesToTypeScript(typeName, attributes, doc || summary) : undefined;

  if (ext === 'proto' || ext === 'protobuf') {
    try {
      const schema = parseProtobufSchema(content);
      const root = rootProtobufMessage(schema, typeName);
      if (root) {
        const attributes = protobufAttributes(root, buildTypeRegistry(schema), schema.package, 0, [root.name]);
        return {
          format: 'protobuf',
          fileName,
          raw: content.trimEnd(),
          description: root.doc,
          attributes,
          typescript: typescript(attributes, root.doc),
        };
      }
    } catch {
      // Unparseable proto files fall through to raw text.
    }
    return { format: 'protobuf', fileName, raw: content.trimEnd(), attributes: [] };
  }

  const parsed = parseStructured(ext, content);

  if (isObject(parsed) && (ext === 'avsc' || ext === 'avro' || (parsed.type === 'record' && Array.isArray(parsed.fields)))) {
    const attributes = avroAttributes(parsed, 0, [parsed.name]);
    return {
      format: 'avro',
      fileName,
      raw: JSON.stringify(parsed, null, 2),
      description: parsed.doc,
      attributes,
      typescript: typescript(attributes, parsed.doc),
    };
  }

  if (
    isObject(parsed) &&
    (parsed.properties || parsed.$schema || parsed.type || parsed.oneOf || parsed.anyOf || parsed.allOf || parsed.$ref)
  ) {
    let processed = processJsonSchema(parsed, parsed, new Set());
    // A root array documents its items, as the catalog's viewer does.
    if (hasType(processed.type, 'array') && isObject(processed.items))
      processed = { ...processed.items, description: processed.description || processed.items.description };
    const attributes = jsonAttributes(processed, 0);
    const variants = jsonVariants(processed, 0);
    return {
      format: 'json-schema',
      fileName,
      raw: ext === 'json' ? JSON.stringify(parsed, null, 2) : content.trimEnd(),
      description: processed.description,
      attributes,
      variants,
      variantType: variants ? processed.variantType : undefined,
      example: exampleFromJsonSchema(processed),
      typescript: typescript(attributes, processed.description),
    };
  }

  return { format: ext || 'text', fileName, raw: content.trimEnd(), attributes: [] };
};
