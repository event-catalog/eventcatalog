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
