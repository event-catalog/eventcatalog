import { memo } from "react";
import { Workflow, Minimize2 } from "lucide-react";

export type FlowExpandedNodeData = {
  flowName?: string;
  version?: string;
};

// Container body keeps a visible teal tint that works in both themes — the
// teal is the sub-flow identity, while theme-aware variables handle text
// and header colour. The header uses the card-bg variable so it blends
// naturally over the dotted background in light and dark modes.
const CONTAINER_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: 12,
  border: "2px solid rgba(20, 184, 166, 0.5)",
  backgroundColor: "rgba(20, 184, 166, 0.08)",
  boxShadow: "0 2px 12px rgba(20, 184, 166, 0.12)",
  position: "relative",
  overflow: "visible",
};

const HEADER_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 44,
  borderTopLeftRadius: 10,
  borderTopRightRadius: 10,
  background: "rgba(20, 184, 166, 0.12)",
  borderBottom: "1px solid rgba(20, 184, 166, 0.3)",
  overflow: "visible",
};

const BADGE_STYLE: React.CSSProperties = {
  position: "absolute",
  top: -10,
  left: 12,
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  padding: "2px 8px",
  borderRadius: 4,
  background: "#0d9488",
  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
  zIndex: 10,
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "white",
};

const HEADER_CONTENT_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: "100%",
  padding: "0 12px 0 14px",
};

const FLOW_NAME_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "rgb(var(--ec-page-text))",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const VERSION_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  color: "#5eead4",
  marginLeft: 8,
};

const COLLAPSE_BUTTON_STYLE: React.CSSProperties = {
  background: "#0d9488",
  border: "1px solid #5eead4",
  borderRadius: 6,
  padding: "4px 10px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontSize: 10,
  fontWeight: 600,
  color: "white",
};

export default memo(function FlowExpandedNode({
  data,
}: {
  data: FlowExpandedNodeData;
}) {
  const { flowName, version } = data;

  return (
    <div style={CONTAINER_STYLE}>
      <div style={HEADER_STYLE}>
        <div style={BADGE_STYLE}>
          <Workflow size={10} strokeWidth={2.5} />
          Sub-flow
        </div>

        <div style={HEADER_CONTENT_STYLE}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={FLOW_NAME_STYLE}>{flowName || "Flow"}</span>
            {version && <span style={VERSION_STYLE}>v{version}</span>}
          </div>

          <button
            style={COLLAPSE_BUTTON_STYLE}
            className="ec-collapse-flow-btn nodrag nopan"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Minimize2 size={12} strokeWidth={2.5} />
            Collapse
          </button>
        </div>
      </div>
    </div>
  );
});
