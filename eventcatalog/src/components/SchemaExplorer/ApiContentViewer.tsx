import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { CommandLineIcon, LockClosedIcon } from '@heroicons/react/24/solid';
import type { SchemaItem } from './types';

interface ApiContentViewerProps {
  message: SchemaItem;
  onCopy: (content: string, id: string) => void;
  copiedId: string | null;
  apiAccessEnabled?: boolean;
}

export default function ApiContentViewer({ message, onCopy, copiedId, apiAccessEnabled = false }: ApiContentViewerProps) {
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

  if (!apiAccessEnabled) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 border border-purple-200">
            <LockClosedIcon className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">API Access</h3>
          <p className="text-sm text-gray-600 mb-6">
            Access your schemas programmatically via REST API. Perfect for CI/CD pipelines, automation, and integrations with your
            development workflow.
          </p>
          <a
            href="https://eventcatalog.cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Upgrade to Scale
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <p className="text-xs text-gray-500 mt-3">Start your 14-day free trial</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <div className="max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100">
            <CommandLineIcon className="h-5 w-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">API Access</h3>
            <p className="text-xs text-gray-500">Access this schema programmatically</p>
          </div>
        </div>

        {/* Endpoint Card */}
        <div className="bg-gray-900 rounded-lg overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <span className="text-xs font-medium text-gray-400">Endpoint</span>
            <button
              onClick={() => onCopy(fullUrl, `${message.data.id}-url`)}
              className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors ${
                copiedId === `${message.data.id}-url` ? 'text-emerald-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              {copiedId === `${message.data.id}-url` ? (
                <>
                  <CheckIcon className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                  Copy URL
                </>
              )}
            </button>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 rounded">GET</span>
              <code className="text-sm text-gray-300 font-mono break-all">{apiPath}</code>
            </div>
          </div>
        </div>

        {/* cURL Example */}
        <div className="bg-gray-900 rounded-lg overflow-hidden mb-6">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <span className="text-xs font-medium text-gray-400">cURL Example</span>
            <button
              onClick={() => onCopy(curlCommand, `${message.data.id}-curl`)}
              className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors ${
                copiedId === `${message.data.id}-curl` ? 'text-emerald-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              {copiedId === `${message.data.id}-curl` ? (
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
          </div>
          <div className="px-4 py-3">
            <code className="text-sm text-gray-300 font-mono break-all">{curlCommand}</code>
          </div>
        </div>

        {/* Response Info */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-900 mb-3">Response</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Content-Type</span>
              <code className="text-gray-700 bg-gray-100 px-2 py-0.5 rounded">application/json</code>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Returns</span>
              <span className="text-gray-700">Raw schema content</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
