import { useEffect, useRef, useCallback, useState, useMemo, memo, type RefObject } from 'react';
import {
  X,
  Square,
  Trash2,
  Sparkles,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Wrench,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  LocateFixed,
  OctagonAlert,
  TriangleAlert,
  Info,
} from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { buildUrl } from '@utils/url-builder';
import OfflineReply, { ConfigurationErrorReply, getChatError, offlineReplyText } from './OfflineReply';
import { clampPanelWidth, MAX_PANEL_WIDTH, MIN_PANEL_WIDTH, PANEL_WIDTH, readPanelWidth, savePanelWidth } from './panel-width';
import {
  ASSISTANT_DRAWING_EVENT,
  CANVAS_FOCUS_EVENT,
  CANVAS_HOTSPOT_EVENT,
  canvasRefIn,
  nodesInFocusLink,
} from './assistant-events';
import { getResourceReferenceColorName } from '@utils/resource-reference-colors';
import { tailwind500RgbByColor } from '@utils/collection-colors';
import { getResourceReferenceIcon } from '@utils/resource-reference-icons';

interface ToolMetadata {
  name: string;
  description: string;
  isCustom?: boolean;
}

// CSS keyframes - defined once outside component to avoid re-injection
const CHAT_PANEL_STYLES = `
  @keyframes ec-chat-breathe {
    0%, 100% { transform: scale(1); opacity: .7; }
    50% { transform: scale(1.06); opacity: 1; }
  }
  .ec-chat-surface { font-weight: 400; }
  .ec-chat-avatar { background: rgb(var(--ec-accent) / .06); animation: ec-chat-breathe 5s ease-in-out infinite; }
  /* The closed panel stays on the page (off screen): a running animation there still costs every frame */
  .ec-chat-surface[aria-hidden='true'] .ec-chat-avatar { animation-play-state: paused; }
  .ec-chat-suggestion { width: fit-content; max-width: 100%; transition: background 180ms, transform 180ms; }
  .ec-chat-suggestion:hover { transform: translateX(3px); }
  .ec-chat-message { animation: fadeInUp 280ms ease-out both; }
  .ec-chat-offline > * { animation: fadeInUp 350ms ease-out both; }
  .ec-chat-offline > :nth-child(2) { animation-delay: 100ms; }
  .ec-chat-offline > :nth-child(3) { animation-delay: 220ms; }
  .ec-chat-offline > :nth-child(4) { animation-delay: 340ms; }
  /* What the assistant's doing while it works: a card with a sheen passing over it, its steps so far ticked and the
     one it's on spinning, its words shimmering */
  @keyframes ec-chat-sheen {
    from { background-position: 200% 0; }
    to { background-position: -200% 0; }
  }
  @keyframes ec-chat-spin { to { transform: rotate(360deg); } }
  .ec-chat-activity {
    position: relative;
    overflow: hidden;
    border: 1px solid rgb(var(--ec-accent) / .18);
    border-radius: 14px;
    background: rgb(var(--ec-accent) / .03);
    box-shadow: 0 6px 20px rgb(var(--ec-accent) / .05);
  }
  .ec-chat-activity::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(110deg, transparent 30%, rgb(var(--ec-accent) / .09) 50%, transparent 70%);
    background-size: 200% 100%;
    animation: ec-chat-sheen 2.2s linear infinite;
  }
  .ec-chat-activity-now {
    background: linear-gradient(90deg, rgb(var(--ec-page-text)) 0%, rgb(var(--ec-accent)) 50%, rgb(var(--ec-page-text)) 100%);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: ec-chat-sheen 2.4s linear infinite;
  }
  .ec-chat-spinner {
    width: 12px;
    height: 12px;
    flex: none;
    border-radius: 50%;
    border: 1.5px solid rgb(var(--ec-accent) / .2);
    border-top-color: rgb(var(--ec-accent));
    animation: ec-chat-spin .8s linear infinite;
  }
  /* Follow-up questions on their way: pills like theirs, a sheen passing along them */
  .ec-chat-pending-pill {
    height: 30px;
    border-radius: 999px;
    background: linear-gradient(90deg, rgb(var(--ec-accent) / .05) 25%, rgb(var(--ec-accent) / .14) 50%, rgb(var(--ec-accent) / .05) 75%);
    background-size: 200% 100%;
    animation: fadeInUp 300ms ease-out both, ec-chat-sheen 1.6s linear infinite;
  }
  .ec-chat-surface[aria-hidden='true'] .ec-chat-activity,
  .ec-chat-surface[aria-hidden='true'] .ec-chat-activity *,
  .ec-chat-surface[aria-hidden='true'] .ec-chat-pending-pill { animation-play-state: paused; }
  .ec-chat-composer {
    border-radius: 20px;
    border-color: rgb(var(--ec-accent) / .22);
    background: rgb(var(--ec-page-bg));
    box-shadow: 0 0 0 3px rgb(var(--ec-accent) / .04), 0 8px 28px rgb(var(--ec-accent) / .04);
    transition: border-color 200ms, box-shadow 200ms;
  }
  .ec-chat-composer:focus-within { border-color: rgb(var(--ec-accent) / .5); box-shadow: 0 0 0 3px rgb(var(--ec-accent) / .09); }
  /* What's typed grows the box (up to a point, then scrolls), with what it's based on and Send in a row under it */
  .ec-chat-composer textarea { display: block; resize: none; min-height: 58px; max-height: 200px; overflow-y: auto; padding: 14px 16px 4px; border-radius: 20px 20px 0 0; }
  .ec-chat-composer-footer { display: flex; align-items: center; gap: 8px; padding: 2px 8px 8px 16px; }
  @media (prefers-reduced-motion: reduce) {
    .ec-chat-surface, .ec-chat-surface *, #eventcatalog-header, #eventcatalog-application {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }

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
  /** Answered here, straight away, rather than by the model: e.g. a question back to the person */
  reply?: string;
}

interface QuestionConfig {
  pattern: RegExp;
  questions: SuggestedQuestion[];
}

const suggestedQuestionsConfig: QuestionConfig[] = [
  // A Studio canvas: the assistant draws on it
  {
    pattern: /\/studio\/[0-9a-f-]{36}/i,
    questions: [
      {
        label: 'Create a new diagram',
        prompt: 'Create a new diagram',
        reply: [
          'What would you like to diagram? Describe it in a sentence or two, for example:',
          '',
          '- How an order flows from checkout to shipping',
          '- One of our domains and what it talks to',
          "- A new service you're designing, and the events it sends and receives",
        ].join('\n'),
      },
      {
        label: 'Review my architecture, highlight any issues',
        prompt:
          'Review the architecture on this canvas and highlight any issues: flag what you find with hotspots on the nodes they are about (critical, warning or info), and add sticky notes with your review and suggestions.',
      },
      {
        label: 'How could we improve this architecture?',
        prompt:
          'How could we improve the architecture on this canvas? Flag the problems and risks you find with hotspots on the nodes they are about, and add sticky notes with your suggested improvements.',
      },
    ],
  },
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
  // Systems page
  {
    pattern: /^\/(docs|visualiser|architecture)\/systems\/.+/,
    questions: [
      { label: 'What services are in this system?', prompt: 'What services belong to this system?' },
      { label: 'What flows are in this system?', prompt: 'What flows belong to this system?' },
      {
        label: 'What does this system connect to?',
        prompt: 'What systems, services, actors, or resources does this system connect to?',
      },
      { label: 'Who owns this system?', prompt: 'Who owns this system and how do I contact them?' },
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

/** The Studio canvas the page shows, if it's one: the assistant draws on it */
export const getCanvasId = (pathname: string) => pathname.match(/\/studio\/([0-9a-f-]{36})\/?(?:[?#]|$)/i)?.[1];

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
  configured?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

/** The window's width without its scrollbar, which the panel (fixed, on the right) sits inside of (or the window's, where
 * that isn't known) */
const viewportWidth = () => document.documentElement.clientWidth || window.innerWidth;

/** What the panel pushes over to make room for it (looked up each time: ClientRouter navigations swap in new pages) */
const pageBesidePanel = () =>
  [document.getElementById('eventcatalog-application'), document.getElementById('eventcatalog-header')].filter(
    Boolean
  ) as HTMLElement[];

// Staggered fade-in animation styles (delays account for 420ms panel slide)
const fadeInStyles = {
  header: {
    animation: 'fadeIn 0.5s ease-out 0.3s both',
  },
  welcome: {
    animation: 'fadeInUp 0.45s ease-out 0.12s both',
  },
  // Label and questions will be staggered individually in the component
  questionsLabel: {
    animation: 'fadeIn 0.5s ease-out 0.7s both',
  },
  getQuestionStyle: (index: number) => ({
    animation: `fadeIn 0.5s ease-out ${0.22 + index * 0.07}s both`,
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
export const preprocessMarkdown = (text: string): string => {
  return (
    text
      // Add newlines before headings if they're directly after text (no newline)
      // This fixes cases like "some text.## Heading" → "some text.\n\n## Heading"
      .replace(/([^\n])(#{1,6}\s)/g, '$1\n\n$2')
      // Show a link still streaming in ("[Order Service](/docs/serv") as its text: shown raw, its URL wraps onto more
      // lines until the closing bracket arrives, then the answer jumps back as it collapses into a link
      .replace(/\[([^\]\n]*)\]\([^)\s]*$/, '$1')
  );
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

/** What the assistant's doing, in words, while a tool runs (or is being written, for the canvas's) */
const TOOL_ACTIVITY: Record<string, string> = {
  getCanvas: 'Reading the canvas…',
  addToCanvas: 'Drawing on the canvas…',
  updateCanvasNode: 'Updating the canvas…',
  connectCanvasNodes: 'Connecting things on the canvas…',
  removeFromCanvas: 'Removing things from the canvas…',
  layoutCanvas: 'Tidying the canvas…',
  walkThrough: 'Preparing the walkthrough…',
  showOnCanvas: 'Showing you on the canvas…',
  addHotspot: 'Flagging hotspots…',
  getResources: 'Searching the catalog…',
  getResource: 'Reading the catalog…',
};
export const activityOf = (toolName: string, state?: string) =>
  toolName === 'addToCanvas' && state === 'input-streaming'
    ? 'Planning the diagram…'
    : (TOOL_ACTIVITY[toolName] ?? `Using ${toolName}…`);

/** The assistant is between things it writes (thinking, or using a tool), not writing text right now */
export const isBetweenText = (message: { parts?: Array<any> } | undefined) => {
  const last = message?.parts?.at(-1);
  return !last || last.type !== 'text' || last.state === 'done';
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
export type ActivityStep = { label: string; done: boolean; count: number };

/**
 * What the assistant has done this turn, step by step (each tool it used, in words, repeats counted), and what it's
 * doing now: the tool it's using, else thinking. Only for a turn that's still going.
 */
export const getActivitySteps = (message: { role?: string; parts?: Array<any> } | undefined): ActivityStep[] => {
  const steps: ActivityStep[] = [];
  for (const part of message?.role === 'assistant' ? (message.parts ?? []) : []) {
    if (!part.type?.startsWith('tool-')) continue;
    const name = part.type.replace('tool-', '');
    if (name === 'suggestFollowUpQuestions') continue;
    const done = part.state === 'output-available' || part.state === 'output-error';
    const label = activityOf(name, part.state).replace(/…$/, '');
    const last = steps.at(-1);
    if (last && last.label === label) {
      last.count += 1;
      last.done = done;
    } else steps.push({ label, done, count: 1 });
  }
  if (!steps.length || steps.every((step) => step.done)) steps.push({ label: 'Thinking it through', done: false, count: 1 });
  return steps;
};

/** The card the assistant's shown working in: its steps so far, ticked, and what it's on now */
const ActivityCard = memo(({ steps }: { steps: ActivityStep[] }) => (
  <div role="status" aria-live="polite" className="ec-chat-message ec-chat-activity my-2 px-4 py-3">
    <ol className="relative space-y-1.5 text-xs">
      {steps.map((step, index) => (
        <li key={index} className="flex items-center gap-2.5">
          {step.done ? (
            <Check size={12} className="flex-none text-[rgb(var(--ec-accent))]" aria-hidden="true" />
          ) : (
            <span className="ec-chat-spinner" aria-hidden="true" />
          )}
          <span className={step.done ? 'text-[rgb(var(--ec-page-text-muted))]' : 'ec-chat-activity-now font-medium'}>
            {step.label}
            {step.done ? '' : '…'}
            {step.count > 1 && <span className="ml-1 opacity-60">×{step.count}</span>}
          </span>
        </li>
      ))}
    </ol>
  </div>
));
ActivityCard.displayName = 'ActivityCard';

/** It's writing follow-up questions (what it does once it's answered) */
export const isSuggestingFollowUps = (message: { role?: string; parts?: Array<any> } | undefined) =>
  message?.role === 'assistant' &&
  !!message.parts?.some((part) => part.type === 'tool-suggestFollowUpQuestions' && part.state !== 'output-available');

/** Where the follow-up questions will be, while it writes them: pills like theirs, coming in */
const FollowUpsLoading = memo(() => (
  <div role="status" aria-live="polite" className="ec-chat-message mt-1 flex flex-col items-start gap-2">
    <span className="ec-chat-activity-now text-xs font-medium">Suggesting what to ask next…</span>
    {['72%', '58%', '66%'].map((width, index) => (
      <span
        key={width}
        aria-hidden="true"
        className="ec-chat-pending-pill block"
        style={{ width, animationDelay: `${index * 90}ms, ${index * 150}ms` }}
      />
    ))}
  </div>
));
FollowUpsLoading.displayName = 'FollowUpsLoading';

// Memoized markdown components to prevent re-renders
/** Takes the person to nodes on the Studio canvas they have open */
const focusCanvas = (nodeIds: string[]) =>
  window.dispatchEvent(
    new CustomEvent(CANVAS_FOCUS_EVENT, { detail: { canvasId: getCanvasId(window.location.pathname), nodeIds } })
  );

/** Takes the person to a hotspot on the Studio canvas they have open, and opens it */
const showHotspot = (hotspotId: string) =>
  window.dispatchEvent(
    new CustomEvent(CANVAS_HOTSPOT_EVENT, { detail: { canvasId: getCanvasId(window.location.pathname), hotspotId } })
  );

/** How long the pointer rests on a walkthrough step before it takes them there (so moving across the steps doesn't) */
const FOCUS_ON_HOVER_MS = 250;

/** Something on the canvas, from the chat: clicking it, or resting the pointer on it, takes them there */
function CanvasLink({ go, className, children }: { go: () => void; className: string; children: React.ReactNode }) {
  const hover = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (hover.current !== null) clearTimeout(hover.current);
    hover.current = null;
  };
  useEffect(() => cancel, []);
  return (
    <button
      type="button"
      onClick={() => {
        cancel();
        go();
      }}
      onMouseEnter={() => {
        cancel();
        hover.current = setTimeout(go, FOCUS_ON_HOVER_MS);
      }}
      onMouseLeave={cancel}
      title="Show me on the canvas"
      className={`cursor-pointer transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

/** A step of a walkthrough on a canvas: takes them to its nodes */
const FocusLink = ({ nodeIds, children }: { nodeIds: string[]; children: React.ReactNode }) => (
  <CanvasLink
    go={() => focusCanvas(nodeIds)}
    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-[rgb(var(--ec-accent))] bg-[rgb(var(--ec-accent)/0.08)] hover:bg-[rgb(var(--ec-accent)/0.16)]"
  >
    {children}
    <LocateFixed size={12} className="flex-none opacity-70" aria-hidden="true" />
  </CanvasLink>
);

/** Something on the canvas the assistant mentions: drawn like the docs' resource references (its type's icon and colour) */
const CanvasRef = ({ type, nodeId, children }: { type: string; nodeId: string; children: React.ReactNode }) => {
  const rgb = type ? tailwind500RgbByColor[getResourceReferenceColorName(type)] : undefined;
  const style = {
    '--ec-resource-ref-bg': rgb ? `rgb(${rgb} / 0.12)` : 'rgb(var(--ec-accent) / 0.12)',
    '--ec-resource-ref-color': rgb ? `rgb(${rgb})` : 'rgb(var(--ec-accent))',
  } as React.CSSProperties;
  return (
    <span style={style}>
      <CanvasLink
        go={() => focusCanvas([nodeId])}
        className="inline-flex items-center gap-1 px-1 -mx-0.5 rounded font-medium underline decoration-dotted decoration-2 underline-offset-[3px] text-[var(--ec-resource-ref-color)] decoration-[var(--ec-resource-ref-color)] hover:bg-[var(--ec-resource-ref-bg)]"
      >
        <svg
          className="w-3.5 h-3.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: getResourceReferenceIcon(type) }}
        />
        <span>{children}</span>
      </CanvasLink>
    </span>
  );
};

/** Hotspots' severities, as Studio shows them */
const HOTSPOT_SEVERITY = {
  critical: { label: 'Critical', color: '#dc2626', icon: OctagonAlert },
  warning: { label: 'Warning', color: '#d97706', icon: TriangleAlert },
  info: { label: 'Info', color: '#2563eb', icon: Info },
} as const;
export type FlaggedHotspot = { id: string; severity: keyof typeof HOTSPOT_SEVERITY; title: string };

/** The hotspots the assistant flagged on the canvas in a message */
export const getFlaggedHotspots = (message: { parts?: Array<any> }): FlaggedHotspot[] =>
  (message.parts ?? []).flatMap((part) =>
    part.type === 'tool-addHotspot' &&
    part.state === 'output-available' &&
    typeof part.output?.hotspotId === 'string' &&
    part.input?.severity in HOTSPOT_SEVERITY
      ? [{ id: part.output.hotspotId, severity: part.input.severity, title: String(part.input.title ?? '') }]
      : []
  );

/** The hotspots it flagged, listed under what it says: each takes them to it on the canvas, opened */
const FlaggedHotspots = memo(({ hotspots }: { hotspots: FlaggedHotspot[] }) => (
  <div className="mt-3 w-full overflow-hidden rounded-xl border border-[rgb(var(--ec-page-border))]">
    <div className="px-3 py-2 text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] bg-[rgb(var(--ec-accent)/0.03)]">
      Hotspots flagged on the canvas ({hotspots.length})
    </div>
    <ul>
      {hotspots.map((hotspot) => {
        const { label, color, icon: Icon } = HOTSPOT_SEVERITY[hotspot.severity];
        return (
          <li key={hotspot.id} className="border-t border-[rgb(var(--ec-page-border))]">
            <CanvasLink
              go={() => showHotspot(hotspot.id)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-accent)/0.06)]"
            >
              <Icon size={14} className="flex-none" style={{ color }} aria-label={label} />
              <span className="min-w-0 flex-1">{hotspot.title}</span>
              <LocateFixed size={12} className="flex-none text-[rgb(var(--ec-icon-color))]" aria-hidden="true" />
            </CanvasLink>
          </li>
        );
      })}
    </ul>
  </div>
));
FlaggedHotspots.displayName = 'FlaggedHotspots';

/** The panel's left edge: dragged to make it wider or narrower (or with the arrow keys), double-clicked back to the default */
const PanelResizeHandle = memo(
  ({ panel, width, onResize }: { panel: RefObject<HTMLDivElement | null>; width: number; onResize: (width: number) => void }) => {
    // Pressed, and whether it's moved since (a click, or each click of a double click, changes nothing)
    const dragging = useRef<{ moved: boolean } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const widthAt = (clientX: number) => clampPanelWidth(viewportWidth() - clientX, viewportWidth());
    // While dragging, the panel and the page beside it are sized here, outside React, so the messages don't re-render
    // on every move (and the page follows the pointer, without its slide)
    const show = (next: number) => {
      if (panel.current) panel.current.style.width = `min(${next}px, 100vw)`;
      pageBesidePanel().forEach((el) => (el.style.paddingRight = `${next}px`));
    };
    const stop = (next: number) => {
      const moved = dragging.current?.moved;
      dragging.current = null;
      setIsDragging(false);
      show(moved ? next : width);
      pageBesidePanel().forEach((el) => (el.style.transition = ''));
      if (moved) onResize(next);
    };
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the assistant"
        aria-valuemin={MIN_PANEL_WIDTH}
        aria-valuemax={MAX_PANEL_WIDTH}
        aria-valuenow={width}
        tabIndex={0}
        title="Drag to resize"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          // Keeps pointer events coming while the pointer is over the page (throws if the pointer has gone)
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {}
          dragging.current = { moved: false };
          setIsDragging(true);
          pageBesidePanel().forEach((el) => (el.style.transition = 'none'));
        }}
        onPointerMove={(event) => {
          if (!dragging.current) return;
          dragging.current.moved = true;
          show(widthAt(event.clientX));
        }}
        onPointerUp={(event) => dragging.current && stop(widthAt(event.clientX))}
        onPointerCancel={() => {
          if (!dragging.current) return;
          // Put back as it was
          dragging.current.moved = false;
          stop(width);
        }}
        onDoubleClick={() => onResize(PANEL_WIDTH)}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 64 : 16;
          if (event.key === 'ArrowLeft') onResize(clampPanelWidth(width + step, viewportWidth()));
          else if (event.key === 'ArrowRight') onResize(clampPanelWidth(width - step, viewportWidth()));
          else return;
          event.preventDefault();
        }}
        className="group absolute inset-y-0 left-0 z-10 hidden w-1.5 cursor-col-resize outline-hidden lg:block"
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-0.5 transition-colors ${
            isDragging
              ? 'bg-[rgb(var(--ec-accent))]'
              : 'group-hover:bg-[rgb(var(--ec-accent)/0.6)] group-focus-visible:bg-[rgb(var(--ec-accent))]'
          }`}
        />
      </div>
    );
  }
);
PanelResizeHandle.displayName = 'PanelResizeHandle';

const markdownComponents = {
  a: ({ node: _node, ...props }: any) => {
    const nodeIds = nodesInFocusLink(props.href);
    if (nodeIds) return <FocusLink nodeIds={nodeIds}>{props.children}</FocusLink>;
    const ref = canvasRefIn(props.href);
    if (ref) return <CanvasRef {...ref}>{props.children}</CanvasRef>;
    return (
      <a
        {...props}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[rgb(var(--ec-accent))] hover:text-[rgb(var(--ec-accent-hover))] underline"
      />
    );
  },
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
export type WalkthroughStep = { title: string; description: string; nodeIds: string[] };
export type Walkthrough = { id: string; title: string; steps: WalkthroughStep[] };

/** The walkthroughs the assistant gave in a message (walkThrough), as the canvas had them */
export const getWalkthroughs = (message: { parts?: Array<any> }): Walkthrough[] =>
  (message.parts ?? []).flatMap((part) =>
    part.type === 'tool-walkThrough' && part.state === 'output-available' && Array.isArray(part.output?.steps)
      ? [{ id: String(part.toolCallId), title: String(part.output.title ?? ''), steps: part.output.steps as WalkthroughStep[] }]
      : []
  );

/**
 * A walkthrough, step by step: each step takes them to its nodes on the canvas (clicked, or the pointer resting on it),
 * and Previous and Next go through them in turn
 */
const WalkthroughSteps = memo(({ walkthrough }: { walkthrough: Walkthrough }) => {
  const [current, setCurrent] = useState<number | null>(null);
  const goTo = useCallback(
    (index: number) => {
      const step = walkthrough.steps[index];
      if (!step) return;
      setCurrent(index);
      if (step.nodeIds.length) focusCanvas(step.nodeIds);
    },
    [walkthrough]
  );
  const count = walkthrough.steps.length;
  return (
    <div className="mt-3 w-full overflow-hidden rounded-xl border border-[rgb(var(--ec-page-border))]">
      <div className="flex items-center gap-2 px-3 py-2 bg-[rgb(var(--ec-accent)/0.03)] border-b border-[rgb(var(--ec-page-border))]">
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[rgb(var(--ec-page-text))]">{walkthrough.title}</span>
        <span className="flex-none text-[11px] text-[rgb(var(--ec-page-text-muted))]">
          {current === null ? `${count} step${count === 1 ? '' : 's'}` : `Step ${current + 1} of ${count}`}
        </span>
        <button
          type="button"
          aria-label="Previous step"
          disabled={current === null || current === 0}
          onClick={() => goTo((current ?? 0) - 1)}
          className="flex-none cursor-pointer rounded p-0.5 text-[rgb(var(--ec-icon-color))] hover:bg-[rgb(var(--ec-accent)/0.1)] disabled:cursor-default disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          type="button"
          aria-label="Next step"
          disabled={current === count - 1}
          onClick={() => goTo(current === null ? 0 : current + 1)}
          className="flex-none cursor-pointer rounded p-0.5 text-[rgb(var(--ec-icon-color))] hover:bg-[rgb(var(--ec-accent)/0.1)] disabled:cursor-default disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <ol className="py-1">
        {walkthrough.steps.map((step, index) => {
          const active = index === current;
          return (
            <li key={index} className="relative">
              {/* The line down to the next step */}
              {index < count - 1 && (
                <span aria-hidden="true" className="absolute left-[23px] top-8 bottom-0 w-px bg-[rgb(var(--ec-accent)/0.2)]" />
              )}
              <CanvasLink
                go={() => goTo(index)}
                className={`flex w-full items-start gap-3 px-3 py-2 text-left ${
                  active ? 'bg-[rgb(var(--ec-accent)/0.08)]' : 'hover:bg-[rgb(var(--ec-accent)/0.05)]'
                }`}
              >
                <span
                  className={`relative z-10 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[11px] font-semibold ${
                    active
                      ? 'bg-[rgb(var(--ec-accent))] text-white'
                      : 'bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-accent))] ring-1 ring-inset ring-[rgb(var(--ec-accent)/0.35)]'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[rgb(var(--ec-page-text))]">
                    {step.title}
                    {step.nodeIds.length > 0 && (
                      <LocateFixed size={11} className="flex-none text-[rgb(var(--ec-accent))] opacity-70" aria-hidden="true" />
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
                    {step.description}
                  </span>
                </span>
              </CanvasLink>
            </li>
          );
        })}
      </ol>
    </div>
  );
});
WalkthroughSteps.displayName = 'WalkthroughSteps';

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

const ChatPanel = ({ isOpen, onClose, configured = false }: ChatPanelProps) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modalInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const modalMessagesContainerRef = useRef<HTMLDivElement>(null);
  // Follow the answer as it streams, until the person scrolls up to read: sending a message or the scroll button
  // follows it again
  const followLatest = useRef(true);
  const lastScrollTop = useRef(new WeakMap<HTMLElement, number>());
  const [inputValue, setInputValue] = useState('');
  const [isSetupThinking, setIsSetupThinking] = useState(false);
  const setupReplyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (setupReplyTimer.current !== null) clearTimeout(setupReplyTimer.current);
    },
    []
  );
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [pathname, setPathname] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  // How wide they made the panel: the default until the width they left it at is read, after hydrating (within the
  // panel's own limits: the window's are applied as it's shown, so it's back to that width when the window's wide again)
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelWidth, setPanelWidth] = useState(PANEL_WIDTH);
  useEffect(() => setPanelWidth(readPanelWidth(Infinity)), []);
  // How wide it's shown: that, leaving room for the page in this window (checked again as the window's resized; it only
  // re-renders when this changes)
  const [shownWidth, setShownWidth] = useState(PANEL_WIDTH);
  useEffect(() => {
    const fit = () => setShownWidth(clampPanelWidth(panelWidth, viewportWidth()));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [panelWidth]);
  const resizePanel = useCallback((width: number) => {
    setPanelWidth(width);
    savePanelWidth(width);
  }, []);
  const [tools, setTools] = useState<ToolMetadata[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const chatApiUrl = useMemo(() => buildUrl('/api/chat', true), []);
  const chatTransport = useMemo(() => new DefaultChatTransport({ api: chatApiUrl }), [chatApiUrl]);

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
    if (configured && isOpen && tools.length === 0) {
      fetch(chatApiUrl)
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
  }, [configured, isOpen, tools.length, chatApiUrl]);

  // Follow the current URL (pathname + search): the panel lives in the persisted header, so it stays mounted while
  // ClientRouter swaps pages underneath it. Reading the URL again after each swap keeps the suggested questions and
  // the "Based on" context on the page the person is actually looking at, not the one they opened the panel from.
  useEffect(() => {
    const updatePathname = () => setPathname(window.location.pathname + window.location.search);
    updatePathname();
    document.addEventListener('astro:after-swap', updatePathname);
    return () => document.removeEventListener('astro:after-swap', updatePathname);
  }, [isOpen]);

  // Memoize suggested questions to avoid recalculating on every render
  const suggestedQuestions = useMemo(() => getSuggestedQuestions(pathname), [pathname]);
  const canvasId = useMemo(() => getCanvasId(pathname), [pathname]);

  // Memoize page context to avoid recalculating on every render
  const pageContext = useMemo(() => {
    const match = pathname.match(
      /^\/(docs|visualiser|architecture)\/(events|services|commands|queries|flows|domains|systems|channels|entities|containers|data-products)\/([^/]+)(?:\/([^/]+))?/
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
        systems: 'System',
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

  // Stop following the answer when the person scrolls up, and follow it again when they're back at the bottom.
  // Only a move up stops it: content growing below doesn't scroll, and a scroll down is heading for the latest.
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    if (isNearBottom) followLatest.current = true;
    else if (target.scrollTop < (lastScrollTop.current.get(target) ?? 0)) followLatest.current = false;
    lastScrollTop.current.set(target, target.scrollTop);
    setShowScrollButton(!isNearBottom);
  }, []);

  const { messages, sendMessage, stop, status, setMessages, error } = useChat({ transport: chatTransport });

  // The chat API's error, or how to fix a chat configuration that didn't load
  const chatError = useMemo(() => getChatError(error), [error]);

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
    isSetupThinking ||
    isWaitingForResponse ||
    (messages.length > 0 && (status === 'submitted' || status === 'streaming') && !assistantHasContent);
  const isLoading = isThinking || isStreaming;
  // Working, and not writing text right now (e.g. drawing on a canvas after saying what it'll do): still shown working
  const isWorking = isThinking || (isStreaming && isBetweenText(lastAssistantMessage));

  // What it's done and is doing in the turn going on (the last message, once the assistant's started it)
  const lastMessage = messages.at(-1);
  const activitySteps = useMemo(() => getActivitySteps(lastMessage), [lastMessage]);
  const suggestingFollowUps = useMemo(() => isSuggestingFollowUps(lastMessage), [lastMessage]);

  // The assistant showing them something on the canvas (showOnCanvas, a walkthrough's start): taken there, once
  const shownOnCanvas = useRef(new Set<string>());
  useEffect(() => {
    for (const part of (lastAssistantMessage?.parts ?? []) as Array<any>) {
      if (part.state !== 'output-available' || shownOnCanvas.current.has(part.toolCallId)) continue;
      // What it showed them, or a walkthrough's first step
      const nodeIds: string[] | undefined =
        part.type === 'tool-showOnCanvas'
          ? part.output?.nodeIds
          : part.type === 'tool-walkThrough'
            ? part.output?.steps?.[0]?.nodeIds
            : undefined;
      if (!nodeIds?.length) continue;
      shownOnCanvas.current.add(part.toolCallId);
      focusCanvas(nodeIds);
    }
  }, [lastAssistantMessage]);

  // Jump the messages (in the panel and the fullscreen modal) to the latest. Instantly: a smooth scroll restarted on
  // every streamed token lands short of the growing answer and scrolls back and forth.
  const scrollToLatest = useCallback(() => {
    for (const container of [messagesContainerRef.current, modalMessagesContainerRef.current]) {
      if (!container) continue;
      container.scrollTop = container.scrollHeight;
      lastScrollTop.current.set(container, container.scrollTop);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    followLatest.current = true;
    scrollToLatest();
  }, [scrollToLatest]);

  useEffect(() => {
    if (followLatest.current) scrollToLatest();
  }, [messages, scrollToLatest]);

  // Focus modal input when fullscreen opens
  useEffect(() => {
    if (isOpen && isFullscreen && !isLoading) {
      const timer = setTimeout(() => {
        modalInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isFullscreen, isLoading]);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      // Focus input on CMD+I or CTRL+I
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'i' && isOpen) {
        e.preventDefault();
        (isFullscreen ? modalInputRef : inputRef).current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isFullscreen, onClose]);

  // Focus input when opened and not loading
  useEffect(() => {
    if (isOpen && !isFullscreen && !isLoading) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isFullscreen, isLoading]);

  // Add/remove padding to main application and header when sidebar panel is open
  useEffect(() => {
    // Looked up each time: the panel stays open across ClientRouter navigations (the header persists), but each one
    // swaps in a new page that needs pushing over too
    const getElements = () => ({
      elements: pageBesidePanel(),
      docsSidebarEl: document.getElementById('eventcatalog-docs-sidebar'),
    });

    const desktop = window.matchMedia('(min-width: 1024px)');
    const updateLayout = () => {
      const pushContent = desktop.matches && isOpen && !isFullscreen;
      const { elements, docsSidebarEl } = getElements();
      elements.forEach((el) => {
        if (!el.style.transition) {
          el.style.transition = 'padding-right 420ms cubic-bezier(0.16, 1, 0.3, 1)';
        }
        el.style.paddingRight = pushContent ? `${shownWidth}px` : '0';
      });
      if (docsSidebarEl) docsSidebarEl.style.display = pushContent ? 'none' : '';
    };
    updateLayout();
    desktop.addEventListener('change', updateLayout);
    // The new page is in place but not yet shown, so it opens already pushed over
    document.addEventListener('astro:after-swap', updateLayout);

    // Cleanup on unmount
    return () => {
      desktop.removeEventListener('change', updateLayout);
      document.removeEventListener('astro:after-swap', updateLayout);
      const { elements, docsSidebarEl } = getElements();
      elements.forEach((el) => {
        el.style.paddingRight = '0';
      });
      if (docsSidebarEl) {
        docsSidebarEl.style.display = '';
      }
    };
  }, [isOpen, isFullscreen, shownWidth]);

  // Submit message handler
  const submitMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isLoading) return;
      setInputValue('');
      followLatest.current = true;
      if (!configured) {
        setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text }] }]);
        setIsSetupThinking(true);
        setupReplyTimer.current = setTimeout(() => {
          setMessages((previous) => [
            ...previous,
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              parts: [
                {
                  type: 'text',
                  text: offlineReplyText,
                },
              ],
            },
          ]);
          setupReplyTimer.current = null;
          setIsSetupThinking(false);
        }, 1200);
        return;
      }
      setIsWaitingForResponse(true);
      // The canvas follows the assistant while it draws
      if (canvasId) window.dispatchEvent(new CustomEvent(ASSISTANT_DRAWING_EVENT, { detail: { canvasId } }));
      sendMessage({ text }, canvasId ? { body: { canvasId } } : undefined);
    },
    [configured, isLoading, sendMessage, setMessages, canvasId]
  );

  const stopResponse = useCallback(() => {
    if (setupReplyTimer.current !== null) {
      clearTimeout(setupReplyTimer.current);
      setupReplyTimer.current = null;
    }
    setIsSetupThinking(false);
    setIsWaitingForResponse(false);
    stop();
  }, [stop]);

  const clearMessages = useCallback(() => {
    stopResponse();
    setMessages([]);
  }, [stopResponse, setMessages]);

  // Handle suggested action clicks
  const handleSuggestedAction = useCallback(
    (prompt: string) => {
      submitMessage(prompt);
    },
    [submitMessage]
  );

  // A suggested question: asked, or answered here straight away (no need to wait on the model to ask something back)
  const handleSuggestedQuestion = useCallback(
    ({ prompt, reply }: SuggestedQuestion) => {
      if (!reply || isLoading) return handleSuggestedAction(prompt);
      followLatest.current = true;
      setMessages((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text: prompt }] },
        { id: crypto.randomUUID(), role: 'assistant', parts: [{ type: 'text', text: reply }] },
      ]);
      (isFullscreen ? modalInputRef : inputRef).current?.focus();
    },
    [handleSuggestedAction, isLoading, isFullscreen, setMessages]
  );

  // The box grows with what's typed in it (up to its max-height, then scrolls), and shrinks back once it's sent
  useEffect(() => {
    for (const input of [inputRef.current, modalInputRef.current]) {
      if (!input) continue;
      input.style.height = 'auto';
      input.style.height = `${input.scrollHeight}px`;
    }
  }, [inputValue, isFullscreen, isOpen]);

  // Handle input enter key
  const handleInputKeyDown = useCallback(
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

  // Memoize greeting - only changes when hour changes (effectively stable during session)
  const greeting = useMemo(() => getGreeting(), []);

  return (
    <>
      {/* Keyframes for fade-in animation - using constant to avoid re-injection.
          Injected raw: React 18's server renderer escapes the `>` selectors in
          text children, which the client doesn't, causing a hydration mismatch. */}
      <style dangerouslySetInnerHTML={{ __html: CHAT_PANEL_STYLES }} />

      {/* Panel - hidden when fullscreen modal is open */}
      {!isFullscreen && (
        <div
          ref={(element) => {
            panelRef.current = element;
            element?.toggleAttribute('inert', !isOpen);
          }}
          aria-hidden={!isOpen}
          className="ec-chat-surface fixed top-0 right-0 h-[100dvh] z-[200] border-l border-[rgb(var(--ec-page-border))] flex flex-col overflow-hidden"
          style={{
            width: `min(${shownWidth}px, 100vw)`,
            transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1)',
            background: `
              radial-gradient(ellipse 100% 40% at 50% 100%, rgb(var(--ec-accent) / 0.045) 0%, transparent 100%),
              rgb(var(--ec-page-bg))
            `,
          }}
        >
          <PanelResizeHandle panel={panelRef} width={shownWidth} onResize={resizePanel} />
          {/* Header */}
          <div className="flex-none shrink-0 border-b border-[rgb(var(--ec-page-border))]">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center space-x-2">
                <Sparkles size={16} className="text-[rgb(var(--ec-accent))]" />
                <span className="font-medium text-[rgb(var(--ec-header-text))] text-sm">Assistant</span>
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
                    onClick={clearMessages}
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
                      <div className="ec-chat-avatar w-24 h-24 rounded-full flex items-center justify-center">
                        <MessageSquare size={42} className="text-[rgb(var(--ec-accent))]" strokeWidth={1.5} />
                      </div>
                    </div>
                    <h2 className="text-lg font-medium text-[rgb(var(--ec-page-text))] mb-1">{greeting}</h2>
                    <p className="text-sm font-normal text-[rgb(var(--ec-content-text))]">
                      {canvasId
                        ? "Tell me what to diagram and I'll draw it on the canvas"
                        : "I'm here to help with your architecture"}
                    </p>
                  </div>

                  {/* Suggested questions - pill style */}
                  <div className="flex-none flex flex-col items-start gap-2">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedQuestion(question)}
                        className="ec-chat-suggestion text-left px-3 py-2 text-xs text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-accent)/0.04)] hover:bg-[rgb(var(--ec-accent)/0.09)] rounded-full transition-all duration-200"
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
                    const flaggedHotspots = message.role === 'assistant' ? getFlaggedHotspots(message) : [];
                    const walkthroughs = message.role === 'assistant' ? getWalkthroughs(message) : [];
                    const isLastMessage = messageIndex === messages.length - 1;
                    return (
                      <div
                        key={message.id}
                        className={`ec-chat-message ${!configured && message.role === 'assistant' ? 'ec-chat-setup' : ''} flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        {message.role === 'user' ? (
                          <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-[rgb(var(--ec-page-text)/0.05)]">
                            <p className="text-sm font-normal whitespace-pre-wrap text-[rgb(var(--ec-page-text))]">{content}</p>
                          </div>
                        ) : !configured ? (
                          <OfflineReply />
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
                            {walkthroughs.map((walkthrough) => (
                              <WalkthroughSteps key={walkthrough.id} walkthrough={walkthrough} />
                            ))}
                            {flaggedHotspots.length > 0 && <FlaggedHotspots hotspots={flaggedHotspots} />}
                            {isLastMessage && followUpSuggestions.length > 0 && !isLoading && (
                              <div className="flex flex-wrap gap-2 mt-3 w-full">
                                {followUpSuggestions.map((suggestion, index) => (
                                  <button
                                    key={index}
                                    onClick={() => handleSuggestedAction(suggestion)}
                                    className="ec-chat-suggestion px-3 py-2 text-xs text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-accent)/0.04)] hover:bg-[rgb(var(--ec-accent)/0.09)] rounded-full transition-all duration-200 text-left"
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
                  {isWorking && (
                    <div className="w-full">
                      {suggestingFollowUps ? <FollowUpsLoading /> : <ActivityCard steps={activitySteps} />}
                    </div>
                  )}

                  {/* Error message as chat bubble */}
                  {status === 'error' &&
                    (chatError.type === 'configuration' ? (
                      <div className="ec-chat-message ec-chat-setup flex flex-col items-start">
                        <ConfigurationErrorReply reason={chatError.reason} />
                      </div>
                    ) : (
                      <div className="flex justify-start">
                        <div className="w-full">
                          <div className="flex items-start gap-2 text-red-600 text-sm">
                            <span className="shrink-0">⚠️</span>
                            <span>{chatError.message}</span>
                          </div>
                        </div>
                      </div>
                    ))}
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
                <div className="ec-chat-composer relative bg-[rgb(var(--ec-page-bg)/0.5)] backdrop-blur-sm rounded-xl border border-[rgb(var(--ec-accent)/0.3)] focus-within:border-[rgb(var(--ec-accent)/0.5)] focus-within:ring-2 focus-within:ring-[rgb(var(--ec-accent)/0.1)] transition-all">
                  <textarea
                    ref={inputRef}
                    rows={2}
                    aria-label="Ask AI a question"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder={canvasId ? 'Describe what to diagram...' : 'Ask, search, or explain...'}
                    disabled={isLoading}
                    className="w-full px-4 bg-transparent text-[rgb(var(--ec-input-text))] placeholder-[rgb(var(--ec-input-placeholder))] focus:outline-hidden text-sm disabled:opacity-50 rounded-xl"
                  />
                  <div className="ec-chat-composer-footer">
                    <div className="min-w-0 flex-1 truncate text-[10px] text-[rgb(var(--ec-page-text-muted))]">
                      <span className="mr-1.5 rounded bg-[rgb(var(--ec-accent)/0.08)] px-1 py-0.5 font-medium text-[rgb(var(--ec-accent))]">
                        AI
                      </span>
                      {configured
                        ? pageContext
                          ? `Based on ${pageContext.name}`
                          : 'Your architecture, connected'
                        : 'Explore your catalog with AI'}
                    </div>
                    <div className="flex-none">
                      {isStreaming || isSetupThinking ? (
                        <button
                          type="button"
                          onClick={stopResponse}
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
            className="ec-chat-surface fixed inset-y-4 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl md:inset-y-8 rounded-xl shadow-2xl z-[301] flex flex-col overflow-hidden focus:outline-hidden border border-[rgb(var(--ec-page-border))]"
            style={{
              background: `
                radial-gradient(ellipse 100% 40% at 50% 100%, rgb(var(--ec-accent) / 0.045) 0%, transparent 100%),
                rgb(var(--ec-page-bg))
              `,
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[rgb(var(--ec-page-border))] flex-shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-[rgb(var(--ec-accent-subtle))] rounded-lg">
                  <Sparkles size={18} className="text-[rgb(var(--ec-accent))]" />
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
                    onClick={clearMessages}
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

            {/* Modal Content */}
            <div ref={modalMessagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-6">
              {!hasMessages ? (
                /* Welcome area - Clean design */
                <div className="flex flex-col h-full max-w-2xl mx-auto">
                  {/* Greeting section - centered */}
                  <div className="flex-1 flex flex-col justify-center items-center text-center">
                    {/* Icon with circular background */}
                    <div className="relative mb-8">
                      <div className="ec-chat-avatar w-28 h-28 rounded-full flex items-center justify-center">
                        <MessageSquare size={48} className="text-[rgb(var(--ec-accent))]" strokeWidth={1.5} />
                      </div>
                    </div>
                    <h2 className="text-2xl font-medium text-[rgb(var(--ec-page-text))] mb-2">{greeting}</h2>
                    <p className="font-normal text-[rgb(var(--ec-content-text))] text-center">
                      {canvasId
                        ? "Tell me what to diagram and I'll draw it on the canvas"
                        : "I'm here to help with your architecture"}
                    </p>
                  </div>

                  {/* Suggested questions - pill style */}
                  <div className="flex-none grid grid-cols-2 gap-2">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedQuestion(question)}
                        className="ec-chat-suggestion px-3 py-2 text-xs text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-accent)/0.04)] hover:bg-[rgb(var(--ec-accent)/0.09)] rounded-full transition-all duration-200 text-left"
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
                    const flaggedHotspots = message.role === 'assistant' ? getFlaggedHotspots(message) : [];
                    const walkthroughs = message.role === 'assistant' ? getWalkthroughs(message) : [];
                    const isLastMessage = messageIndex === messages.length - 1;
                    return (
                      <div
                        key={message.id}
                        className={`ec-chat-message ${!configured && message.role === 'assistant' ? 'ec-chat-setup' : ''} flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        {message.role === 'user' ? (
                          <div className="max-w-[75%] rounded-2xl rounded-br-md px-4 py-2.5 bg-[rgb(var(--ec-page-text)/0.05)]">
                            <p className="text-sm font-normal whitespace-pre-wrap text-[rgb(var(--ec-page-text))]">{content}</p>
                          </div>
                        ) : !configured ? (
                          <OfflineReply />
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
                            {walkthroughs.map((walkthrough) => (
                              <WalkthroughSteps key={walkthrough.id} walkthrough={walkthrough} />
                            ))}
                            {flaggedHotspots.length > 0 && <FlaggedHotspots hotspots={flaggedHotspots} />}
                            {isLastMessage && followUpSuggestions.length > 0 && !isLoading && (
                              <div className="flex flex-wrap gap-2 mt-3 w-full">
                                {followUpSuggestions.map((suggestion, index) => (
                                  <button
                                    key={index}
                                    onClick={() => handleSuggestedAction(suggestion)}
                                    className="ec-chat-suggestion px-3 py-2 text-xs text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-accent)/0.04)] hover:bg-[rgb(var(--ec-accent)/0.09)] rounded-full transition-all duration-200 text-left"
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

                  {isWorking && (
                    <div className="w-full max-w-md">
                      {suggestingFollowUps ? <FollowUpsLoading /> : <ActivityCard steps={activitySteps} />}
                    </div>
                  )}

                  {/* Error message as chat bubble */}
                  {status === 'error' &&
                    (chatError.type === 'configuration' ? (
                      <div className="ec-chat-message ec-chat-setup flex flex-col items-start">
                        <ConfigurationErrorReply reason={chatError.reason} />
                      </div>
                    ) : (
                      <div className="flex justify-start">
                        <div className="w-full">
                          <div className="flex items-start gap-2 text-red-600 text-sm">
                            <span className="shrink-0">⚠️</span>
                            <span>{chatError.message}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Modal Input area */}
            <div className="flex-shrink-0 px-6 py-4">
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                <div className="ec-chat-composer relative bg-[rgb(var(--ec-page-bg)/0.5)] backdrop-blur-sm rounded-xl border border-[rgb(var(--ec-accent)/0.3)] focus-within:border-[rgb(var(--ec-accent)/0.5)] focus-within:ring-2 focus-within:ring-[rgb(var(--ec-accent)/0.1)] transition-all">
                  <textarea
                    ref={modalInputRef}
                    rows={2}
                    aria-label="Ask AI a question"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder={canvasId ? 'Describe what to diagram...' : 'Ask, search, or explain...'}
                    disabled={isLoading}
                    className="w-full px-4 bg-transparent text-[rgb(var(--ec-input-text))] placeholder-[rgb(var(--ec-input-placeholder))] focus:outline-hidden text-sm disabled:opacity-50 rounded-xl"
                  />
                  <div className="ec-chat-composer-footer">
                    <div className="min-w-0 flex-1 truncate text-[10px] text-[rgb(var(--ec-page-text-muted))]">
                      <span className="mr-1.5 rounded bg-[rgb(var(--ec-accent)/0.08)] px-1 py-0.5 font-medium text-[rgb(var(--ec-accent))]">
                        AI
                      </span>
                      {configured
                        ? pageContext
                          ? `Based on ${pageContext.name}`
                          : 'Your architecture, connected'
                        : 'Explore your catalog with AI'}
                    </div>
                    <div className="flex-none">
                      {isStreaming || isSetupThinking ? (
                        <button
                          type="button"
                          onClick={stopResponse}
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
