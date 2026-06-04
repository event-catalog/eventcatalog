import type { Loader } from 'astro/loaders';
import { glob } from 'glob';
import matter from 'gray-matter';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
import { isEventCatalogScaleEnabled } from '../feature';
import { sortVersioned } from './util';

const colors = pc.createColors(true);

type MessageCollection = 'events' | 'commands' | 'queries';

type SchemaReference = {
  id?: string;
  ref?: string;
  file?: string;
  path?: string;
  name?: string;
  format?: string;
  environments?: string[];
  default?: boolean;
};

type SchemaSourceEntry = {
  provider: string;
  id?: string;
  path?: string;
  url?: string;
  ref?: string;
  [key: string]: unknown;
};

type SchemaSource = {
  type: 'schemas';
  name: string;
  canResolve: (ref: string) => boolean;
  resolve: (
    ref: string,
    context?: { messageFilePath?: string }
  ) => Promise<
    | {
        id: string;
        name?: string;
        format?: string;
        content: string;
        source: SchemaSourceEntry;
      }
    | undefined
  >;
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
  ref?: string;
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
    provider: string;
    id?: string;
    path?: string;
    url?: string;
    ref?: string;
    [key: string]: unknown;
  };
  readOnly?: boolean;
};

type InternalMessageSchemaResource = MessageSchemaResource & {
  _context?: {
    messageFilePath?: string;
  };
};

type SchemaLoaderOptions = {
  messages: {
    pattern: string[];
    base?: string;
  };
  sources?: SchemaSource[];
};

type LoaderContext = Parameters<Loader['load']>[0];

const MESSAGE_COLLECTIONS: MessageCollection[] = ['events', 'commands', 'queries'];
const FILE_SCHEMA_REF_PREFIX = 'file://';

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

const getSchemaCollectionId = ({
  message,
  reference,
  schemaRef,
  schemaFile,
}: {
  message: { collection: MessageCollection; id: string; version: string };
  reference: SchemaReference;
  schemaRef?: string;
  schemaFile?: string;
}) => {
  if (schemaRef) return buildGeneratedSchemaId(message, schemaRef);
  if (reference.id) return reference.id;
  return buildGeneratedSchemaId(message, schemaFile as string);
};

const getSchemaFile = (reference: SchemaReference) => reference.file ?? reference.path;

const getSchemaRef = (reference: SchemaReference) => {
  if (reference.ref) return reference.ref;
  if (!getSchemaFile(reference)) return reference.id;
  return undefined;
};

const schemaFileExists = (schema: MessageSchemaResource): schema is MessageSchemaResource & { filePath: string } =>
  Boolean(schema.filePath && fsSync.existsSync(schema.filePath));

const getSchemaProvider = (id: string) => {
  try {
    const url = new URL(id);
    return url.protocol.replace(':', '') || 'external';
  } catch {
    return 'external';
  }
};

const isFileSchemaRef = (ref?: string) => ref?.startsWith(FILE_SCHEMA_REF_PREFIX);

const getFileSchemaRefPath = (ref: string, messageFilePath: string) => {
  if (ref.startsWith('file:///') || ref.startsWith('file://localhost/')) {
    try {
      const filePath = fileURLToPath(ref);
      return {
        filePath,
        sourcePath: filePath,
      };
    } catch {
      throw new Error(`Invalid file schema ref "${ref}". Expected file://<relative-path> or file:///absolute/path.`);
    }
  }

  const sourcePath = decodeURIComponent(ref.slice(FILE_SCHEMA_REF_PREFIX.length));
  if (!sourcePath) {
    throw new Error(`Invalid file schema ref "${ref}". Expected file://<relative-path> or file:///absolute/path.`);
  }

  return {
    filePath: path.resolve(path.dirname(messageFilePath), sourcePath),
    sourcePath,
  };
};

const getTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false });
};

const logSchemaInfo = (message: string) => {
  console.log(`${colors.dim(getTimestamp())} ${colors.blue('[schemas]')} ${message}`);
};

const getMessageTypeLabel = (collection: MessageCollection) => {
  if (collection === 'events') return 'event';
  if (collection === 'commands') return 'command';
  return 'query';
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : String(error);
};

const getSchemaResolveRef = (schema: MessageSchemaResource) => schema.ref ?? schema.id;

const buildSchemaSourceErrorMessage = ({
  schema,
  source,
  error,
}: {
  schema: MessageSchemaResource;
  source: SchemaSource;
  error: unknown;
}) => {
  const messageType = getMessageTypeLabel(schema.message.collection);

  return [
    '',
    colors.red(colors.bold('[schemas] Failed to resolve schema')),
    '',
    `  Message: ${messageType} "${schema.message.id}" version "${schema.message.version}"`,
    `  Schema:  ${getSchemaResolveRef(schema)}`,
    `  Source:  ${source.name}`,
    '',
    colors.bold('Reason:'),
    `  ${getErrorMessage(error)}`,
    '',
  ].join('\n');
};

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
    data.schemas?.filter((schema) => getSchemaRef(schema) || getSchemaFile(schema)) ??
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
    const schemaFile = getSchemaFile(reference);
    const schemaRef = getSchemaRef(reference);
    const fileSchemaRef = isFileSchemaRef(schemaRef) ? getFileSchemaRefPath(schemaRef as string, messageFilePath) : undefined;
    const schemaFilePath = schemaFile ? path.resolve(path.dirname(messageFilePath), schemaFile) : fileSchemaRef?.filePath;
    const schemaId = getSchemaCollectionId({ message, reference, schemaRef, schemaFile });
    const schemaPathForFormat = schemaFile ?? fileSchemaRef?.filePath;

    return {
      id: schemaId,
      ...(schemaRef ? { ref: schemaRef } : {}),
      name: reference.name ?? (schemaFile ? schemaId : fileSchemaRef ? path.basename(fileSchemaRef.filePath) : undefined),
      version: data.version,
      format: reference.format ?? (schemaPathForFormat ? getSchemaFormat(schemaPathForFormat) : 'unknown'),
      file: schemaFile,
      filePath: schemaFilePath,
      environments: reference.environments,
      default: reference.default,
      message,
      source: {
        provider: schemaFile || fileSchemaRef ? 'file' : getSchemaProvider(schemaRef ?? schemaId),
        path: schemaFile ?? fileSchemaRef?.sourcePath,
      },
    };
  });
};

const resolveSchemaSource = async (
  schema: InternalMessageSchemaResource,
  source: SchemaSource
): Promise<InternalMessageSchemaResource | undefined> => {
  if (schemaFileExists(schema)) return schema;
  if (schema.filePath) return undefined;

  let resolvedSchema: Awaited<ReturnType<SchemaSource['resolve']>>;
  const schemaResolveRef = getSchemaResolveRef(schema);

  try {
    resolvedSchema = await source.resolve(schemaResolveRef, schema._context);
  } catch (error) {
    throw new Error(buildSchemaSourceErrorMessage({ schema, source, error }));
  }

  if (!resolvedSchema) return undefined;

  const resolvedMessageSchema: InternalMessageSchemaResource = {
    ...schema,
    format: schema.format !== 'unknown' ? schema.format : (resolvedSchema.format ?? 'unknown'),
    content: resolvedSchema.content,
    source: resolvedSchema.source,
    readOnly: true,
  };

  const name = schema.name ?? resolvedSchema.name;
  if (name) resolvedMessageSchema.name = name;

  return resolvedMessageSchema;
};

const resolveSchemaSources = async (schemas: InternalMessageSchemaResource[], sources: SchemaSource[] = []) => {
  if (sources.length > 0 && !isEventCatalogScaleEnabled()) {
    throw new Error('Schema sources require EventCatalog Scale.');
  }

  const localSchemas = schemas.filter(schemaFileExists);
  const externalSchemas = schemas.filter((schema) => !schema.filePath);
  const resolvedExternalSchemas: InternalMessageSchemaResource[] = [];
  const resolvedExternalSchemaIds = new Set<string>();

  for (const source of sources) {
    const sourceSchemas = externalSchemas.filter((schema) => source.canResolve(getSchemaResolveRef(schema)));
    if (sourceSchemas.length === 0) continue;

    logSchemaInfo(
      `Loading ${sourceSchemas.length} schema${sourceSchemas.length === 1 ? '' : 's'} from schema source "${source.name}"`
    );

    const resolvedSchemas = await Promise.all(sourceSchemas.map((schema) => resolveSchemaSource(schema, source)));
    const syncedSchemas = resolvedSchemas.filter((schema): schema is InternalMessageSchemaResource => schema !== undefined);

    for (const schema of syncedSchemas) {
      resolvedExternalSchemaIds.add(schema.id);
      resolvedExternalSchemas.push(schema);
    }

    const skippedSchemas = sourceSchemas.length - syncedSchemas.length;
    logSchemaInfo(
      `Synced ${syncedSchemas.length} schema${syncedSchemas.length === 1 ? '' : 's'} from schema source "${source.name}"${
        skippedSchemas > 0 ? ` (${skippedSchemas} skipped)` : ''
      }`
    );
  }

  return [
    ...localSchemas,
    ...resolvedExternalSchemas,
    ...schemas.filter((schema) => schema.filePath && !schemaFileExists(schema)),
  ].filter((schema) => {
    if (schema.filePath) return schemaFileExists(schema);
    return resolvedExternalSchemaIds.has(schema.id);
  });
};

const loadMessageSchemaResources = async ({ pattern, base }: SchemaLoaderOptions['messages']) => {
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
      return getMessageSchemasFromFrontmatter({ data, collection, messageFilePath: file }).map((schema) => ({
        ...schema,
        _context: {
          messageFilePath: file,
        },
      }));
    })
  );

  return schemas.flat();
};

const stripSchemaLoaderContext = (schema: InternalMessageSchemaResource): MessageSchemaResource => {
  const { _context, ...publicSchema } = schema;
  return publicSchema;
};

export const loadMessageSchemas = async (messages: SchemaLoaderOptions['messages'], sources: SchemaSource[] = []) => {
  const schemas = await loadMessageSchemaResources(messages);
  const resolvedSchemas = await resolveSchemaSources(schemas, sources);

  return addLatestMetadata(resolvedSchemas.map(stripSchemaLoaderContext));
};

const getSchemaBody = async (schema: MessageSchemaResource) => {
  if (schema.content !== undefined) return schema.content;
  if (!schemaFileExists(schema)) return undefined;
  return fs.readFile(schema.filePath, 'utf8');
};

const setSchema = async (context: LoaderContext, schema: MessageSchemaResource) => {
  const body = await getSchemaBody(schema);
  if (body === undefined) return;

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

export const schemaLoader = ({ messages, sources = [] }: SchemaLoaderOptions): Loader => {
  return {
    name: 'eventcatalog-schema-loader',
    load: async (context) => {
      context.store.clear();
      const schemas = await loadMessageSchemas(messages, sources);

      for (const schema of schemas) {
        await setSchema(context, schema);
      }
    },
  };
};
