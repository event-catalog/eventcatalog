import { ClipboardDocumentIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { buildUrl } from '@utils/url-builder';
import JSONSchemaViewer from './JSONSchemaViewer';
import AvroSchemaViewer from './AvroSchemaViewer';
import { getLanguageForHighlight, getSchemaTypeLabel, ICON_SPECS } from './utils';
import type { SchemaItem } from './types';
import { useDarkMode } from './useDarkMode';

interface SchemaContentViewerProps {
  message: SchemaItem;
  onCopy: () => void;
  isCopied: boolean;
  viewMode: 'code' | 'schema' | 'diff';
  parsedSchema: any;
  parsedAvroSchema?: any;
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
  showRequired = false,
  onOpenFullscreen,
}: SchemaContentViewerProps) {
  const isDarkMode = useDarkMode();

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
    if (parsedSchema) {
      return <JSONSchemaViewer schema={parsedSchema} onOpenFullscreen={onOpenFullscreen} />;
    }
  }

  const ext = message.schemaExtension?.toLowerCase() || '';
  const iconSpec = ICON_SPECS[ext];
  const filename = message.data.schemaPath
    ? message.data.schemaPath.split('/').pop() || `${message.data.id}.${ext || 'json'}`
    : `${message.data.id}.${ext || 'json'}`;

  return (
    <div className="h-full flex flex-col rounded-lg border border-[rgb(var(--ec-page-border))] overflow-hidden bg-[rgb(var(--ec-code-bg))]">
      {/* Window title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[rgb(var(--ec-content-hover))] border-b border-[rgb(var(--ec-page-border))]">
        <div className="flex items-center gap-3">
          {/* Traffic light dots */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
          </div>

          {/* Filename */}
          <span className="text-xs font-mono text-[rgb(var(--ec-page-text-muted))]">{filename}</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {message.collection === 'services' &&
            (() => {
              const specType = message.specType || 'openapi';
              const specFilename = message.specFilenameWithoutExtension || 'schema';

              let urlSegment = 'spec';
              if (specType === 'asyncapi') {
                urlSegment = 'asyncapi';
              } else if (specType === 'graphql') {
                urlSegment = 'graphql';
              }

              const specUrl = buildUrl(`/docs/services/${message.data.id}/${message.data.version}/${urlSegment}/${specFilename}`);

              return (
                <a
                  href={specUrl}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-page-bg)/0.5)] hover:text-[rgb(var(--ec-page-text))] rounded transition-colors"
                  title="View full specification"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  View Spec
                </a>
              );
            })()}
          {onOpenFullscreen && (
            <button
              onClick={onOpenFullscreen}
              className="inline-flex items-center p-1 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-page-bg)/0.5)] hover:text-[rgb(var(--ec-page-text))] rounded transition-colors"
              title="Open in fullscreen"
            >
              <ArrowsPointingOutIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onCopy}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-page-bg)/0.5)] hover:text-[rgb(var(--ec-page-text))] rounded transition-colors"
            title="Copy code"
          >
            <ClipboardDocumentIcon className="h-3 w-3" />
            {isCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Code content */}
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={getLanguageForHighlight(message.schemaExtension)}
          style={isDarkMode ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            padding: '1rem 1.25rem',
            borderRadius: 0,
            fontSize: '0.8125rem',
            lineHeight: '1.625',
            height: '100%',
            overflow: 'auto',
            background: 'transparent',
          }}
          showLineNumbers={true}
          wrapLines={true}
          wrapLongLines={true}
        >
          {message.schemaContent}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
