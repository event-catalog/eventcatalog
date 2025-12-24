import { ChevronUpIcon, ChevronDownIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { CommandLineIcon, LockClosedIcon } from '@heroicons/react/24/solid';
import type { SchemaItem } from './types';

interface ApiAccessSectionProps {
  message: SchemaItem;
  isExpanded: boolean;
  onToggle: () => void;
  onCopy: (content: string, id: string) => void;
  copiedId: string | null;
  apiAccessEnabled?: boolean;
}

export default function ApiAccessSection({
  message,
  isExpanded,
  onToggle,
  onCopy,
  copiedId,
  apiAccessEnabled = false,
}: ApiAccessSectionProps) {
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
    <div className="flex-shrink-0 border-b border-gray-100">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CommandLineIcon className="h-3.5 w-3.5 text-gray-700" />
          <span className="text-xs font-medium text-gray-700">API</span>
          {!apiAccessEnabled && (
            <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 border border-purple-100">
              <LockClosedIcon className="h-2.5 w-2.5" />
              Scale
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="h-3.5 w-3.5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-3">
          {apiAccessEnabled ? (
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
                      : 'text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
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
                      : 'text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
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
          ) : (
            <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-md px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700">Access schemas via API</p>
                <p className="text-[10px] text-gray-500 mt-0.5">CI/CD, automation & integrations</p>
              </div>
              <a
                href="https://eventcatalog.cloud"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
              >
                Try Scale
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
