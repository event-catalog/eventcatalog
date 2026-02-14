import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { BoxesIcon } from "lucide-react";

export type GroupNodeData = {
  mode: string;
  domain: {
    name: string;
    version: string;
    summary: string;
  };
};

const GROUP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
  borderRadius: 12,
  border: "2px solid var(--ec-group-border, #c4b5fd)",
  backgroundColor: "var(--ec-group-bg, rgba(250, 248, 255, 0.35))",
  position: "relative" as const,
  overflow: "visible" as const,
} as const;

const GROUP_HEADER_STYLE = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  height: 44,
  borderTopLeftRadius: 10,
  borderTopRightRadius: 10,
  background: "var(--ec-group-header-bg, rgba(237, 233, 254, 0.7))",
  borderBottom: "1px solid var(--ec-group-border, #c4b5fd)",
  overflow: "visible" as const,
} as const;

const GROUP_WATERMARK_STYLE = {
  position: "absolute" as const,
  top: 6,
  right: 10,
  opacity: 0.12,
  transform: "rotate(12deg)",
  pointerEvents: "none" as const,
} as const;

const GROUP_ICON_CIRCLE_STYLE = {
  position: "absolute" as const,
  top: -14,
  left: 12,
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "#7c3aed",
  border: "2px solid #a78bfa",
  display: "flex",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  zIndex: 10,
} as const;

const GROUP_BANNER_CONTENT_STYLE = {
  display: "flex",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  height: "100%",
  padding: "0 40px",
} as const;

const GROUP_BANNER_INNER_STYLE = {
  display: "flex",
  alignItems: "center" as const,
  gap: 8,
} as const;

const GROUP_DOMAIN_NAME_STYLE = {
  fontSize: 15,
  fontWeight: 800,
  color: "var(--ec-group-text, #5b21b6)",
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  whiteSpace: "nowrap" as const,
} as const;

const GROUP_VERSION_STYLE = {
  fontSize: 9,
  fontWeight: 500,
  color: "#a78bfa",
} as const;

const GROUP_ICON_COLOR_STYLE = { color: "#7c3aed" } as const;
const GROUP_ICON_WHITE_STYLE = { color: "white" } as const;

export default memo(function GroupNode({ data }: NodeProps) {
  const { domain } = data as unknown as GroupNodeData;

  return (
    <div style={GROUP_CONTAINER_STYLE}>
      {/* Header banner */}
      <div style={GROUP_HEADER_STYLE}>
        {/* Watermark icon in banner */}
        <div style={GROUP_WATERMARK_STYLE}>
          <BoxesIcon size={28} strokeWidth={2} style={GROUP_ICON_COLOR_STYLE} />
        </div>

        {/* Icon circle overlapping top of banner */}
        <div style={GROUP_ICON_CIRCLE_STYLE}>
          <BoxesIcon
            size={16}
            strokeWidth={2.5}
            style={GROUP_ICON_WHITE_STYLE}
          />
        </div>

        {/* Banner text content */}
        <div style={GROUP_BANNER_CONTENT_STYLE}>
          <div style={GROUP_BANNER_INNER_STYLE}>
            <span style={GROUP_DOMAIN_NAME_STYLE}>
              {domain?.name || "Domain"}
            </span>
            {domain?.version && (
              <span style={GROUP_VERSION_STYLE}>v{domain.version}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
