import { Handle, Position } from "@xyflow/react";
import {
  Group as GroupIcon,
  Server as ServerIcon,
  Box as BoxIcon,
  Database as DatabaseIcon,
  MessageSquare as MessageSquareIcon,
} from "lucide-react";
import { buildUrl, navigateTo } from "../utils/url-builder";
import { memo } from "react";
import { LINE_CLAMP_STYLE, useDarkMode } from "./shared-styles";
import { HIDDEN_HANDLE_STYLE } from "./OwnerIndicator";
import { TruncatedResourceName } from "./TruncatedResourceName";

interface SystemData {
  id: string;
  version: string;
  name: string;
  summary?: string;
  // "external" marks a third-party/SaaS system (e.g. Resend, Stripe). Such
  // systems are shaded in the graph. Defaults to internal when absent.
  scope?: "internal" | "external";
}

interface Data {
  mode: "simple" | "full";
  system: SystemData;
  servicesCount?: number;
  entitiesCount?: number;
  containersCount?: number;
  // Total messages handled by the system's services (sends + receives).
  messagesCount?: number;
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

/**
 * A system rendered on the System Diagram.
 *
 * Styled to match the other resource nodes (e.g. the service node): a rounded,
 * bordered card with a floating type badge + icon on the top-left border.
 * Left-clicking the node navigates to the system's architecture map.
 * Right-click (handled by the NodeGraph context-menu wrapper) offers docs / map / context.
 */
export default memo(function SystemNode({ data }: any) {
  const {
    system,
    mode = "simple",
    servicesCount = 0,
    entitiesCount = 0,
    containersCount = 0,
    messagesCount = 0,
  } = data as Data;
  const { id, version, name, summary, scope } = system;
  const isExternal = scope === "external";
  const isDark = useDarkMode();

  const stats = [
    { icon: ServerIcon, label: "Services", count: servicesCount },
    { icon: MessageSquareIcon, label: "Messages", count: messagesCount },
    { icon: BoxIcon, label: "Entities", count: entitiesCount },
    { icon: DatabaseIcon, label: "Data Stores", count: containersCount },
  ].filter((stat) => stat.count > 0);

  // External systems get a subtle gray fill so they read as outside the org,
  // without the busier striped treatment.
  const cardBackground = isExternal
    ? isDark
      ? "rgba(148,163,184,0.12)"
      : "rgba(148,163,184,0.1)"
    : "var(--ec-system-node-bg, rgb(var(--ec-card-bg)))";

  const goToMap = () => {
    // Soft, animated navigation via the host's view-transition router when
    // available (falls back to a hard nav). Both the System Diagram and
    // the target system Map share a `transition:name="visualiser-graph"` portal,
    // so this reads as drilling one level deeper into the system.
    navigateTo(buildUrl(`/visualiser/systems/${id}/${version}`));
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goToMap}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") goToMap();
      }}
      title={`Open the ${name} map`}
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2 overflow-visible cursor-pointer",
        isExternal ? "border-dashed border-violet-400" : "border-violet-500",
      )}
      style={{
        background: cardBackground,
        boxShadow: "0 2px 12px rgba(139, 92, 246, 0.15)",
      }}
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
        <span className="inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm bg-violet-500">
          <GroupIcon className="w-2.5 h-2.5" strokeWidth={2.5} />
          {isExternal ? "External System" : "System"}
        </span>
      </div>

      <div className="px-3 pt-3.5 pb-2.5">
        <div className="flex items-baseline gap-1 min-w-0">
          <TruncatedResourceName
            value={name}
            tooltipBorderColor="#8b5cf6"
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
            className={classNames(
              "mt-1.5 text-[9px] text-[rgb(var(--ec-page-text-muted))] leading-relaxed overflow-hidden",
            )}
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
                <Icon className="w-3 h-3 text-violet-500" strokeWidth={2} />
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
