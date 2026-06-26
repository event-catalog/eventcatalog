import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Group as GroupIcon } from "lucide-react";
import { TruncatedResourceName } from "./TruncatedResourceName";

export type SystemGroupNodeData = {
  system: {
    name: string;
    version?: string;
  };
};

/**
 * A boundary box wrapping all of a system's nodes on the System Diagram, so the
 * services / data stores / messages inside visibly belong to one parent system.
 *
 * Sized + positioned by the node-graph (it wraps the laid-out children); this
 * component only renders the chrome — a rounded violet box with a header banner
 * carrying the system name + icon.
 */
const CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
  borderRadius: 14,
  border: "2px solid var(--ec-system-group-border, #c4b5fd)",
  // Slightly gray, translucent body so the grouped children read as "inside".
  backgroundColor: "var(--ec-system-group-bg, rgba(100, 116, 139, 0.06))",
  position: "relative" as const,
  overflow: "visible" as const,
  boxShadow: "0 2px 16px rgba(139, 92, 246, 0.10)",
} as const;

const HEADER_STYLE = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  height: 48,
  borderTopLeftRadius: 12,
  borderTopRightRadius: 12,
  // Faint violet wash on the header, separated from the body by a hairline.
  background: "var(--ec-system-group-header-bg, rgba(139, 92, 246, 0.05))",
  borderBottom: "1px solid var(--ec-system-group-border, #c4b5fd)",
  display: "flex",
  alignItems: "center" as const,
  padding: "0 16px",
  overflow: "visible" as const,
} as const;

// Floating "SYSTEM" badge on the top-left border — mirrors the System node badge.
const BADGE_STYLE = {
  position: "absolute" as const,
  top: -11,
  left: 14,
  display: "inline-flex",
  alignItems: "center" as const,
  gap: 4,
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "white",
  background: "#8b5cf6",
  padding: "2px 7px",
  borderRadius: 5,
  boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
  zIndex: 10,
} as const;

const NAME_STYLE = {
  fontSize: 14,
  fontWeight: 700,
  color: "var(--ec-system-group-text, #5b21b6)",
  whiteSpace: "nowrap" as const,
} as const;

const VERSION_STYLE = {
  fontSize: 10,
  fontWeight: 500,
  color: "#a78bfa",
  marginLeft: 6,
} as const;

export default memo(function SystemGroupNode({ data }: NodeProps) {
  const { system } = data as unknown as SystemGroupNodeData;

  return (
    <div style={CONTAINER_STYLE}>
      {/* Floating type badge, styled like the System node's badge */}
      <span style={BADGE_STYLE}>
        <GroupIcon size={10} strokeWidth={2.5} />
        System
      </span>

      {/* Header banner carrying the system name */}
      <div style={HEADER_STYLE}>
        <TruncatedResourceName
          value={system?.name || "System"}
          tooltipBorderColor="#8b5cf6"
          className="truncate"
          style={NAME_STYLE}
        >
          {system?.name || "System"}
        </TruncatedResourceName>
        {system?.version && (
          <span style={VERSION_STYLE}>v{system.version}</span>
        )}
      </div>
    </div>
  );
});
