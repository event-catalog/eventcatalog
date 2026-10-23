import type { ReactNode } from 'react';
import { ClipboardDocumentIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { getLanguageForHighlight, SCHEMA_CODE_STYLE } from './utils';
import { useDarkMode } from './useDarkMode';
import { renderHighlightedRows } from '@utils/syntax-highlighter-renderer';

export const SCHEMA_CODE_ACTION_CLASS =
  'pointer-events-auto inline-flex items-center gap-1 rounded-md bg-[rgb(var(--ec-content-hover)/0.9)] text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] backdrop-blur-xs transition-colors hover:bg-[rgb(var(--ec-page-bg)/0.75)] hover:text-[rgb(var(--ec-page-text))]';

interface SchemaCodeBlockProps {
  code: string;
  /** The schema's extension or format, see getLanguageForHighlight */
  extension?: string;
  onCopy: () => void;
  isCopied: boolean;
  onOpenFullscreen?: () => void;
  /** Extra actions shown before the fullscreen and copy buttons */
  actions?: ReactNode;
}

/** Highlighted schema source with line numbers, as shown on the Schema tab of the Schema Explorer and on specification pages */
export default function SchemaCodeBlock({ code, extension, onCopy, isCopied, onOpenFullscreen, actions }: SchemaCodeBlockProps) {
  const isDarkMode = useDarkMode();

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-code-bg))]">
      <div className="pointer-events-none absolute right-4 top-4 z-10 flex items-center gap-1.5">
        {actions}
        {onOpenFullscreen && (
          <button onClick={onOpenFullscreen} className={`${SCHEMA_CODE_ACTION_CLASS} p-1.5`} title="Open in fullscreen">
            <ArrowsPointingOutIcon className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={onCopy} className={`${SCHEMA_CODE_ACTION_CLASS} px-2 py-1.5`} title="Copy code">
          <ClipboardDocumentIcon className="h-3 w-3" />
          {isCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <SyntaxHighlighter
          renderer={renderHighlightedRows}
          language={getLanguageForHighlight(extension)}
          style={isDarkMode ? oneDark : oneLight}
          customStyle={{ ...SCHEMA_CODE_STYLE, height: '100%' }}
          showLineNumbers={true}
          wrapLines={true}
          wrapLongLines={true}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
