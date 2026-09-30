import { ArrowUpRight, Boxes, ExternalLink, Library, ServerCog } from 'lucide-react';
import { Row } from './Row';
import { MCP_DOCS_URL, UrlPanel } from './SettingsShared';

export type DomainMcpServer = {
  id: string;
  name: string;
  summary?: string;
  /** Services and messages the domain's MCP server serves (including its subdomains and systems) */
  services: number;
  messages: number;
  docsUrl: string;
  url: string;
};

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

// What the domain's MCP server covers, e.g. "5 services · 12 messages"
const getScope = (server: DomainMcpServer) => `${plural(server.services, 'service')} · ${plural(server.messages, 'message')}`;

interface Props {
  inSSR: boolean;
  mcpUrl: string;
  domainServers: DomainMcpServer[];
}

export const McpSettingsForm = ({ inSSR, mcpUrl, domainServers }: Props) => {
  return (
    <div className="divide-y divide-[rgb(var(--ec-page-border))]">
      <Row
        title="Catalog MCP Server"
        description="Connect AI agents (Claude, Cursor, VS Code and any MCP client) to every resource in your catalog: domains, services, messages, flows, schemas and the teams that own them."
        canEdit={false}
        dirty={false}
      >
        {inSSR ? <CatalogServer url={mcpUrl} /> : <McpNeedsSSR />}
      </Row>

      {inSSR && domainServers.length > 0 && (
        <Row
          title="Domain MCP Servers"
          description="Each domain has its own MCP server, scoped to the domain and the services, messages and flows in it. Connect a team's agent to just the part of the architecture it works on."
          canEdit={false}
          dirty={false}
        >
          <DomainServers servers={domainServers} />
        </Row>
      )}
    </div>
  );
};

const LivePill = () => (
  <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[rgb(var(--ec-badge-color-green-text)/0.3)] bg-[rgb(var(--ec-badge-color-green-background))] px-2 py-0.5 text-[11px] font-semibold text-[rgb(var(--ec-badge-color-green-text))]">
    <span className="relative flex h-1.5 w-1.5" aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
    </span>
    Live
  </span>
);

const CatalogServer = ({ url }: { url: string }) => (
  <div className="overflow-hidden rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))]">
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[rgb(var(--ec-accent)/0.3)] bg-[rgb(var(--ec-accent-subtle))] text-[rgb(var(--ec-accent))]">
        <Library className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-[rgb(var(--ec-page-text))]">Your whole catalog</p>
          <LivePill />
        </div>
        <p className="mt-0.5 text-[12px] leading-snug text-[rgb(var(--ec-page-text-muted))]">
          Every domain, service, message, flow and schema, served to your AI agents from one URL.
        </p>
      </div>
    </div>
    <div className="border-t border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg)/0.4)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--ec-page-text-muted))]">Server URL</p>
      <UrlPanel url={url} />
      <a
        href={MCP_DOCS_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[rgb(var(--ec-accent))] hover:underline"
      >
        How to connect a client
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </a>
    </div>
  </div>
);

const DomainServers = ({ servers }: { servers: DomainMcpServer[] }) => (
  <ul className="divide-y divide-[rgb(var(--ec-page-border))] overflow-hidden rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))]">
    {servers.map((server) => (
      <li key={server.id} className="px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <a
            href={server.docsUrl}
            title={server.summary}
            className="inline-flex min-w-0 items-center gap-2 text-[13px] font-medium text-[rgb(var(--ec-page-text))] hover:text-[rgb(var(--ec-accent))]"
          >
            <Boxes className="h-3.5 w-3.5 flex-shrink-0 self-center text-[rgb(var(--ec-icon-color))]" aria-hidden />
            <span className="truncate">{server.name}</span>
          </a>
          <span className="flex-shrink-0 text-[11px] text-[rgb(var(--ec-page-text-muted))]">{getScope(server)}</span>
        </div>
        <UrlPanel url={server.url} />
      </li>
    ))}
  </ul>
);

const McpNeedsSSR = () => (
  <div className="overflow-hidden rounded-lg border border-[rgb(var(--ec-accent)/0.4)] bg-gradient-to-br from-[rgb(var(--ec-accent)/0.1)] via-[rgb(var(--ec-accent)/0.05)] to-transparent">
    <div className="flex items-start gap-3 px-4 py-3.5">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-[rgb(var(--ec-accent)/0.4)] bg-[rgb(var(--ec-accent)/0.1)] text-[rgb(var(--ec-accent))]">
        <ServerCog className="h-4 w-4" aria-hidden />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-[rgb(var(--ec-page-text))]">Server output mode required</p>
          <span className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--ec-accent)/0.4)] bg-[rgb(var(--ec-accent)/0.1)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--ec-accent))]">
            SSR
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-snug text-[rgb(var(--ec-page-text-muted))]">
          The MCP Server requires your catalog to run in server (SSR) mode. Follow the setup guide to switch.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a
            href={MCP_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-[rgb(var(--ec-accent))] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[rgb(var(--ec-accent-hover))]"
          >
            MCP setup guide
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  </div>
);
