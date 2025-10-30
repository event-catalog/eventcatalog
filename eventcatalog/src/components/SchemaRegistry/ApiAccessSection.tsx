import { ChevronUpIcon, ChevronDownIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
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

  const curlCommand = typeof window !== 'undefined' ? `curl -X GET "${window.location.origin}${apiPath}"` : '';

  return (
    <div className="flex-shrink-0 border-b border-gray-200">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors"
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
        <div className="px-4 pb-3 bg-gray-50">
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
        </div>
      )}
    </div>
  );
}
