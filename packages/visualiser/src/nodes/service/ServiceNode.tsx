import { memo, useMemo } from "react";
import { ServerIcon } from "lucide-react";
import {
  OwnerIndicator,
  normalizeOwners,
  HIDDEN_HANDLE_STYLE,
} from "../OwnerIndicator";
import { Node, Handle, Position } from "@xyflow/react";
import { EventCatalogResource, Service as ServiceType } from "../../types";
import { NotesIndicator } from "../NotesIndicator";
import {
  LINE_CLAMP_STYLE,
  WATERMARK_STYLE,
  FOLDED_CORNER_SHADOW_STYLE,
} from "../shared-styles";

const MiniEnvelope = memo(function MiniEnvelope({
  side,
  delay,
}: {
  side: "left" | "right";
  delay: number;
}) {
  return (
    <svg
      width="14"
      height="10"
      viewBox="0 0 14 10"
      style={{
        animation: `${side === "left" ? "ec-svc-msg-in" : "ec-svc-msg-out"} 2.5s ease-in-out ${delay}s infinite`,
        opacity: 0,
      }}
    >
      <rect
        x="0.5"
        y="0.5"
        width="13"
        height="9"
        rx="1.5"
        fill="#9ca3af"
        opacity={0.85}
      />
      <path
        d="M0.5,0.5 L7,5 L13.5,0.5"
        fill="none"
        stroke="white"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
});

const ServiceMessageFlow = memo(function ServiceMessageFlow({
  side,
}: {
  side: "left" | "right";
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        [side]: -4,
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        zIndex: 15,
        pointerEvents: "none",
      }}
    >
      <MiniEnvelope side={side} delay={0} />
      <MiniEnvelope side={side} delay={0.8} />
      <MiniEnvelope side={side} delay={1.6} />
    </div>
  );
});

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
        background: "linear-gradient(135deg, #ec4899, #be185d)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        animation: "ec-service-handle-pulse 2s ease-in-out infinite",
        pointerEvents: "none",
      }}
    />
  );
});

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type ServiceNodeData = EventCatalogResource & {
  service: ServiceType;
};

export type ServiceNode = Node<ServiceNodeData, "service">;

function PostItService(props: ServiceNode) {
  const { version, name, summary, deprecated, draft, notes } =
    props.data.service;
  const mode = props.data.mode || "simple";

  return (
    <div
      className={classNames(
        "relative min-w-44 max-w-56 min-h-[120px]",
        props?.selected ? "ring-2 ring-pink-400/60 ring-offset-1" : "",
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
          background: draft
            ? "repeating-linear-gradient(135deg, #fbcfe8 0%, #f9a8d4 40%, #ec4899 100%)"
            : "linear-gradient(135deg, #fbcfe8 0%, #f9a8d4 40%, #ec4899 100%)",
          boxShadow:
            "1px 1px 3px rgba(0,0,0,0.15), 3px 4px 8px rgba(0,0,0,0.08)",
          transform: "rotate(1deg)",
          border: deprecated
            ? "2px dashed rgba(239, 68, 68, 0.5)"
            : draft
              ? "2px dashed rgba(236, 72, 153, 0.5)"
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
            borderColor: "#db2777 transparent transparent transparent",
            opacity: 0.3,
          }}
        />
      </div>

      {/* Content sits on top, unrotated */}
      <div className="relative px-3.5 py-3">
        {/* Type label row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <ServerIcon
              className="w-3 h-3 text-pink-900/50"
              strokeWidth={2.5}
            />
            <span className="text-[8px] font-bold text-pink-900/50 uppercase tracking-widest">
              Service
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
            deprecated ? "text-pink-950/40 line-through" : "text-pink-950",
          )}
        >
          {name}
        </div>

        {/* Version */}
        {version && (
          <div className="text-[9px] text-pink-900/40 font-semibold mt-0.5">
            v{version}
          </div>
        )}

        {/* Summary */}
        {mode === "full" && summary && (
          <div
            className="mt-2 pt-1.5 border-t border-pink-900/10 text-[9px] text-pink-950/60 leading-relaxed overflow-hidden"
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

function DefaultService(props: ServiceNode) {
  const { version, name, summary, deprecated, draft, notes } =
    props.data.service;
  const mode = props.data.mode || "simple";
  const owners = useMemo(
    () => normalizeOwners(props.data.service.owners),
    [props.data.service.owners],
  );

  return (
    <div
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2",
        props?.selected ? "ring-2 ring-pink-400/60 ring-offset-2" : "",
        deprecated
          ? "border-dashed border-red-300"
          : draft
            ? "border-dashed border-pink-300/60"
            : "border-pink-300",
        "bg-[rgb(var(--ec-card-bg))]",
      )}
      style={{
        boxShadow: "0 2px 12px rgba(236, 72, 153, 0.15)",
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
        <ServerIcon className="w-8 h-8 text-pink-400" strokeWidth={2} />
      </div>

      {/* Top row: icon circle left */}
      <div className="flex items-start justify-between -mt-4 px-3">
        <div
          className={classNames(
            "flex items-center justify-center w-8 h-8 rounded-full shadow-sm border-2",
            "bg-pink-500 border-pink-400",
          )}
        >
          <ServerIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
      </div>

      <div className="px-3.5 pt-1.5 pb-3">
        {/* Type + version row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={classNames(
                "text-[8px] font-bold uppercase tracking-widest",
                "text-pink-400",
              )}
            >
              Service
            </span>
            {version && (
              <span
                className={classNames(
                  "text-[8px] font-medium",
                  "text-pink-300",
                )}
              >
                v{version}
              </span>
            )}
          </div>
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
          accentColor="bg-pink-400"
          borderColor="rgba(236,72,153,0.08)"
          iconClass="text-pink-300"
        />
      </div>
    </div>
  );
}

export default memo(function Service(props: ServiceNode) {
  const nodeStyle = props?.data?.style;

  if (nodeStyle === "post-it") {
    return <PostItService {...props} />;
  }

  return <DefaultService {...props} />;
});
