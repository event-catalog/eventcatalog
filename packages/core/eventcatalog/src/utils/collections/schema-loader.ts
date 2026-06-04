import type { Loader } from 'astro/loaders';
import { glob } from 'glob';
import matter from 'gray-matter';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { sortVersioned } from './util';

type MessageCollection = 'events' | 'commands' | 'queries';

type SchemaReference = {
  id?: string;
  file?: string;
  path?: string;
  name?: string;
  format?: string;
  environments?: string[];
  default?: boolean;
};

type MessageFrontmatter = {
  id?: string;
  name?: string;
  version?: string;
  summary?: string;
  owners?: string[];
  schemaPath?: string;
  schemas?: SchemaReference[];
};

export type MessageSchemaResource = {
  id: string;
  name?: string;
  version?: string;
  format: string;
  content?: string;
  file?: string;
  filePath?: string;
  environments?: string[];
  default?: boolean;
  latest?: boolean;
  message: {
    collection: MessageCollection;
    id: string;
    name?: string;
    version: string;
    summary?: string;
    owners?: string[];
  };
  source: {
    provider: 'file';
    path: string;
  };
};

type SchemaLoaderOptions = {
  messages: {
    pattern: string[];
    base?: string;
  };
};

type LoaderContext = Parameters<Loader['load']>[0];

const MESSAGE_COLLECTIONS: MessageCollection[] = ['events', 'commands', 'queries'];

const normalizePath = (value: string) => value.replace(/\\/g, '/');

const getMessageCollectionFromPath = (filePath: string): MessageCollection | undefined => {
  const parts = normalizePath(filePath).split('/');
  return MESSAGE_COLLECTIONS.find((collection) => parts.includes(collection));
};

const getSchemaFormat = (schemaPath: string) => {
  const extension = path.extname(schemaPath).replace('.', '').toLowerCase();

  if (extension === 'avsc' || extension === 'avro') return 'avro';
  if (extension === 'proto') return 'protobuf';
  if (extension === 'json') return 'jsonschema';
  if (extension === 'yaml' || extension === 'yml') return 'yaml';

  return extension || 'unknown';
};

const buildGeneratedSchemaId = (message: { collection: MessageCollection; id: string; version: string }, schemaPath: string) =>
  `schema:${message.collection}:${message.id}:${message.version}:${schemaPath}`;

const getSchemaFile = (reference: SchemaReference) => reference.file ?? reference.path;

const addLatestMetadata = (schemas: MessageSchemaResource[]) => {
  const schemasByMessage = schemas.reduce(
    (acc, schema) => {
      const key = `${schema.message.collection}:${schema.message.id}`;
      acc[key] = [...(acc[key] ?? []), schema];
      return acc;
    },
    {} as Record<string, MessageSchemaResource[]>
  );

  const latestVersionsByMessage = Object.entries(schemasByMessage).reduce(
    (acc, [key, messageSchemas]) => {
      acc[key] = sortVersioned(messageSchemas, (schema) => schema.message.version)[0]?.message.version;
      return acc;
    },
    {} as Record<string, string | undefined>
  );

  return schemas.map((schema) => {
    const key = `${schema.message.collection}:${schema.message.id}`;
    return {
      ...schema,
      latest: schema.message.version === latestVersionsByMessage[key],
    };
  });
};

export const getMessageSchemasFromFrontmatter = ({
  data,
  collection,
  messageFilePath,
}: {
  data: MessageFrontmatter;
  collection: MessageCollection;
  messageFilePath: string;
}): MessageSchemaResource[] => {
  if (!data.id || !data.version) return [];

  const message = {
    collection,
    id: data.id,
    name: data.name,
    version: data.version,
    summary: data.summary,
    owners: data.owners,
  };

  const schemaReferences =
    data.schemas?.filter((schema) => getSchemaFile(schema)) ??
    (data.schemaPath
      ? [
          {
            id: buildGeneratedSchemaId(message, data.schemaPath),
            file: data.schemaPath,
            name: 'Schema',
            default: true,
          },
        ]
      : []);

  return schemaReferences.map((reference) => {
    const schemaFile = getSchemaFile(reference) as string;
    const schemaFilePath = path.resolve(path.dirname(messageFilePath), schemaFile);
    const schemaId = reference.id ?? buildGeneratedSchemaId(message, schemaFile);

    return {
      id: schemaId,
      name: reference.name ?? schemaId,
      version: data.version,
      format: reference.format ?? getSchemaFormat(schemaFile),
      file: schemaFile,
      filePath: schemaFilePath,
      environments: reference.environments,
      default: reference.default,
      message,
      source: {
        provider: 'file',
        path: schemaFile,
      },
    };
  });
};

export const loadMessageSchemas = async ({ pattern, base }: SchemaLoaderOptions['messages']) => {
  if (!base) return [];

  const files = await glob(pattern, {
    cwd: base,
    absolute: true,
    nodir: true,
    ignore: ['dist/**', '**/dist/**'],
  });

  const schemas = await Promise.all(
    files.map(async (file) => {
      const collection = getMessageCollectionFromPath(file);
      if (!collection) return [];

      const { data } = matter.read(file) as { data: MessageFrontmatter };
      return getMessageSchemasFromFrontmatter({ data, collection, messageFilePath: file });
    })
  );

  return addLatestMetadata(schemas.flat());
};

const getSchemaBody = async (schema: MessageSchemaResource) => {
  if (!schema.filePath || !fsSync.existsSync(schema.filePath)) return '';
  return fs.readFile(schema.filePath, 'utf8');
};

const setSchema = async (context: LoaderContext, schema: MessageSchemaResource) => {
  const body = await getSchemaBody(schema);
  const schemaWithContent = {
    ...schema,
    content: body,
  };
  const parsedData = await context.parseData({
    id: schema.id,
    data: schemaWithContent,
  });

  context.store.set({
    id: schema.id,
    data: parsedData,
    body,
    digest: context.generateDigest(schemaWithContent),
  });
};

export const schemaLoader = ({ messages }: SchemaLoaderOptions): Loader => {
  return {
    name: 'eventcatalog-schema-loader',
    load: async (context) => {
      const schemas = await loadMessageSchemas(messages);

      for (const schema of schemas) {
        await setSchema(context, schema);
      }
    },
  };
};
