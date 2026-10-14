import { ChevronUpIcon, ChevronDownIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { CommandLineIcon } from '@heroicons/react/24/solid';
import type { SchemaItem } from './types';

interface ApiAccessSectionProps {
  message: SchemaItem;
  isExpanded: boolean;
  onToggle: () => void;
  onCopy: (content: string, id: string) => void;
  copiedId: string | null;
}

export default function ApiAccessSection({ message, isExpanded, onToggle, onCopy, copiedId }: ApiAccessSectionProps) {
  // Generate API path based on collection type
  let apiPath = '';
  if (message.collection === 'services') {
    const specType = message.specType || 'openapi';
    apiPath = `/api/schemas/services/${message.data.id}/${message.data.version}/${specType}`;
  } else {
    apiPath = `/api/schemas/${message.collection}/${message.data.id}/${message.data.version}`;
  }

  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${apiPath}` : apiPath;
  const curlCommand = `curl ${fullUrl}`;
  const isCopied = copiedId === `${message.data.id}-api`;

  return (
    <div className="flex-shrink-0 border-b border-[rgb(var(--ec-page-border))]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-[rgb(var(--ec-page-bg)/0.5)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <CommandLineIcon className="h-3.5 w-3.5 text-[rgb(var(--ec-icon-color))]" />
          <span className="text-xs font-medium text-[rgb(var(--ec-page-text))]">API</span>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))]" />
        ) : (
          <ChevronDownIcon className="h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))]" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-3">
          <div className="space-y-2">
            {/* Endpoint */}
            <div className="flex items-center gap-2 bg-gray-900 rounded-md px-3 py-2">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">GET</span>
              <code className="flex-1 text-[11px] text-gray-300 font-mono truncate">{apiPath}</code>
              <button
                onClick={() => onCopy(fullUrl, `${message.data.id}-api`)}
                className={`flex-shrink-0 p-1 rounded transition-colors ${
                  isCopied ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'
                }`}
                title="Copy URL"
              >
                {isCopied ? <CheckIcon className="h-3.5 w-3.5" /> : <ClipboardDocumentIcon className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Quick copy buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCopy(curlCommand, `${message.data.id}-curl`)}
                className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded border transition-colors ${
                  copiedId === `${message.data.id}-curl`
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'text-[rgb(var(--ec-page-text-muted))] border-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-input-bg))] hover:text-[rgb(var(--ec-page-text))]'
                }`}
              >
                {copiedId === `${message.data.id}-curl` ? (
                  <>
                    <CheckIcon className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="h-3 w-3" />
                    Copy cURL
                  </>
                )}
              </button>
              <button
                onClick={() => onCopy(fullUrl, `${message.data.id}-url`)}
                className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded border transition-colors ${
                  copiedId === `${message.data.id}-url`
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'text-[rgb(var(--ec-page-text-muted))] border-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-input-bg))] hover:text-[rgb(var(--ec-page-text))]'
                }`}
              >
                {copiedId === `${message.data.id}-url` ? (
                  <>
                    <CheckIcon className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="h-3 w-3" />
                    Copy URL
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
