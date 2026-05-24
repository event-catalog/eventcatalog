import { memo, useMemo } from "react";
import { Bot } from "lucide-react";
import { Node, Handle, Position, useNodeConnections } from "@xyflow/react";
import { EventCatalogResource } from "../types";
import { NotesIndicator } from "./NotesIndicator";
import {
  OwnerIndicator,
  normalizeOwners,
  HIDDEN_HANDLE_STYLE,
} from "./OwnerIndicator";
import { LINE_CLAMP_STYLE, useDarkMode } from "./shared-styles";
import { CustomIcon, isIconPath, resolveIconUrl } from "../utils/custom-icon";
import { TruncatedResourceName } from "./TruncatedResourceName";

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
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
        background: "linear-gradient(135deg, #0ea5e9, #0369a1)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        animation: "ec-dp-handle-pulse 2s ease-in-out infinite",
        pointerEvents: "none",
      }}
    />
  );
}

const getProviderIconSrc = (provider: string | undefined, isDark: boolean) => {
  if (!provider) return null;
  const providerIconName = provider
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const iconPath =
    providerIconName === "openai" || providerIconName === "anthropic"
      ? `/icons/agent/${providerIconName}-${isDark ? "dark" : "light"}.svg`
      : `/icons/agent/${providerIconName}.svg`;

  return resolveIconUrl(iconPath);
};

type AgentNodeData = EventCatalogResource & {
  agent: {
    id: string;
    version: string;
    name: string;
    summary?: string;
    owners?: any[];
    deprecated?: boolean;
    draft?: boolean;
    notes?: import("../types").Note[];
    model?: {
      provider?: string;
      name?: string;
      version?: string;
    };
    styles?: {
      icon?: string;
      node?: { color?: string; label?: string };
    };
  };
};

export type AgentNode = Node<AgentNodeData, "agent">;

function Agent(props: AgentNode) {
  const {
    version,
    name,
    summary,
    deprecated,
    draft,
    notes,
    owners,
    model,
    styles,
  } = props.data.agent;
  const mode = props.data.mode || "simple";
  const customIcon = isIconPath(styles?.icon) ? styles!.icon! : undefined;
  const normalizedOwners = useMemo(() => normalizeOwners(owners), [owners]);
  const targetConnections = useNodeConnections({ handleType: "target" });
  const sourceConnections = useNodeConnections({ handleType: "source" });
  const isDark = useDarkMode();
  const deprecatedStripe = isDark
    ? "rgba(239,68,68,0.25)"
    : "rgba(239,68,68,0.1)";
  const draftStripe = isDark
    ? "rgba(14,165,233,0.25)"
    : "rgba(14,165,233,0.15)";
  const providerLabel = model?.provider;
  const providerIconSrc = getProviderIconSrc(providerLabel, isDark);
  const modelLabel = model?.name;

  return (
    <div
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2 overflow-visible",
        props?.selected ? "ring-2 ring-sky-400/60 ring-offset-2" : "",
        deprecated
          ? "border-dashed border-red-500"
          : draft
            ? "border-dashed border-sky-400"
            : "border-sky-500",
      )}
      style={{
        background: deprecated
          ? `repeating-linear-gradient(135deg, transparent, transparent 6px, ${deprecatedStripe} 6px, ${deprecatedStripe} 7px), var(--ec-agent-node-bg, rgb(var(--ec-card-bg)))`
          : draft
            ? `repeating-linear-gradient(135deg, transparent, transparent 4px, ${draftStripe} 4px, ${draftStripe} 4.5px), var(--ec-agent-node-bg, rgb(var(--ec-card-bg)))`
            : "var(--ec-agent-node-bg, rgb(var(--ec-card-bg)))",
        boxShadow: "0 2px 12px rgba(14, 165, 233, 0.15)",
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
      {notes && notes.length > 0 && (
        <NotesIndicator notes={notes} resourceName={name} />
      )}
      {targetConnections.length > 0 && <GlowHandle side="left" />}
      {sourceConnections.length > 0 && <GlowHandle side="right" />}

      <div className="absolute -top-2.5 left-2.5 flex items-center gap-1.5 z-10">
        <span
          className={classNames(
            "inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm",
            deprecated ? "bg-red-500" : "bg-sky-500",
          )}
        >
          <Bot className="w-2.5 h-2.5" strokeWidth={2.5} />
          Agent
          {draft && " (Draft)"}
          {deprecated && " (Deprecated)"}
        </span>
      </div>

      <div className="px-3 pt-3.5 pb-2.5">
        <div className="flex items-center gap-2">
          {customIcon && (
            <CustomIcon
              src={customIcon}
              alt={name}
              className={
                mode === "full"
                  ? "w-[26px] h-[26px] shrink-0"
                  : "w-4 h-4 shrink-0 -my-1"
              }
            />
          )}
          <div className="flex items-baseline gap-1 min-w-0">
            <TruncatedResourceName
              value={name}
              tooltipBorderColor="#0ea5e9"
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

        {(providerLabel || modelLabel) && (
          <div className="flex items-center gap-1 flex-wrap mt-1.5">
            {providerLabel && (
              <span className="inline-flex items-center text-[7px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 uppercase tracking-wide">
                {providerIconSrc && (
                  <img
                    src={providerIconSrc}
                    alt=""
                    className="w-2 h-2 shrink-0 mr-1 object-contain"
                    loading="lazy"
                  />
                )}
                {providerLabel}
              </span>
            )}
            {modelLabel && (
              <span className="inline-flex items-center text-[7px] font-bold px-1.5 py-0.5 rounded bg-[rgb(var(--ec-page-bg))] text-[rgb(var(--ec-page-text-muted))] border border-sky-500/30 max-w-[8.5rem] truncate">
                {modelLabel}
              </span>
            )}
          </div>
        )}

        <OwnerIndicator
          owners={normalizedOwners}
          accentColor="bg-sky-400"
          borderColor="rgba(14,165,233,0.08)"
          iconClass="text-sky-300"
        />
      </div>
    </div>
  );
}

export default memo(Agent);
