import { ArrowRightLeft, Link } from "lucide-react";
import {
  OwnerIndicator,
  normalizeOwners,
  HIDDEN_HANDLE_STYLE,
} from "../OwnerIndicator";
import { Node, Handle, Position, useHandleConnections } from "@xyflow/react";
import { getIconForProtocol } from "../../utils/protocols";
import { EventCatalogResource, Channel as ChannelType } from "../../types";
import { NotesIndicator } from "../NotesIndicator";
import {
  LINE_CLAMP_STYLE,
  WATERMARK_STYLE,
  FOLDED_CORNER_SHADOW_STYLE,
  EMPTY_ARRAY,
} from "../shared-styles";

import { memo, useMemo } from "react";

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
        background: "linear-gradient(135deg, #6b7280, #374151)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        animation: "ec-channel-handle-pulse 2s ease-in-out infinite",
        pointerEvents: "none",
      }}
    />
  );
}

type ChannelNodeData = EventCatalogResource & {
  channel: ChannelType;
};

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

export type ChannelNode = Node<ChannelNodeData, "channel">;

function PostItChannel(props: ChannelNode) {
  const { data } = props;
  const {
    version,
    name,
    summary,
    deprecated,
    draft,
    protocols = EMPTY_ARRAY,
    notes,
  } = data.channel;
  const mode = props.data.mode || "simple";
  const iconEntry = getIconForProtocol(protocols?.[0]);

  return (
    <div
      className={classNames(
        "relative min-w-44 max-w-56 min-h-[120px]",
        props?.selected ? "ring-2 ring-gray-400/60 ring-offset-1" : "",
      )}
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
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #e5e7eb 0%, #d1d5db 40%, #6b7280 100%)",
          boxShadow:
            "1px 1px 3px rgba(0,0,0,0.15), 3px 4px 8px rgba(0,0,0,0.08)",
          transform: "rotate(-1deg)",
          border: deprecated
            ? "2px dashed rgba(239, 68, 68, 0.5)"
            : draft
              ? "2px dashed rgba(107, 114, 128, 0.5)"
              : "none",
        }}
      >
        {/* Folded corner */}
        <div style={FOLDED_CORNER_SHADOW_STYLE} />
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 0,
            height: 0,
            borderStyle: "solid",
            borderWidth: "18px 0 0 18px",
            borderColor: "#374151 transparent transparent transparent",
            opacity: 0.3,
          }}
        />
      </div>

      <div className="relative px-3.5 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <ArrowRightLeft
              className="w-3 h-3 text-gray-900/50"
              strokeWidth={2.5}
            />
            <span className="text-[8px] font-bold text-gray-900/50 uppercase tracking-widest">
              Channel
            </span>
          </div>
          <div className="flex items-center gap-1">
            {draft && (
              <span className="text-[8px] font-extrabold text-amber-900 bg-amber-100 border border-dashed border-amber-400 px-1.5 py-0.5 rounded uppercase">
                Draft
              </span>
            )}
            {deprecated && (
              <span className="text-[7px] font-bold text-white bg-red-500 border border-red-600 px-1.5 py-0.5 rounded uppercase">
                Deprecated
              </span>
            )}
            {protocols?.[0] && (
              <span className="flex items-center gap-0.5 text-[7px] font-semibold text-gray-900/50 bg-gray-900/10 px-1 py-px rounded uppercase">
                {protocols[0]}
              </span>
            )}
          </div>
        </div>

        <div
          className={classNames(
            "text-[13px] font-bold leading-snug",
            deprecated ? "text-gray-950/40 line-through" : "text-gray-950",
          )}
        >
          {name}
        </div>

        {version && (
          <div className="text-[9px] text-gray-900/40 font-semibold mt-0.5">
            v{version}
          </div>
        )}

        {mode === "full" && summary && (
          <div
            className="mt-2 pt-1.5 border-t border-gray-900/10 text-[9px] text-gray-950/60 leading-relaxed overflow-hidden"
            style={LINE_CLAMP_STYLE}
            title={summary}
          >
            {summary}
          </div>
        )}
      </div>
    </div>
  );
}

function DefaultChannel(props: ChannelNode) {
  const { data } = props;
  const {
    version,
    name,
    summary,
    deprecated,
    draft,
    protocols = EMPTY_ARRAY,
    address,
    notes,
  } = data.channel;
  const mode = props.data.mode || "simple";
  const owners = useMemo(
    () => normalizeOwners(data.channel?.owners),
    [data.channel?.owners],
  );
  const iconEntry = getIconForProtocol(protocols?.[0]);
  const sourceConnections = useHandleConnections({ type: "source" });
  const targetConnections = useHandleConnections({ type: "target" });
  const hasConnections =
    sourceConnections.length > 0 || targetConnections.length > 0;

  return (
    <div
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2",
        props?.selected ? "ring-2 ring-gray-400/60 ring-offset-2" : "",
        deprecated
          ? "border-dashed border-red-300"
          : draft
            ? "border-dashed border-gray-300/60"
            : "border-gray-300",
        "bg-[rgb(var(--ec-card-bg))]",
      )}
      style={{
        boxShadow: "0 2px 12px rgba(107, 114, 128, 0.15)",
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
      {!deprecated && !draft && hasConnections && <GlowHandle side="left" />}
      {!deprecated && !draft && hasConnections && <GlowHandle side="right" />}

      {/* Watermark icon */}
      <div
        className="absolute top-2 right-2 pointer-events-none overflow-hidden"
        style={WATERMARK_STYLE}
      >
        <ArrowRightLeft className="w-8 h-8 text-gray-400" strokeWidth={2} />
      </div>

      {/* Top row: icon left, protocol badge right */}
      <div className="flex items-start justify-between -mt-4 px-3">
        {iconEntry?.type === "svg" ? (
          <iconEntry.component className="w-8 h-8 rounded shadow-sm" />
        ) : (
          <div
            className={classNames(
              "flex items-center justify-center w-8 h-8 rounded-full shadow-sm border-2",
              deprecated
                ? "bg-gray-200 border-gray-300"
                : "bg-gray-500 border-gray-400",
            )}
          >
            {iconEntry ? (
              <iconEntry.component
                className="w-4 h-4 text-white"
                strokeWidth={2.5}
              />
            ) : (
              <ArrowRightLeft
                className="w-4 h-4 text-white"
                strokeWidth={2.5}
              />
            )}
          </div>
        )}

        {/* Protocol badge */}
        {protocols?.[0] && (
          <div className="relative z-10 mt-2.5 flex items-center gap-1 bg-[rgb(var(--ec-page-border)/0.3)] border border-[rgb(var(--ec-page-border))] rounded-full px-1.5 py-0.5">
            <span className="text-[7px] font-semibold text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wide">
              {protocols[0]}
            </span>
          </div>
        )}
      </div>

      <div className="px-3.5 pt-1.5 pb-3">
        {/* Type + version row */}
        <div className="flex items-center gap-1.5">
          <span
            className={classNames(
              "text-[8px] font-bold uppercase tracking-widest",
              "text-gray-400",
            )}
          >
            Channel
          </span>
          {version && (
            <span
              className={classNames("text-[8px] font-medium", "text-gray-300")}
            >
              v{version}
            </span>
          )}
        </div>

        {/* Name */}
        <div
          className={classNames(
            "text-[13px] font-bold leading-tight mt-1",
            deprecated
              ? "text-[rgb(var(--ec-page-text-muted))] line-through"
              : "text-[rgb(var(--ec-page-text))]",
          )}
        >
          {name}
        </div>

        {/* Draft badge */}
        {draft && (
          <span className="inline-block mt-1 text-[8px] font-extrabold text-amber-900 bg-amber-100 border border-dashed border-amber-400 px-1.5 py-0.5 rounded-full uppercase">
            Draft
          </span>
        )}

        {/* Deprecated badge */}
        {deprecated && (
          <span className="inline-block mt-1 text-[8px] font-extrabold text-red-700 bg-red-100 border border-dashed border-red-400 px-1.5 py-0.5 rounded-full uppercase">
            Deprecated
          </span>
        )}

        {/* Summary */}
        {mode === "full" && summary && (
          <div
            className="mt-2 text-[9px] text-[rgb(var(--ec-page-text-muted))] leading-relaxed overflow-hidden"
            style={LINE_CLAMP_STYLE}
            title={summary}
          >
            {summary}
          </div>
        )}

        {/* Address */}
        {mode === "full" && address && (
          <div className="flex items-center gap-1 mt-1.5">
            <Link className="w-2.5 h-2.5 text-[rgb(var(--ec-page-text-muted))]" />
            <span className="text-[8px] text-[rgb(var(--ec-page-text-muted))] font-mono">
              {address}
            </span>
          </div>
        )}

        {/* Owners */}
        <OwnerIndicator
          owners={owners}
          accentColor="bg-gray-400"
          borderColor="rgba(107,114,128,0.08)"
          iconClass="text-gray-300"
        />
      </div>
    </div>
  );
}

export default memo(function Channel(props: ChannelNode) {
  const nodeStyle = props?.data?.style;

  if (nodeStyle === "post-it") {
    return <PostItChannel {...props} />;
  }

  return <DefaultChannel {...props} />;
});
