import { parseSchemaForViewer } from '@components/SchemaExplorer/parse-schema';
import { getLanguageForHighlight } from '@components/SchemaExplorer/utils';
import { getSchemaExtensionForFormat } from '@utils/collections/schemas';
import type { SchemaViewerSchema } from './apps/schema-viewer/shared';

type SchemaToolResult = { name?: string; format?: string; url?: string; code: string };

/**
 * The schemas returned by getSchemaForResource, ready for the schema viewer: parsed for its Properties tab
 * and with the language to highlight them in, the same way EventCatalog's schema pages do.
 */
export const toSchemaViewerSchemas = (schemas: SchemaToolResult[]): SchemaViewerSchema[] =>
  schemas.map((schema) => {
    // Schemas in the schemas collection have a format (jsonschema, avro, protobuf), others a file extension
    const format = schema.format ?? schema.url?.split('.').pop() ?? '';
    const extension = getSchemaExtensionForFormat(format);
    return {
      ...parseSchemaForViewer(extension, schema.code),
      ...(schemas.length > 1 && { name: schema.name ?? schema.url?.split('/').pop() ?? format }),
      format,
      language: getLanguageForHighlight(extension),
      code: schema.code,
    };
  });
