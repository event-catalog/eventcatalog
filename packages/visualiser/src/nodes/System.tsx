import { Handle, Position } from "@xyflow/react";
import {
  Group as GroupIcon,
  Server as ServerIcon,
  Box as BoxIcon,
  Database as DatabaseIcon,
} from "lucide-react";
import { buildUrl } from "../utils/url-builder";
import { memo } from "react";
import { LINE_CLAMP_STYLE } from "./shared-styles";
import { HIDDEN_HANDLE_STYLE } from "./OwnerIndicator";
import { TruncatedResourceName } from "./TruncatedResourceName";

interface SystemData {
  id: string;
  version: string;
  name: string;
  summary?: string;
}

interface Data {
  mode: "simple" | "full";
  system: SystemData;
  servicesCount?: number;
  entitiesCount?: number;
  containersCount?: number;
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

/**
 * A system rendered on the System Context Diagram.
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
  } = data as Data;
  const { id, version, name, summary } = system;

  const stats = [
    { icon: ServerIcon, label: "Services", count: servicesCount },
    { icon: BoxIcon, label: "Entities", count: entitiesCount },
    { icon: DatabaseIcon, label: "Data Stores", count: containersCount },
  ].filter((stat) => stat.count > 0);

  const goToMap = () => {
    window.location.href = buildUrl(`/visualiser/systems/${id}/${version}`);
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
      className="relative min-w-48 max-w-60 rounded-xl border-2 border-violet-500 overflow-visible cursor-pointer bg-[var(--ec-system-node-bg,rgb(var(--ec-card-bg)))]"
      style={{ boxShadow: "0 2px 12px rgba(139, 92, 246, 0.15)" }}
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
          System
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
