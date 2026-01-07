import {
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  CodeBracketIcon,
  TableCellsIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon, CommandLineIcon } from '@heroicons/react/24/solid';
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
  schemaViewMode: 'code' | 'schema' | 'diff' | 'api';
  onViewModeChange: (mode: 'code' | 'schema' | 'diff' | 'api') => void;
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

  // Get schema icon
  const ext = message.schemaExtension?.toLowerCase();
  const hasSchemaIcon = ['openapi', 'asyncapi', 'graphql', 'avro', 'json', 'proto'].includes(ext || '');
  const iconName = ext === 'json' ? 'json-schema' : ext;

  return (
    <div className="flex-shrink-0 border-b border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))]">
      {/* Main Header */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-${color}-50 dark:bg-${color}-500/10 border border-${color}-100 dark:border-${color}-500/30 mt-0.5`}
              >
                <Icon className={`h-4.5 w-4.5 text-${color}-600 dark:text-${color}-400`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-[rgb(var(--ec-page-text))] truncate">{message.data.name}</h2>
                  {hasMultipleVersions ? (
                    <div className="relative flex-shrink-0">
                      <select
                        value={selectedVersion || message.data.version}
                        onChange={(e) => onVersionChange(e.target.value)}
                        className="appearance-none text-xs font-medium text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] border border-[rgb(var(--ec-page-border))] rounded-md pl-2.5 pr-7 py-1 focus:outline-none focus:ring-1 focus:ring-[rgb(var(--ec-accent))] focus:border-[rgb(var(--ec-accent))] cursor-pointer hover:bg-[rgb(var(--ec-input-bg))] transition-colors"
                      >
                        {availableVersions.map((v) => (
                          <option key={v.data.version} value={v.data.version}>
                            v{v.data.version}
                          </option>
                        ))}
                      </select>
                      <ClockIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[rgb(var(--ec-icon-color))] pointer-events-none" />
                    </div>
                  ) : (
                    <span className="text-xs text-[rgb(var(--ec-page-text-muted))] flex-shrink-0 font-medium bg-[rgb(var(--ec-content-hover))] px-2 py-1 rounded-md border border-[rgb(var(--ec-page-border))]">
                      v{message.data.version}
                    </span>
                  )}
                </div>
                {/* Tags */}
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-${color}-50 dark:bg-${color}-500/10 text-${color}-700 dark:text-${color}-400 border border-${color}-100 dark:border-${color}-500/30`}
                  >
                    {message.collection}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-[rgb(var(--ec-content-hover))] text-[rgb(var(--ec-page-text-muted))] border border-[rgb(var(--ec-page-border))]">
                    {hasSchemaIcon && (
                      <img src={buildUrl(`/icons/${iconName}.svg`, true)} alt={`${ext} icon`} className="h-3 w-3 opacity-70" />
                    )}
                    {getSchemaTypeLabel(message.schemaExtension)}
                  </span>
                </div>
                {/* Summary */}
                {message.data.summary && <p className="text-xs text-[rgb(var(--ec-page-text-muted))] mt-1.5 line-clamp-1">{message.data.summary}</p>}
              </div>
            </div>
          </div>

          {/* View Docs Button */}
          <a
            href={buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-md hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))] transition-colors"
          >
            View docs
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-4 py-2 bg-[rgb(var(--ec-content-hover))] border-t border-[rgb(var(--ec-page-border))] flex items-center justify-between">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-0.5 p-0.5 bg-[rgb(var(--ec-input-bg))] border border-[rgb(var(--ec-page-border))] rounded-md">
          <button
            onClick={() => onViewModeChange('code')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-all ${
              schemaViewMode === 'code' ? 'bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] text-[rgb(var(--ec-page-text))] shadow-sm' : 'text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]'
            }`}
            title="View raw code"
          >
            <CodeBracketIcon className="h-3.5 w-3.5" />
            Code
          </button>
          {hasParsedSchema && (
            <button
              onClick={() => onViewModeChange('schema')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-all ${
                schemaViewMode === 'schema' ? 'bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] text-[rgb(var(--ec-page-text))] shadow-sm' : 'text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]'
              }`}
              title="View as schema"
            >
              <TableCellsIcon className="h-3.5 w-3.5" />
              Schema
            </button>
          )}
          {hasDiffs && (
            <button
              onClick={() => onViewModeChange('diff')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-all ${
                schemaViewMode === 'diff' ? 'bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] text-[rgb(var(--ec-page-text))] shadow-sm' : 'text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]'
              }`}
              title="View version diffs"
            >
              <ClockIcon className="h-3.5 w-3.5" />
              History
              <span
                className={`ml-0.5 px-1 py-0.5 rounded text-[10px] tabular-nums ${
                  schemaViewMode === 'diff' ? 'bg-[rgb(var(--ec-content-hover))] text-[rgb(var(--ec-page-text-muted))]' : 'bg-[rgb(var(--ec-input-bg))] text-[rgb(var(--ec-icon-color))]'
                }`}
              >
                {diffCount}
              </span>
            </button>
          )}
          <button
            onClick={() => onViewModeChange('api')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-all ${
              schemaViewMode === 'api' ? 'bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] text-[rgb(var(--ec-page-text))] shadow-sm' : 'text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]'
            }`}
            title="API access"
          >
            <CommandLineIcon className="h-3.5 w-3.5" />
            API
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCopy}
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all ${
              isCopied
                ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30'
                : 'text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))]'
            }`}
            title="Copy schema to clipboard"
          >
            {isCopied ? (
              <>
                <CheckIcon className="h-3.5 w-3.5" />
                Copied
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={onDownload}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-md hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))] transition-all"
            title="Download schema file"
          >
            <ArrowDownTrayIcon className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
