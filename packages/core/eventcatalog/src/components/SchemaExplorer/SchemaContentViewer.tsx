import { buildUrl } from '@utils/url-builder';
import JSONSchemaViewer from './JSONSchemaViewer';
import AvroSchemaViewer from './AvroSchemaViewer';
import ProtobufSchemaViewer from './ProtobufSchemaViewer';
import SchemaCodeBlock, { SCHEMA_CODE_ACTION_CLASS } from './SchemaCodeBlock';
import type { SchemaItem } from './types';

const SPEC_URL_SEGMENTS: Record<string, string> = {
  openapi: 'spec',
  asyncapi: 'asyncapi',
  graphql: 'graphql',
  generic: 'generic',
};

interface SchemaContentViewerProps {
  message: SchemaItem;
  onCopy: () => void;
  isCopied: boolean;
  viewMode: 'code' | 'schema' | 'diff';
  parsedSchema: any;
  parsedAvroSchema?: any;
  parsedProtoSchema?: any;
  onOpenFullscreen?: () => void;
  showRequired?: boolean;
}

export default function SchemaContentViewer({
  message,
  onCopy,
  isCopied,
  viewMode,
  parsedSchema,
  parsedAvroSchema,
  parsedProtoSchema,
  showRequired = false,
  onOpenFullscreen,
}: SchemaContentViewerProps) {
  if (!message.schemaContent) {
    return (
      <div className="flex items-center justify-center h-full text-[rgb(var(--ec-page-text-muted))]">
        <p className="text-sm">No schema content available</p>
      </div>
    );
  }

  // Render schema viewer based on schema type
  if (viewMode === 'schema') {
    if (parsedAvroSchema) {
      return <AvroSchemaViewer schema={parsedAvroSchema} onOpenFullscreen={onOpenFullscreen} showRequired={showRequired} />;
    }
    if (parsedProtoSchema) {
      return <ProtobufSchemaViewer schema={parsedProtoSchema} onOpenFullscreen={onOpenFullscreen} showRequired={showRequired} />;
    }
    if (parsedSchema) {
      return <JSONSchemaViewer schema={parsedSchema} onOpenFullscreen={onOpenFullscreen} />;
    }
  }

  // Services link to their specification's own page
  const specUrl =
    message.collection === 'services'
      ? buildUrl(
          `/docs/services/${message.data.id}/${message.data.version}/${SPEC_URL_SEGMENTS[message.specType || 'openapi'] ?? 'spec'}/${message.specFilenameWithoutExtension || 'schema'}`
        )
      : undefined;

  return (
    <SchemaCodeBlock
      code={message.schemaContent}
      extension={message.schemaExtension}
      onCopy={onCopy}
      isCopied={isCopied}
      onOpenFullscreen={onOpenFullscreen}
      actions={
        specUrl && (
          <a href={specUrl} className={`${SCHEMA_CODE_ACTION_CLASS} px-2 py-1`} title="View full specification">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            View Spec
          </a>
        )
      }
    />
  );
}
