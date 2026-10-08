import { useEffect, useState } from 'react';
import { Bot, Check, ChevronDown, Copy, X } from 'lucide-react';
import type { WebMcpStatus } from '../hooks/use-canvas-webmcp';
import { STATUS } from './status';

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
- Ask me here, in our conversation, what we are designing, then work on the canvas as we talk: add catalog resources (find them with getResources / search_catalog), add new components for things that don't exist yet, and connect them. Leave out positions so new nodes go next to what they connect to; only re-lay the whole canvas (layoutCanvas / layout_canvas) when I ask.
- Talk to me here, not in canvas comments. Only comment on the canvas when I ask you to (e.g. to review it), and reply to comments people leave for you.
- Pass agentName with your name on MCP tools, so people on the canvas can see who you are.`;

function CopyButton({ text, label = 'Copy', large = false }: { text: string; label?: string; large?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium bg-[rgb(var(--ec-button-bg))] text-[rgb(var(--ec-button-text))] hover:bg-[rgb(var(--ec-button-bg-hover))] ${
        large ? 'w-full px-4 py-2.5 text-sm' : 'px-2.5 py-1.5 text-xs'
      }`}
    >
      {copied ? <Check size={large ? 16 : 14} /> : <Copy size={large ? 16 : 14} />}
      {copied ? 'Copied' : label}
    </button>
  );
}

/** Something to copy (an address or a command), with its copy button */
function CopyField({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md border px-2 py-1.5 text-xs bg-[rgb(var(--ec-input-bg))] border-[rgb(var(--ec-input-border))]">
        {value}
      </code>
      <CopyButton text={value} />
    </div>
  );
}

/** Turns something on for this tab, or says it's on */
function TabSwitch({ on, onTurnOn, label }: { on: boolean; onTurnOn: () => void; label: string }) {
  return on ? (
    <p className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium ${STATUS.success.text}`}>
      <span className={`h-2 w-2 rounded-full ${STATUS.success.dot}`} />
      On for this tab
    </p>
  ) : (
    <button
      onClick={onTurnOn}
      className="shrink-0 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium border-[rgb(var(--ec-page-border))] hover:bg-[rgb(var(--ec-page-border)/0.4)]"
    >
      {label}
    </button>
  );
}

type Way = 'chat' | 'code' | 'browser';
const WAYS: { id: Way; label: string; hint: string }[] = [
  { id: 'chat', label: 'Chat app', hint: 'Claude, ChatGPT' },
  { id: 'code', label: 'Coding agent', hint: 'Claude Code, Cursor, Codex' },
  { id: 'browser', label: 'This browser', hint: 'WebMCP' },
];

/**
 * Bringing an AI agent onto the canvas: copy the prompt and give it to the agent (it works out how to connect).
 * The prompt is there to read, and how each kind of agent connects is one step each, for setting it up by hand.
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
  const [relayOn, setRelayOn] = useState(isRelayEnabled);
  const [showPrompt, setShowPrompt] = useState(false);
  const [way, setWay] = useState<Way>('chat');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const turnOnRelay = () => {
    if (!relayScriptPath) return;
    enableRelay(relayScriptPath);
    setRelayOn(true);
    // The relay hands this tab's WebMCP tools to desktop agents
    onEnableWebMcp();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Connect your agent"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full max-w-md flex-col rounded-xl border shadow-2xl bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]"
      >
        <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-accent))]">
              <Bot size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold">Bring in an AI agent</h2>
              <p className="text-xs text-[rgb(var(--ec-page-text-muted))]">It joins this canvas and designs with you, live.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-[rgb(var(--ec-icon-color))] hover:bg-[rgb(var(--ec-page-border)/0.5)]"
          >
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 space-y-5 overflow-y-auto px-5 pb-5">
          {/* The one thing most people need: the prompt */}
          <section className="space-y-2">
            <CopyButton text={prompt} label="Copy prompt" large />
            <p className="text-center text-xs text-[rgb(var(--ec-page-text-muted))]">
              Paste it into your agent. It works out how to connect.{' '}
              <button
                onClick={() => setShowPrompt((shown) => !shown)}
                aria-expanded={showPrompt}
                className="inline-flex items-center gap-0.5 font-medium text-[rgb(var(--ec-accent))] hover:underline"
              >
                {showPrompt ? 'Hide prompt' : 'Show prompt'}
                <ChevronDown size={12} className={`transition-transform ${showPrompt ? 'rotate-180' : ''}`} />
              </button>
            </p>
            {showPrompt && (
              <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border p-3 font-mono text-[11px] leading-relaxed bg-[rgb(var(--ec-page-bg))] border-[rgb(var(--ec-page-border))]">
                {prompt}
              </pre>
            )}
          </section>

          {/* Or set it up by hand, for the kind of agent you use */}
          <section className="space-y-3 border-t pt-4 border-[rgb(var(--ec-page-border))]">
            <h3 className="text-xs font-semibold">Or connect it yourself</h3>
            <div role="tablist" className="grid grid-cols-3 gap-1 rounded-lg p-1 bg-[rgb(var(--ec-page-border)/0.5)]">
              {WAYS.map(({ id, label, hint }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={way === id}
                  onClick={() => setWay(id)}
                  className={`rounded-md px-2 py-1.5 text-center ${
                    way === id ? 'bg-[rgb(var(--ec-card-bg))] shadow-sm' : 'text-[rgb(var(--ec-page-text-muted))]'
                  }`}
                >
                  <span className="block text-xs font-medium">{label}</span>
                  <span className="block truncate text-[10px] text-[rgb(var(--ec-page-text-muted))]">{hint}</span>
                </button>
              ))}
            </div>

            {way === 'chat' && (
              <div className="space-y-2">
                <p className="text-xs text-[rgb(var(--ec-page-text-muted))]">
                  Add this MCP server to your chat app. Chats that show MCP Apps open the canvas right in the chat.
                </p>
                <CopyField value={link.mcpUrl} />
              </div>
            )}
            {way === 'code' && (
              <div className="space-y-2">
                <p className="text-xs text-[rgb(var(--ec-page-text-muted))]">
                  Add EventCatalog's MCP server, e.g. in Claude Code:
                </p>
                <CopyField value={`claude mcp add --transport http eventcatalog ${link.mcpUrl}`} />
                {relayScriptPath && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-[rgb(var(--ec-page-text-muted))]">
                      Can't reach this server? Use this tab through the local relay: add <code>{RELAY_COMMAND}</code> as an MCP
                      server.
                    </p>
                    <TabSwitch on={relayOn} onTurnOn={turnOnRelay} label="Turn on relay" />
                  </div>
                )}
              </div>
            )}
            {way === 'browser' && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[rgb(var(--ec-page-text-muted))]">
                  {webMcp.state === 'on'
                    ? `This tab offers ${webMcp.tools} canvas tools to agents in your browser (like the MCP-B extension).`
                    : 'Let agents in your browser (like the MCP-B extension) use this canvas through WebMCP.'}
                </p>
                <TabSwitch on={webMcp.state === 'on'} onTurnOn={onEnableWebMcp} label="Turn on" />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
