import { memo, useMemo } from "react";
import { MonitorIcon } from "lucide-react";
import { Node, Handle, Position, useNodeConnections } from "@xyflow/react";
import { EventCatalogResource, View as ViewType } from "../../types";
import {
  OwnerIndicator,
  normalizeOwners,
  HIDDEN_HANDLE_STYLE,
} from "../OwnerIndicator";
import { NotesIndicator } from "../NotesIndicator";
import { LINE_CLAMP_STYLE, EMPTY_ARRAY, HANDLE_GLOW } from "../shared-styles";
import { TruncatedResourceName } from "../TruncatedResourceName";
import { FocusedResourceIndicator } from "../FocusedResourceIndicator";

// Views are sky blue, so they stand apart from commands (blue) and data stores (indigo)
const VIEW_COLOR = "#0ea5e9";

const GlowHandle = memo(function GlowHandle({
  side,
}: {
  side: "left" | "right";
}) {
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
        background: "linear-gradient(135deg, #38bdf8, #0284c7)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        ...HANDLE_GLOW.view,
        pointerEvents: "none",
      }}
    />
  );
});

type ViewNodeData = EventCatalogResource & {
  view: ViewType;
};

export type ViewNode = Node<ViewNodeData, "view">;

export default memo(function View(props: ViewNode) {
  const {
    name,
    version,
    summary,
    screenshot,
    owners = EMPTY_ARRAY,
    notes,
  } = props.data.view;
  const mode = props.data.mode || "simple";
  const ownersNormalized = useMemo(() => normalizeOwners(owners), [owners]);
  const targetConnections = useNodeConnections({ handleType: "target" });
  const sourceConnections = useNodeConnections({ handleType: "source" });

  return (
    <div
      className={[
        "relative min-w-48 max-w-60 rounded-xl border-2 border-sky-500 overflow-visible",
        props.selected ? "ring-2 ring-sky-400/60 ring-offset-2" : "",
      ].join(" ")}
      style={{
        background: "rgb(var(--ec-card-bg))",
        boxShadow: "0 2px 12px rgba(14, 165, 233, 0.15)",
      }}
    >
      {props.data.isFocused && <FocusedResourceIndicator />}
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
        <span className="inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm bg-sky-500">
          <MonitorIcon className="w-2.5 h-2.5" strokeWidth={2.5} />
          View
        </span>
      </div>

      <div className="px-3 pt-3.5 pb-2.5">
        {/* Name + version */}
        <div className="flex items-baseline gap-1 min-w-0">
          <TruncatedResourceName
            value={name}
            tooltipBorderColor={VIEW_COLOR}
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

        {/* Screenshot */}
        {mode === "full" && screenshot && (
          <img
            src={screenshot}
            alt={`${name} screenshot`}
            className="mt-2 w-full h-24 object-cover rounded-md border border-[rgb(var(--ec-page-border))]"
          />
        )}

        {/* Owners */}
        <OwnerIndicator
          owners={ownersNormalized}
          accentColor="bg-sky-400"
          borderColor="rgba(14,165,233,0.08)"
          iconClass="text-sky-300"
        />
      </div>
    </div>
  );
});
