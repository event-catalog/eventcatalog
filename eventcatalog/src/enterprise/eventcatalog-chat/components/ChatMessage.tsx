import React, { useState } from 'react';
import ReactMarkdown, { type ExtraProps } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message } from '@enterprise/eventcatalog-chat/components/hooks/ChatProvider';
import * as Dialog from '@radix-ui/react-dialog';
import { Fullscreen, X, Clipboard, Check, ChevronDown, ChevronRight } from 'lucide-react'; // Add Clipboard, Check, ChevronDown, ChevronRight icons

// Define Resource type locally
interface Resource {
  id: string;
  type: string;
  url: string;
  title?: string;
  name?: string | null; // Allow null for name
}

interface ChatMessageProps {
  message: Message;
}

// Function to escape special characters for regex
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Function to parse and render content with iframes
function parseContentWithIframes(content: string): React.ReactNode[] {
  const iframeRegex = /<iframe[^>]*>.*?<\/iframe>/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = iframeRegex.exec(content)) !== null) {
    // Add text before iframe as markdown
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      if (textBefore.trim()) {
        parts.push(
          <ReactMarkdown
            key={`text-${lastIndex}`}
            components={{
              code({ node, className, children, ...props }: CodeComponentProps) {
                const inline = props.inline;
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children);
                const language = match ? match[1] : 'text';
                const codeBlockId = `code-${React.useId()}`;
                const isCopied = false; // We'll handle this in the parent component

                const treatAsInline = inline || !codeString.includes('\n');

                return !treatAsInline ? (
                  <div className="code-block bg-[#1e1e1e] rounded-md overflow-hidden my-4 relative group">
                    <div className="flex justify-between items-center px-4 py-1.5 bg-gray-700 text-gray-300 text-xs">
                      <span>{language}</span>
                    </div>
                    <SyntaxHighlighter
                      style={vscDarkPlus as any}
                      language={language}
                      PreTag="div"
                      showLineNumbers
                      wrapLines={true}
                      customStyle={{ margin: 0, borderRadius: '0 0 0.375rem 0.375rem', padding: '1rem' }}
                    >
                      {codeString.replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code
                    className={`px-1 py-0.5 rounded text-xs font-mono bg-gray-300/70 text-gray-900 ${className || ''}`}
                    {...props}
                  >
                    {codeString.trim()}
                  </code>
                );
              },
              a: ({ node, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800" />
              ),
              p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
            }}
          >
            {textBefore}
          </ReactMarkdown>
        );
      }
    }

    // Parse iframe attributes
    const iframeHtml = match[0];
    const srcMatch = iframeHtml.match(/src=["']([^"']+)["']/i);
    const widthMatch = iframeHtml.match(/width=["']([^"']+)["']/i);
    const heightMatch = iframeHtml.match(/height=["']([^"']+)["']/i);
    const titleMatch = iframeHtml.match(/title=["']([^"']+)["']/i);

    if (srcMatch) {
      parts.push(
        <iframe
          key={`iframe-${match.index}`}
          src={srcMatch[1]}
          width={widthMatch ? widthMatch[1] : '100%'}
          height={heightMatch ? heightMatch[1] : '400'}
          title={titleMatch ? titleMatch[1] : 'Embedded content'}
          className="w-full h-96 border rounded-lg my-4"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          loading="lazy"
        />
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last iframe
  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex);
    if (textAfter.trim()) {
      parts.push(
        <ReactMarkdown
          key={`text-${lastIndex}`}
          components={{
            code({ node, className, children, ...props }: CodeComponentProps) {
              const inline = props.inline;
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children);
              const language = match ? match[1] : 'text';
              const codeBlockId = `code-${React.useId()}`;
              const isCopied = false;

              const treatAsInline = inline || !codeString.includes('\n');

              return !treatAsInline ? (
                <div className="code-block bg-[#1e1e1e] rounded-md overflow-hidden my-4 relative group">
                  <div className="flex justify-between items-center px-4 py-1.5 bg-gray-700 text-gray-300 text-xs">
                    <span>{language}</span>
                  </div>
                  <SyntaxHighlighter
                    style={vscDarkPlus as any}
                    language={language}
                    PreTag="div"
                    showLineNumbers
                    wrapLines={true}
                    customStyle={{ margin: 0, borderRadius: '0 0 0.375rem 0.375rem', padding: '1rem' }}
                  >
                    {codeString.replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              ) : (
                <code
                  className={`px-1 py-0.5 rounded text-xs font-mono bg-gray-300/70 text-gray-900 ${className || ''}`}
                  {...props}
                >
                  {codeString.trim()}
                </code>
              );
            },
            a: ({ node, ...props }) => (
              <a {...props} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800" />
            ),
            p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
          }}
        >
          {textAfter}
        </ReactMarkdown>
      );
    }
  }

  return parts;
}

// Define props for the code component explicitly
interface CodeComponentProps extends React.HTMLAttributes<HTMLElement>, ExtraProps {
  inline?: boolean;
}

const ChatMessage = React.memo(({ message }: ChatMessageProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ language: string; code: string } | null>(null);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({}); // State for copy feedback
  const [isResourcesCollapsed, setIsResourcesCollapsed] = useState(true); // State for resource section collapse
  const [isContextCollapsed, setIsContextCollapsed] = useState(true); // State for additional context collapse

  // Helper to get display name for resource, ensuring a fallback
  const getResourceDisplayName = (resource: Resource): string => {
    return resource.title || resource.name || resource.id || 'Resource'; // Added fallback
  };

  const handleCopy = (codeToCopy: string, id: string) => {
    navigator.clipboard
      .writeText(codeToCopy)
      .then(() => {
        setCopiedStates((prev) => ({ ...prev, [id]: true }));
        setTimeout(() => {
          setCopiedStates((prev) => ({ ...prev, [id]: false }));
        }, 1500); // Reset after 1.5 seconds
      })
      .catch((err) => {
        console.error('Failed to copy code: ', err);
      });
  };

  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${message.isUser ? 'bg-purple-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}
      >
        {/* Apply prose styles, including prose-invert for user messages for better text contrast */}
        <div className={`prose prose-sm max-w-none ${message.isUser ? 'prose-invert' : ''}`}>
          {(() => {
            const content = message.content || '';
            const iframeRegex = /<iframe[^>]*>.*?<\/iframe>/gi;

            // If content contains iframes, use custom parser
            if (iframeRegex.test(content)) {
              return parseContentWithIframes(content);
            }

            // Otherwise, use regular ReactMarkdown
            return (
              <ReactMarkdown
                components={{
                  code({ node, className, children, ...props }: CodeComponentProps) {
                    const inline = props.inline;
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children);
                    const language = match ? match[1] : 'text';
                    const codeBlockId = `code-${React.useId()}`;
                    const isCopied = copiedStates[codeBlockId];

                    const handleOpenModal = () => {
                      setModalContent({ language, code: codeString.replace(/\n$/, '') });
                      setIsModalOpen(true);
                    };

                    // Heuristic: Treat as inline if it doesn't contain newlines OR if explicitly inline.
                    // This handles parser quirks with single-line snippets in lists, etc.
                    const treatAsInline = inline || !codeString.includes('\n');

                    return !treatAsInline ? (
                      <div className="code-block bg-[#1e1e1e] rounded-md overflow-hidden my-4 relative group">
                        <div className="flex justify-between items-center px-4 py-1.5 bg-gray-700 text-gray-300 text-xs">
                          <span>{language}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopy(codeString.replace(/\n$/, ''), codeBlockId)}
                              className="text-gray-300 hover:text-white flex items-center"
                              aria-label={isCopied ? 'Copied' : 'Copy code'}
                            >
                              {isCopied ? <Check size={14} className="text-green-400" /> : <Clipboard size={14} />}
                            </button>
                            <button
                              onClick={handleOpenModal}
                              className="text-gray-300 hover:text-white"
                              aria-label="View code fullscreen"
                            >
                              <Fullscreen size={14} />
                            </button>
                          </div>
                        </div>
                        <SyntaxHighlighter
                          style={vscDarkPlus as any}
                          language={language}
                          PreTag="div"
                          showLineNumbers
                          wrapLines={true}
                          customStyle={{ margin: 0, borderRadius: '0 0 0.375rem 0.375rem', padding: '1rem' }}
                        >
                          {codeString.replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code
                        className={`px-1 py-0.5 rounded text-xs font-mono ${
                          message.isUser
                            ? 'bg-purple-800/70 text-purple-100' // Darker purple bg, light text for user
                            : 'bg-gray-300/70 text-gray-900' // Darker gray bg, dark text for assistant
                        } ${className || ''}`}
                        {...props}
                      >
                        {/* Render trimmed version for inline code */}
                        {codeString.trim()}
                      </code>
                    );
                  },
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800" />
                  ),
                  p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                }}
              >
                {content}
              </ReactMarkdown>
            );
          })()}
        </div>

        {/* Additional Context section (for user messages) */}
        {message.isUser && message.additionalContext && (
          <div className="mt-3 pt-3 border-t border-purple-700/50">
            {' '}
            {/* Adjusted border color for subtlety */}
            <button
              className="flex items-center text-xs text-purple-300 mb-1 w-full text-left focus:outline-none" // Adjusted text color for subtlety
              onClick={() => setIsContextCollapsed(!isContextCollapsed)}
              aria-expanded={!isContextCollapsed}
              aria-controls="additional-context-content"
            >
              {isContextCollapsed ? <ChevronRight size={14} className="mr-1" /> : <ChevronDown size={14} className="mr-1" />}
              Prompt used:
            </button>
            {!isContextCollapsed && (
              <div className="text-[10px] mt-1 pl-5 prose prose-sm prose-invert" id="additional-context-content">
                {' '}
                {/* Removed max-w-none */}
                <pre className="whitespace-pre-wrap break-words">{message.additionalContext}</pre> {/* Use pre for formatting */}
              </div>
            )}
          </div>
        )}

        {/* Resource section */}
        {!message.isUser && message.resources && message.resources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            {/* Make the title clickable to toggle collapse */}
            <button
              className="flex items-center text-xs text-gray-500 mb-1 w-full text-left focus:outline-none"
              onClick={() => setIsResourcesCollapsed(!isResourcesCollapsed)}
              aria-expanded={!isResourcesCollapsed}
              aria-controls="resource-list"
            >
              {isResourcesCollapsed ? <ChevronRight size={14} className="mr-1" /> : <ChevronDown size={14} className="mr-1" />}
              Referenced Resources:
            </button>
            {/* Conditionally render the list based on the collapsed state */}
            {!isResourcesCollapsed && (
              <div className="text-[10px] mt-1 pl-5" id="resource-list">
                {' '}
                {/* Added pl-5 for indentation */}
                {(message.resources as Resource[]).map((resource: Resource, idx: number) => (
                  <span key={resource.id || `res-${idx}`}>
                    <a
                      href={resource.url}
                      className="text-purple-600 hover:text-purple-800"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {/* Use helper function for clarity and add parentheses for operator precedence */}
                      {getResourceDisplayName(resource)} ({resource.type})
                    </a>
                    {idx < (message.resources?.length || 0) - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Code Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          {/* Add z-index and animations to Overlay */}
          {/* NOTE: Define overlayShow/overlayHide keyframes in CSS/Tailwind config */}
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50 data-[state=open]:animate-overlayShow data-[state=closed]:animate-overlayHide" />
          {/* Add z-index and animations to Content */}
          {/* NOTE: Define contentShow/contentHide keyframes in CSS/Tailwind config */}
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[100] w-[90vw] max-w-4xl max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-[#1e1e1e] p-0 shadow-lg focus:outline-none data-[state=open]:animate-contentShow data-[state=closed]:animate-contentHide overflow-hidden flex flex-col">
            {/* Modal Header with Copy Button */}
            <div className="flex justify-between items-center px-4 py-2.5 bg-gray-700 text-gray-300 text-sm flex-shrink-0 border-b border-gray-600">
              <Dialog.Title className="font-medium">{modalContent?.language}</Dialog.Title>
              <div className="flex items-center gap-3">
                {modalContent && (
                  <button
                    onClick={() => handleCopy(modalContent.code, 'modal-copy')}
                    className="text-gray-300 hover:text-white flex items-center gap-1 text-xs"
                    aria-label={copiedStates['modal-copy'] ? 'Copied' : 'Copy code'}
                  >
                    {copiedStates['modal-copy'] ? <Check size={14} className="text-green-400" /> : <Clipboard size={14} />}
                    {copiedStates['modal-copy'] ? 'Copied!' : 'Copy'}
                  </button>
                )}
                <Dialog.Close asChild>
                  <button className="text-gray-300 hover:text-white" aria-label="Close">
                    <X size={18} />
                  </button>
                </Dialog.Close>
              </div>
            </div>
            <div className="flex-grow overflow-auto">
              {modalContent && (
                <SyntaxHighlighter
                  style={vscDarkPlus as any}
                  language={modalContent.language}
                  PreTag="div"
                  showLineNumbers
                  wrapLines={true}
                  customStyle={{ margin: 0, height: '100%', padding: '1rem' }} // Ensure it fills height and has padding
                >
                  {modalContent.code}
                </SyntaxHighlighter>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
