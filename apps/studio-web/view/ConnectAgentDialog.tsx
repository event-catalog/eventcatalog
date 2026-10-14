/**
 * "Connect your AI agent": how to add this server to an AI client, in a few steps for the common ones, each with
 * what to copy. Tailwind with EventCatalog's theme variables, on Headless UI's Dialog and Tabs.
 */
import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { Check, Code2, Copy, X } from 'lucide-react';
import { ClaudeCodeLogo, ClaudeLogo, CursorLogo, OpenAILogo } from '@eventcatalog/visualiser/studio';
import { copyToClipboard } from './ported/clipboard';
import { track } from './analytics';

type ConnectAgentDialogProps = {
  open: boolean;
  /** This server's MCP endpoint, e.g. https://mcp.eventcatalog.dev/mcp */
  mcpUrl: string;
  onClose: () => void;
};

/** Something to copy, with a button that copies it */
function Snippet({ text, label, client }: { text: string; label: string; client: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative mt-2 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover))]">
      <pre className="overflow-x-auto whitespace-pre p-3 pr-12 font-mono text-xs leading-relaxed text-[rgb(var(--ec-page-text))]">{text}</pre>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        title="Copy"
        onClick={async () => {
          const ok = await copyToClipboard(text);
          if (ok) setCopied(true);
          track('connect_agent_copied', { client, ok });
        }}
        className="absolute right-2 top-2 rounded-md p-1.5 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-card-bg))]! hover:text-[rgb(var(--ec-page-text))]! [&_svg]:h-4 [&_svg]:w-4"
      >
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      </button>
    </div>
  );
}

const Steps = ({ children }: { children: React.ReactNode }) => (
  <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[rgb(var(--ec-page-text))] marker:text-[rgb(var(--ec-page-text-muted))]">
    {children}
  </ol>
);

/** Things to ask, for the two ways of pairing with an agent here: designing something new, and understanding what's there */
const PAIRING = [
  {
    title: 'Design ideas together',
    prompts: ['Sketch an event-driven checkout with me', 'How could we split the orders service?', 'Add retries and a dead letter queue to this'],
  },
  {
    title: 'Understand how it works',
    prompts: ['Show me how orders are placed in this repo', 'Walk me through what happens when a payment fails', 'Which services read the customers table?'],
  },
];

export function ConnectAgentDialog({ open, mcpUrl, onClose }: ConnectAgentDialogProps) {
  const clients = [
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
            <Snippet client="claude" text={mcpUrl} label="the URL" />
          </li>
          <li>In a chat, turn the connector on and start pairing (try one of the prompts below).</li>
        </Steps>
      ),
    },
    {
      name: 'Claude Code',
      logo: <ClaudeCodeLogo />,
      body: (
        <Steps>
          <li>
            Run this in your project:
            <Snippet client="claude-code" text={`claude mcp add --transport http eventcatalog ${mcpUrl}`} label="the command" />
          </li>
          <li>Start pairing, e.g. "Show me how orders are placed in this repo" or "Sketch a design for retries with me".</li>
        </Steps>
      ),
    },
    {
      name: 'ChatGPT',
      logo: <OpenAILogo />,
      body: (
        <Steps>
          <li>
            In ChatGPT, open <strong>Settings → Apps &amp; Connectors</strong>, turn on developer mode and choose <strong>Create</strong>.
          </li>
          <li>
            Name it <strong>EventCatalog</strong>, paste this URL, and choose no authentication:
            <Snippet client="chatgpt" text={mcpUrl} label="the URL" />
          </li>
          <li>In a chat, add the connector and start pairing (try one of the prompts below).</li>
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
            <Snippet client="cursor" text={JSON.stringify({ mcpServers: { eventcatalog: { url: mcpUrl } } }, null, 2)} label="the settings" />
          </li>
          <li>Start pairing with the agent (try one of the prompts below).</li>
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
            <Snippet client="vscode" text={JSON.stringify({ servers: { eventcatalog: { type: 'http', url: mcpUrl } } }, null, 2)} label="the settings" />
          </li>
          <li>In Copilot's agent mode, start pairing (try one of the prompts below).</li>
        </Steps>
      ),
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[80]">
      <DialogBackdrop transition className="fixed inset-0 bg-black/40 transition-opacity duration-150 data-closed:opacity-0" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-xl rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] shadow-2xl transition duration-150 data-closed:scale-[0.98] data-closed:opacity-0"
        >
          <div className="flex items-start gap-3 px-5 pt-5">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold">Connect your AI agent</DialogTitle>
              <p className="mt-1.5 text-sm font-light leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
                Pair with your AI agent on your architecture: sketch ideas together, or have it walk you through how something works.
                It draws on this canvas, and you both change it. Add EventCatalog Studio as an MCP server; no account needed.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="-mr-1 -mt-1 rounded-md p-1.5 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-content-hover))]! hover:text-[rgb(var(--ec-page-text))]!"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>

          <TabGroup
            className="px-5 pb-5 pt-4"
            onChange={(index) => track('connect_agent_tab_viewed', { client: clients[index]?.name.toLowerCase().replace(/\s+/g, '-') })}
          >
            <TabList className="flex gap-1 rounded-lg bg-[rgb(var(--ec-content-hover))] p-1">
              {clients.map(({ name, logo }) => (
                <Tab
                  key={name}
                  className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:flex-none rounded-md px-2 py-1.5 text-xs font-medium text-[rgb(var(--ec-page-text-muted))] outline-none data-hover:text-[rgb(var(--ec-page-text))] data-selected:bg-[rgb(var(--ec-card-bg))] data-selected:text-[rgb(var(--ec-page-text))] data-selected:shadow-sm"
                >
                  {logo}
                  {name}
                </Tab>
              ))}
            </TabList>
            <TabPanels className="mt-4">
              {clients.map(({ name, body }) => (
                <TabPanel key={name}>{body}</TabPanel>
              ))}
            </TabPanels>
          </TabGroup>
          {/* What pairing looks like: the two ways people work with their agent here */}
          <div className="grid gap-3 border-t border-[rgb(var(--ec-page-border))] px-5 py-4 sm:grid-cols-2">
            {PAIRING.map(({ title, prompts }) => (
              <div key={title}>
                <h3 className="text-xs font-semibold text-[rgb(var(--ec-page-text))]">{title}</h3>
                <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
                  {prompts.map((prompt) => (
                    <li key={prompt}>“{prompt}”</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
