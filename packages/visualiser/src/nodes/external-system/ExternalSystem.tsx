import { memo } from "react";
import { Globe } from "lucide-react";
import { Node, Handle, Position } from "@xyflow/react";
import { useNodeHasConnections } from "../../utils/node-connections";
import {
  EventCatalogResource,
  ExternalSystem as ExternalSystemType,
} from "../../types";
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
        background: "linear-gradient(135deg, #8e4ec6, #8145b5)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        ...HANDLE_GLOW.external,
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
        props?.selected ? "ring-2 ring-[#be93e4]/60 ring-offset-1" : "",
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
            "linear-gradient(135deg, #ead5f9 0%, #be93e4 40%, #8e4ec6 100%)",
          boxShadow:
            "1px 1px 3px rgba(0,0,0,0.15), 3px 4px 8px rgba(0,0,0,0.08)",
          transform: "rotate(-1deg)",
          border: deprecated
            ? "2px dashed rgba(229, 72, 77, 0.5)"
            : draft
              ? "2px dashed rgba(142, 78, 198, 0.5)"
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
            borderColor: "#8145b5 transparent transparent transparent",
            opacity: 0.3,
          }}
        />
      </div>

      <div className="relative px-3.5 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Globe className="w-3 h-3 text-[#402060]/50" strokeWidth={2.5} />
            <span className="text-[8px] font-bold text-[#402060]/50 uppercase tracking-widest">
              External
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
          tooltipBorderColor="#8e4ec6"
          className={classNames(
            "text-[13px] font-bold leading-snug truncate",
            deprecated ? "text-[#402060]/40 line-through" : "text-[#402060]",
          )}
        >
          {name}
        </TruncatedResourceName>

        {version && (
          <div className="text-[9px] text-[#402060]/40 font-semibold mt-0.5">
            v{version}
          </div>
        )}

        {mode === "full" && summary && (
          <div
            className="mt-2 pt-1.5 border-t border-[#402060]/10 text-[9px] text-[#402060]/60 leading-relaxed overflow-hidden"
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
  const connected = useNodeHasConnections();
  const isDark = useDarkMode();
  const deprecatedStripe = isDark
    ? "rgba(229,72,77,0.25)"
    : "rgba(229,72,77,0.1)";

  return (
    <div
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2 overflow-visible",
        props?.selected ? "ring-2 ring-[#be93e4]/60 ring-offset-2" : "",
        deprecated
          ? "border-dashed border-[#e5484d]"
          : draft
            ? `border-dashed ${isDark ? "border-[#be93e4]" : "border-[#be93e4]/60"}`
            : "border-[#8e4ec6]",
      )}
      style={{
        background: deprecated
          ? `repeating-linear-gradient(135deg, transparent, transparent 6px, ${deprecatedStripe} 6px, ${deprecatedStripe} 7px), var(--ec-external-node-bg, rgb(var(--ec-card-bg)))`
          : draft
            ? `repeating-linear-gradient(135deg, transparent, transparent 4px, ${isDark ? "rgba(142,78,198,0.25)" : "rgba(142,78,198,0.15)"} 4px, ${isDark ? "rgba(142,78,198,0.25)" : "rgba(142,78,198,0.15)"} 4.5px), repeating-linear-gradient(45deg, transparent, transparent 4px, ${isDark ? "rgba(142,78,198,0.25)" : "rgba(142,78,198,0.15)"} 4px, ${isDark ? "rgba(142,78,198,0.25)" : "rgba(142,78,198,0.15)"} 4.5px), var(--ec-external-node-bg, rgb(var(--ec-card-bg)))`
            : "var(--ec-external-node-bg, rgb(var(--ec-card-bg)))",
        boxShadow: "0 2px 12px rgba(142, 78, 198, 0.15)",
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
            deprecated ? "bg-[#e5484d]" : "bg-[#8e4ec6]",
          )}
        >
          <Globe className="w-2.5 h-2.5" strokeWidth={2.5} />
          External System{draft && " (Draft)"}
          {deprecated && " (Deprecated)"}
        </span>
      </div>

      <div className="px-3 pt-3.5 pb-2.5">
        {/* Name + version */}
        <div className="flex items-baseline gap-1 min-w-0">
          <TruncatedResourceName
            value={name}
            tooltipBorderColor="#8e4ec6"
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

export default memo(function ExternalSystem(props: ExternalSystemNode) {
  const nodeStyle = props?.data?.style;

  if (nodeStyle === "post-it") {
    return <PostItExternalSystem {...props} />;
  }

  return <DefaultExternalSystem {...props} />;
});
