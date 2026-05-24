import { memo } from "react";
import { Wrench } from "lucide-react";
import { Handle, Node, Position, useNodeConnections } from "@xyflow/react";
import { EventCatalogResource } from "../types";
import { HIDDEN_HANDLE_STYLE } from "./OwnerIndicator";
import { LINE_CLAMP_STYLE, useDarkMode } from "./shared-styles";
import { TruncatedResourceName } from "./TruncatedResourceName";
import { CustomIcon, isIconPath } from "../utils/custom-icon";
import mcpDark from "../icons/protocols/mcp-dark.svg?raw";
import mcpLight from "../icons/protocols/mcp-light.svg?raw";

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type AgentToolData = EventCatalogResource & {
  agentTool: {
    id?: string;
    name: string;
    type: string;
    icon?: string;
    url?: string;
    description?: string;
  };
};

export type AgentToolNode = Node<AgentToolData, "agentTool">;

const normalizeType = (type?: string) => (type || "").trim().toLowerCase();

function ToolTypeBadge({ type }: { type: string }) {
  const isDark = useDarkMode();
  const normalizedType = normalizeType(type);
  const label = type.toUpperCase();

  if (normalizedType === "mcp") {
    return (
      <span className="inline-flex items-center gap-1 text-[7px] font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/25">
        <span
          className="w-2 h-2 shrink-0 [&>svg]:w-2 [&>svg]:h-2"
          dangerouslySetInnerHTML={{ __html: isDark ? mcpDark : mcpLight }}
        />
        MCP
      </span>
    );
  }

  return (
    <span className="inline-flex items-center text-[7px] font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/25">
      {label}
    </span>
  );
}

function GlowHandle({ side }: { side: "left" | "right" }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        [side]: -6,
        transform: "translateY(-50%)",
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        animation: "ec-dp-handle-pulse 2s ease-in-out infinite",
        pointerEvents: "none",
      }}
    />
  );
}

function AgentTool(props: AgentToolNode) {
  const { name, type, icon, url, description } = props.data.agentTool;
  const customIcon = isIconPath(icon) ? icon : undefined;
  const targetConnections = useNodeConnections({ handleType: "target" });
  const sourceConnections = useNodeConnections({ handleType: "source" });

  return (
    <div
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2 overflow-visible border-violet-500",
        props?.selected ? "ring-2 ring-violet-400/60 ring-offset-2" : "",
      )}
      style={{
        background: "var(--ec-agent-tool-node-bg, rgb(var(--ec-card-bg)))",
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
      {targetConnections.length > 0 && <GlowHandle side="left" />}
      {sourceConnections.length > 0 && <GlowHandle side="right" />}

      <div className="absolute -top-2.5 left-2.5 flex items-center gap-1.5 z-10">
        <span className="inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm bg-violet-500">
          <Wrench className="w-2.5 h-2.5" strokeWidth={2.5} />
          Tool
        </span>
      </div>

      <div className="px-3 pt-3.5 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {customIcon && (
            <CustomIcon
              src={customIcon}
              alt={name}
              className="w-4 h-4 shrink-0"
            />
          )}
          <TruncatedResourceName
            value={name}
            tooltipBorderColor="#8b5cf6"
            className="text-[13px] font-semibold leading-snug text-[rgb(var(--ec-page-text))] truncate"
          >
            {name}
          </TruncatedResourceName>
        </div>

        {description && (
          <div
            className="mt-1.5 text-[9px] text-[rgb(var(--ec-page-text-muted))] leading-relaxed overflow-hidden"
            style={LINE_CLAMP_STYLE}
            title={description}
          >
            {description}
          </div>
        )}

        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
          <ToolTypeBadge type={type} />
          {url && (
            <span className="inline-flex items-center text-[7px] font-bold px-1.5 py-0.5 rounded bg-[rgb(var(--ec-page-bg))] text-[rgb(var(--ec-page-text-muted))] border border-violet-500/25 max-w-[9rem] truncate">
              {url}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(AgentTool);
