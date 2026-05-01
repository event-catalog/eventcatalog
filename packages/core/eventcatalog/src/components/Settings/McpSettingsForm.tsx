import { ExternalLink, Server, ServerCog } from 'lucide-react';
import { Row } from './Row';
import { LiveCard, MCP_DOCS_URL, UpgradeRequired, UrlPanel } from './SettingsShared';

interface Props {
  hasScalePlan: boolean;
  inSSR: boolean;
  mcpUrl: string;
}

export const McpSettingsForm = ({ hasScalePlan, inSSR, mcpUrl }: Props) => {
  const mcpAvailable = hasScalePlan && inSSR;

  return (
    <div className="divide-y divide-[rgb(var(--ec-page-border))]">
      <Row
        title="MCP Server"
        description="Expose your catalog over the Model Context Protocol so AI agents (Claude Desktop, Cursor, etc.) can query your architecture as a live data source."
        canEdit={false}
        dirty={false}
      >
        {mcpAvailable ? (
          <McpAvailable url={mcpUrl} />
        ) : !hasScalePlan ? (
          <UpgradeRequired
            tier="Scale"
            blurb="The MCP Server is a Scale-plan feature. Upgrade to expose your catalog to AI agents over the Model Context Protocol."
            docsUrl={MCP_DOCS_URL}
          />
        ) : (
          <McpNeedsSSR />
        )}
      </Row>
    </div>
  );
};

const McpAvailable = ({ url }: { url: string }) => (
  <div className="space-y-3">
    <LiveCard
      icon={<Server className="h-4 w-4" aria-hidden />}
      title="MCP server is live"
      description="Point Claude Desktop, Cursor, or any MCP-aware client at the endpoint below."
    />
    <div className="rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg)/0.4)] px-4 py-3">
      <p className="text-[12px] font-medium text-[rgb(var(--ec-page-text))]">Endpoint</p>
      <UrlPanel url={url} />
      <a
        href={MCP_DOCS_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[rgb(var(--ec-accent))] hover:underline"
      >
        Connect a client
        <ExternalLink className="h-3 w-3" aria-hidden />
      </a>
    </div>
  </div>
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
          Your catalog needs to run as a live server before AI agents can connect to it.
        </p>
        <p className="mt-1 text-[12px] leading-snug text-[rgb(var(--ec-page-text-muted))]">
          Switch your catalog to server mode and you’re good to go — the setup guide walks through it.
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
