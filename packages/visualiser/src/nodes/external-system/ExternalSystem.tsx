import { memo } from "react";
import { Globe } from "lucide-react";
import { Node, Handle, Position } from "@xyflow/react";
import {
  EventCatalogResource,
  ExternalSystem as ExternalSystemType,
} from "../../types";
import { NotesIndicator } from "../NotesIndicator";
import { HIDDEN_HANDLE_STYLE } from "../OwnerIndicator";
import {
  LINE_CLAMP_STYLE,
  WATERMARK_STYLE,
  FOLDED_CORNER_SHADOW_STYLE,
} from "../shared-styles";

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
        background: "linear-gradient(135deg, #a855f7, #7e22ce)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        animation: "ec-external-handle-pulse 2s ease-in-out infinite",
        pointerEvents: "none",
      }}
    />
  );
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type ExternalSystemNodeData = EventCatalogResource & {
  externalSystem: ExternalSystemType & {
    deprecated?: boolean;
    draft?: boolean;
  };
};

export type ExternalSystemNode = Node<
  ExternalSystemNodeData,
  "external-system"
>;

function PostItExternalSystem(props: ExternalSystemNode) {
  const { version, name, summary, deprecated, draft, notes } =
    props.data.externalSystem;
  const mode = props.data.mode || "simple";

  return (
    <div
      className={classNames(
        "relative min-w-44 max-w-56 min-h-[120px]",
        props?.selected ? "ring-2 ring-purple-400/60 ring-offset-1" : "",
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
            "linear-gradient(135deg, #e9d5ff 0%, #c084fc 40%, #a855f7 100%)",
          boxShadow:
            "1px 1px 3px rgba(0,0,0,0.15), 3px 4px 8px rgba(0,0,0,0.08)",
          transform: "rotate(-1deg)",
          border: deprecated
            ? "2px dashed rgba(239, 68, 68, 0.5)"
            : draft
              ? "2px dashed rgba(168, 85, 247, 0.5)"
              : "none",
        }}
      >
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
            borderColor: "#7e22ce transparent transparent transparent",
            opacity: 0.3,
          }}
        />
      </div>

      <div className="relative px-3.5 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Globe className="w-3 h-3 text-purple-900/50" strokeWidth={2.5} />
            <span className="text-[8px] font-bold text-purple-900/50 uppercase tracking-widest">
              External
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
            deprecated ? "text-purple-950/40 line-through" : "text-purple-950",
          )}
        >
          {name}
        </div>

        {version && (
          <div className="text-[9px] text-purple-900/40 font-semibold mt-0.5">
            v{version}
          </div>
        )}

        {mode === "full" && summary && (
          <div
            className="mt-2 pt-1.5 border-t border-purple-900/10 text-[9px] text-purple-950/60 leading-relaxed overflow-hidden"
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

function DefaultExternalSystem(props: ExternalSystemNode) {
  const { version, name, summary, deprecated, draft, notes } =
    props.data.externalSystem;
  const mode = props.data.mode || "simple";

  return (
    <div
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2",
        props?.selected ? "ring-2 ring-purple-400/60 ring-offset-2" : "",
        deprecated
          ? "border-dashed border-red-300"
          : draft
            ? "border-dashed border-purple-300/60"
            : "border-purple-300",
        "bg-[rgb(var(--ec-card-bg))]",
      )}
      style={{
        boxShadow: "0 2px 12px rgba(168, 85, 247, 0.15)",
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
        <Globe className="w-8 h-8 text-purple-400" strokeWidth={2} />
      </div>

      {/* Top row: icon circle left */}
      <div className="flex items-start justify-between -mt-4 px-3">
        <div
          className={classNames(
            "flex items-center justify-center w-8 h-8 rounded-full shadow-sm border-2",
            "bg-purple-500 border-purple-400",
          )}
        >
          <Globe className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
      </div>

      <div className="px-3.5 pt-1.5 pb-3">
        {/* Type + version row */}
        <div className="flex items-center gap-1.5">
          <span
            className={classNames(
              "text-[8px] font-bold uppercase tracking-widest",
              "text-purple-400",
            )}
          >
            External System
          </span>
          {version && (
            <span
              className={classNames(
                "text-[8px] font-medium",
                "text-purple-300",
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
      </div>
    </div>
  );
}

export default memo(function ExternalSystem(props: ExternalSystemNode) {
  const nodeStyle = props?.data?.style;

  if (nodeStyle === "post-it") {
    return <PostItExternalSystem {...props} />;
  }

  return <DefaultExternalSystem {...props} />;
});
