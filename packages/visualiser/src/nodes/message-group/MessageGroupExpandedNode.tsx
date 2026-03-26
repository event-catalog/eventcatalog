import { memo } from "react";
import { Layers, Minimize2 } from "lucide-react";

export type MessageGroupExpandedNodeData = {
  groupName: string;
  direction: "sends" | "receives";
  messageCount: number;
  onCollapse?: string; // group node ID to collapse back to
};

const CONTAINER_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  borderRadius: 12,
  border: "2px solid rgba(139, 92, 246, 0.5)",
  backgroundColor: "rgba(139, 92, 246, 0.05)",
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
  background: "rgba(139, 92, 246, 0.12)",
  borderBottom: "1px solid rgba(139, 92, 246, 0.3)",
  overflow: "visible",
};

const ICON_CIRCLE_STYLE: React.CSSProperties = {
  position: "absolute",
  top: -14,
  left: 12,
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "#7c3aed",
  border: "2px solid #a78bfa",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  zIndex: 10,
};

const HEADER_CONTENT_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: "100%",
  padding: "0 12px 0 52px",
};

const GROUP_NAME_STYLE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "var(--ec-group-text, #5b21b6)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const COUNT_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  color: "#a78bfa",
  marginLeft: 8,
};

const COLLAPSE_BUTTON_STYLE: React.CSSProperties = {
  background: "rgba(139, 92, 246, 0.15)",
  border: "1px solid rgba(139, 92, 246, 0.3)",
  borderRadius: 6,
  padding: "4px 8px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontSize: 10,
  fontWeight: 600,
  color: "#7c3aed",
};

export default memo(function MessageGroupExpandedNode({
  data,
}: {
  data: MessageGroupExpandedNodeData;
}) {
  const { groupName, messageCount } = data;

  return (
    <div style={CONTAINER_STYLE}>
      <div style={HEADER_STYLE}>
        <div style={ICON_CIRCLE_STYLE}>
          <Layers size={16} strokeWidth={2.5} style={{ color: "white" }} />
        </div>

        <div style={HEADER_CONTENT_STYLE}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={GROUP_NAME_STYLE}>{groupName || "Message Group"}</span>
            <span style={COUNT_STYLE}>
              {messageCount} {messageCount === 1 ? "message" : "messages"}
            </span>
          </div>

          <button
            style={COLLAPSE_BUTTON_STYLE}
            className="ec-collapse-group-btn nodrag nopan"
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
