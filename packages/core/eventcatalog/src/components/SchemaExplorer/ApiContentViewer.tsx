import { ClipboardDocumentIcon, CheckIcon, GlobeAltIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { getLanguageForHighlight, getSchemaTypeLabel } from './utils';
import { useDarkMode } from './useDarkMode';
import type { SchemaItem } from './types';

interface ApiContentViewerProps {
  message: SchemaItem;
  onCopy: (content: string, id: string) => void;
  copiedId: string | null;
  apiAccessEnabled?: boolean;
}

export default function ApiContentViewer({ message, onCopy, copiedId, apiAccessEnabled = false }: ApiContentViewerProps) {
  const isDarkMode = useDarkMode();
  const dividerColor = isDarkMode ? 'rgb(var(--ec-page-text-muted) / 0.13)' : 'rgb(var(--ec-page-border))';
  const boxBorderColor = isDarkMode ? 'rgb(var(--ec-page-text-muted) / 0.17)' : 'rgb(var(--ec-page-border))';
  const insetDividerColor = isDarkMode ? 'rgb(var(--ec-page-text-muted) / 0.11)' : 'rgb(var(--ec-page-border) / 0.8)';
  const headingClass = 'text-sm font-semibold text-[rgb(var(--ec-page-text))]';
  const labelClass = 'text-sm text-[rgb(var(--ec-page-text-muted))]';
  const valueClass = 'text-sm text-[rgb(var(--ec-page-text-muted))]';

  let apiPath = '';
  if (message.collection === 'services') {
    const specType = message.specType || 'openapi';
    apiPath = `/api/schemas/services/${message.data.id}/${message.data.version}/${specType}`;
  } else {
    apiPath = `/api/schemas/${message.collection}/${message.data.id}/${message.data.version}`;
  }

  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${apiPath}` : apiPath;
  const exampleResponse = message.schemaContent || '{}';
  const schemaTypeLabel = getSchemaTypeLabel(message.schemaExtension);
  const lineCount = exampleResponse.split('\n').length;
  const byteSize = new TextEncoder().encode(exampleResponse).length;

  if (!apiAccessEnabled) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgb(var(--ec-accent)/0.3)] bg-[rgb(var(--ec-accent-subtle))]">
            <LockClosedIcon className="h-8 w-8 text-[rgb(var(--ec-accent))]" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[rgb(var(--ec-page-text))]">API Access</h3>
          <p className="mb-6 text-sm text-[rgb(var(--ec-page-text-muted))]">
            Access your schemas programmatically via REST API. Perfect for CI/CD pipelines, automation, and integrations with your
            development workflow.
          </p>
          <a
            href="https://eventcatalog.cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[rgb(var(--ec-accent))] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[rgb(var(--ec-accent-hover))]"
          >
            Upgrade to Scale
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <p className="mt-3 text-xs text-[rgb(var(--ec-page-text-muted))]">Start your 14-day free trial</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto pr-1">
      <div className="space-y-4 pb-3">
        <section className="overflow-hidden rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-dropdown-bg)/0.66)]">
          <div className="flex items-start justify-between gap-4 px-4 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-accent))]">
                  <GlobeAltIcon className="h-3.5 w-3.5" />
                </div>
                <h3 className={headingClass}>HTTP Endpoint</h3>
              </div>
              <p className={`mt-2 ${labelClass}`}>
                Use this endpoint to interact with the{' '}
                <span className="text-[rgb(var(--ec-page-text))]">{message.data.name}</span>.
              </p>
            </div>
            <CopyButton
              label="Copy"
              isCopied={copiedId === `${message.data.id}-url`}
              onClick={() => onCopy(fullUrl, `${message.data.id}-url`)}
              borderColor={boxBorderColor}
              variant="ghost"
            />
          </div>

          <div className="px-4 pb-4">
            <div
              className="flex items-center gap-2 rounded-lg border bg-[rgb(var(--ec-content-hover)/0.45)] p-2"
              style={{ borderColor: boxBorderColor }}
            >
              <span className="rounded-md bg-emerald-500/15 px-3 py-2 text-xs font-bold uppercase tracking-wide text-emerald-400">
                GET
              </span>
              <code className="min-w-0 flex-1 truncate text-[13px] text-[rgb(var(--ec-page-text-muted))]">{apiPath}</code>
            </div>

            <div className="mt-4 pt-4">
              <div className="mb-2 flex items-center gap-3">
                <span className={labelClass}>Full URL</span>
                <div className="h-px flex-1" style={{ backgroundColor: insetDividerColor }} />
              </div>
              <div className="flex items-center gap-4">
                <code className="min-w-0 flex-1 break-all text-[13px] leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
                  {fullUrl}
                </code>
                <CopyButton
                  label="Copy"
                  isCopied={copiedId === `${message.data.id}-full-url`}
                  onClick={() => onCopy(fullUrl, `${message.data.id}-full-url`)}
                  borderColor={boxBorderColor}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-dropdown-bg)/0.66)]">
          <div className="px-4 py-4">
            <h3 className={headingClass}>Response</h3>
          </div>
          <div className="border-t" style={{ borderColor: dividerColor }}>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <span className={labelClass}>Content-Type</span>
              <code
                className="rounded-md border bg-[rgb(var(--ec-content-hover)/0.45)] px-2.5 py-1 text-xs font-medium text-[rgb(var(--ec-page-text-muted))]"
                style={{ borderColor: boxBorderColor }}
              >
                application/json
              </code>
            </div>
            <div className="flex items-center justify-between gap-4 border-t px-4 py-3" style={{ borderColor: dividerColor }}>
              <span className={labelClass}>Returns</span>
              <span className={valueClass}>Raw schema content</span>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-dropdown-bg)/0.66)]">
          <div className="flex items-center justify-between gap-4 px-4 py-4">
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-md border bg-[rgb(var(--ec-content-hover)/0.45)] text-[rgb(var(--ec-page-text-muted))]"
                style={{ borderColor: boxBorderColor }}
              >
                <DocumentTextIcon className="h-3.5 w-3.5" />
              </div>
              <h3 className={headingClass}>Example Response</h3>
            </div>
            <CopyButton
              label="Copy"
              isCopied={copiedId === `${message.data.id}-response`}
              onClick={() => onCopy(exampleResponse, `${message.data.id}-response`)}
              borderColor={boxBorderColor}
              variant="ghost"
            />
          </div>

          <div className="border-t" style={{ borderColor: dividerColor }}>
            <SyntaxHighlighter
              language={getLanguageForHighlight(message.schemaExtension)}
              style={isDarkMode ? oneDark : oneLight}
              customStyle={{
                margin: 0,
                padding: '1rem 1.25rem',
                borderRadius: 0,
                fontSize: '0.8125rem',
                lineHeight: '1.625',
                background: 'transparent',
              }}
              showLineNumbers={true}
              wrapLines={true}
              wrapLongLines={true}
            >
              {exampleResponse}
            </SyntaxHighlighter>
          </div>

          <div className="flex items-center justify-between gap-4 border-t px-4 py-3" style={{ borderColor: dividerColor }}>
            <div className="inline-flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Valid {schemaTypeLabel}
            </div>
            <div className="flex items-center gap-4 text-xs text-[rgb(var(--ec-page-text-muted))]">
              <span>{lineCount} lines</span>
              <span>{formatBytes(byteSize)}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function CopyButton({
  label,
  isCopied,
  onClick,
  borderColor,
  variant = 'outline',
}: {
  label: string;
  isCopied: boolean;
  onClick: () => void;
  borderColor: string;
  variant?: 'outline' | 'ghost';
}) {
  const classes =
    variant === 'ghost'
      ? 'inline-flex items-center gap-2 rounded-md px-1 py-1 text-xs font-medium transition-colors'
      : 'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors';

  return (
    <button
      onClick={onClick}
      style={variant === 'outline' ? { borderColor } : undefined}
      className={`${classes} ${
        isCopied
          ? 'text-emerald-400'
          : 'text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover)/0.45)] hover:text-[rgb(var(--ec-page-text))]'
      }`}
    >
      {isCopied ? <CheckIcon className="h-3.5 w-3.5" /> : <ClipboardDocumentIcon className="h-3.5 w-3.5" />}
      {isCopied ? 'Copied' : label}
    </button>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
