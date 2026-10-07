import { useEffect, useState, type ReactNode } from 'react';
import { Bot, Check, Copy, X } from 'lucide-react';
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
- Read the canvas first (getCanvas / get_canvas) and tell me who else is on it.
- Ask me what we are designing, then work on the canvas as we talk: add catalog resources (find them with getResources / search_catalog), add new components for things that don't exist yet, and connect them. Leave out positions so new nodes go next to what they connect to; only re-lay the whole canvas (layoutCanvas / layout_canvas) when I ask.
- Leave questions and suggestions as comments on the canvas, and reply to comments people leave for you.
- Pass agentName with your name on MCP tools, so people on the canvas can see who you are.`;

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium bg-[rgb(var(--ec-button-bg))] text-[rgb(var(--ec-button-text))]"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function Detail({ title, value, children }: { title: string; value?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold">{title}</h3>
      <p className="text-xs text-[rgb(var(--ec-page-text-muted))]">{children}</p>
      {value && (
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md border px-2 py-1.5 text-xs bg-[rgb(var(--ec-input-bg))] border-[rgb(var(--ec-input-border))]">
            {value}
          </code>
          <CopyButton text={value} />
        </div>
      )}
    </div>
  );
}

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Connect your agent"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full max-w-2xl flex-col rounded-xl border shadow-2xl bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]"
      >
        <div className="flex items-start justify-between gap-4 border-b p-5 border-[rgb(var(--ec-page-border))]">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Bot size={18} />
              Connect your agent
            </h2>
            <p className="text-sm text-[rgb(var(--ec-page-text-muted))]">
              Give this prompt to your agent (Claude, ChatGPT, Codex, Cursor...). It joins this canvas and works on it with you,
              live, using whatever it can connect with.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-[rgb(var(--ec-icon-color))] hover:bg-[rgb(var(--ec-page-border)/0.5)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 space-y-5 overflow-y-auto p-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--ec-page-text-muted))]">Prompt</h3>
              <CopyButton text={prompt} label="Copy prompt" />
            </div>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border p-3 font-mono text-xs leading-relaxed bg-[rgb(var(--ec-page-bg))] border-[rgb(var(--ec-page-border))]">
              {prompt}
            </pre>
          </div>

          <div className="space-y-4 border-t pt-4 border-[rgb(var(--ec-page-border))]">
            <Detail title="MCP server" value={link.mcpUrl}>
              For agents that can add an MCP server. Chats that show MCP Apps (ChatGPT, Claude) can open the canvas right in the
              chat. Agents running in the cloud need this EventCatalog on a public URL.
            </Detail>
            <Detail title="WebMCP (this tab)">
              {webMcp.state === 'on'
                ? `On: this tab offers ${webMcp.tools} canvas tools to agents in your browser (${webMcp.source === 'native' ? "your browser's WebMCP" : 'WebMCP polyfill, e.g. for the MCP-B extension'}).`
                : 'Off: this tab is not offering tools to agents in your browser (e.g. through the MCP-B extension).'}{' '}
              {webMcp.state === 'off' && (
                <button onClick={onEnableWebMcp} className="font-medium text-[rgb(var(--ec-accent))] hover:underline">
                  Turn on for this tab
                </button>
              )}
            </Detail>
            {relayScriptPath && (
              <Detail title="WebMCP local relay" value={RELAY_COMMAND}>
                For agents on your computer (Claude Code, Cursor...): add this as an MCP server, and turn the relay on for this
                tab. They get the tools of this tab while it stays open.{' '}
                {relayOn ? (
                  <span className={`font-medium ${STATUS.success.text}`}>The relay is on for this tab.</span>
                ) : (
                  <button
                    onClick={() => {
                      enableRelay(relayScriptPath);
                      setRelayOn(true);
                      // The relay hands this tab's WebMCP tools to desktop agents
                      onEnableWebMcp();
                    }}
                    className="font-medium text-[rgb(var(--ec-accent))] hover:underline"
                  >
                    Turn on for this tab
                  </button>
                )}
              </Detail>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
