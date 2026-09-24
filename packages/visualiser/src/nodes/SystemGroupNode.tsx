import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Boxes as BoxesIcon, Group as GroupIcon } from "lucide-react";
import { TruncatedResourceName } from "./TruncatedResourceName";
import { HIDDEN_HANDLE_STYLE } from "./OwnerIndicator";
import { FocusedResourceIndicator } from "./FocusedResourceIndicator";

export type SystemGroupNodeData = {
  system?: {
    name: string;
    version?: string;
  };
  // Set for a domain boundary (a `domain-group` node) instead of a system
  domain?: {
    name: string;
    version?: string;
  };
  // The domain is a subdomain of another domain on the graph
  subdomain?: boolean;
  // The system being viewed on this page
  isFocused?: boolean;
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
  // Falls back to the group text colour, which is lighter in dark mode
  color: "var(--ec-system-group-text, var(--ec-group-text, #5b21b6))",
  whiteSpace: "nowrap" as const,
} as const;

const VERSION_STYLE = {
  fontSize: 10,
  fontWeight: 500,
  color: "#a78bfa",
  marginLeft: 6,
} as const;

// Domains use the same boundary box, in the domain colour (yellow)
const DOMAIN_CONTAINER_STYLE = {
  ...CONTAINER_STYLE,
  border: "2px solid var(--ec-domain-group-border, #facc15)",
  backgroundColor: "var(--ec-domain-group-bg, rgba(250, 204, 21, 0.04))",
  boxShadow: "0 2px 16px rgba(234, 179, 8, 0.10)",
} as const;
const DOMAIN_HEADER_STYLE = {
  ...HEADER_STYLE,
  background: "var(--ec-domain-group-header-bg, rgba(250, 204, 21, 0.08))",
  borderBottom: "1px solid var(--ec-domain-group-border, #facc15)",
} as const;
const DOMAIN_BADGE_STYLE = { ...BADGE_STYLE, background: "#eab308" } as const;
const DOMAIN_NAME_STYLE = {
  ...NAME_STYLE,
  color: "var(--ec-domain-group-text, rgb(var(--ec-page-text)))",
} as const;

export default memo(function SystemGroupNode({ data }: NodeProps) {
  const { system, domain, subdomain, isFocused } =
    data as unknown as SystemGroupNodeData;
  const isDomain = !!domain;
  const resource = domain ?? system;
  const typeLabel = isDomain ? (subdomain ? "Subdomain" : "Domain") : "System";

  return (
    <div style={isDomain ? DOMAIN_CONTAINER_STYLE : CONTAINER_STYLE}>
      {isFocused && <FocusedResourceIndicator />}
      {/* Lets other nodes connect to the whole system (e.g. related systems) */}
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
      {/* Floating type badge, styled like the System node's badge */}
      <span style={isDomain ? DOMAIN_BADGE_STYLE : BADGE_STYLE}>
        {isDomain ? (
          <BoxesIcon size={10} strokeWidth={2.5} />
        ) : (
          <GroupIcon size={10} strokeWidth={2.5} />
        )}
        {typeLabel}
      </span>

      {/* Header banner carrying the system (or domain) name */}
      <div style={isDomain ? DOMAIN_HEADER_STYLE : HEADER_STYLE}>
        <TruncatedResourceName
          value={resource?.name || typeLabel}
          tooltipBorderColor={isDomain ? "#eab308" : "#8b5cf6"}
          className="truncate"
          style={isDomain ? DOMAIN_NAME_STYLE : NAME_STYLE}
        >
          {resource?.name || typeLabel}
        </TruncatedResourceName>
        {resource?.version && (
          <span style={VERSION_STYLE}>v{resource.version}</span>
        )}
      </div>
    </div>
  );
});
