import type { SchemaItem, SchemaRelationshipCollection } from './types';
import { buildUrl } from '@utils/url-builder';
import { getGenericSpecificationIcon, resolveIconUrl } from '@utils/icon';

// Schema types that should use SVG icons
export const ICON_SPECS: Record<string, string> = {
  openapi: 'openapi',
  asyncapi: 'asyncapi',
  graphql: 'graphql',
  gql: 'graphql',
  avro: 'avro',
  avsc: 'avro',
  proto: 'proto',
  protobuf: 'proto',
  json: 'json-schema',
};

type SchemaFormat = Pick<SchemaItem, 'schemaExtension' | 'specType' | 'specIcon'>;

/** The icon for a schema, or undefined when it shows a format badge instead */
export function getSchemaIconUrl(message: SchemaFormat): string | undefined {
  if (message.specType === 'generic') return resolveIconUrl(getGenericSpecificationIcon(message.specIcon));
  const iconSpec = ICON_SPECS[message.schemaExtension?.toLowerCase() || ''];
  return iconSpec ? buildUrl(`/icons/${iconSpec}.svg`, true) : undefined;
}

// A generic specification's extension is only its syntax, so a JSON file is not called a JSON Schema
const GENERIC_SPECIFICATION_LABELS: Record<string, string> = { json: 'JSON', yaml: 'YAML', xml: 'XML', text: 'Text' };

export const getSchemaDisplayLabel = (message: SchemaFormat): string =>
  (message.specType === 'generic' && GENERIC_SPECIFICATION_LABELS[message.schemaExtension || '']) ||
  getSchemaTypeLabel(message.schemaExtension);

// Extensions that are the same format, so they share one filter
const FORMAT_ALIASES: Record<string, string> = { yml: 'yaml', gql: 'graphql', avsc: 'avro', protobuf: 'proto' };

/**
 * The format a schema is filtered by in the Schema Explorer. A generic specification's extension is only its syntax,
 * so a generic JSON file is plain JSON (`json-document`), not a JSON Schema.
 */
export function getSchemaFormat(message: Pick<SchemaItem, 'schemaExtension' | 'specType'>): string | undefined {
  const extension = message.schemaExtension?.toLowerCase();
  if (!extension) return undefined;
  if (message.specType === 'generic' && extension === 'json') return 'json-document';
  return FORMAT_ALIASES[extension] ?? extension;
}

/**
 * The formats of the given schemas with how many use each, most used first. The selected format is always included
 * (with a count of 0 when none of the schemas use it) so it can be cleared.
 */
export function getFormatOptions(
  messages: Pick<SchemaItem, 'schemaExtension' | 'specType'>[],
  selectedFormat?: string
): { format: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const message of messages) {
    const format = getSchemaFormat(message);
    if (format) counts.set(format, (counts.get(format) ?? 0) + 1);
  }
  if (selectedFormat && !counts.has(selectedFormat)) counts.set(selectedFormat, 0);
  return [...counts]
    .map(([format, count]) => ({ format, count }))
    .sort((a, b) => b.count - a.count || a.format.localeCompare(b.format));
}

// Schema format badge config for non-icon types: short label + color
export function getFormatBadge(ext?: string): { label: string; color: string } {
  const type = ext?.toLowerCase();
  switch (type) {
    case 'json':
      return { label: '{ }', color: 'text-emerald-400' };
    case 'avro':
    case 'avsc':
      return { label: 'avro', color: 'text-blue-400' };
    case 'proto':
    case 'protobuf':
      return { label: 'proto', color: 'text-orange-400' };
    case 'yaml':
    case 'yml':
      return { label: 'yaml', color: 'text-yellow-400' };
    case 'xml':
    case 'xsd':
      return { label: 'xml', color: 'text-red-400' };
    default:
      return { label: '{ }', color: 'text-gray-400' };
  }
}

// Extract the service name from a producer/consumer reference ID
// Content references use format: "{serviceId}-{version}" e.g. "ShippingService-0.0.1"
export function extractServiceName(refId: string): string {
  const match = refId.match(/^(.+?)-(\d+\.\d+\.\d+|\d+\.\d+|\d+)$/);
  return match ? match[1] : refId;
}

/** Resolve both enriched collection entries and compact explorer references. */
export function getSchemaRelationshipReference(reference: {
  id: string;
  version?: string;
  collection?: string;
  name?: string;
  summary?: string;
  data?: { id: string; version: string; name?: string; summary?: string };
}) {
  const collection = (
    reference.collection === 'agents' || reference.collection === 'data-products' || reference.collection === 'flows'
      ? reference.collection
      : 'services'
  ) as SchemaRelationshipCollection;
  return {
    id: reference.data?.id ?? reference.id,
    version: reference.data?.version ?? reference.version,
    collection,
    name: reference.data?.name ?? reference.name,
    summary: reference.data?.summary ?? reference.summary,
  };
}

export const SCHEMA_RELATIONSHIP_LABELS: Record<SchemaRelationshipCollection, string> = {
  services: 'Service',
  agents: 'Agent',
  'data-products': 'Data Product',
  flows: 'Flow',
};

export const getSchemaRelationshipHref = (reference: {
  id: string;
  version?: string;
  collection: SchemaRelationshipCollection;
}) => buildUrl(`/docs/${reference.collection}/${reference.id}/${reference.version}`);

export const getLanguageForHighlight = (extension?: string): string => {
  if (!extension) return 'json';
  const ext = extension.toLowerCase();
  switch (ext) {
    case 'avro':
    case 'avsc':
    case 'json':
      return 'json';
    case 'proto':
    case 'protobuf':
      return 'protobuf';
    case 'xsd':
    case 'xml':
      return 'xml';
    case 'graphql':
    case 'gql':
      return 'graphql';
    case 'yaml':
    case 'yml':
    case 'openapi':
    case 'asyncapi':
      return 'yaml';
    case 'ts':
    case 'typescript':
      return 'typescript';
    case 'text':
      return 'text';
    case 'js':
    case 'javascript':
      return 'javascript';
    default:
      return 'json';
  }
};

/** Style of highlighted schema code, shared by the Schema tab and the MCP server's schema viewer */
export const SCHEMA_CODE_STYLE = {
  margin: 0,
  padding: '1.25rem',
  borderRadius: 0,
  fontSize: '0.8125rem',
  lineHeight: '1.625',
  background: 'transparent',
  overflow: 'auto',
} as const;

export const getSchemaTypeLabel = (extension?: string): string => {
  if (!extension) return 'JSON';
  const ext = extension.toLowerCase();
  switch (ext) {
    case 'avro':
    case 'avsc':
      return 'Avro';
    case 'proto':
    case 'protobuf':
      return 'Protobuf';
    case 'xsd':
      return 'XML Schema';
    case 'graphql':
    case 'gql':
      return 'GraphQL';
    case 'yaml':
    case 'yml':
      return 'YAML';
    case 'json':
      return 'JSON Schema';
    case 'openapi':
      return 'OpenAPI';
    case 'asyncapi':
      return 'AsyncAPI';
    default:
      return ext.toUpperCase();
  }
};

export const copyToClipboard = async (content: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

export const downloadSchema = (content: string, filename: string, extension: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
