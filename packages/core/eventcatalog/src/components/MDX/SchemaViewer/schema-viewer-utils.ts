import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { load as loadYaml } from 'js-yaml';
import { getAbsoluteFilePathForAstroFile, isAvroSchema } from '../../../utils/files';

type SchemaViewerProps = {
  id?: string;
  file?: string;
  [key: string]: any;
};

type CollectionSchema = {
  id: string;
  data: {
    content?: string;
    file?: string;
    filePath?: string;
    ref?: string;
    format?: string;
    default?: boolean;
    source?: {
      path?: string;
      branch?: string;
    };
    message?: {
      collection: string;
      id: string;
      version: string;
    };
  };
};

type ResolveSchemaViewerOptions = {
  id: string;
  version?: string;
  collection?: string;
  filePath: string;
  schemaViewerProps: SchemaViewerProps;
  collectionSchemas: CollectionSchema[];
  index: number;
};

export const getSchemaViewerKey = (schemaViewerProps: SchemaViewerProps) => schemaViewerProps.file || 'default';

const isYamlSchema = (schemaPath?: string, format?: string) =>
  schemaPath?.endsWith('.yml') || schemaPath?.endsWith('.yaml') || format === 'yaml';

const isAvroSchemaReference = (schemaPath?: string, format?: string) =>
  format === 'avro' || (schemaPath ? isAvroSchema(schemaPath) : false);

const parseSchemaContent = (content: string, schemaPath?: string, format?: string) => {
  if (isYamlSchema(schemaPath, format)) return loadYaml(content);
  return JSON.parse(content);
};

const shouldRenderSchema = (schema: any, isAvro: boolean) => {
  if (isAvro) return true;
  return schema?.['x-eventcatalog-render-schema-viewer'] !== undefined ? schema['x-eventcatalog-render-schema-viewer'] : true;
};

const getCollectionSchemaForViewer = ({
  collectionSchemas,
  collection,
  id,
  version,
}: Pick<ResolveSchemaViewerOptions, 'collectionSchemas' | 'collection' | 'id' | 'version'>) => {
  if (!collection || !version) return undefined;

  const resourceSchemas = collectionSchemas.filter((schema) => {
    const message = schema.data.message;
    if (!message) return false;
    return message.collection === collection && message.id === id && message.version === version;
  });

  return resourceSchemas.find((schema) => schema.data.default) || resourceSchemas[0];
};

const getCollectionSchemaPath = (schema?: CollectionSchema) =>
  schema?.data.filePath || schema?.data.file || schema?.data.source?.path || schema?.data.ref;

export const resolveSchemaViewer = async ({
  id,
  version,
  collection,
  filePath,
  schemaViewerProps,
  collectionSchemas,
  index,
}: ResolveSchemaViewerOptions) => {
  const schemaKey = getSchemaViewerKey(schemaViewerProps);
  const localSchemaPath = schemaViewerProps.file ? getAbsoluteFilePathForAstroFile(filePath, schemaViewerProps.file) : undefined;
  const localSchemaExists = localSchemaPath ? existsSync(localSchemaPath) : false;

  let schema;
  let render = true;
  let isAvro = false;
  let schemaPath = localSchemaPath;
  let parseError;

  if (localSchemaExists && localSchemaPath) {
    isAvro = isAvroSchema(localSchemaPath);
    const content = await readFile(localSchemaPath, 'utf-8');
    schema = parseSchemaContent(content, localSchemaPath);
    render = shouldRenderSchema(schema, isAvro);
  } else if (!schemaViewerProps.file) {
    const collectionSchema = getCollectionSchemaForViewer({ collectionSchemas, collection, id, version });
    const content = collectionSchema?.data.content;
    schemaPath = getCollectionSchemaPath(collectionSchema);

    if (content) {
      try {
        isAvro = isAvroSchemaReference(schemaPath, collectionSchema?.data.format);
        schema = parseSchemaContent(content, schemaPath, collectionSchema?.data.format);
        render = shouldRenderSchema(schema, isAvro);
      } catch (error) {
        parseError = error instanceof Error ? error.message : 'Unknown parsing error';
      }
    }
  }

  return {
    id: schemaViewerProps.id || id,
    exists: localSchemaExists || schema !== undefined,
    schema,
    schemaPath,
    schemaKey,
    isAvroSchema: isAvro,
    parseError,
    ...schemaViewerProps,
    render,
    index,
  };
};
