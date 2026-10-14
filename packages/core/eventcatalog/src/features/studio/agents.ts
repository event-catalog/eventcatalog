/**
 * Who an agent is, named after its client when it doesn't say, in its brand's colour: on the server (MCP tools) and
 * in a chat's canvas view (which joins as the chat's agent). Their logos are in the visualiser's ClientLogos.
 */
export type AgentIdentity = { name: string; color: string };

const AGENT_COLORS: Record<string, string> = {
  ChatGPT: '#10a37f',
  Codex: '#10a37f',
  Claude: '#d97757',
  'Claude Code': '#d97757',
  Cursor: '#111827',
};

/** Agents' clients, by what's in their user agent or host name (most specific first) */
const CLIENTS: [RegExp, string][] = [
  [/claude[-_ ]?code/i, 'Claude Code'],
  [/claude|anthropic/i, 'Claude'],
  [/codex/i, 'Codex'],
  [/openai|chatgpt/i, 'ChatGPT'],
  [/cursor/i, 'Cursor'],
];

/** Who the agent is, from the name it gives, else its client's user agent (or a chat's host name) */
export const getAgent = (agentName: string | undefined, client = ''): AgentIdentity => {
  const name = agentName?.trim() || CLIENTS.find(([pattern]) => pattern.test(client))?.[1] || 'AI agent';
  return { name, color: AGENT_COLORS[name] ?? '#8b5cf6' };
};
