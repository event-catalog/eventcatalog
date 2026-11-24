import { memo } from "react";
import { Wrench } from "lucide-react";
import { Handle, Node, Position } from "@xyflow/react";
import { useNodeHasConnections } from "../utils/node-connections";
import { EventCatalogResource } from "../types";
import { HIDDEN_HANDLE_STYLE } from "./OwnerIndicator";
import { LINE_CLAMP_STYLE, useDarkMode, HANDLE_GLOW } from "./shared-styles";
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
      <span className="inline-flex items-center gap-1 text-[7px] font-bold px-1.5 py-0.5 rounded bg-[#6e56cf]/10 text-[#6550b9] dark:text-[#c2b5f5] border border-[#6e56cf]/25">
        <span
          className="w-2 h-2 shrink-0 [&>svg]:w-2 [&>svg]:h-2"
          dangerouslySetInnerHTML={{ __html: isDark ? mcpDark : mcpLight }}
        />
        MCP
      </span>
    );
  }

  return (
    <span className="inline-flex items-center text-[7px] font-bold px-1.5 py-0.5 rounded bg-[#6e56cf]/10 text-[#6550b9] dark:text-[#c2b5f5] border border-[#6e56cf]/25">
      {label}
    </span>
  );
}

function GlowHandle({ side }: { side: "left" | "right" }) {
  return (
    <div
      className="ec-handle-glow"
      style={{
        position: "absolute",
        top: "50%",
        [side]: -6,
        transform: "translateY(-50%)",
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #6e56cf, #6550b9)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        ...HANDLE_GLOW.dataProduct,
        pointerEvents: "none",
      }}
    />
  );
}

function AgentTool(props: AgentToolNode) {
  const { name, type, icon, url, description } = props.data.agentTool;
  const customIcon = isIconPath(icon) ? icon : undefined;
  const connected = useNodeHasConnections();

  return (
    <div
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2 overflow-visible border-[#6e56cf]",
        props?.selected ? "ring-2 ring-[#aa99ec]/60 ring-offset-2" : "",
      )}
      style={{
        background: "var(--ec-agent-tool-node-bg, rgb(var(--ec-card-bg)))",
        boxShadow: "0 2px 12px rgba(110, 86, 207, 0.15)",
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
      {connected.target && <GlowHandle side="left" />}
      {connected.source && <GlowHandle side="right" />}

      <div className="absolute -top-2.5 left-2.5 flex items-center gap-1.5 z-10">
        <span className="inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm bg-[#6e56cf]">
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
            tooltipBorderColor="#6e56cf"
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
            <span className="inline-flex items-center text-[7px] font-bold px-1.5 py-0.5 rounded bg-[rgb(var(--ec-page-bg))] text-[rgb(var(--ec-page-text-muted))] border border-[#6e56cf]/25 max-w-[9rem] truncate">
              {url}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(AgentTool);
