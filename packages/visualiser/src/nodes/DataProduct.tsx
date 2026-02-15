import { memo } from "react";
import { Package } from "lucide-react";
import { Node, Handle, Position, useHandleConnections } from "@xyflow/react";
import { EventCatalogResource } from "../types";
import { NotesIndicator } from "./NotesIndicator";
import { HIDDEN_HANDLE_STYLE } from "./OwnerIndicator";
import {
  LINE_CLAMP_STYLE,
  FOLDED_CORNER_SHADOW_STYLE,
  useDarkMode,
} from "./shared-styles";

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
        background: "linear-gradient(135deg, #6366f1, #4338ca)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        animation: "ec-dp-handle-pulse 2s ease-in-out infinite",
        pointerEvents: "none",
      }}
    />
  );
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type DataProductNodeData = EventCatalogResource & {
  dataProduct: {
    id: string;
    version: string;
    name: string;
    summary?: string;
    inputs?: any[];
    outputs?: any[];
    owners?: any[];
    deprecated?: boolean;
    draft?: boolean;
    notes?: import("../types").Note[];
  };
};

export type DataProductNode = Node<DataProductNodeData, "data-product">;

function PostItDataProduct(props: DataProductNode) {
  const { version, name, summary, deprecated, draft, notes } =
    props.data.dataProduct;
  const mode = props.data.mode || "simple";

  return (
    <div
      className={classNames(
        "relative min-w-44 max-w-56 min-h-[120px]",
        props?.selected ? "ring-2 ring-indigo-400/60 ring-offset-1" : "",
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
      {/* Inner wrapper with rotation */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #c7d2fe 0%, #a5b4fc 40%, #6366f1 100%)",
          boxShadow:
            "1px 1px 3px rgba(0,0,0,0.15), 3px 4px 8px rgba(0,0,0,0.08)",
          transform: "rotate(1deg)",
          border: deprecated
            ? "2px dashed rgba(239, 68, 68, 0.5)"
            : draft
              ? "2px dashed rgba(99, 102, 241, 0.5)"
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
            borderColor: "#4338ca transparent transparent transparent",
            opacity: 0.3,
          }}
        />
      </div>

      {/* Content sits on top, unrotated */}
      <div className="relative px-3.5 py-3">
        {/* Type label row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Package className="w-3 h-3 text-indigo-900/50" strokeWidth={2.5} />
            <span className="text-[8px] font-bold text-indigo-900/50 uppercase tracking-widest">
              Data Product
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
            deprecated ? "text-indigo-950/40 line-through" : "text-indigo-950",
          )}
        >
          {name}
        </div>

        {/* Version */}
        {version && (
          <div className="text-[9px] text-indigo-900/40 font-semibold mt-0.5">
            v{version}
          </div>
        )}

        {/* Summary */}
        {mode === "full" && summary && (
          <div
            className="mt-2 pt-1.5 border-t border-indigo-900/10 text-[9px] text-indigo-950/60 leading-relaxed overflow-hidden"
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

function DefaultDataProduct(props: DataProductNode) {
  const { version, name, summary, deprecated, draft, notes } =
    props.data.dataProduct;
  const mode = props.data.mode || "simple";
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
        props?.selected ? "ring-2 ring-indigo-400/60 ring-offset-2" : "",
        deprecated
          ? "border-dashed border-red-500"
          : draft
            ? `border-dashed ${isDark ? "border-indigo-400" : "border-indigo-400/60"}`
            : "border-indigo-500",
      )}
      style={{
        background: deprecated
          ? `repeating-linear-gradient(135deg, transparent, transparent 6px, ${deprecatedStripe} 6px, ${deprecatedStripe} 7px), var(--ec-dp-node-bg, rgb(var(--ec-card-bg)))`
          : draft
            ? `repeating-linear-gradient(135deg, transparent, transparent 4px, ${isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)"} 4px, ${isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)"} 4.5px), repeating-linear-gradient(45deg, transparent, transparent 4px, ${isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)"} 4px, ${isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)"} 4.5px), var(--ec-dp-node-bg, rgb(var(--ec-card-bg)))`
            : "var(--ec-dp-node-bg, rgb(var(--ec-card-bg)))",
        boxShadow: "0 2px 12px rgba(99, 102, 241, 0.15)",
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

      {/* Badge positioned outside top-left corner */}
      <div className="absolute -top-2.5 left-2.5 flex items-center gap-1.5 z-10">
        <span
          className={classNames(
            "inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm",
            deprecated ? "bg-red-500" : "bg-indigo-500",
          )}
        >
          <Package className="w-2.5 h-2.5" strokeWidth={2.5} />
          Data Product{draft && " (Draft)"}
          {deprecated && " (Deprecated)"}
        </span>
      </div>

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
      </div>
    </div>
  );
}

export default memo(function DataProductNode(props: DataProductNode) {
  const nodeStyle = props?.data?.style;

  if (nodeStyle === "post-it") {
    return <PostItDataProduct {...props} />;
  }

  return <DefaultDataProduct {...props} />;
});
