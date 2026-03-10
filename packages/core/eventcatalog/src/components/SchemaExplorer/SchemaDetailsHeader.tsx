import { ClipboardDocumentIcon, ArrowDownTrayIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { buildUrl } from '@utils/url-builder';
import { getCollectionStyles } from '@components/Grids/utils';
import { getSchemaTypeLabel, ICON_SPECS, getFormatBadge } from './utils';
import type { SchemaItem } from './types';

interface SchemaDetailsHeaderProps {
  message: SchemaItem;
  onCopy: () => void;
  onDownload: () => void;
  isCopied: boolean;
}

export default function SchemaDetailsHeader({ message, onCopy, onDownload, isCopied }: SchemaDetailsHeaderProps) {
  const { color } = getCollectionStyles(message.collection);
  const ext = message.schemaExtension?.toLowerCase() || '';
  const iconSpec = ICON_SPECS[ext];

  return (
    <div className="flex-shrink-0 px-6 pt-5 pb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Format badge */}
          <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-[rgb(var(--ec-content-hover))] border border-[rgb(var(--ec-page-border)/0.5)]">
            {iconSpec ? (
              <img src={buildUrl(`/icons/${iconSpec}.svg`, true)} alt={`${ext} icon`} className="h-5 w-5" />
            ) : (
              <span className="text-xs font-bold font-mono text-[rgb(var(--ec-page-text-muted))]">
                {getFormatBadge(ext).label}
              </span>
            )}
          </div>

          {/* Title + badges */}
          <h2 className="text-lg font-semibold text-[rgb(var(--ec-page-text))] truncate">{message.data.name}</h2>
          <span className="flex-shrink-0 text-xs font-mono tabular-nums text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-content-hover))] px-2 py-0.5 rounded-md">
            v{message.data.version}
          </span>
          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[rgb(var(--ec-content-hover))] text-[rgb(var(--ec-page-text-muted))]">
            {getSchemaTypeLabel(message.schemaExtension)}
          </span>
          <span
            className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-${color}-500/10 text-${color}-400 capitalize`}
          >
            {message.collection}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onCopy}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
              isCopied
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : 'text-[rgb(var(--ec-page-text-muted))] border-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))]'
            }`}
          >
            {isCopied ? <CheckIcon className="h-3.5 w-3.5" /> : <ClipboardDocumentIcon className="h-3.5 w-3.5" />}
            {isCopied ? 'Copied' : 'Copy link'}
          </button>
          <button
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] border border-[rgb(var(--ec-page-border))] rounded-md hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))] transition-all"
          >
            <ArrowDownTrayIcon className="h-3.5 w-3.5" />
            Download
          </button>
          <a
            href={buildUrl(`/docs/${message.collection}/${message.data.id}/${message.data.version}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] border border-[rgb(var(--ec-page-border))] rounded-md hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))] transition-all"
          >
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            Back
          </a>
        </div>
      </div>
    </div>
  );
}
