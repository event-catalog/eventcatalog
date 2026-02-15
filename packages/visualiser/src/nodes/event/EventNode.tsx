import { memo, useMemo, useState, useCallback } from "react";
import { Zap, MessageCircle } from "lucide-react";
import {
  OwnerIndicator,
  normalizeOwners,
  HIDDEN_HANDLE_STYLE,
} from "../OwnerIndicator";
import { Node, Handle, Position, useHandleConnections } from "@xyflow/react";
import { Message, EventCatalogResource } from "../../types";
import { NotesIndicator, NotesModal } from "../NotesIndicator";
import {
  LINE_CLAMP_STYLE,
  FOLDED_CORNER_SHADOW_STYLE,
  useDarkMode,
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

function BottomRightNotes({
  notes,
  resourceName,
  resourceVersion,
  isDark,
}: {
  notes: any[];
  resourceName: string;
  resourceVersion?: string;
  isDark: boolean;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
  }, []);

  const count = notes.length;
  const hasUrgent = notes.some(
    (n: any) =>
      n.priority &&
      (n.priority.toLowerCase() === "high" ||
        n.priority.toLowerCase() === "critical"),
  );

  return (
    <div
      className="nopan nodrag shrink-0 ml-auto"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="cursor-pointer"
        onClick={handleClick}
        style={{
          position: "relative",
          width: 26,
          height: 26,
          transition: "transform 0.15s ease",
          filter: hasUrgent
            ? "drop-shadow(0 1px 4px rgba(239,68,68,0.4))"
            : "drop-shadow(0 1px 4px rgba(251,191,36,0.4))",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path
            d="M3 4C3 2.34 4.34 1 6 1h14c1.66 0 3 1.34 3 3v12c0 1.66-1.34 3-3 3H9l-4.3 4.3c-.6.6-1.7.2-1.7-.7V4z"
            fill={hasUrgent ? "#ef4444" : "#f59e0b"}
          />
        </svg>
        <span
          style={{
            position: "absolute",
            top: "38%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: 10,
            fontWeight: 800,
            color: "white",
            lineHeight: 1,
          }}
        >
          {count}
        </span>
      </div>

      <NotesModal
        notes={notes}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        resourceName={resourceName}
        resourceVersion={resourceVersion}
        resourceType="Event"
        accentColor="linear-gradient(135deg, #fb923c, #ea580c)"
        icon={
          <Zap
            style={{ width: 18, height: 18, color: "white" }}
            strokeWidth={2.5}
          />
        }
      />
    </div>
  );
}

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
  const targetConnections = useHandleConnections({ type: "target" });
  const sourceConnections = useHandleConnections({ type: "source" });
  const isDark = useDarkMode();
  const deprecatedStripe = isDark
    ? "rgba(239,68,68,0.25)"
    : "rgba(239,68,68,0.1)";

  return (
    <div
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2 overflow-visible",
        props?.selected ? "ring-2 ring-orange-400/60 ring-offset-2" : "",
        deprecated
          ? "border-dashed border-red-500"
          : draft
            ? `border-dashed ${isDark ? "border-orange-400" : "border-orange-400/60"}`
            : "border-orange-500",
      )}
      style={{
        background: deprecated
          ? `repeating-linear-gradient(135deg, transparent, transparent 6px, ${deprecatedStripe} 6px, ${deprecatedStripe} 7px), var(--ec-event-node-bg, rgb(var(--ec-card-bg)))`
          : draft
            ? `repeating-linear-gradient(135deg, transparent, transparent 4px, ${isDark ? "rgba(251,146,60,0.25)" : "rgba(251,146,60,0.15)"} 4px, ${isDark ? "rgba(251,146,60,0.25)" : "rgba(251,146,60,0.15)"} 4.5px), repeating-linear-gradient(45deg, transparent, transparent 4px, ${isDark ? "rgba(251,146,60,0.25)" : "rgba(251,146,60,0.15)"} 4px, ${isDark ? "rgba(251,146,60,0.25)" : "rgba(251,146,60,0.15)"} 4.5px), var(--ec-event-node-bg, rgb(var(--ec-card-bg)))`
            : "var(--ec-event-node-bg, rgb(var(--ec-card-bg)))",
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
      {targetConnections.length > 0 && <GlowHandle side="left" />}
      {sourceConnections.length > 0 && <GlowHandle side="right" />}

      {/* Type badge top-left */}
      <div className="absolute -top-2.5 left-2.5 z-10">
        <span
          className={classNames(
            "inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm",
            deprecated ? "bg-red-500" : "bg-orange-500",
          )}
        >
          <Zap className="w-2.5 h-2.5" strokeWidth={2.5} />
          Event{draft && " (Draft)"}
          {deprecated && " (Deprecated)"}
        </span>
      </div>
      {/* Schema badge top-right */}
      {schema && (
        <span
          className="z-10 text-[7px] font-semibold text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-card-bg))] border border-orange-500 rounded-full px-1.5 py-0.5 uppercase tracking-wide"
          style={{ position: "absolute", top: -8, right: 10 }}
        >
          {schema.includes(".") ? schema.split(".").pop() : schema}
        </span>
      )}

      <div className="px-3 pt-3.5 pb-2.5">
        {/* Name + version */}
        <div className="flex items-baseline gap-1">
          <span className="text-[13px] font-semibold leading-snug text-[rgb(var(--ec-page-text))]">
            {name}
          </span>
          {version && (
            <span
              className="text-[10px] font-normal shrink-0"
              style={{ color: isDark ? "#dce3eb" : "#6b7280" }}
            >
              (v{version})
            </span>
          )}
        </div>

        {/* Summary */}
        {mode === "full" && summary && (
          <div
            className="mt-1.5 text-[9px] leading-relaxed overflow-hidden"
            style={{
              ...LINE_CLAMP_STYLE,
              color: isDark ? "#f0f4f8" : "#374151",
            }}
            title={summary}
          >
            {summary}
          </div>
        )}

        {/* Owners + Notes row */}
        <div className="flex items-end justify-between">
          <OwnerIndicator
            owners={owners}
            accentColor="bg-orange-400"
            borderColor="rgba(251,146,60,0.08)"
            iconClass="text-orange-300"
          />
          {notes && notes.length > 0 && (
            <BottomRightNotes
              notes={notes}
              resourceName={name}
              resourceVersion={version}
              isDark={isDark}
            />
          )}
        </div>
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
