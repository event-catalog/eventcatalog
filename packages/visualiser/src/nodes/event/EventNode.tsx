import { memo, useMemo } from "react";
import { Zap } from "lucide-react";
import {
  OwnerIndicator,
  normalizeOwners,
  HIDDEN_HANDLE_STYLE,
} from "../OwnerIndicator";
import { Node, Handle, Position } from "@xyflow/react";
import { Message, EventCatalogResource } from "../../types";
import { NotesIndicator } from "../NotesIndicator";
import {
  LINE_CLAMP_STYLE,
  WATERMARK_STYLE,
  FOLDED_CORNER_SHADOW_STYLE,
} from "../shared-styles";

const GlowHandle = memo(function GlowHandle({
  side,
}: {
  side: "left" | "right";
}) {
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
        background: "linear-gradient(135deg, #fb923c, #ea580c)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        animation: "ec-handle-pulse 2s ease-in-out infinite",
        pointerEvents: "none",
      }}
    />
  );
});

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type MessageNodeData = EventCatalogResource & {
  message: Message;
};

export type EventNode = Node<MessageNodeData, "event">;

function PostItEvent(props: EventNode) {
  const { version, name, summary, deprecated, draft, notes } =
    props?.data?.message;
  const mode = props?.data?.mode || "simple";

  return (
    <div
      className={classNames(
        "relative min-w-44 max-w-56 min-h-[120px]",
        props?.selected ? "ring-2 ring-orange-400/60 ring-offset-1" : "",
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
      {/* Inner wrapper with rotation — keeps handles aligned to the unrotated bounding box */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #fed7aa 0%, #fdba74 40%, #fb923c 100%)",
          boxShadow:
            "1px 1px 3px rgba(0,0,0,0.15), 3px 4px 8px rgba(0,0,0,0.08)",
          transform: "rotate(-1deg)",
          border: deprecated
            ? "2px dashed rgba(239, 68, 68, 0.5)"
            : draft
              ? "2px dashed rgba(251, 146, 60, 0.5)"
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
            borderColor: "#f97316 transparent transparent transparent",
            opacity: 0.3,
          }}
        />
      </div>

      {/* Content sits on top, unrotated, so text stays crisp */}
      <div className="relative px-3.5 py-3">
        {/* Type label row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-orange-900/50" strokeWidth={2.5} />
            <span className="text-[8px] font-bold text-orange-900/50 uppercase tracking-widest">
              Event
            </span>
          </div>
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
        </div>

        {/* Name */}
        <div
          className={classNames(
            "text-[13px] font-bold leading-snug",
            deprecated ? "text-orange-950/40 line-through" : "text-orange-950",
          )}
        >
          {name}
        </div>

        {/* Version */}
        {version && (
          <div className="text-[9px] text-orange-900/40 font-semibold mt-0.5">
            v{version}
          </div>
        )}

        {/* Summary */}
        {mode === "full" && summary && (
          <div
            className="mt-2 pt-1.5 border-t border-orange-900/10 text-[9px] text-orange-950/60 leading-relaxed overflow-hidden"
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

function DefaultEvent(props: EventNode) {
  const { version, name, summary, deprecated, draft, schema, notes } =
    props?.data?.message;
  const mode = props?.data?.mode || "simple";
  const owners = useMemo(
    () => normalizeOwners(props?.data?.message?.owners),
    [props?.data?.message?.owners],
  );

  return (
    <div
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2",
        props?.selected ? "ring-2 ring-orange-400/60 ring-offset-2" : "",
        deprecated
          ? "border-dashed border-red-300"
          : draft
            ? "border-dashed border-orange-300/60"
            : "border-orange-300",
        "bg-[rgb(var(--ec-card-bg))]",
      )}
      style={{
        boxShadow: "0 2px 12px rgba(251, 146, 60, 0.15)",
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
      {!deprecated && !draft && <GlowHandle side="left" />}
      {!deprecated && !draft && <GlowHandle side="right" />}

      {/* Watermark icon */}
      <div
        className="absolute top-2 right-2 pointer-events-none overflow-hidden"
        style={WATERMARK_STYLE}
      >
        <Zap className="w-8 h-8 text-orange-400" strokeWidth={2} />
      </div>

      {/* Top row: icon circle left, tech badge right */}
      <div className="flex items-start justify-between -mt-4 px-3">
        <div
          className={classNames(
            "flex items-center justify-center w-8 h-8 rounded-full shadow-sm border-2",
            "bg-orange-500 border-orange-400",
          )}
        >
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>

        {/* Tech badge — extract extension from schema path */}
        {schema && (
          <div className="relative z-10 mt-2.5 flex items-center gap-1 bg-[rgb(var(--ec-page-border)/0.3)] border border-[rgb(var(--ec-page-border))] rounded-full px-1.5 py-0.5">
            <span className="text-[7px] font-semibold text-[rgb(var(--ec-page-text-muted))] uppercase tracking-wide">
              {schema.includes(".") ? schema.split(".").pop() : schema}
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
              "text-orange-400",
            )}
          >
            Event
          </span>
          {version && (
            <span
              className={classNames(
                "text-[8px] font-medium",
                "text-orange-300",
              )}
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

        {/* Owners */}
        <OwnerIndicator
          owners={owners}
          accentColor="bg-orange-400"
          borderColor="rgba(251,146,60,0.08)"
          iconClass="text-orange-300"
        />
      </div>
    </div>
  );
}

export default memo(function Event(props: EventNode) {
  const nodeStyle = props?.data?.style;

  if (nodeStyle === "post-it") {
    return <PostItEvent {...props} />;
  }

  return <DefaultEvent {...props} />;
});
