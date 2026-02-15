import { memo, useMemo } from "react";
import { Search } from "lucide-react";
import {
  OwnerIndicator,
  normalizeOwners,
  HIDDEN_HANDLE_STYLE,
} from "../OwnerIndicator";
import { Node, Handle, Position, useHandleConnections } from "@xyflow/react";
import { Message, EventCatalogResource } from "../../types";
import { NotesIndicator } from "../NotesIndicator";
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
        background: "linear-gradient(135deg, #22c55e, #15803d)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        animation: "ec-query-handle-pulse 2s ease-in-out infinite",
        pointerEvents: "none",
      }}
    />
  );
});

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type QueryNodeData = EventCatalogResource & {
  message: Message;
};

export type QueryNode = Node<QueryNodeData, "query">;

function PostItQuery(props: QueryNode) {
  const { version, name, summary, deprecated, draft, notes } =
    props.data.message;
  const mode = props.data.mode || "simple";

  return (
    <div
      className={classNames(
        "relative min-w-44 max-w-56 min-h-[120px]",
        props?.selected ? "ring-2 ring-green-400/60 ring-offset-1" : "",
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
            "linear-gradient(135deg, #bbf7d0 0%, #86efac 40%, #22c55e 100%)",
          boxShadow:
            "1px 1px 3px rgba(0,0,0,0.15), 3px 4px 8px rgba(0,0,0,0.08)",
          transform: "rotate(-1deg)",
          border: deprecated
            ? "2px dashed rgba(239, 68, 68, 0.5)"
            : draft
              ? "2px dashed rgba(34, 197, 94, 0.5)"
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
            borderColor: "#16a34a transparent transparent transparent",
            opacity: 0.3,
          }}
        />
      </div>

      <div className="relative px-3.5 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Search className="w-3 h-3 text-green-900/50" strokeWidth={2.5} />
            <span className="text-[8px] font-bold text-green-900/50 uppercase tracking-widest">
              Query
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

        <div
          className={classNames(
            "text-[13px] font-bold leading-snug",
            deprecated ? "text-green-950/40 line-through" : "text-green-950",
          )}
        >
          {name}
        </div>

        {version && (
          <div className="text-[9px] text-green-900/40 font-semibold mt-0.5">
            v{version}
          </div>
        )}

        {mode === "full" && summary && (
          <div
            className="mt-2 pt-1.5 border-t border-green-900/10 text-[9px] text-green-950/60 leading-relaxed overflow-hidden"
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

function DefaultQuery(props: QueryNode) {
  const { version, name, summary, deprecated, draft, schema, notes } =
    props.data.message;
  const mode = props.data.mode || "simple";
  const owners = useMemo(
    () => normalizeOwners(props.data.message?.owners),
    [props.data.message?.owners],
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
        props?.selected ? "ring-2 ring-green-400/60 ring-offset-2" : "",
        deprecated
          ? "border-dashed border-red-500"
          : draft
            ? `border-dashed ${isDark ? "border-green-400" : "border-green-400/60"}`
            : "border-green-500",
      )}
      style={{
        background: deprecated
          ? `repeating-linear-gradient(135deg, transparent, transparent 6px, ${deprecatedStripe} 6px, ${deprecatedStripe} 7px), var(--ec-query-node-bg, rgb(var(--ec-card-bg)))`
          : draft
            ? `repeating-linear-gradient(135deg, transparent, transparent 4px, ${isDark ? "rgba(34,197,94,0.25)" : "rgba(34,197,94,0.15)"} 4px, ${isDark ? "rgba(34,197,94,0.25)" : "rgba(34,197,94,0.15)"} 4.5px), repeating-linear-gradient(45deg, transparent, transparent 4px, ${isDark ? "rgba(34,197,94,0.25)" : "rgba(34,197,94,0.15)"} 4px, ${isDark ? "rgba(34,197,94,0.25)" : "rgba(34,197,94,0.15)"} 4.5px), var(--ec-query-node-bg, rgb(var(--ec-card-bg)))`
            : "var(--ec-query-node-bg, rgb(var(--ec-card-bg)))",
        boxShadow: "0 2px 12px rgba(34, 197, 94, 0.15)",
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

      {/* Type badge top-left */}
      <div className="absolute -top-2.5 left-2.5 z-10">
        <span
          className={classNames(
            "inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm",
            deprecated ? "bg-red-500" : "bg-green-500",
          )}
        >
          <Search className="w-2.5 h-2.5" strokeWidth={2.5} />
          Query{draft && " (Draft)"}
          {deprecated && " (Deprecated)"}
        </span>
      </div>
      {/* Schema badge top-right */}
      {schema && (
        <span
          className="z-10 text-[7px] font-semibold text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-card-bg))] border border-green-500 rounded-full px-1.5 py-0.5 uppercase tracking-wide"
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
            <span className="text-[10px] font-normal text-[rgb(var(--ec-page-text-muted))] shrink-0">
              (v{version})
            </span>
          )}
        </div>

        {/* Summary */}
        {mode === "full" && summary && (
          <div
            className="mt-1.5 text-[9px] text-[rgb(var(--ec-page-text-muted))] leading-relaxed overflow-hidden"
            style={LINE_CLAMP_STYLE}
            title={summary}
          >
            {summary}
          </div>
        )}

        {/* Owners */}
        <OwnerIndicator
          owners={owners}
          accentColor="bg-green-400"
          borderColor="rgba(34,197,94,0.08)"
          iconClass="text-green-300"
        />
      </div>
    </div>
  );
}

export default memo(function Query(props: QueryNode) {
  const nodeStyle = props?.data?.style;

  if (nodeStyle === "post-it") {
    return <PostItQuery {...props} />;
  }

  return <DefaultQuery {...props} />;
});
