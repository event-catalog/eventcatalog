import { useEffect, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Code2, Copy, Globe, Sparkles, X } from 'lucide-react';
import type { WebMcpStatus } from '../hooks/use-canvas-webmcp';
import { STATUS, ClaudeCodeLogo, ClaudeLogo, CursorLogo, OpenAILogo } from '@eventcatalog/visualiser/studio';

type CanvasLink = { canvasId: string; title?: string; canvasUrl: string; mcpUrl: string };

export const RELAY_COMMAND = 'npx -y @mcp-b/webmcp-local-relay@5.1.0';
const RELAY_KEY = 'eventcatalog-webmcp-relay';
const WEBMCP_KEY = 'eventcatalog-webmcp';

const isOn = (key: string) => {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
};
const turnOn = (key: string) => {
  try {
    localStorage.setItem(key, 'true');
  } catch {}
};

/**
 * WebMCP through the polyfill (for browsers without WebMCP of their own) is opt in, remembered in this browser:
 * the polyfill watches every change to the page, which on a canvas is every drag and pan. The relay needs it.
 */
export const isWebMcpEnabled = () => isOn(WEBMCP_KEY) || isOn(RELAY_KEY);
export const enableWebMcp = () => turnOn(WEBMCP_KEY);

/**
 * The WebMCP local relay hands this tab's tools to desktop agents. Opt in: its script keeps looking for a
 * relay on localhost, so it only loads once someone turns it on (remembered in this browser).
 */
export const isRelayEnabled = () => isOn(RELAY_KEY);

export const loadRelay = (scriptPath: string) => {
  if (document.querySelector('script[data-webmcp-relay-embed]')) return;
  const script = document.createElement('script');
  script.src = scriptPath;
  script.dataset.webmcpRelayEmbed = '';
  script.dataset.relayPort = '9333';
  document.body.appendChild(script);
};

const enableRelay = (scriptPath: string) => {
  turnOn(RELAY_KEY);
  loadRelay(scriptPath);
};

/**
 * The prompt people give their agent to join this canvas. It works out how to connect from what the agent
 * can do: the EventCatalog MCP server (and openCanvas in chats that show MCP Apps), WebMCP in the open tab,
 * or the WebMCP local relay for desktop agents.
 */
export const buildAgentPrompt = ({ canvasId, title, canvasUrl, mcpUrl }: CanvasLink) =>
  `Join me on an EventCatalog canvas so we can design this together, live.

Canvas: ${title ? `"${title}"` : 'Untitled'}
Canvas id: ${canvasId}
Link: ${canvasUrl}

Connect with the first of these you can use:

1. EventCatalog MCP server (Streamable HTTP): ${mcpUrl}
   - If you already have it (tools like getCanvas, addToCanvas), use them with canvasId "${canvasId}".
   - If not and you can add MCP servers, add it. For example, in Claude Code: claude mcp add --transport http eventcatalog ${mcpUrl}
   - If you can show MCP Apps in this chat (e.g. ChatGPT, Claude), call openCanvas with canvasId "${canvasId}" so I can work on the canvas with you right here.
2. WebMCP: if you can use tools from my browser tab, I have the canvas open there and it offers tools like get_canvas, add_to_canvas and add_comment.
3. WebMCP local relay: if you run on my computer (e.g. Claude Code, Cursor) and can't reach the MCP server, add the MCP server \`${RELAY_COMMAND}\`. It gives you the tools of my open canvas tab.

Once connected:
- Read the canvas first (getCanvas / get_canvas) and tell me here who else is on it.
- Ask me here, in our conversation, what we are designing, then work on the canvas as we talk: add catalog resources (find them with getResources / search_catalog), add new components for things that don't exist yet, and connect them. Leave out positions so new nodes go next to what they connect to. When you finish a round of changes, tidy the whole canvas once (layoutCanvas / layout_canvas) before you hand back to me, unless I asked you to keep the layout.
- Talk to me here, not in canvas comments. Only comment on the canvas when I ask you to (e.g. to review it), and reply to comments people leave for you.
- Pass agentName with your name on MCP tools, so people on the canvas can see who you are.`;

const button =
  'inline-flex h-9 flex-none items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors [&_svg]:h-4 [&_svg]:w-4';
const primary = `${button} bg-[rgb(var(--ec-page-text))] text-[rgb(var(--ec-page-bg))] hover:bg-[rgb(var(--ec-page-text)/0.85)]`;
const secondary = `${button} border border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover))]`;

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/** Something to copy, with a button that copies it (as Studio on the web's) */
function Snippet({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <div className="relative mt-2 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover))]">
      <pre className="overflow-x-auto whitespace-pre p-3 pr-12 font-mono text-xs leading-relaxed text-[rgb(var(--ec-page-text))]">
        {text}
      </pre>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        title="Copy"
        onClick={async () => setCopied(await copyText(text))}
        className="absolute right-2 top-2 rounded-md p-1.5 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-card-bg))] hover:text-[rgb(var(--ec-page-text))] [&_svg]:h-4 [&_svg]:w-4"
      >
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      </button>
    </div>
  );
}

const Steps = ({ children }: { children: ReactNode }) => (
  <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[rgb(var(--ec-page-text))] marker:text-[rgb(var(--ec-page-text-muted))]">
    {children}
  </ol>
);

/** Turns something on for this tab, or says it's on */
function TabSwitch({ on, onTurnOn, label }: { on: boolean; onTurnOn: () => void; label: string }) {
  return on ? (
    <p className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium ${STATUS.success.text}`}>
      <span className={`h-2 w-2 rounded-full ${STATUS.success.dot}`} />
      On for this tab
    </p>
  ) : (
    <button type="button" onClick={onTurnOn} className={`${secondary} h-8 px-3 text-xs`}>
      {label}
    </button>
  );
}

/** Things to ask, for the two ways of pairing with an agent on a canvas: designing something new, and understanding what's there */
const PAIRING = [
  {
    title: 'Design ideas together',
    prompts: [
      'Add a payments service that listens to OrderPlaced',
      'How could we split the orders service?',
      'Add retries and a dead letter queue to this',
    ],
  },
  {
    title: 'Understand how it works',
    prompts: [
      'Put everything the Orders domain owns on the canvas',
      'Walk me through what happens when a payment fails',
      'Which services consume this event?',
    ],
  },
];

/**
 * Bringing an AI agent onto the canvas, as Studio on the web does it: how to add EventCatalog's MCP server to each
 * common client, a step or two each with what to copy, and what to ask it. The quickest way first: a prompt to give
 * the agent, which works out how to connect (and which canvas to join) itself. Agents in this browser use WebMCP.
 */
export default function ConnectAgentDialog({
  link,
  webMcp,
  relayScriptPath,
  onEnableWebMcp,
  onClose,
}: {
  link: CanvasLink;
  webMcp: WebMcpStatus;
  /** Turn WebMCP on for this tab (through the polyfill, when the browser has none) */
  onEnableWebMcp: () => void;
  /** Where the relay's script is served (only on EventCatalog's own canvas page) */
  relayScriptPath?: string;
  onClose: () => void;
}) {
  const prompt = buildAgentPrompt(link);
  const { mcpUrl, canvasId } = link;
  const [relayOn, setRelayOn] = useState(isRelayEnabled);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [client, setClient] = useState(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  useEffect(() => {
    if (!promptCopied) return;
    const timer = setTimeout(() => setPromptCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [promptCopied]);

  const turnOnRelay = () => {
    if (!relayScriptPath) return;
    enableRelay(relayScriptPath);
    setRelayOn(true);
    // The relay hands this tab's WebMCP tools to desktop agents
    onEnableWebMcp();
  };

  const joinThisCanvas = (
    <>
      Ask it to join this canvas (<code className="text-xs">{canvasId}</code>), or paste the prompt above, and start pairing (try
      one of the prompts below).
    </>
  );
  const clients: { name: string; logo: ReactNode; body: ReactNode }[] = [
    {
      name: 'Claude',
      logo: <ClaudeLogo />,
      body: (
        <Steps>
          <li>
            In Claude, open <strong>Settings → Connectors</strong> and choose <strong>Add custom connector</strong>.
          </li>
          <li>
            Name it <strong>EventCatalog</strong> and paste this URL:
            <Snippet text={mcpUrl} label="the URL" />
          </li>
          <li>In a chat, turn the connector on. {joinThisCanvas}</li>
        </Steps>
      ),
    },
    {
      name: 'Claude Code',
      logo: <ClaudeCodeLogo />,
      body: (
        <>
          <Steps>
            <li>
              Run this in your project:
              <Snippet text={`claude mcp add --transport http eventcatalog ${mcpUrl}`} label="the command" />
            </li>
            <li>{joinThisCanvas}</li>
          </Steps>
          {relayScriptPath && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-[rgb(var(--ec-page-border))] p-3">
              <p className="text-xs text-[rgb(var(--ec-page-text-muted))]">
                Can't reach this EventCatalog from your computer? Use this tab through the local relay: add{' '}
                <code>{RELAY_COMMAND}</code> as an MCP server.
              </p>
              <TabSwitch on={relayOn} onTurnOn={turnOnRelay} label="Turn on relay" />
            </div>
          )}
        </>
      ),
    },
    {
      name: 'ChatGPT',
      logo: <OpenAILogo />,
      body: (
        <Steps>
          <li>
            In ChatGPT, open <strong>Settings → Apps &amp; Connectors</strong>, turn on developer mode and choose{' '}
            <strong>Create</strong>.
          </li>
          <li>
            Name it <strong>EventCatalog</strong> and paste this URL:
            <Snippet text={mcpUrl} label="the URL" />
          </li>
          <li>In a chat, add the connector. Chats that show MCP Apps open the canvas right there. {joinThisCanvas}</li>
        </Steps>
      ),
    },
    {
      name: 'Cursor',
      logo: <CursorLogo />,
      body: (
        <Steps>
          <li>
            Add this server to <code className="text-xs">.cursor/mcp.json</code> in your project:
            <Snippet text={JSON.stringify({ mcpServers: { eventcatalog: { url: mcpUrl } } }, null, 2)} label="the settings" />
          </li>
          <li>{joinThisCanvas}</li>
        </Steps>
      ),
    },
    {
      name: 'VS Code',
      logo: <Code2 />,
      body: (
        <Steps>
          <li>
            Add this server to <code className="text-xs">.vscode/mcp.json</code> in your project:
            <Snippet
              text={JSON.stringify({ servers: { eventcatalog: { type: 'http', url: mcpUrl } } }, null, 2)}
              label="the settings"
            />
          </li>
          <li>In Copilot's agent mode: {joinThisCanvas}</li>
        </Steps>
      ),
    },
    {
      name: 'This browser',
      logo: <Globe />,
      body: (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm leading-relaxed text-[rgb(var(--ec-page-text))]">
            {webMcp.state === 'on'
              ? `This tab offers ${webMcp.tools} canvas tools to agents in your browser (like the MCP-B extension) through WebMCP.`
              : 'Let agents in your browser (like the MCP-B extension) use this canvas through WebMCP.'}
          </p>
          <TabSwitch on={webMcp.state === 'on'} onTurnOn={onEnableWebMcp} label="Turn on" />
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-agent-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full max-w-2xl flex-col rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] shadow-2xl"
      >
        <div className="flex items-start gap-3 px-5 pt-5">
          <div className="min-w-0 flex-1">
            <h2 id="connect-agent-title" className="text-base font-semibold">
              Connect your AI agent
            </h2>
            <p className="mt-1.5 text-sm font-light leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
              Pair with your AI agent on this canvas: sketch ideas together, or have it bring in what your catalog has and walk
              you through it. It joins with its own pointer, and you both change the canvas. Add this EventCatalog as an MCP
              server.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-1 -mt-1 rounded-md p-1.5 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))] hover:text-[rgb(var(--ec-page-text))]"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto">
          {/* The quickest way: one prompt, which the agent works out how to connect from (and which canvas to join) */}
          <section className="mx-5 mt-4 overflow-hidden rounded-xl border border-[color-mix(in_srgb,rgb(var(--ec-accent))_35%,rgb(var(--ec-page-border)))] bg-[color-mix(in_srgb,rgb(var(--ec-accent))_6%,transparent)]">
            <div className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[color-mix(in_srgb,rgb(var(--ec-accent))_14%,transparent)] text-[rgb(var(--ec-accent))]">
                <Sparkles aria-hidden className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">Quickest: paste one prompt</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
                  Give it to your agent: it connects to this EventCatalog and joins this canvas on its own.
                </p>
              </div>
              <button type="button" onClick={async () => setPromptCopied(await copyText(prompt))} className={primary}>
                {promptCopied ? <Check aria-hidden /> : <Copy aria-hidden />}
                {promptCopied ? 'Copied' : 'Copy prompt'}
              </button>
            </div>
            {/* What's in it, at a glance (the whole of it on a click) */}
            <div className="relative border-t border-[color-mix(in_srgb,rgb(var(--ec-accent))_20%,rgb(var(--ec-page-border)))] bg-[rgb(var(--ec-card-bg)/0.6)]">
              <pre
                className={`whitespace-pre-wrap px-4 py-3 font-mono text-[11px] leading-relaxed text-[rgb(var(--ec-page-text-muted))] ${
                  showPrompt ? 'max-h-56 overflow-y-auto' : 'max-h-[112px] overflow-hidden'
                }`}
              >
                {prompt}
              </pre>
              {!showPrompt && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[rgb(var(--ec-card-bg))] via-[rgb(var(--ec-card-bg)/0.85)] to-transparent" />
              )}
              <button
                type="button"
                onClick={() => setShowPrompt((shown) => !shown)}
                aria-expanded={showPrompt}
                className={`${
                  showPrompt ? 'mx-4 mb-3' : 'absolute bottom-2 left-1/2 -translate-x-1/2'
                } inline-flex items-center gap-1 rounded-full border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] px-2.5 py-1 text-[11px] font-medium text-[rgb(var(--ec-page-text-muted))] shadow-sm hover:text-[rgb(var(--ec-page-text))]`}
              >
                {showPrompt ? 'Show less' : 'Show the whole prompt'}
                <ChevronDown aria-hidden size={12} className={`transition-transform ${showPrompt ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </section>

          <p className="mx-5 mt-5 text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--ec-page-text-muted))]">
            Or set it up yourself
          </p>
          {/* Or add the server to the client they use, a step or two each */}
          <div className="px-5 pb-5 pt-2">
            <div role="tablist" className="flex gap-1 rounded-lg bg-[rgb(var(--ec-content-hover))] p-1">
              {clients.map(({ name, logo }, index) => (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={client === index}
                  onClick={() => setClient(index)}
                  className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium outline-none [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:flex-none ${
                    client === index
                      ? 'bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] shadow-sm'
                      : 'text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]'
                  }`}
                >
                  {logo}
                  {name}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="mt-4">
              {clients[client].body}
            </div>
          </div>

          {/* What pairing looks like: the two ways people work with their agent on a canvas */}
          <div className="grid gap-3 border-t border-[rgb(var(--ec-page-border))] px-5 py-4 sm:grid-cols-2">
            {PAIRING.map(({ title, prompts }) => (
              <div key={title}>
                <h3 className="text-xs font-semibold text-[rgb(var(--ec-page-text))]">{title}</h3>
                <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
                  {prompts.map((text) => (
                    <li key={text}>“{text}”</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
