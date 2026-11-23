import type { ReactNode } from 'react';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { codeTheme } from './code-theme';
import { getLanguageForHighlight, getSchemaTypeLabel } from './utils';
import { renderHighlightedRows } from '@utils/syntax-highlighter-renderer';
import type { SchemaItem } from './types';

interface ApiContentViewerProps {
  message: SchemaItem;
  onCopy: (content: string, id: string) => void;
  copiedId: string | null;
}

/**
 * The API tab: how to fetch this schema over HTTP, laid out as an API reference. The endpoint and what it returns on
 * the left; the request and the response, ready to copy, on the right (stacked on narrow screens).
 */
export default function ApiContentViewer({ message, onCopy, copiedId }: ApiContentViewerProps) {
  const apiPath =
    message.collection === 'services'
      ? `/api/schemas/services/${message.data.id}/${message.data.version}/${message.specType || 'openapi'}`
      : `/api/schemas/${message.collection}/${message.data.id}/${message.data.version}`;

  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${apiPath}` : apiPath;
  const curl = `curl ${fullUrl}`;
  const exampleResponse = message.schemaContent || '{}';
  const schemaTypeLabel = getSchemaTypeLabel(message.schemaExtension);
  const formatName = /schema/i.test(schemaTypeLabel) ? schemaTypeLabel : `${schemaTypeLabel} Schema`;
  const lineCount = exampleResponse.split('\n').length;
  const byteSize = new TextEncoder().encode(exampleResponse).length;
  const copyId = (part: string) => `${message.data.id}-${part}`;

  const details: { label: string; value: ReactNode }[] = [
    { label: 'Status', value: '200 OK' },
    { label: 'Content-Type', value: <code className="font-mono text-[13px]">text/plain</code> },
    { label: 'Returns', value: `The raw ${formatName} file` },
    { label: 'Size', value: `${formatBytes(byteSize)} · ${lineCount} lines` },
  ];

  return (
    <div className="h-full overflow-auto pr-1">
      <div className="grid grid-cols-1 items-start gap-8 pb-3 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:gap-10">
        {/* The endpoint and what it returns */}
        <div className="min-w-0 space-y-6">
          <div>
            <h3 className="text-[15px] font-semibold text-[rgb(var(--ec-page-text))]">Fetch this schema</h3>
            <p className="mt-1 text-sm leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
              Returns version {message.data.version} of {message.data.name} as plain text, for scripts, CI checks and code
              generators.
            </p>
          </div>

          {/* The endpoint, on one line: method, URL, copy */}
          <div className="flex h-10 items-center gap-2.5 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] pl-2 pr-1">
            <span className="rounded bg-[rgb(var(--ec-badge-color-green-background))] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[rgb(var(--ec-badge-color-green-text))]">
              GET
            </span>
            <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-[rgb(var(--ec-page-text))]" title={fullUrl}>
              {apiPath}
            </code>
            <CopyButton
              label="Copy URL"
              isCopied={copiedId === copyId('url')}
              onClick={() => onCopy(fullUrl, copyId('url'))}
              iconOnly
            />
          </div>

          {/* What comes back */}
          <dl className="divide-y divide-[rgb(var(--ec-page-border))] border-y border-[rgb(var(--ec-page-border))]">
            {details.map((detail) => (
              <div key={detail.label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <dt className="text-[rgb(var(--ec-page-text-muted))]">{detail.label}</dt>
                <dd className="text-right text-[rgb(var(--ec-page-text))]">{detail.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* The request and the response, ready to copy */}
        <div className="min-w-0 space-y-4 xl:sticky xl:top-0">
          <CodePanel
            title="Request"
            meta="cURL"
            copy={<CopyButton label="Copy" isCopied={copiedId === copyId('curl')} onClick={() => onCopy(curl, copyId('curl'))} />}
          >
            <pre className="whitespace-pre-wrap break-all px-4 py-3 font-mono text-[13px] leading-relaxed text-[rgb(var(--ec-page-text))]">
              <span className="select-none text-[rgb(var(--ec-page-text-muted))]">$ </span>
              {curl}
            </pre>
          </CodePanel>

          <CodePanel
            title="Response"
            meta={
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--ec-badge-color-green-text))]" aria-hidden="true" />
                200 · text/plain
              </span>
            }
            copy={
              <CopyButton
                label="Copy"
                isCopied={copiedId === copyId('response')}
                onClick={() => onCopy(exampleResponse, copyId('response'))}
              />
            }
          >
            <div className="max-h-[32rem] overflow-auto">
              <SyntaxHighlighter
                renderer={renderHighlightedRows}
                language={getLanguageForHighlight(message.schemaExtension)}
                style={codeTheme}
                customStyle={{
                  margin: 0,
                  padding: '0.75rem 1rem',
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
          </CodePanel>
        </div>
      </div>
    </div>
  );
}

/** A code block with a quiet header: its title, a muted detail, and a copy button */
function CodePanel({ title, meta, copy, children }: { title: string; meta?: ReactNode; copy: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))]">
      <div className="flex h-10 items-center justify-between gap-3 border-b border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-text)/0.025)] pl-4 pr-1.5">
        <div className="flex min-w-0 items-center gap-2.5 text-[13px]">
          <span className="font-medium text-[rgb(var(--ec-page-text))]">{title}</span>
          {meta && <span className="truncate text-xs text-[rgb(var(--ec-page-text-muted))]">{meta}</span>}
        </div>
        {copy}
      </div>
      {children}
    </section>
  );
}

function CopyButton({
  label,
  isCopied,
  onClick,
  iconOnly = false,
}: {
  label: string;
  isCopied: boolean;
  onClick: () => void;
  /** Just the icon (the label becomes its accessible name), for tight spots like the endpoint row */
  iconOnly?: boolean;
}) {
  const Icon = isCopied ? CheckIcon : ClipboardDocumentIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={iconOnly ? (isCopied ? 'Copied' : label) : undefined}
      title={iconOnly ? label : undefined}
      className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md text-xs font-medium transition-colors hover:bg-[rgb(var(--ec-page-text)/0.06)] ${
        iconOnly ? 'w-7 justify-center' : 'px-2'
      } ${isCopied ? 'text-[rgb(var(--ec-badge-color-green-text))]' : 'text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]'}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {!iconOnly && (isCopied ? 'Copied' : label)}
    </button>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
