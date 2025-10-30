import { ChevronUpIcon, ChevronDownIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
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

  const curlCommand = typeof window !== 'undefined' ? `curl -X GET "${window.location.origin}${apiPath}"` : '';

  return (
    <div className="flex-shrink-0 border-b border-gray-200">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-1.5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs font-semibold text-gray-900">API Access</span>
          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
            Scale
          </span>
        </div>
        {isExpanded ? <ChevronUpIcon className="h-4 w-4 text-gray-600" /> : <ChevronDownIcon className="h-4 w-4 text-gray-600" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-2 bg-gray-50">
          {apiAccessEnabled ? (
            <>
              <p className="text-xs text-gray-600 mb-2">Access this schema programmatically via API</p>
              <div className="bg-gray-900 rounded-md p-3">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs text-gray-400 font-mono">GET</span>
                  <button
                    onClick={() => onCopy(curlCommand, `${message.data.id}-api`)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-300 hover:text-white transition-colors"
                    title="Copy curl command"
                  >
                    <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                    {copiedId === `${message.data.id}-api` ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <code className="block text-xs text-green-400 font-mono break-all">{apiPath}</code>
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Example:</p>
                  <code className="block text-xs text-gray-300 font-mono whitespace-pre-wrap break-all">{curlCommand}</code>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-purple-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-purple-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Upgrade to Scale</h4>
                  <p className="text-xs text-gray-600 mb-3">
                    Access your schemas programmatically via API. Perfect for CI/CD pipelines, automation, and integrations.
                  </p>
                  <a
                    href="https://eventcatalog.cloud"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Start 14-day free trial
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
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
