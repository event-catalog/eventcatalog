import { memo } from "react";
import { Database } from "lucide-react";
import { HIDDEN_HANDLE_STYLE } from "../OwnerIndicator";
import { Node, Handle, Position, useHandleConnections } from "@xyflow/react";
import { useDarkMode } from "../shared-styles";

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
        background: "linear-gradient(135deg, #06b6d4, #0891b2)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        animation: "ec-handle-pulse 2s ease-in-out infinite",
        pointerEvents: "none" as const,
      }}
    />
  );
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type FieldNodeData = {
  name: string;
  type?: string;
  mode?: "simple" | "full";
};

export type FieldNode = Node<FieldNodeData, "field">;

export default memo(function Field(props: FieldNode) {
  const { name, type: fieldType } = props.data;
  const mode = props.data.mode || "simple";
  const targetConnections = useHandleConnections({ type: "target" });
  const sourceConnections = useHandleConnections({ type: "source" });
  const isDark = useDarkMode();

  return (
    <div
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2 overflow-visible",
        props?.selected ? "ring-2 ring-cyan-400/60 ring-offset-2" : "",
        "border-cyan-500",
      )}
      style={{
        background: "var(--ec-field-node-bg, rgb(var(--ec-card-bg)))",
        boxShadow: "0 2px 12px rgba(6, 182, 212, 0.15)",
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
        <span className="inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm bg-cyan-600">
          <Database className="w-2.5 h-2.5" strokeWidth={2.5} />
          Field
        </span>
      </div>

      {/* Field type badge top-right */}
      {fieldType && (
        <span
          className="z-10 text-[7px] font-semibold text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-card-bg))] border border-cyan-500 rounded-full px-1.5 py-0.5 uppercase tracking-wide"
          style={{ position: "absolute", top: -8, right: 10 }}
        >
          {fieldType}
        </span>
      )}

      <div className="px-3 pt-3.5 pb-2.5">
        {/* Name */}
        <div className="flex items-baseline gap-1">
          <span className="text-[13px] font-semibold leading-snug text-[rgb(var(--ec-page-text))]">
            {name}
          </span>
        </div>

        {/* Type info in full mode */}
        {mode === "full" && fieldType && (
          <div
            className="mt-1.5 text-[9px] text-[rgb(var(--ec-page-text-muted))] leading-relaxed"
            title={`Type: ${fieldType}`}
          >
            Type: {fieldType}
          </div>
        )}
      </div>
    </div>
  );
});
