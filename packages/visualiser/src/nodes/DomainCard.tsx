import { Handle, Position } from "@xyflow/react";
import {
  Boxes as BoxesIcon,
  Box as BoxIcon,
  Group as GroupIcon,
  Server as ServerIcon,
} from "lucide-react";
import { memo } from "react";
import { buildUrl, navigateTo } from "../utils/url-builder";
import { LINE_CLAMP_STYLE } from "./shared-styles";
import { HIDDEN_HANDLE_STYLE } from "./OwnerIndicator";
import { TruncatedResourceName } from "./TruncatedResourceName";

interface Data {
  mode: "simple" | "full";
  domain: {
    id: string;
    version: string;
    name: string;
    summary?: string;
  };
  systemsCount?: number;
  servicesCount?: number;
  entitiesCount?: number;
  /** The domain is a subdomain of another domain */
  subdomain?: boolean;
}

const CARD_STYLE = {
  background: "var(--ec-domain-node-bg, rgb(var(--ec-card-bg)))",
  boxShadow: "0 2px 12px rgba(234, 179, 8, 0.15)",
} as const;

/**
 * A domain shown as a single card (not expanded into its systems), e.g. another
 * domain on a domain's diagram. Styled like the system node, in the domain
 * colour, with counts of what the domain contains.
 * Left-clicking the card opens the domain's diagram.
 */
export default memo(function DomainCardNode({ data }: any) {
  const {
    domain,
    mode = "simple",
    systemsCount = 0,
    servicesCount = 0,
    entitiesCount = 0,
    subdomain = false,
  } = data as Data;
  const { id, version, name, summary } = domain;

  const stats = [
    { icon: GroupIcon, label: "Systems", count: systemsCount },
    { icon: ServerIcon, label: "Services", count: servicesCount },
    { icon: BoxIcon, label: "Entities", count: entitiesCount },
  ].filter((stat) => stat.count > 0);

  const goToDiagram = () =>
    navigateTo(buildUrl(`/visualiser/domains/${id}/${version}`));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goToDiagram}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") goToDiagram();
      }}
      title={`Open the ${name} diagram`}
      className="relative min-w-48 max-w-60 rounded-xl border-2 border-yellow-400 overflow-visible cursor-pointer"
      style={CARD_STYLE}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={HIDDEN_HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={HIDDEN_HANDLE_STYLE}
      />

      {/* Floating type badge on the top-left border */}
      <div className="absolute -top-2.5 left-2.5 flex items-center gap-1.5 z-10">
        <span className="inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm bg-yellow-500">
          <BoxesIcon className="w-2.5 h-2.5" strokeWidth={2.5} />
          {subdomain ? "Subdomain" : "Domain"}
        </span>
      </div>

      <div className="px-3 pt-3.5 pb-2.5">
        <div className="flex items-baseline gap-1 min-w-0">
          <TruncatedResourceName
            value={name}
            tooltipBorderColor="#eab308"
            className="text-[13px] font-semibold leading-snug text-[rgb(var(--ec-page-text))] truncate"
          >
            {name}
          </TruncatedResourceName>
          {version && (
            <span className="text-[10px] font-normal text-[rgb(var(--ec-page-text-muted))] shrink-0">
              (v{version})
            </span>
          )}
        </div>

        {mode === "full" && summary && (
          <div
            className="mt-1.5 text-[9px] text-[rgb(var(--ec-page-text-muted))] leading-relaxed overflow-hidden"
            style={LINE_CLAMP_STYLE}
            title={summary}
          >
            {summary}
          </div>
        )}

        {stats.length > 0 && (
          <div className="mt-2 flex items-center gap-3 border-t border-[rgb(var(--ec-page-border))] pt-1.5">
            {stats.map(({ icon: Icon, label, count }) => (
              <div
                key={label}
                title={`${count} ${label}`}
                className="flex items-center gap-1 text-[10px] text-[rgb(var(--ec-page-text-muted))]"
              >
                <Icon className="w-3 h-3 text-yellow-500" strokeWidth={2} />
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
