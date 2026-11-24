import { memo } from "react";
import { User } from "lucide-react";
import { Node, Handle, Position } from "@xyflow/react";
import { useNodeHasConnections } from "../../utils/node-connections";
import { EventCatalogResource, Note } from "../../types";
import { NotesIndicator } from "../NotesIndicator";
import { HIDDEN_HANDLE_STYLE } from "../OwnerIndicator";
import {
  LINE_CLAMP_STYLE,
  FOLDED_CORNER_SHADOW_STYLE,
  useDarkMode,
  HANDLE_GLOW,
} from "../shared-styles";
import { TruncatedResourceName } from "../TruncatedResourceName";

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
        background: "linear-gradient(135deg, #ffc53d, #ab6400)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        ...HANDLE_GLOW.actor,
        pointerEvents: "none",
      }}
    />
  );
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type ActorNodeData = EventCatalogResource & {
  name: string;
  summary: string;
  deprecated?: boolean;
  draft?: boolean;
  notes?: Note[];
};

export type ActorNode = Node<ActorNodeData, "actor">;

function PostItActor(props: ActorNode) {
  const { name, summary, deprecated, draft, notes } = props?.data;
  const mode = props?.data?.mode || "simple";

  return (
    <div
      className={classNames(
        "relative min-w-44 max-w-56 min-h-[120px]",
        props?.selected ? "ring-2 ring-[#e2a336]/60 ring-offset-1" : "",
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
            "linear-gradient(135deg, #fff7c2 0%, #e9c162 40%, #ffc53d 100%)",
          boxShadow:
            "1px 1px 3px rgba(0,0,0,0.15), 3px 4px 8px rgba(0,0,0,0.08)",
          transform: "rotate(1deg)",
          border: deprecated
            ? "2px dashed rgba(229, 72, 77, 0.5)"
            : draft
              ? "2px dashed rgba(255, 197, 61, 0.5)"
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
            borderColor: "#ab6400 transparent transparent transparent",
            opacity: 0.3,
          }}
        />
      </div>

      <div className="relative px-3.5 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-[#4f3422]/50" strokeWidth={2.5} />
            <span className="text-[8px] font-bold text-[#4f3422]/50 uppercase tracking-widest">
              Actor
            </span>
          </div>
          {draft && (
            <span className="text-[8px] font-extrabold text-[#4f3422] bg-[#fff7c2] border border-dashed border-[#e2a336] px-1.5 py-0.5 rounded uppercase">
              Draft
            </span>
          )}
          {deprecated && (
            <span className="text-[7px] font-bold text-white bg-[#e5484d] border border-[#dc3e42] px-1.5 py-0.5 rounded uppercase">
              Deprecated
            </span>
          )}
        </div>

        <TruncatedResourceName
          as="div"
          value={name}
          tooltipBorderColor="#ffc53d"
          className={classNames(
            "text-[13px] font-bold leading-snug truncate",
            deprecated ? "text-[#4f3422]/40 line-through" : "text-[#4f3422]",
          )}
        >
          {name}
        </TruncatedResourceName>

        {mode === "full" && summary && (
          <div
            className="mt-2 pt-1.5 border-t border-[#4f3422]/10 text-[9px] text-[#4f3422]/60 leading-relaxed overflow-hidden"
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

function DefaultActor(props: ActorNode) {
  const { name, summary, deprecated, draft, notes } = props?.data;
  const mode = props?.data?.mode || "simple";
  const connected = useNodeHasConnections();
  const isDark = useDarkMode();
  const deprecatedStripe = isDark
    ? "rgba(229,72,77,0.25)"
    : "rgba(229,72,77,0.1)";

  return (
    <div
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2 overflow-visible",
        props?.selected ? "ring-2 ring-[#e2a336]/60 ring-offset-2" : "",
        deprecated
          ? "border-dashed border-[#e5484d]"
          : draft
            ? `border-dashed ${isDark ? "border-[#e2a336]" : "border-[#e2a336]/60"}`
            : "border-[#ffc53d]",
      )}
      style={{
        background: deprecated
          ? `repeating-linear-gradient(135deg, transparent, transparent 6px, ${deprecatedStripe} 6px, ${deprecatedStripe} 7px), var(--ec-actor-node-bg, rgb(var(--ec-card-bg)))`
          : draft
            ? `repeating-linear-gradient(135deg, transparent, transparent 4px, ${isDark ? "rgba(255,197,61,0.25)" : "rgba(255,197,61,0.15)"} 4px, ${isDark ? "rgba(255,197,61,0.25)" : "rgba(255,197,61,0.15)"} 4.5px), repeating-linear-gradient(45deg, transparent, transparent 4px, ${isDark ? "rgba(255,197,61,0.25)" : "rgba(255,197,61,0.15)"} 4px, ${isDark ? "rgba(255,197,61,0.25)" : "rgba(255,197,61,0.15)"} 4.5px), var(--ec-actor-node-bg, rgb(var(--ec-card-bg)))`
            : "var(--ec-actor-node-bg, rgb(var(--ec-card-bg)))",
        boxShadow: "0 2px 12px rgba(255, 197, 61, 0.15)",
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
      {connected.target && <GlowHandle side="left" />}
      {connected.source && <GlowHandle side="right" />}

      {/* Badge positioned outside top-left corner */}
      <div className="absolute -top-2.5 left-2.5 flex items-center gap-1.5 z-10">
        <span
          className={classNames(
            "inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm",
            deprecated ? "bg-[#e5484d]" : "bg-[#ffc53d]",
          )}
        >
          <User className="w-2.5 h-2.5" strokeWidth={2.5} />
          Actor{draft && " (Draft)"}
          {deprecated && " (Deprecated)"}
        </span>
      </div>

      <div className="px-3 pt-3.5 pb-2.5">
        {/* Name */}
        <TruncatedResourceName
          as="div"
          value={name}
          tooltipBorderColor="#ffc53d"
          className="text-[13px] font-semibold leading-snug text-[rgb(var(--ec-page-text))] truncate"
        >
          {name}
        </TruncatedResourceName>

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

export default memo(function Actor(props: ActorNode) {
  const nodeStyle = props?.data?.style;

  if (nodeStyle === "post-it") {
    return <PostItActor {...props} />;
  }

  return <DefaultActor {...props} />;
});
