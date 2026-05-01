import fs from 'node:fs';
import path from 'node:path';
import * as recast from 'recast';
import babelParser from 'recast/parsers/babel.js';

const b = recast.types.builders;
type ASTNode = recast.types.ASTNode;
type ObjectExpression = recast.types.namedTypes.ObjectExpression;
type Property = recast.types.namedTypes.Property;
type ObjectProperty = recast.types.namedTypes.ObjectProperty;

export type ConfigPrimitive = string | boolean;

export type ConfigUpdate = {
  // Primitive value → set; `null` → remove; object → recurse one level.
  [key: string]: ConfigPrimitive | null | NestedConfigUpdate;
};

type NestedConfigUpdate = {
  [key: string]: ConfigPrimitive | null;
};

const projectRoot = () => process.env.PROJECT_DIR ?? process.cwd();

export const getConfigPath = () => path.join(projectRoot(), 'eventcatalog.config.js');

export const readConfigSource = (): string => fs.readFileSync(getConfigPath(), 'utf8');

const parse = (source: string) => recast.parse(source, { parser: babelParser });

const isObjectProperty = (n: any): n is Property | ObjectProperty => n && (n.type === 'ObjectProperty' || n.type === 'Property');

const propertyKeyName = (prop: Property | ObjectProperty): string | null => {
  const key: any = prop.key;
  if (!key) return null;
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'Literal' || key.type === 'StringLiteral') return String(key.value);
  return null;
};

const findExportedObject = (ast: ASTNode): ObjectExpression => {
  let result: ObjectExpression | null = null;
  recast.visit(ast, {
    visitExportDefaultDeclaration(p) {
      const decl: any = p.node.declaration;
      if (decl?.type === 'ObjectExpression') {
        result = decl as ObjectExpression;
      } else if (decl?.type === 'TSAsExpression' && decl.expression?.type === 'ObjectExpression') {
        result = decl.expression as ObjectExpression;
      }
      return false;
    },
  });
  if (!result) throw new Error('Could not find `export default { ... }` in eventcatalog.config.js');
  return result;
};

const findProperty = (obj: ObjectExpression, name: string): (Property | ObjectProperty) | null => {
  for (const prop of obj.properties) {
    if (isObjectProperty(prop) && propertyKeyName(prop) === name) return prop as Property | ObjectProperty;
  }
  return null;
};

const removeProperty = (obj: ObjectExpression, name: string): boolean => {
  const idx = obj.properties.findIndex((p) => isObjectProperty(p) && propertyKeyName(p) === name);
  if (idx === -1) return false;
  obj.properties.splice(idx, 1);
  return true;
};

const buildLiteral = (value: ConfigPrimitive) => (typeof value === 'boolean' ? b.booleanLiteral(value) : b.stringLiteral(value));

const setPrimitiveProperty = (obj: ObjectExpression, name: string, value: ConfigPrimitive) => {
  const existing = findProperty(obj, name);
  const literal = buildLiteral(value);
  if (existing) {
    (existing as any).value = literal;
    return;
  }
  obj.properties.push(b.property('init', b.identifier(name), literal) as any);
};

const ensureNestedObject = (obj: ObjectExpression, name: string): ObjectExpression => {
  const existing = findProperty(obj, name);
  if (existing && (existing as any).value?.type === 'ObjectExpression') {
    return (existing as any).value as ObjectExpression;
  }
  const fresh = b.objectExpression([]);
  if (existing) {
    (existing as any).value = fresh;
  } else {
    obj.properties.push(b.property('init', b.identifier(name), fresh) as any);
  }
  return fresh;
};

const removeNestedObjectIfEmpty = (obj: ObjectExpression, name: string) => {
  const existing = findProperty(obj, name);
  if (!existing) return;
  const value: any = (existing as any).value;
  if (value?.type === 'ObjectExpression' && value.properties.length === 0) {
    removeProperty(obj, name);
  }
};

/**
 * Apply an update to eventcatalog.config.js, preserving formatting/comments via recast.
 *
 * - String value → replace existing or insert new property
 * - `null` value → remove property if present
 * - Nested object value → recurse one level (sufficient for v1 fields like `logo`)
 *
 * Returns the updated source. Caller is responsible for writing it.
 */
export const applyConfigUpdate = (source: string, update: ConfigUpdate): string => {
  const ast = parse(source);
  const root = findExportedObject(ast);

  for (const [key, value] of Object.entries(update)) {
    if (value === null) {
      removeProperty(root, key);
      continue;
    }
    if (typeof value === 'string' || typeof value === 'boolean') {
      setPrimitiveProperty(root, key, value);
      continue;
    }
    // nested object update
    const nested = ensureNestedObject(root, key);
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      if (nestedValue === null) {
        removeProperty(nested, nestedKey);
      } else if (typeof nestedValue === 'string' || typeof nestedValue === 'boolean') {
        setPrimitiveProperty(nested, nestedKey, nestedValue);
      }
    }
    removeNestedObjectIfEmpty(root, key);
  }

  return recast.print(ast, { quote: 'single' }).code;
};

export const writeConfigUpdate = (update: ConfigUpdate): string => {
  const source = readConfigSource();
  const updated = applyConfigUpdate(source, update);
  fs.writeFileSync(getConfigPath(), updated, 'utf8');
  return updated;
};
