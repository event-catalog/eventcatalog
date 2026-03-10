import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon, ArrowsPointingOutIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { getLanguageForHighlight } from './utils';
import type { SchemaItem } from './types';
import { useDarkMode } from './useDarkMode';

interface SchemaCodeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  message: SchemaItem;
  onCopy: () => void;
  isCopied: boolean;
}

export default function SchemaCodeModal({ isOpen, onOpenChange, message, onCopy, isCopied }: SchemaCodeModalProps) {
  const isDarkMode = useDarkMode();

  if (!message.schemaContent) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-50" />
        <Dialog.Content className="fixed inset-4 md:inset-8 rounded-lg bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] shadow-xl focus:outline-hidden data-[state=open]:animate-contentShow z-[100] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--ec-page-border))] flex-shrink-0">
            <div className="flex items-center gap-3">
              <ArrowsPointingOutIcon className="h-6 w-6 text-[rgb(var(--ec-icon-color))]" />
              <div>
                <Dialog.Title className="text-xl font-semibold text-[rgb(var(--ec-page-text))]">{message.data.name}</Dialog.Title>
                <Dialog.Description className="text-sm text-[rgb(var(--ec-page-text-muted))] mt-1">
                  v{message.data.version} · {getLanguageForHighlight(message.schemaExtension).toUpperCase()}
                </Dialog.Description>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-content-hover))] rounded-md transition-colors"
                title="Copy code"
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
                {isCopied ? 'Copied!' : 'Copy'}
              </button>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-2 text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))] rounded-md transition-colors"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <SyntaxHighlighter
              language={getLanguageForHighlight(message.schemaExtension)}
              style={isDarkMode ? oneDark : oneLight}
              customStyle={{
                margin: 0,
                padding: '1rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                lineHeight: '1.6',
                height: '100%',
                background: 'rgb(var(--ec-code-bg))',
              }}
              showLineNumbers={true}
              wrapLines={true}
              wrapLongLines={true}
            >
              {message.schemaContent}
            </SyntaxHighlighter>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-4 border-t border-[rgb(var(--ec-page-border))] flex-shrink-0">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-md hover:bg-[rgb(var(--ec-content-hover))] focus:outline-hidden transition-colors"
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
