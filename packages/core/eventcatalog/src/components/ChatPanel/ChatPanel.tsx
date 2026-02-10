import { useEffect, useRef, useCallback, useState, useMemo, memo } from 'react';
import { X, Square, Trash2, BookOpen, Copy, Check, Maximize2, Minimize2, Wrench, ChevronDown, MessageSquare } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';

interface ToolMetadata {
  name: string;
  description: string;
  isCustom?: boolean;
}

// CSS keyframes - defined once outside component to avoid re-injection
const CHAT_PANEL_STYLES = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
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
`;

// Stable style object for syntax highlighter
const CODE_BLOCK_STYLE = {
  margin: 0,
  borderRadius: '0.375rem',
  fontSize: '12px',
  padding: '1rem',
};

// Code block component with copy functionality - memoized
const CodeBlock = memo(({ language, children }: { language: string; children: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
    } catch {
      // Clipboard API can fail in some contexts
    }
  }, [children]);

  // Clear copied state after 2 seconds with proper cleanup
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <div className="relative group my-2">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        aria-label="Copy code"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <SyntaxHighlighter language={language} style={oneDark} customStyle={CODE_BLOCK_STYLE}>
        {children}
      </SyntaxHighlighter>
    </div>
  );
});
CodeBlock.displayName = 'CodeBlock';

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
      {
        label: 'What does this service depend on?',
        prompt: 'What are the upstream and downstream dependencies of this service?',
      },
      { label: 'How do I integrate with this service?', prompt: 'How do I integrate with this service?' },
      { label: 'What messages are published and consumed?', prompt: 'What messages does this service produce and consume?' },
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
  // Business Flows / Workflows (must be before general visualiser pattern)
  {
    pattern: /^\/(docs|visualiser)\/flows\/.+/,
    questions: [
      {
        label: 'Walk me through this workflow',
        prompt:
          'Get the architecture diagram for this flow and walk me through each step of this business workflow. Explain what happens at each stage.',
      },
      {
        label: 'What services are involved?',
        prompt:
          'Using the architecture diagram, list all the services involved in this workflow and explain their role in the process.',
      },
      {
        label: 'What events does this trigger?',
        prompt: 'What events are produced during this workflow? When are they triggered and who consumes them?',
      },
      {
        label: 'What can go wrong?',
        prompt:
          'Analyze this workflow and identify potential failure points. What happens if a step fails? Are there retry mechanisms or compensating actions?',
      },
    ],
  },
  // Visualizer page (/visualiser/*) - general fallback for other visualiser pages
  {
    pattern: /^\/visualiser\/.+/,
    questions: [
      {
        label: 'Explain this architecture',
        prompt:
          'Get the architecture diagram for this resource and explain what I am looking at. Describe the key components and how they connect.',
      },
      {
        label: 'What are the dependencies?',
        prompt: 'Using the architecture diagram, show me what this resource depends on and what depends on it.',
      },
      {
        label: 'How does data flow here?',
        prompt: 'Get the architecture diagram and explain how data flows through this part of the system.',
      },
      {
        label: 'What would break if this changes?',
        prompt:
          'Analyze the architecture diagram to identify what services or components would be affected if this resource changes.',
      },
    ],
  },
  // Data Products page
  {
    pattern: /^\/(docs|visualiser)\/data-products\/.+/,
    questions: [
      { label: 'What are the inputs and outputs?', prompt: 'What are the inputs and outputs of this data product?' },
      { label: 'Show me the data contracts', prompt: 'What are the data contracts for this data product?' },
      { label: 'Is this data product production ready?', prompt: 'Is this data product production ready?' },
      { label: 'What is the quality & SLA of this product?', prompt: 'What is the quality & SLA of this product?' },
      { label: 'Who owns this data product?', prompt: 'Who owns this data product and how do I contact them?' },
    ],
  },

  // Designs page
  {
    pattern: /^\/diagrams\/.+/,
    questions: [
      { label: 'Tell me more about this diagram?', prompt: 'Tell me more about this diagram?' },
      { label: 'Help me understand this diagram', prompt: 'Help me understand this diagram' },
      { label: 'What is the context of this diagram?', prompt: 'What is the context of this diagram, what is it related to?' },
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
  // Follow-up suggestions animate with staggered fade-in-up
  getFollowUpStyle: (index: number) => ({
    animation: `fadeInUp 0.4s ease-out ${index * 0.1}s both`,
  }),
};

// Preprocess markdown to fix common formatting issues
const preprocessMarkdown = (text: string): string => {
  // Add newlines before headings if they're directly after text (no newline)
  // This fixes cases like "some text.## Heading" → "some text.\n\n## Heading"
  return text.replace(/([^\n])(#{1,6}\s)/g, '$1\n\n$2');
};

// Helper to extract text content from message parts
const getMessageContent = (message: { parts?: Array<{ type: string; text?: string }> }): string => {
  if (!message.parts) return '';
  const rawContent = message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
  return preprocessMarkdown(rawContent);
};

// Helper to extract follow-up suggestions from message parts
const getFollowUpSuggestions = (message: { parts?: Array<any> }): string[] => {
  if (!message.parts) return [];

  for (const part of message.parts) {
    // AI SDK format: type is "tool-{toolName}" and result is in "output"
    if (part.type === 'tool-suggestFollowUpQuestions' && part.state === 'output-available') {
      const suggestions = part.output?.suggestions;
      if (suggestions && Array.isArray(suggestions)) {
        return suggestions;
      }
    }
  }
  return [];
};

// Helper to extract currently running tools from message parts
const getRunningTools = (message: { parts?: Array<any> }): string[] => {
  if (!message.parts) return [];

  const runningTools: string[] = [];
  for (const part of message.parts) {
    // Tool parts have type like "tool-{toolName}" and state indicates progress
    if (part.type?.startsWith('tool-') && part.state !== 'output-available') {
      // Extract tool name from type (e.g., "tool-getServiceHealth" -> "getServiceHealth")
      const toolName = part.type.replace('tool-', '');
      // Skip the follow-up suggestions tool as it's internal
      if (toolName !== 'suggestFollowUpQuestions') {
        runningTools.push(toolName);
      }
    }
  }
  return runningTools;
};

// Helper to extract completed tools from message parts (for showing after completion)
const getCompletedTools = (message: { parts?: Array<any> }): string[] => {
  if (!message.parts) return [];

  const completedTools: string[] = [];
  for (const part of message.parts) {
    // Tool parts have type like "tool-{toolName}" and state 'output-available' when done
    if (part.type?.startsWith('tool-') && part.state === 'output-available') {
      const toolName = part.type.replace('tool-', '');
      // Skip internal tools
      if (toolName !== 'suggestFollowUpQuestions') {
        completedTools.push(toolName);
      }
    }
  }
  return completedTools;
};

// Skeleton loading component - memoized since it never changes
const SkeletonLoader = memo(() => (
  <div className="animate-pulse space-y-3">
    <div className="h-4 bg-[rgb(var(--ec-content-hover))] rounded w-[90%]" />
    <div className="h-4 bg-[rgb(var(--ec-content-hover))] rounded w-[75%]" />
    <div className="h-4 bg-[rgb(var(--ec-content-hover))] rounded w-[85%]" />
    <div className="h-4 bg-[rgb(var(--ec-content-hover))] rounded w-[60%]" />
  </div>
));
SkeletonLoader.displayName = 'SkeletonLoader';

// Memoized markdown components to prevent re-renders
const markdownComponents = {
  a: ({ ...props }: any) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[rgb(var(--ec-accent))] hover:text-[rgb(var(--ec-accent-hover))] underline"
    />
  ),
  code: ({ children, className, ...props }: any) => {
    const isInline = !className;
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'text';
    const codeString = String(children).replace(/\n$/, '');

    return isInline ? (
      <code
        className="px-1 py-0.5 rounded text-xs font-mono bg-[rgb(var(--ec-content-hover))] text-[rgb(var(--ec-page-text))]"
        {...props}
      >
        {children}
      </code>
    ) : (
      <CodeBlock language={language}>{codeString}</CodeBlock>
    );
  },
  table: ({ ...props }: any) => (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full text-xs border-collapse border border-[rgb(var(--ec-page-border))]" {...props} />
    </div>
  ),
  thead: ({ ...props }: any) => <thead className="bg-[rgb(var(--ec-content-hover))]" {...props} />,
  th: ({ ...props }: any) => (
    <th
      className="px-3 py-2 text-left font-medium text-[rgb(var(--ec-page-text))] border border-[rgb(var(--ec-page-border))]"
      {...props}
    />
  ),
  td: ({ ...props }: any) => (
    <td className="px-3 py-2 text-[rgb(var(--ec-page-text-muted))] border border-[rgb(var(--ec-page-border))]" {...props} />
  ),
};

// Modal version with slightly different code styling
const modalMarkdownComponents = {
  ...markdownComponents,
  code: ({ children, className, ...props }: any) => {
    const isInline = !className;
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'text';
    const codeString = String(children).replace(/\n$/, '');

    return isInline ? (
      <code
        className="px-1.5 py-0.5 rounded text-sm font-mono bg-[rgb(var(--ec-content-hover))] text-[rgb(var(--ec-page-text))]"
        {...props}
      >
        {children}
      </code>
    ) : (
      <CodeBlock language={language}>{codeString}</CodeBlock>
    );
  },
  table: ({ ...props }: any) => (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full text-sm border-collapse border border-[rgb(var(--ec-page-border))]" {...props} />
    </div>
  ),
};

const ChatPanel = ({ isOpen, onClose }: ChatPanelProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modalMessagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [pathname, setPathname] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tools, setTools] = useState<ToolMetadata[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);

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

  // Memoize suggested questions to avoid recalculating on every render
  const suggestedQuestions = useMemo(() => getSuggestedQuestions(pathname), [pathname]);

  // Memoize page context to avoid recalculating on every render
  const pageContext = useMemo(() => {
    const match = pathname.match(
      /^\/(docs|visualiser|architecture)\/(events|services|commands|queries|flows|domains|channels|entities|containers|data-products)\/([^/]+)(?:\/([^/]+))?/
    );
    if (match) {
      const [, , collection, id, version] = match;
      const collectionNames: Record<string, string> = {
        events: 'Event',
        services: 'Service',
        commands: 'Command',
        queries: 'Query',
        flows: 'Flow',
        domains: 'Domain',
        channels: 'Channel',
        entities: 'Entity',
        containers: 'Container',
        'data-products': 'Data Product',
      };
      return {
        type: collectionNames[collection] || collection,
        name: id,
        version: version || 'latest',
      };
    }
    return null;
  }, [pathname]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }, []);

  const { messages, sendMessage, stop, status, setMessages, error } = useChat();

  // Extract user-friendly error message
  const errorMessage = error?.message || 'Something went wrong. Please try again.';

  // Memoize last assistant message to avoid array operations on every render
  const lastAssistantMessage = useMemo(() => messages.findLast((m) => m.role === 'assistant'), [messages]);

  // Check if the assistant has started outputting content
  const assistantHasContent = useMemo(
    () => lastAssistantMessage?.parts?.some((p) => p.type === 'text' && (p as { type: 'text'; text: string }).text.length > 0),
    [lastAssistantMessage]
  );

  // Clear waiting state once assistant starts outputting or on error
  useEffect(() => {
    if (assistantHasContent || status === 'error') {
      setIsWaitingForResponse(false);
    }
  }, [assistantHasContent, status]);

  const isStreaming = status === 'streaming' && assistantHasContent;
  const isThinking =
    isWaitingForResponse || (messages.length > 0 && (status === 'submitted' || status === 'streaming') && !assistantHasContent);
  const isLoading = isThinking || isStreaming;

  // Get currently running tools from the last assistant message
  const runningTools = useMemo(() => (lastAssistantMessage ? getRunningTools(lastAssistantMessage) : []), [lastAssistantMessage]);

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

  // Handle input enter key
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  // Memoize greeting - only changes when hour changes (effectively stable during session)
  const greeting = useMemo(() => getGreeting(), []);

  return (
    <>
      {/* Keyframes for fade-in animation - using constant to avoid re-injection */}
      <style>{CHAT_PANEL_STYLES}</style>

      {/* Panel - hidden when fullscreen modal is open */}
      {!isFullscreen && (
        <div
          className="fixed top-0 right-0 h-[100vh] z-[200] border-l border-[rgb(var(--ec-page-border))] flex flex-col overflow-hidden"
          style={{
            width: `${PANEL_WIDTH}px`,
            transform: isOpen ? 'translateX(0)' : `translateX(${PANEL_WIDTH}px)`,
            transition: 'transform 800ms cubic-bezier(0.16, 1, 0.3, 1)',
            background: `
              radial-gradient(ellipse 100% 40% at 50% 100%, rgb(var(--ec-accent) / 0.15) 0%, transparent 100%),
              rgb(var(--ec-page-bg))
            `,
          }}
        >
          {/* Header */}
          <div className="flex-none shrink-0 pb-1">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center space-x-2">
                <BookOpen size={16} className="text-[rgb(var(--ec-accent))]" />
                <span className="font-medium text-[rgb(var(--ec-header-text))] text-sm">EventCatalog Assistant</span>
              </div>
              <div className="flex items-center space-x-1">
                {tools.length > 0 && (
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <button
                        className="p-2 rounded-lg hover:bg-[rgb(var(--ec-header-border))] text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-header-text))] transition-colors"
                        aria-label="View available tools"
                        title="Available tools"
                      >
                        <Wrench size={16} />
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content
                        className="w-72 bg-[rgb(var(--ec-dropdown-bg))] rounded-lg shadow-lg border border-[rgb(var(--ec-dropdown-border))] p-3 z-[250]"
                        sideOffset={5}
                        align="end"
                      >
                        <div className="text-[10px] font-medium text-[rgb(var(--ec-page-text-muted))] mb-2">
                          Available Tools ({sortedTools.length})
                        </div>
                        <div className="max-h-64 overflow-y-auto divide-y divide-[rgb(var(--ec-page-border))]">
                          {sortedTools.map((tool) => (
                            <div key={tool.name} className="py-1.5 first:pt-0 last:pb-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-medium text-[rgb(var(--ec-dropdown-text))]">{tool.name}</span>
                                {tool.isCustom && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-medium bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-accent-text))] rounded">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-[rgb(var(--ec-page-text-muted))] mt-0.5">{tool.description}</div>
                            </div>
                          ))}
                        </div>
                        <Popover.Arrow className="fill-[rgb(var(--ec-dropdown-bg))]" />
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                )}
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="p-2 rounded-lg hover:bg-[rgb(var(--ec-header-border))] text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-header-text))] transition-colors"
                  aria-label="Expand to fullscreen"
                  title="Expand"
                >
                  <Maximize2 size={16} />
                </button>
                {hasMessages && (
                  <button
                    onClick={() => setMessages([])}
                    className="p-2 rounded-lg hover:bg-[rgb(var(--ec-header-border))] text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-header-text))] transition-colors"
                    aria-label="Clear chat"
                    title="Clear chat"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-[rgb(var(--ec-header-border))] text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-header-text))] transition-colors"
                  aria-label="Close chat panel"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            {/* Thinking indicator */}
            {isThinking && (
              <div className="px-4 pb-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[rgb(var(--ec-accent))] rounded-full animate-pulse" />
                <span className="text-xs text-[rgb(var(--ec-icon-color))]">
                  {runningTools.length > 0 ? (
                    <>
                      Using <span className="font-medium text-[rgb(var(--ec-accent))]">{runningTools[0]}</span>...
                    </>
                  ) : (
                    'Thinking...'
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden" key={isOpen ? 'content-open' : 'content-closed'}>
            {/* Messages or Welcome area */}
            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-5 scrollbar-hide">
              {!hasMessages ? (
                /* Welcome area - Clean GitBook-inspired design */
                <div className="flex flex-col h-full py-6">
                  {/* Greeting section - centered */}
                  <div
                    className="flex-1 flex flex-col items-center justify-center text-center"
                    style={isOpen ? fadeInStyles.welcome : undefined}
                  >
                    {/* Icon with circular background */}
                    <div className="relative mb-6">
                      <div className="w-32 h-32 rounded-full bg-[rgb(var(--ec-accent)/0.15)] flex items-center justify-center">
                        <MessageSquare size={56} className="text-[rgb(var(--ec-accent))]" strokeWidth={1.5} />
                      </div>
                    </div>
                    <h2 className="text-lg font-semibold text-[rgb(var(--ec-accent))] mb-1">{greeting}</h2>
                    <p className="text-sm font-normal text-[rgb(var(--ec-content-text))]">
                      I'm here to help with your architecture
                    </p>
                  </div>

                  {/* Suggested questions - pill style */}
                  <div className="flex-none space-y-2">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedAction(question.prompt)}
                        className="w-full text-left px-4 py-2.5 text-xs text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-page-text)/0.05)] hover:bg-[rgb(var(--ec-accent)/0.15)] rounded-full transition-all duration-200"
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
                  {messages.map((message, messageIndex) => {
                    const content = getMessageContent(message);
                    const followUpSuggestions = message.role === 'assistant' ? getFollowUpSuggestions(message) : [];
                    const completedTools = message.role === 'assistant' ? getCompletedTools(message) : [];
                    const isLastMessage = messageIndex === messages.length - 1;
                    return (
                      <div key={message.id} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {message.role === 'user' ? (
                          <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-[rgb(var(--ec-page-text)/0.05)]">
                            <p className="text-sm font-normal whitespace-pre-wrap text-[rgb(var(--ec-page-text))]">{content}</p>
                          </div>
                        ) : (
                          <>
                            {/* Tools used indicator */}
                            {completedTools.length > 0 && (
                              <div className="flex items-center gap-1.5 mb-2">
                                <Wrench size={10} className="text-[rgb(var(--ec-icon-color))]" />
                                <span className="text-[10px] text-[rgb(var(--ec-icon-color))]">
                                  Used{' '}
                                  {completedTools.slice(0, 2).map((tool, i) => (
                                    <span key={tool}>
                                      <span className="font-medium text-[rgb(var(--ec-accent))]">{tool}</span>
                                      {i < Math.min(completedTools.length, 2) - 1 && ', '}
                                    </span>
                                  ))}
                                  {completedTools.length > 2 && <span> +{completedTools.length - 2} more</span>}
                                </span>
                              </div>
                            )}
                            <div className="w-full text-[rgb(var(--ec-content-text))]">
                              <div className="prose prose-sm max-w-none prose-p:my-2 prose-p:font-normal prose-p:text-[13px] prose-p:text-[rgb(var(--ec-content-text))] prose-headings:my-2 prose-headings:font-semibold prose-headings:text-[rgb(var(--ec-page-text))] prose-h1:text-base prose-h2:text-sm prose-h3:text-[13px] prose-h4:text-[13px] prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-[13px] prose-li:font-normal prose-li:text-[rgb(var(--ec-content-text))] text-[13px] font-light">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                  {content}
                                </ReactMarkdown>
                              </div>
                            </div>
                            {/* Follow-up suggestions - only show for last assistant message when not loading */}
                            {isLastMessage && followUpSuggestions.length > 0 && !isLoading && (
                              <div className="flex flex-wrap gap-2 mt-3 w-full">
                                {followUpSuggestions.map((suggestion, index) => (
                                  <button
                                    key={index}
                                    onClick={() => handleSuggestedAction(suggestion)}
                                    className="px-4 py-2.5 text-xs text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-page-text)/0.05)] hover:bg-[rgb(var(--ec-accent)/0.15)] rounded-full transition-all duration-200 text-left"
                                    style={fadeInStyles.getFollowUpStyle(index)}
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
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

            {/* Scroll to bottom button */}
            {hasMessages && showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-24 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text-muted))] text-xs font-medium rounded-full shadow-lg border border-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-content-hover))] transition-all z-10"
              >
                <ChevronDown size={14} />
                <span>Scroll to bottom</span>
              </button>
            )}

            {/* Input area (Fixed at bottom) */}
            <div className="flex-none px-4 py-3" key={isOpen ? 'input-open' : 'input-closed'}>
              <form onSubmit={handleSubmit}>
                <div className="relative bg-[rgb(var(--ec-page-bg)/0.5)] backdrop-blur-sm rounded-xl border border-[rgb(var(--ec-accent)/0.3)] focus-within:border-[rgb(var(--ec-accent)/0.5)] focus-within:ring-2 focus-within:ring-[rgb(var(--ec-accent)/0.1)] transition-all">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Ask, search, or explain..."
                    disabled={isLoading}
                    className="w-full px-4 py-3 pr-16 bg-transparent text-[rgb(var(--ec-input-text))] placeholder-[rgb(var(--ec-input-placeholder))] focus:outline-none text-sm disabled:opacity-50 rounded-xl"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                    {isStreaming ? (
                      <button
                        type="button"
                        onClick={() => stop()}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        aria-label="Stop generating"
                      >
                        <Square size={14} fill="currentColor" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                        className="px-3 py-1.5 bg-[rgb(var(--ec-accent))] text-white text-xs font-medium rounded-lg hover:bg-[rgb(var(--ec-accent-hover))] disabled:bg-transparent disabled:text-[rgb(var(--ec-icon-color))] transition-colors"
                        aria-label="Send message"
                      >
                        Send
                      </button>
                    )}
                  </div>
                </div>
              </form>
              {/* Context indicator */}
              <div className="flex items-center justify-center gap-1.5 mt-2">
                {pageContext ? (
                  <span className="text-[10px] text-[rgb(var(--ec-icon-color))] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--ec-accent))]" />
                    Based on {pageContext.type}: {pageContext.name}
                  </span>
                ) : (
                  <span className="text-[10px] text-[rgb(var(--ec-icon-color))]">
                    AI can make mistakes. Verify important info.
                  </span>
                )}
              </div>
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
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300]" />
          <Dialog.Content
            className="fixed inset-y-4 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl md:inset-y-8 rounded-xl shadow-2xl z-[301] flex flex-col overflow-hidden focus:outline-none border border-[rgb(var(--ec-page-border))]"
            style={{
              background: `
                radial-gradient(ellipse 100% 40% at 50% 100%, rgb(var(--ec-accent) / 0.15) 0%, transparent 100%),
                rgb(var(--ec-page-bg))
              `,
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[rgb(var(--ec-page-border))] flex-shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-[rgb(var(--ec-accent-subtle))] rounded-lg">
                  <BookOpen size={18} className="text-[rgb(var(--ec-accent))]" />
                </div>
                <Dialog.Title className="text-base font-medium text-[rgb(var(--ec-page-text))]">Ask AI</Dialog.Title>
              </div>
              <div className="flex items-center space-x-2">
                {tools.length > 0 && (
                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <button
                        className="p-2 rounded-lg hover:bg-[rgb(var(--ec-content-hover))] text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] transition-colors"
                        aria-label="View available tools"
                        title="Available tools"
                      >
                        <Wrench size={18} />
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content
                        className="w-80 bg-[rgb(var(--ec-dropdown-bg))] rounded-lg shadow-lg border border-[rgb(var(--ec-dropdown-border))] p-4 z-[350]"
                        sideOffset={5}
                        align="end"
                        style={{ maxHeight: 'calc(100vh - 200px)' }}
                      >
                        <div className="text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] mb-2">
                          Available Tools ({sortedTools.length})
                        </div>
                        <div
                          className="overflow-y-auto divide-y divide-[rgb(var(--ec-page-border))]"
                          style={{ maxHeight: 'calc(100vh - 280px)' }}
                        >
                          {sortedTools.map((tool) => (
                            <div key={tool.name} className="py-2 first:pt-0 last:pb-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-[rgb(var(--ec-dropdown-text))]">{tool.name}</span>
                                {tool.isCustom && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-medium bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-accent-text))] rounded">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[rgb(var(--ec-page-text-muted))] mt-0.5">{tool.description}</div>
                            </div>
                          ))}
                        </div>
                        <Popover.Arrow className="fill-[rgb(var(--ec-dropdown-bg))]" />
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                )}
                {hasMessages && (
                  <button
                    onClick={() => setMessages([])}
                    className="p-2 rounded-lg hover:bg-[rgb(var(--ec-content-hover))] text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] transition-colors"
                    aria-label="Clear chat"
                    title="Clear chat"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 rounded-lg hover:bg-[rgb(var(--ec-content-hover))] text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] transition-colors"
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
                  className="p-2 rounded-lg hover:bg-[rgb(var(--ec-content-hover))] text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Thinking indicator */}
            {isThinking && (
              <div className="px-5 py-2 flex items-center gap-2 border-b border-[rgb(var(--ec-page-border))]">
                <div className="w-1.5 h-1.5 bg-[rgb(var(--ec-accent))] rounded-full animate-pulse" />
                <span className="text-sm text-[rgb(var(--ec-page-text-muted))]">
                  {runningTools.length > 0 ? (
                    <>
                      Using <span className="font-medium text-[rgb(var(--ec-accent))]">{runningTools[0]}</span>...
                    </>
                  ) : (
                    'Thinking...'
                  )}
                </span>
              </div>
            )}

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {!hasMessages ? (
                /* Welcome area - Clean design */
                <div className="flex flex-col h-full max-w-2xl mx-auto">
                  {/* Greeting section - centered */}
                  <div className="flex-1 flex flex-col justify-center items-center text-center">
                    {/* Icon with circular background */}
                    <div className="relative mb-8">
                      <div className="w-40 h-40 rounded-full bg-[rgb(var(--ec-accent)/0.15)] flex items-center justify-center">
                        <MessageSquare size={72} className="text-[rgb(var(--ec-accent))]" strokeWidth={1.5} />
                      </div>
                    </div>
                    <h2 className="text-2xl font-semibold text-[rgb(var(--ec-accent))] mb-2">{greeting}</h2>
                    <p className="font-normal text-[rgb(var(--ec-content-text))] text-center">
                      I'm here to help with your architecture
                    </p>
                  </div>

                  {/* Suggested questions - pill style */}
                  <div className="flex-none grid grid-cols-2 gap-2">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedAction(question.prompt)}
                        className="px-4 py-2.5 text-xs text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-page-text)/0.05)] hover:bg-[rgb(var(--ec-accent)/0.15)] rounded-full transition-all duration-200 text-left"
                      >
                        {question.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Messages area */
                <div className="max-w-3xl mx-auto space-y-4">
                  {messages.map((message, messageIndex) => {
                    const content = getMessageContent(message);
                    const followUpSuggestions = message.role === 'assistant' ? getFollowUpSuggestions(message) : [];
                    const completedTools = message.role === 'assistant' ? getCompletedTools(message) : [];
                    const isLastMessage = messageIndex === messages.length - 1;
                    return (
                      <div key={message.id} className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {message.role === 'user' ? (
                          <div className="max-w-[75%] rounded-2xl rounded-br-md px-4 py-2.5 bg-[rgb(var(--ec-page-text)/0.05)]">
                            <p className="text-sm font-normal whitespace-pre-wrap text-[rgb(var(--ec-page-text))]">{content}</p>
                          </div>
                        ) : (
                          <>
                            {/* Tools used indicator */}
                            {completedTools.length > 0 && (
                              <div className="flex items-center gap-1.5 mb-2">
                                <Wrench size={12} className="text-[rgb(var(--ec-icon-color))]" />
                                <span className="text-[11px] text-[rgb(var(--ec-icon-color))]">
                                  Used{' '}
                                  {completedTools.slice(0, 3).map((tool, i) => (
                                    <span key={tool}>
                                      <span className="font-medium text-[rgb(var(--ec-accent))]">{tool}</span>
                                      {i < Math.min(completedTools.length, 3) - 1 && ', '}
                                    </span>
                                  ))}
                                  {completedTools.length > 3 && <span> +{completedTools.length - 3} more</span>}
                                </span>
                              </div>
                            )}
                            <div className="w-full text-[rgb(var(--ec-content-text))]">
                              <div className="prose prose-sm max-w-none prose-p:text-[rgb(var(--ec-content-text))] prose-headings:my-2 prose-headings:font-semibold prose-headings:text-[rgb(var(--ec-page-text))] prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-h4:text-sm prose-li:text-[rgb(var(--ec-content-text))]">
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={modalMarkdownComponents}>
                                  {content}
                                </ReactMarkdown>
                              </div>
                            </div>
                            {/* Follow-up suggestions - only show for last assistant message when not loading */}
                            {isLastMessage && followUpSuggestions.length > 0 && !isLoading && (
                              <div className="flex flex-wrap gap-2 mt-3 w-full">
                                {followUpSuggestions.map((suggestion, index) => (
                                  <button
                                    key={index}
                                    onClick={() => handleSuggestedAction(suggestion)}
                                    className="px-4 py-2.5 text-xs text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-page-text)/0.05)] hover:bg-[rgb(var(--ec-accent)/0.15)] rounded-full transition-all duration-200 text-left"
                                    style={fadeInStyles.getFollowUpStyle(index)}
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
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
            <div className="flex-shrink-0 px-6 py-4">
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                <div className="relative bg-[rgb(var(--ec-page-bg)/0.5)] backdrop-blur-sm rounded-xl border border-[rgb(var(--ec-accent)/0.3)] focus-within:border-[rgb(var(--ec-accent)/0.5)] focus-within:ring-2 focus-within:ring-[rgb(var(--ec-accent)/0.1)] transition-all">
                  <input
                    ref={modalInputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Ask, search, or explain..."
                    disabled={isLoading}
                    className="w-full px-4 py-3.5 pr-20 bg-transparent text-[rgb(var(--ec-input-text))] placeholder-[rgb(var(--ec-input-placeholder))] focus:outline-none text-sm disabled:opacity-50 rounded-xl"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                    {isStreaming ? (
                      <button
                        type="button"
                        onClick={() => stop()}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        aria-label="Stop generating"
                      >
                        <Square size={14} fill="currentColor" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                        className="px-4 py-2 bg-[rgb(var(--ec-accent))] text-white text-sm font-medium rounded-lg hover:bg-[rgb(var(--ec-accent-hover))] disabled:bg-transparent disabled:text-[rgb(var(--ec-icon-color))] disabled:cursor-not-allowed transition-colors"
                        aria-label="Send message"
                      >
                        Send
                      </button>
                    )}
                  </div>
                </div>
              </form>
              {/* Context indicator */}
              <div className="flex items-center justify-center gap-1.5 mt-3 max-w-3xl mx-auto">
                {pageContext ? (
                  <span className="text-xs text-[rgb(var(--ec-icon-color))] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--ec-accent))]" />
                    Based on {pageContext.type}: {pageContext.name}
                  </span>
                ) : (
                  <span className="text-xs text-[rgb(var(--ec-icon-color))]">AI can make mistakes. Verify important info.</span>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

export default ChatPanel;
