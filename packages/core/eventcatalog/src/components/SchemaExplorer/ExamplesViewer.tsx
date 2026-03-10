import { useState, useEffect } from 'react';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { getLanguageForHighlight } from './utils';
import { copyToClipboard } from './utils';
import type { MessageExample } from './types';
import { useDarkMode } from './useDarkMode';

interface ExamplesViewerProps {
  examples: MessageExample[];
}

export default function ExamplesViewer({ examples }: ExamplesViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isDarkMode = useDarkMode();

  useEffect(() => {
    setSelectedIndex(0);
  }, [examples]);

  if (examples.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[rgb(var(--ec-page-text-muted))]">
        <p className="text-sm">No examples available</p>
      </div>
    );
  }

  const selected = examples[selectedIndex];
  const lang = getLanguageForHighlight(selected.extension);

  const handleCopy = async (content: string, id: string) => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="h-full flex gap-4 overflow-hidden">
      {/* Left: example list */}
      <div className="flex-shrink-0 w-56 overflow-y-auto space-y-1">
        {examples.map((ex, idx) => (
          <button
            key={ex.fileName}
            onClick={() => setSelectedIndex(idx)}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
              idx === selectedIndex
                ? 'bg-[rgb(var(--ec-accent-subtle))] border border-[rgb(var(--ec-accent)/0.3)]'
                : 'hover:bg-[rgb(var(--ec-content-hover))] border border-transparent'
            }`}
          >
            <span
              className={`block text-xs font-medium truncate ${
                idx === selectedIndex ? 'text-[rgb(var(--ec-page-text))]' : 'text-[rgb(var(--ec-page-text-muted))]'
              }`}
            >
              {ex.title}
            </span>
            {ex.summary && (
              <span className="block text-[11px] text-[rgb(var(--ec-page-text-muted))] mt-0.5 line-clamp-2 leading-relaxed">
                {ex.summary}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Right: code + usage */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Code window */}
        <div className="flex flex-col rounded-lg border border-[rgb(var(--ec-page-border))] overflow-hidden bg-[rgb(var(--ec-code-bg))]">
          {/* Window title bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[rgb(var(--ec-content-hover))] border-b border-[rgb(var(--ec-page-border))]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
              </div>
              <span className="text-xs font-mono text-[rgb(var(--ec-page-text-muted))]">{selected.fileName}</span>
            </div>

            <button
              onClick={() => handleCopy(selected.content, selected.fileName)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-page-bg)/0.5)] hover:text-[rgb(var(--ec-page-text))] rounded transition-colors"
              title="Copy code"
            >
              <ClipboardDocumentIcon className="h-3 w-3" />
              {copiedId === selected.fileName ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Code content */}
          <div className="overflow-auto">
            <SyntaxHighlighter
              language={lang}
              style={isDarkMode ? oneDark : oneLight}
              customStyle={{
                margin: 0,
                padding: '1rem 1.25rem',
                borderRadius: 0,
                fontSize: '0.8125rem',
                lineHeight: '1.625',
                overflow: 'auto',
                background: 'transparent',
              }}
              showLineNumbers={true}
              wrapLines={true}
              wrapLongLines={true}
            >
              {selected.content}
            </SyntaxHighlighter>
          </div>
        </div>

        {/* Usage section */}
        {selected.usage && (
          <div className="flex-shrink-0 mt-3">
            <div className="rounded-lg border border-[rgb(var(--ec-page-border))] overflow-hidden bg-[rgb(var(--ec-code-bg))]">
              <div className="flex items-center justify-between px-4 py-2 bg-[rgb(var(--ec-content-hover))] border-b border-[rgb(var(--ec-page-border))]">
                <span className="text-xs font-medium text-[rgb(var(--ec-page-text-muted))]">Usage</span>
                <button
                  onClick={() => handleCopy(selected.usage!, `usage-${selected.fileName}`)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-page-bg)/0.5)] hover:text-[rgb(var(--ec-page-text))] rounded transition-colors"
                  title="Copy usage"
                >
                  <ClipboardDocumentIcon className="h-3 w-3" />
                  {copiedId === `usage-${selected.fileName}` ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="overflow-auto max-h-32">
                <pre className="m-0 px-5 py-3 text-[0.75rem] leading-[1.5] whitespace-pre-wrap break-words text-[rgb(var(--ec-page-text-muted))] bg-transparent font-mono">
                  <code>{selected.usage}</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
