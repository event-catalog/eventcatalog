// Schema types that should use SVG icons
export const ICON_SPECS: Record<string, string> = {
  openapi: 'openapi',
  asyncapi: 'asyncapi',
  graphql: 'graphql',
  gql: 'graphql',
  avro: 'avro',
  avsc: 'avro',
  proto: 'proto',
  json: 'json-schema',
};

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

export const getLanguageForHighlight = (extension?: string): string => {
  if (!extension) return 'json';
  const ext = extension.toLowerCase();
  switch (ext) {
    case 'avro':
    case 'avsc':
    case 'json':
      return 'json';
    case 'proto':
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
    case 'js':
    case 'javascript':
      return 'javascript';
    default:
      return 'json';
  }
};

export const getSchemaTypeLabel = (extension?: string): string => {
  if (!extension) return 'JSON';
  const ext = extension.toLowerCase();
  switch (ext) {
    case 'avro':
    case 'avsc':
      return 'Avro';
    case 'proto':
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
