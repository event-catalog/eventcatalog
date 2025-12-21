import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { X, Sparkles, Square, Trash2, BookOpen, Copy, Check, Maximize2, Minimize2, Wrench } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';

interface ToolMetadata {
  name: string;
  description: string;
  isCustom?: boolean;
}

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
  // Match /schemas with specType=graphql as query parameter
  {
    pattern: /^\/schemas.*[?&]specType=graphql/,
    questions: [
      { label: 'Tell me more about this GraphQL schema', prompt: 'Tell me more about this GraphQL schema' },
      { label: 'What queries are available?', prompt: 'What queries are available in this GraphQL schema?' },
      { label: 'What mutations are available?', prompt: 'What mutations are available in this GraphQL schema?' },
      { label: 'Show me the types defined', prompt: 'Show me the types defined in this GraphQL schema' },
    ],
  },
  {
    pattern: /^\/schemas.*[?&]specType=openapi/,
    questions: [
      { label: 'Tell me more about this OpenAPI schema', prompt: 'Tell me more about this OpenAPI schema' },
      { label: 'Show me the endpoints available', prompt: 'Show me the endpoints available in this OpenAPI schema' },
      {
        label: 'Show me the request and response formats',
        prompt: 'Show me the request and response formats in this OpenAPI schema',
      },
    ],
  },
  {
    pattern: /^\/schemas.*[?&]specType=asyncapi/,
    questions: [
      { label: 'Tell me more about this AsyncAPI schema', prompt: 'Tell me more about this AsyncAPI schema' },
      { label: 'Show me the channels available', prompt: 'Show me the channels available in this AsyncAPI schema' },
      { label: 'Show me the messages available', prompt: 'Show me the messages available in this AsyncAPI schema' },
      {
        label: 'Show me the request and response formats',
        prompt: 'Show me the request and response formats in this AsyncAPI schema',
      },
    ],
  },
  {
    pattern: /^\/schemas/,
    questions: [
      { label: 'Tell me more about this schema?', prompt: 'Tell me more about this schema' },
      { label: 'Who producers or consumes this schema?', prompt: 'Who producers or consumes this schema?' },
      { label: 'What fields are required?', prompt: 'What fields are required for this schema?' },
      {
        label: 'Generate code using this schema',
        prompt: 'Create a code example of using this schema, ask me for the programming language I want the example in.',
      },
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

// Staggered fade-in animation styles (delays account for 800ms panel slide)
const fadeInStyles = {
  header: {
    animation: 'fadeIn 0.5s ease-out 0.3s both',
  },
  welcome: {
    animation: 'fadeIn 0.6s ease-out 0.4s both',
  },
  // Label and questions will be staggered individually in the component
  questionsLabel: {
    animation: 'fadeIn 0.5s ease-out 0.7s both',
  },
  getQuestionStyle: (index: number) => ({
    animation: `fadeIn 0.5s ease-out ${0.85 + index * 0.12}s both`,
  }),
  inputFocus: {
    animation: 'focusIn 0.6s ease-out 1.4s both',
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
  const [tools, setTools] = useState<ToolMetadata[]>([]);

  // Sort tools with custom ones first
  const sortedTools = useMemo(() => {
    return [...tools].sort((a, b) => {
      if (a.isCustom && !b.isCustom) return -1;
      if (!a.isCustom && b.isCustom) return 1;
      return 0;
    });
  }, [tools]);

  // Fetch available tools when panel opens
  useEffect(() => {
    if (isOpen && tools.length === 0) {
      fetch('/api/chat')
        .then((res) => res.json())
        .then((data) => {
          if (data.tools) {
            setTools(data.tools);
          }
        })
        .catch(() => {
          // Silently fail - tools info is optional
        });
    }
  }, [isOpen, tools.length]);

  // Get current URL (pathname + search) on mount and when panel opens
  useEffect(() => {
    setPathname(window.location.pathname + window.location.search);
  }, [isOpen]);

  const suggestedQuestions = getSuggestedQuestions(pathname);

  const { messages, sendMessage, stop, status, setMessages, error } = useChat({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  // Extract user-friendly error message
  const errorMessage = error?.message || 'Something went wrong. Please try again.';

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

  // Add/remove padding to main application and header when sidebar panel is open
  useEffect(() => {
    const appEl = document.getElementById('eventcatalog-application');
    const headerEl = document.getElementById('eventcatalog-header');
    const docsSidebarEl = document.getElementById('eventcatalog-docs-sidebar');

    const elements = [appEl, headerEl].filter(Boolean) as HTMLElement[];

    elements.forEach((el) => {
      // Add transition if not already present
      if (!el.style.transition) {
        el.style.transition = 'padding-right 800ms cubic-bezier(0.16, 1, 0.3, 1)';
      }

      // Only add padding when panel is open AND not in fullscreen mode
      if (isOpen && !isFullscreen) {
        el.style.paddingRight = `${PANEL_WIDTH}px`;
      } else {
        el.style.paddingRight = '0';
      }
    });

    // Hide docs sidebar when chat panel is open
    if (docsSidebarEl) {
      if (isOpen && !isFullscreen) {
        docsSidebarEl.style.display = 'none';
      } else {
        docsSidebarEl.style.display = '';
      }
    }

    // Cleanup on unmount
    return () => {
      elements.forEach((el) => {
        el.style.paddingRight = '0';
      });
      if (docsSidebarEl) {
        docsSidebarEl.style.display = '';
      }
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
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes focusIn {
          from {
            box-shadow: 0 0 0 0 rgba(168, 85, 247, 0);
            border-color: #e5e7eb;
          }
          to {
            box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.15);
            border-color: #c084fc;
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
          className="fixed top-0 right-0 h-[100vh] z-[200] bg-white border-l border-gray-200 flex flex-col overflow-hidden"
          style={{
            width: `${PANEL_WIDTH}px`,
            transform: isOpen ? 'translateX(0)' : `translateX(${PANEL_WIDTH}px)`,
            transition: 'transform 800ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div className="flex-none border-b border-gray-100 shrink-0 pb-1">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-purple-50 rounded-md">
                  <BookOpen size={14} className="text-purple-600" />
                </div>
                <span className="font-medium text-gray-900 text-sm">EventCatalog Assistant</span>
              </div>
              <div className="flex items-center space-x-1">
                {tools.length > 0 && (
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <button
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="View available tools"
                        title="Available tools"
                      >
                        <Wrench size={16} />
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content
                        className="w-72 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-[250]"
                        sideOffset={5}
                        align="end"
                      >
                        <div className="text-[10px] font-medium text-gray-500 mb-2">Available Tools ({sortedTools.length})</div>
                        <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                          {sortedTools.map((tool) => (
                            <div key={tool.name} className="py-1.5 first:pt-0 last:pb-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-medium text-gray-700">{tool.name}</span>
                                {tool.isCustom && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-medium bg-purple-100 text-purple-700 rounded">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-500 mt-0.5">{tool.description}</div>
                            </div>
                          ))}
                        </div>
                        <Popover.Arrow className="fill-white" />
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                )}
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
              <div className="px-4 pb-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-500">Thinking...</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden" key={isOpen ? 'content-open' : 'content-closed'}>
            {/* Messages or Welcome area */}
            <div className="flex-1 overflow-y-auto px-4 scrollbar-hide">
              {!hasMessages ? (
                /* Welcome area */
                <div className="flex flex-col h-full justify-between pt-4 pb-2">
                  {/* Center content */}
                  <div
                    className="flex-1 flex flex-col items-center justify-center"
                    style={isOpen ? fadeInStyles.welcome : undefined}
                  >
                    {/* Animated Icon */}
                    <div className="relative mb-5">
                      <div className="absolute inset-0 bg-purple-400/20 rounded-2xl blur-xl animate-pulse" />
                      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <BookOpen size={26} className="text-white" strokeWidth={1.5} />
                        <Sparkles size={10} className="text-purple-200 absolute -top-1 -right-1 animate-pulse" />
                      </div>
                    </div>
                    <h2 className="text-base font-medium text-gray-900 mb-1">{getGreeting()}</h2>
                    <p className="text-sm text-gray-500 text-center">Ask me anything about your catalog.</p>
                  </div>

                  {/* Suggested questions */}
                  <div className="space-y-1.5 mt-4">
                    <p
                      className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2"
                      style={isOpen ? fadeInStyles.questionsLabel : undefined}
                    >
                      Example questions
                    </p>
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedAction(question.prompt)}
                        className="w-full text-left px-3 py-2.5 text-sm text-gray-700 bg-gray-100 hover:bg-purple-50 hover:text-purple-700 border border-gray-200 hover:border-purple-200 rounded-lg transition-colors"
                        style={isOpen ? fadeInStyles.getQuestionStyle(index) : undefined}
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
                          <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-purple-600 text-white">
                            <p className="text-sm whitespace-pre-wrap">{content}</p>
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
                          <span>{errorMessage}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input area (Fixed at bottom) */}
            <div className="flex-none px-4 py-3 border-t border-gray-100" key={isOpen ? 'input-open' : 'input-closed'}>
              <form onSubmit={handleSubmit}>
                <div className="relative bg-gray-50 rounded-lg border-2 border-gray-200 focus-within:border-purple-300 focus-within:bg-white transition-all">
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
                    placeholder="Ask a question..."
                    disabled={isLoading}
                    className="w-full px-3 py-2.5 pr-14 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-sm disabled:opacity-50 rounded-lg"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10">
                    {isStreaming ? (
                      <button
                        type="button"
                        onClick={() => stop()}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        aria-label="Stop generating"
                      >
                        <Square size={12} fill="currentColor" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                        className="px-2.5 py-1 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
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
          <Dialog.Overlay className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[300]" />
          <Dialog.Content className="fixed inset-y-4 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl md:inset-y-8 rounded-xl bg-white shadow-2xl z-[301] flex flex-col overflow-hidden focus:outline-none border border-gray-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-purple-50 rounded-lg">
                  <BookOpen size={18} className="text-purple-600" />
                </div>
                <Dialog.Title className="text-base font-medium text-gray-900">Ask AI</Dialog.Title>
              </div>
              <div className="flex items-center space-x-2">
                {tools.length > 0 && (
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <button
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="View available tools"
                        title="Available tools"
                      >
                        <Wrench size={18} />
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content
                        className="w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-[350]"
                        sideOffset={5}
                        align="end"
                        style={{ maxHeight: 'calc(100vh - 200px)' }}
                      >
                        <div className="text-[11px] font-medium text-gray-500 mb-2">Available Tools ({sortedTools.length})</div>
                        <div className="overflow-y-auto divide-y divide-gray-100" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                          {sortedTools.map((tool) => (
                            <div key={tool.name} className="py-2 first:pt-0 last:pb-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-gray-700">{tool.name}</span>
                                {tool.isCustom && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-medium bg-purple-100 text-purple-700 rounded">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5">{tool.description}</div>
                            </div>
                          ))}
                        </div>
                        <Popover.Arrow className="fill-white" />
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                )}
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
              <div className="px-5 py-2 flex items-center gap-2 border-b border-gray-100">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            )}

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!hasMessages ? (
                /* Welcome area */
                <div className="flex flex-col h-full justify-center items-center">
                  {/* Animated Icon */}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-purple-400/20 rounded-2xl blur-xl animate-pulse" />
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <BookOpen size={30} className="text-white" strokeWidth={1.5} />
                      <Sparkles size={12} className="text-purple-200 absolute -top-1 -right-1 animate-pulse" />
                    </div>
                  </div>
                  <h2 className="text-xl font-medium text-gray-900 mb-1">{getGreeting()}</h2>
                  <p className="text-gray-500 text-center mb-8">Ask me anything about your catalog.</p>

                  {/* Suggested questions */}
                  <div className="grid grid-cols-2 gap-2 max-w-lg">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedAction(question.prompt)}
                        className="px-4 py-2.5 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
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
                          <div className="max-w-[75%] rounded-2xl rounded-br-md px-4 py-2.5 bg-purple-600 text-white">
                            <p className="text-sm whitespace-pre-wrap">{content}</p>
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
                          <span>{errorMessage}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={modalMessagesEndRef} />
                </div>
              )}
            </div>

            {/* Modal Input area */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100">
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                <div className="relative bg-gray-50 rounded-lg border border-gray-200 focus-within:border-purple-300 focus-within:bg-white transition-all">
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
                    placeholder="Ask a question..."
                    disabled={isLoading}
                    className="w-full px-4 py-3 pr-16 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-sm disabled:opacity-50 rounded-lg"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                    {isStreaming ? (
                      <button
                        type="button"
                        onClick={() => stop()}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        aria-label="Stop generating"
                      >
                        <Square size={14} fill="currentColor" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                        className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
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
