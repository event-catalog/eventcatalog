import { useEffect, useRef, useCallback, useState } from 'react';
import { X, Sparkles, Square, Trash2, BookOpen, Copy, Check, Maximize2, Minimize2 } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import * as Dialog from '@radix-ui/react-dialog';

// Code block component with copy functionality
const CodeBlock = ({ language, children }: { language: string; children: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-2">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        aria-label="Copy code"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0.375rem',
          fontSize: '12px',
          padding: '1rem',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

// Get time-based greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

// ============================================
// SUGGESTED QUESTIONS CONFIGURATION
// ============================================
// Each config has a pattern (regex) to match the URL path
// and an array of questions to show. Questions are checked
// in order - first matching pattern wins.
// ============================================

interface SuggestedQuestion {
  label: string;
  prompt: string;
}

interface QuestionConfig {
  pattern: RegExp;
  questions: SuggestedQuestion[];
}

const suggestedQuestionsConfig: QuestionConfig[] = [
  // Message pages (events, commands, queries) - most specific first
  {
    pattern: /^\/docs\/(events|commands|queries)\/.+/,
    questions: [
      { label: 'Which services publish this?', prompt: 'Who produces this message?' },
      { label: 'Which services subscribe to this?', prompt: 'Who consumes this message?' },
      { label: 'View the message schema', prompt: 'Show me the schema for this message' },
      { label: 'What breaks if this changes?', prompt: 'What services would be affected if this message changes?' },
    ],
  },
  // AsyncAPI specification page
  {
    pattern: /^\/docs\/services\/.+\/asyncapi\/.+/,
    questions: [
      { label: 'Summarize this API', prompt: 'Help me understand this AsyncAPI specification' },
      { label: 'Show all channels', prompt: 'What channels are defined in this AsyncAPI spec?' },
      { label: 'How do I authenticate?', prompt: 'What authentication is required for this service?' },
      { label: 'What message formats are used?', prompt: 'What are the message formats and schemas?' },
    ],
  },
  // OpenAPI specification page
  {
    pattern: /^\/docs\/services\/.+\/spec\/.+/,
    questions: [
      { label: 'Summarize this API', prompt: 'Help me understand this OpenAPI specification' },
      { label: 'Show all endpoints', prompt: 'What endpoints are available in this API?' },
      { label: 'How do I authenticate?', prompt: 'What authentication is required for this API?' },
      { label: 'What are the request & response formats?', prompt: 'What are the request and response formats?' },
    ],
  },
  // Services page
  {
    pattern: /^\/docs\/services\/.+/,
    questions: [
      { label: 'Who owns this service?', prompt: 'Who owns this service and how do I contact them?' },
      { label: 'What does this depend on?', prompt: 'What are the upstream and downstream dependencies of this service?' },
      { label: 'How do I integrate with this?', prompt: 'How do I integrate with this service?' },
      { label: 'What messages does this publish?', prompt: 'What messages does this service produce?' },
    ],
  },
  // Domains page
  {
    pattern: /^\/docs\/domains\/.+/,
    questions: [
      { label: 'What services are in this domain?', prompt: 'What services belong to this domain?' },
      { label: 'What business capability is this?', prompt: 'What business capability does this domain represent?' },
      { label: 'What events come from this domain?', prompt: 'What events are published by this domain?' },
      { label: 'Who owns this domain?', prompt: 'Who owns this domain and how do I contact them?' },
    ],
  },
  // Any other docs page
  {
    pattern: /^\/docs\/.+/,
    questions: [
      { label: 'Tell me about this', prompt: 'Tell me more about this page' },
      { label: 'Who is responsible for this?', prompt: 'Who owns this resource?' },
      { label: 'What else is related to this?', prompt: 'What other resources are related to this?' },
    ],
  },
  // Default questions (fallback)
  {
    pattern: /.*/,
    questions: [
      { label: 'What domains do we have?', prompt: 'What domains are in my catalog?' },
      { label: 'Show me all services', prompt: 'What services do I have?' },
      { label: 'What changed recently?', prompt: 'What are the most recent changes in the catalog?' },
      { label: 'How does data flow between services?', prompt: 'Show me how data flows between services' },
    ],
  },
];

// Get suggested questions based on current URL path
const getSuggestedQuestions = (pathname: string): SuggestedQuestion[] => {
  for (const config of suggestedQuestionsConfig) {
    if (config.pattern.test(pathname)) {
      return config.questions;
    }
  }
  // Fallback to last config (default)
  return suggestedQuestionsConfig[suggestedQuestionsConfig.length - 1].questions;
};

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PANEL_WIDTH = 400;

// Staggered fade-in animation styles
const fadeInStyles = {
  header: {
    animation: 'fadeInDown 0.3s ease-out 0.1s both',
  },
  content: {
    animation: 'fadeInDown 0.3s ease-out 0.2s both',
  },
  input: {
    animation: 'fadeInDown 0.3s ease-out 0.3s both',
  },
};

// Helper to extract text content from message parts
const getMessageContent = (message: { parts?: Array<{ type: string; text?: string }> }): string => {
  if (!message.parts) return '';
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
};

// Skeleton loading component
const SkeletonLoader = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-4 bg-gray-200 rounded w-[90%]" />
    <div className="h-4 bg-gray-200 rounded w-[75%]" />
    <div className="h-4 bg-gray-200 rounded w-[85%]" />
    <div className="h-4 bg-gray-200 rounded w-[60%]" />
  </div>
);

const ChatPanel = ({ isOpen, onClose }: ChatPanelProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modalMessagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [pathname, setPathname] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get current pathname on mount and when panel opens
  useEffect(() => {
    setPathname(window.location.pathname);
  }, [isOpen]);

  const suggestedQuestions = getSuggestedQuestions(pathname);

  const { messages, sendMessage, stop, status, setMessages } = useChat({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  // Check if the assistant has started outputting content
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  const assistantHasContent = lastAssistantMessage?.parts?.some(
    (p) => p.type === 'text' && (p as { type: 'text'; text: string }).text.length > 0
  );

  // Clear waiting state once assistant starts outputting or on error
  useEffect(() => {
    if (assistantHasContent || status === 'error') {
      setIsWaitingForResponse(false);
    }
  }, [assistantHasContent, status]);

  const isStreaming = status === 'streaming' && assistantHasContent;
  const isThinking = isWaitingForResponse || ((status === 'submitted' || status === 'streaming') && !assistantHasContent);
  const isLoading = isThinking || isStreaming;

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
    // Also scroll modal messages
    modalMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, scrollToBottom]);

  // Focus modal input when fullscreen opens
  useEffect(() => {
    if (isFullscreen && !isLoading) {
      setTimeout(() => {
        modalInputRef.current?.focus();
      }, 100);
    }
  }, [isFullscreen, isLoading]);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      // Focus input on CMD+I or CTRL+I
      if ((e.metaKey || e.ctrlKey) && e.key === 'i' && isOpen) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus input when opened and not loading
  useEffect(() => {
    if (isOpen && !isLoading) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isLoading]);

  // Add/remove padding to main content when sidebar panel is open
  useEffect(() => {
    const contentEl = document.getElementById('content');
    if (!contentEl) return;

    // Add transition if not already present
    if (!contentEl.style.transition) {
      contentEl.style.transition = 'padding-right 300ms cubic-bezier(0.16, 1, 0.3, 1)';
    }

    // Only add padding when panel is open AND not in fullscreen mode
    if (isOpen && !isFullscreen) {
      contentEl.style.paddingRight = '23rem';
    } else {
      contentEl.style.paddingRight = '0';
    }

    // Cleanup on unmount
    return () => {
      contentEl.style.paddingRight = '0';
    };
  }, [isOpen, isFullscreen]);

  // Submit message handler
  const submitMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isLoading) return;
      setInputValue('');
      setIsWaitingForResponse(true);
      sendMessage({ text });
    },
    [isLoading, sendMessage]
  );

  // Handle suggested action clicks
  const handleSuggestedAction = useCallback(
    (prompt: string) => {
      submitMessage(prompt);
    },
    [submitMessage]
  );

  // Handle textarea enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitMessage(inputValue);
      }
    },
    [inputValue, submitMessage]
  );

  // Handle form submit
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      submitMessage(inputValue);
    },
    [inputValue, submitMessage]
  );

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* Keyframes for fade-in animation */}
      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(147, 51, 234, 0.3); }
          50% { box-shadow: 0 0 16px rgba(147, 51, 234, 0.5); }
        }
      `}</style>

      {/* Panel - hidden when fullscreen modal is open */}
      {!isFullscreen && (
        <div
          className="fixed top-0 right-0 h-[100vh] z-[200] bg-gradient-to-b from-white via-white to-gray-50/80 border-l border-gray-200/80 flex flex-col overflow-hidden"
          style={{
            width: `${PANEL_WIDTH}px`,
            transform: isOpen ? 'translateX(0)' : `translateX(${PANEL_WIDTH}px)`,
            transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '-8px 0 24px -4px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Purple accent line at top */}
          <div className="h-1 bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600" />

          {/* Header */}
          <div
            className="flex-none bg-gradient-to-b from-purple-50/50 to-transparent shrink-0"
            style={isOpen ? fadeInStyles.header : undefined}
            key={isOpen ? 'header-open' : 'header-closed'}
          >
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-purple-100 rounded-lg relative">
                  <BookOpen size={16} className="text-purple-600" />
                  <Sparkles size={8} className="text-purple-400 absolute -top-0.5 -right-0.5" />
                </div>
                <span className="font-semibold text-gray-900 text-[15px]">EventCatalog Assistant</span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Expand to fullscreen"
                  title="Expand"
                >
                  <Maximize2 size={16} />
                </button>
                {hasMessages && (
                  <button
                    onClick={() => setMessages([])}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Clear chat"
                    title="Clear chat"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close chat panel"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            {/* Thinking indicator */}
            {isThinking && (
              <div className="px-5 pb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-500">Thinking...</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div
            className="flex-1 flex flex-col min-h-0 relative overflow-hidden"
            style={isOpen ? fadeInStyles.content : undefined}
            key={isOpen ? 'content-open' : 'content-closed'}
          >
            {/* Messages or Welcome area */}
            <div className="flex-1 overflow-y-auto px-6 scrollbar-hide">
              {!hasMessages ? (
                /* Welcome area */
                <div className="flex flex-col h-full justify-between pt-6 pb-2">
                  {/* Center content */}
                  <div className="flex-1 flex flex-col items-center justify-center">
                    {/* Animated Icon */}
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-purple-400/20 rounded-2xl blur-xl animate-pulse" />
                      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <BookOpen size={28} className="text-white" strokeWidth={1.5} />
                        <Sparkles size={12} className="text-purple-200 absolute -top-1 -right-1 animate-pulse" />
                      </div>
                    </div>

                    {/* Greeting with gradient */}
                    <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-1">
                      {getGreeting()}
                    </h2>
                    <p className="text-sm text-gray-500 text-center">I'm here to help you explore your architecture.</p>
                  </div>

                  {/* Suggested questions */}
                  <div className="flex flex-wrap gap-2 mt-6">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedAction(question.prompt)}
                        className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 rounded-full transition-all shadow-sm"
                      >
                        {question.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Messages area */
                <div className="py-4 space-y-4">
                  {messages.map((message) => {
                    const content = getMessageContent(message);
                    return (
                      <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {message.role === 'user' ? (
                          <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm">
                            <p className="text-sm font-light whitespace-pre-wrap">{content}</p>
                          </div>
                        ) : (
                          <div className="w-full text-gray-700">
                            <div className="prose prose-sm max-w-none prose-p:my-2 prose-p:font-normal prose-p:text-[13px] prose-headings:my-3 prose-headings:font-medium prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-[13px] prose-li:font-normal text-[13px] font-light">
                              <ReactMarkdown
                                components={{
                                  a: ({ ...props }) => (
                                    <a
                                      {...props}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-purple-600 hover:text-purple-800 underline"
                                    />
                                  ),
                                  code: ({ children, className, ...props }) => {
                                    const isInline = !className;
                                    const match = /language-(\w+)/.exec(className || '');
                                    const language = match ? match[1] : 'text';
                                    const codeString = String(children).replace(/\n$/, '');

                                    return isInline ? (
                                      <code
                                        className="px-1 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-800"
                                        {...props}
                                      >
                                        {children}
                                      </code>
                                    ) : (
                                      <CodeBlock language={language}>{codeString}</CodeBlock>
                                    );
                                  },
                                }}
                              >
                                {content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Skeleton loading indicator */}
                  {isThinking && (
                    <div className="w-full">
                      <SkeletonLoader />
                    </div>
                  )}

                  {/* Error message as chat bubble */}
                  {status === 'error' && (
                    <div className="flex justify-start">
                      <div className="w-full">
                        <div className="flex items-start gap-2 text-red-600 text-sm">
                          <span className="shrink-0">⚠️</span>
                          <span>Something went wrong. Please try again.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input area (Fixed at bottom) */}
            <div
              className="flex-none px-4 py-3 pb-2 bg-gradient-to-t from-gray-50 to-transparent border-t border-gray-100"
              style={isOpen ? fadeInStyles.input : undefined}
              key={isOpen ? 'input-open' : 'input-closed'}
            >
              <form onSubmit={handleSubmit}>
                <div className="relative bg-white rounded-xl border border-gray-200 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100 transition-all shadow-sm">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitMessage(inputValue);
                      }
                    }}
                    placeholder="Ask anything about your architecture..."
                    disabled={isLoading}
                    className="w-full px-3 py-2.5 pr-16 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-sm disabled:opacity-50 rounded-xl"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10">
                    {isStreaming ? (
                      <button
                        type="button"
                        onClick={() => stop()}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Stop generating"
                      >
                        <Square size={12} fill="currentColor" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                        className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                        aria-label="Send message"
                      >
                        Send
                      </button>
                    )}
                  </div>
                </div>
              </form>

              <p className="text-[9px] text-gray-400 mt-2 text-center">AI can make mistakes. Verify important info.</p>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Modal */}
      <Dialog.Root
        open={isFullscreen}
        onOpenChange={(open) => {
          setIsFullscreen(open);
          // If modal is being closed (clicking outside, etc.), close the chat entirely
          if (!open) {
            onClose();
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300]" />
          <Dialog.Content className="fixed inset-y-4 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl md:inset-y-8 rounded-2xl bg-white shadow-2xl z-[301] flex flex-col overflow-hidden focus:outline-none border border-gray-200">
            {/* Purple accent line at top */}
            <div className="h-1 bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600" />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-b from-purple-50/50 to-transparent flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-xl relative">
                  <BookOpen size={20} className="text-purple-600" />
                  <Sparkles size={10} className="text-purple-400 absolute -top-0.5 -right-0.5" />
                </div>
                <Dialog.Title className="text-lg font-semibold text-gray-900">EventCatalog Assistant</Dialog.Title>
              </div>
              <div className="flex items-center space-x-2">
                {hasMessages && (
                  <button
                    onClick={() => setMessages([])}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Clear chat"
                    title="Clear chat"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Exit fullscreen"
                  title="Exit fullscreen"
                >
                  <Minimize2 size={18} />
                </button>
                <button
                  onClick={() => {
                    setIsFullscreen(false);
                    onClose();
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Thinking indicator */}
            {isThinking && (
              <div className="px-6 py-2 flex items-center gap-2 border-b border-gray-100">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            )}

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {!hasMessages ? (
                /* Welcome area */
                <div className="flex flex-col h-full justify-center items-center">
                  {/* Animated Icon */}
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-purple-400/20 rounded-2xl blur-xl animate-pulse" />
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <BookOpen size={36} className="text-white" strokeWidth={1.5} />
                      <Sparkles size={14} className="text-purple-200 absolute -top-1 -right-1 animate-pulse" />
                    </div>
                  </div>

                  {/* Greeting with gradient */}
                  <h2 className="text-2xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                    {getGreeting()}
                  </h2>
                  <p className="text-gray-500 text-center mb-10">I'm here to help you explore your architecture.</p>

                  {/* Suggested questions */}
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedAction(question.prompt)}
                        className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 rounded-full transition-all shadow-sm"
                      >
                        {question.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Messages area */
                <div className="max-w-3xl mx-auto space-y-4">
                  {messages.map((message) => {
                    const content = getMessageContent(message);
                    return (
                      <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {message.role === 'user' ? (
                          <div className="max-w-[75%] rounded-2xl rounded-br-md px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm">
                            <p className="text-sm font-light whitespace-pre-wrap">{content}</p>
                          </div>
                        ) : (
                          <div className="w-full text-gray-700">
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown
                                components={{
                                  a: ({ ...props }) => (
                                    <a
                                      {...props}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-purple-600 hover:text-purple-800 underline"
                                    />
                                  ),
                                  code: ({ children, className, ...props }) => {
                                    const isInline = !className;
                                    const match = /language-(\w+)/.exec(className || '');
                                    const language = match ? match[1] : 'text';
                                    const codeString = String(children).replace(/\n$/, '');

                                    return isInline ? (
                                      <code
                                        className="px-1.5 py-0.5 rounded text-sm font-mono bg-gray-100 text-gray-800"
                                        {...props}
                                      >
                                        {children}
                                      </code>
                                    ) : (
                                      <CodeBlock language={language}>{codeString}</CodeBlock>
                                    );
                                  },
                                }}
                              >
                                {content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isThinking && (
                    <div className="w-full max-w-md">
                      <SkeletonLoader />
                    </div>
                  )}

                  {/* Error message as chat bubble */}
                  {status === 'error' && (
                    <div className="flex justify-start">
                      <div className="w-full">
                        <div className="flex items-start gap-2 text-red-600 text-sm">
                          <span className="shrink-0">⚠️</span>
                          <span>Something went wrong. Please try again.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={modalMessagesEndRef} />
                </div>
              )}
            </div>

            {/* Modal Input area */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gradient-to-t from-gray-50 to-transparent">
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                <div className="relative bg-white rounded-xl border border-gray-200 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100 transition-all shadow-sm">
                  <input
                    ref={modalInputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitMessage(inputValue);
                      }
                    }}
                    placeholder="Ask anything about your architecture..."
                    disabled={isLoading}
                    className="w-full px-4 py-3 pr-20 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-sm disabled:opacity-50 rounded-xl"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                    {isStreaming ? (
                      <button
                        type="button"
                        onClick={() => stop()}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Stop generating"
                      >
                        <Square size={16} fill="currentColor" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                        className="px-4 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                        aria-label="Send message"
                      >
                        Send
                      </button>
                    )}
                  </div>
                </div>
              </form>
              <p className="text-xs text-gray-400 mt-2 text-center">AI can make mistakes. Verify important info.</p>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

export default ChatPanel;
