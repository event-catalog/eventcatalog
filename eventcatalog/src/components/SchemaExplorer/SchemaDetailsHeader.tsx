import { ClipboardDocumentIcon, ArrowDownTrayIcon, CodeBracketIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { buildUrl } from '@utils/url-builder';
import { getCollectionStyles } from '@components/Grids/utils';
import { getSchemaTypeLabel } from './utils';
import type { SchemaItem } from './types';

interface SchemaDetailsHeaderProps {
  message: SchemaItem;
  availableVersions: SchemaItem[];
  selectedVersion: string | null;
  onVersionChange: (version: string) => void;
  onCopy: () => void;
  onDownload: () => void;
  isCopied: boolean;
  schemaViewMode: 'code' | 'schema' | 'diff';
  onViewModeChange: (mode: 'code' | 'schema' | 'diff') => void;
  hasParsedSchema: boolean;
  hasDiffs: boolean;
  diffCount: number;
}

export default function SchemaDetailsHeader({
  message,
  availableVersions,
  selectedVersion,
  onVersionChange,
  onCopy,
  onDownload,
  isCopied,
  schemaViewMode,
  onViewModeChange,
  hasParsedSchema,
  hasDiffs,
  diffCount,
}: SchemaDetailsHeaderProps) {
  const { color, Icon } = getCollectionStyles(message.collection);
  const hasMultipleVersions = availableVersions.length > 1;

  return (
    <div className="flex-shrink-0 border-b border-gray-200 p-3">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Icon className={`h-5 w-5 text-${color}-500 flex-shrink-0`} />
            <a
              href={buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`)}
              className={`text-lg font-semibold text-gray-900 hover:text-${color}-600 hover:underline truncate`}
            >
              {message.data.name}
            </a>
            {hasMultipleVersions ? (
              <select
                value={selectedVersion || message.data.version}
                onChange={(e) => onVersionChange(e.target.value)}
                className="text-xs text-gray-700 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {availableVersions.map((v) => (
                  <option key={v.data.version} value={v.data.version}>
                    v{v.data.version}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-gray-500 flex-shrink-0">v{message.data.version}</span>
            )}
          </div>
          <div className="flex items-center gap-1 mb-2">
            <span
              className={`inline-flex items-center rounded-full bg-${color}-100 px-1.5 py-0.5 text-xs font-medium text-${color}-800`}
            >
              {message.collection}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800">
              {(() => {
                const ext = message.schemaExtension?.toLowerCase();
                if (
                  ext === 'openapi' ||
                  ext === 'asyncapi' ||
                  ext === 'graphql' ||
                  ext === 'avro' ||
                  ext === 'json' ||
                  ext === 'proto'
                ) {
                  // Map json extension to json-schema icon
                  const iconName = ext === 'json' ? 'json-schema' : ext;
                  const iconPath = buildUrl(`/icons/${iconName}.svg`, true);
                  return (
                    <>
                      <img src={iconPath} alt={`${ext} icon`} className="h-3 w-3" />
                      {getSchemaTypeLabel(message.schemaExtension)}
                    </>
                  );
                }
                return getSchemaTypeLabel(message.schemaExtension);
              })()}
            </span>
          </div>
          {message.data.summary && <p className="text-xs text-gray-600 line-clamp-2">{message.data.summary}</p>}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 mr-2 border-r border-gray-300 pr-2">
          <button
            onClick={() => onViewModeChange('code')}
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
              schemaViewMode === 'code' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Code view"
          >
            <CodeBracketIcon className="h-3.5 w-3.5" />
            Code
          </button>
          {hasParsedSchema && (
            <button
              onClick={() => onViewModeChange('schema')}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                schemaViewMode === 'schema' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Schema view"
            >
              <TableCellsIcon className="h-3.5 w-3.5" />
              Schema
            </button>
          )}
          {hasDiffs && (
            <button
              onClick={() => onViewModeChange('diff')}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                schemaViewMode === 'diff' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="View version history diffs"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Diff ({diffCount})
            </button>
          )}
        </div>

        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          title="Copy schema to clipboard"
        >
          <ClipboardDocumentIcon className="h-4 w-4" />
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={onDownload}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          title="Download schema file"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Download
        </button>
        <a
          href={buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors ml-auto"
          title="View full documentation"
        >
          View Docs →
        </a>
      </div>
    </div>
  );
}
