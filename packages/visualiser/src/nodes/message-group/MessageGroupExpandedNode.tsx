import { memo } from "react";
import { Layers, Minimize2 } from "lucide-react";
import { TruncatedResourceName } from "../TruncatedResourceName";

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
  border: "2px solid rgba(110, 86, 207, 0.5)",
  backgroundColor: "rgba(110, 86, 207, 0.05)",
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
  background: "rgba(110, 86, 207, 0.12)",
  borderBottom: "1px solid rgba(110, 86, 207, 0.3)",
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
  background: "#654dc4",
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
  gap: 12,
};

const GROUP_NAME_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--ec-group-text, #6550b9)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const COUNT_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  color: "#aa99ec",
  marginLeft: 8,
};

const COLLAPSE_BUTTON_STYLE: React.CSSProperties = {
  background: "#654dc4",
  border: "1px solid #aa99ec",
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

export default memo(function MessageGroupExpandedNode({
  data,
}: {
  data: MessageGroupExpandedNodeData;
}) {
  const { groupName, messageCount } = data;

  return (
    <div style={CONTAINER_STYLE}>
      <div style={HEADER_STYLE}>
        <div style={BADGE_STYLE}>
          <Layers size={10} strokeWidth={2.5} />
          Group
        </div>

        <div style={HEADER_CONTENT_STYLE}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              minWidth: 0,
              flex: 1,
            }}
          >
            <TruncatedResourceName
              value={groupName || "Group"}
              tooltipBorderColor="#6e56cf"
              className="truncate"
              style={GROUP_NAME_STYLE}
            >
              {groupName || "Group"}
            </TruncatedResourceName>
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
