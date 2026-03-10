import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { LockClosedIcon } from '@heroicons/react/24/solid';
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
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-[rgb(var(--ec-accent-subtle))] border border-[rgb(var(--ec-accent)/0.3)]">
            <LockClosedIcon className="h-8 w-8 text-[rgb(var(--ec-accent))]" />
          </div>
          <h3 className="text-lg font-semibold text-[rgb(var(--ec-page-text))] mb-2">API Access</h3>
          <p className="text-sm text-[rgb(var(--ec-page-text-muted))] mb-6">
            Access your schemas programmatically via REST API. Perfect for CI/CD pipelines, automation, and integrations with your
            development workflow.
          </p>
          <a
            href="https://eventcatalog.cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[rgb(var(--ec-accent))] rounded-lg hover:bg-[rgb(var(--ec-accent-hover))] transition-colors"
          >
            Upgrade to Scale
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <p className="text-xs text-[rgb(var(--ec-page-text-muted))] mt-3">Start your 14-day free trial</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="space-y-4">
        {/* Endpoint */}
        <div className="rounded-lg border border-[rgb(var(--ec-page-border))] overflow-hidden bg-[rgb(var(--ec-code-bg))]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgb(var(--ec-page-border))]">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 rounded">
                GET
              </span>
              <span className="text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">Endpoint</span>
            </div>
            <CopyButton
              label="Copy URL"
              isCopied={copiedId === `${message.data.id}-url`}
              onClick={() => onCopy(fullUrl, `${message.data.id}-url`)}
            />
          </div>
          <div className="px-4 py-3">
            <code className="text-[13px] text-[rgb(var(--ec-page-text))] font-mono break-all leading-relaxed">{apiPath}</code>
          </div>
        </div>

        {/* cURL */}
        <div className="rounded-lg border border-[rgb(var(--ec-page-border))] overflow-hidden bg-[rgb(var(--ec-code-bg))]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgb(var(--ec-page-border))]">
            <span className="text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">cURL</span>
            <CopyButton
              label="Copy"
              isCopied={copiedId === `${message.data.id}-curl`}
              onClick={() => onCopy(curlCommand, `${message.data.id}-curl`)}
            />
          </div>
          <div className="px-4 py-3">
            <code className="text-[13px] text-[rgb(var(--ec-page-text))] font-mono break-all leading-relaxed">
              <span className="text-[rgb(var(--ec-accent))]">curl</span> {fullUrl}
            </code>
          </div>
        </div>

        {/* Response details */}
        <div className="rounded-lg border border-[rgb(var(--ec-page-border))] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[rgb(var(--ec-page-border))]">
            <span className="text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">Response</span>
          </div>
          <div className="divide-y divide-[rgb(var(--ec-page-border))]">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-[rgb(var(--ec-page-text-muted))]">Content-Type</span>
              <code className="text-xs font-mono text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-content-hover))] px-2 py-0.5 rounded">
                application/json
              </code>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-[rgb(var(--ec-page-text-muted))]">Returns</span>
              <span className="text-xs text-[rgb(var(--ec-page-text))]">Raw schema content</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ label, isCopied, onClick }: { label: string; isCopied: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors ${
        isCopied
          ? 'text-emerald-400'
          : 'text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))]'
      }`}
    >
      {isCopied ? <CheckIcon className="h-3 w-3" /> : <ClipboardDocumentIcon className="h-3 w-3" />}
      {isCopied ? 'Copied' : label}
    </button>
  );
}
