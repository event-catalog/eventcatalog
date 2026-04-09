import { memo, useMemo } from "react";
import { Layers, Zap, Terminal, HelpCircle, Maximize2 } from "lucide-react";
import { Node, Handle, Position, useNodeConnections } from "@xyflow/react";
import { HIDDEN_HANDLE_STYLE } from "../OwnerIndicator";
import { useDarkMode } from "../shared-styles";

export type MessageGroupNodeData = {
  mode?: string;
  groupName: string;
  direction: "sends" | "receives";
  messageCount: number;
  messageTypes: string[];
  messages: Array<{
    message: any;
    channels: any[];
  }>;
  service: { id: string; version: string };
};

export type MessageGroupNode = Node<MessageGroupNodeData, "messageGroup">;

const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  events: Zap,
  commands: Terminal,
  queries: HelpCircle,
};

const CARD_STYLE: React.CSSProperties = {
  borderRadius: 12,
  border: "2px solid rgba(139, 92, 246, 0.4)",
  background: "var(--ec-message-group-node-bg, rgb(var(--ec-card-bg)))",
  pointerEvents: "none" as const,
};

export default memo(function MessageGroupNode(props: MessageGroupNode) {
  const { groupName, messageCount } = props.data;
  const isDark = useDarkMode();
  const targetConnections = useNodeConnections({ handleType: "target" });
  const sourceConnections = useNodeConnections({ handleType: "source" });
  const stackDepth = messageCount >= 3 ? 3 : messageCount;

  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    props.data.messages.forEach(({ message }) => {
      const type = message?.collection || "unknown";
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [props.data.messages]);

  return (
    <div className="relative" style={{ isolation: "isolate" }}>
      {/* Stack layers — positioned behind the main card */}
      {stackDepth >= 3 && (
        <div
          style={{
            ...CARD_STYLE,
            position: "absolute",
            inset: 0,
            transform: "translate(6px, 6px)",
            opacity: 0.5,
          }}
        />
      )}
      {stackDepth >= 2 && (
        <div
          style={{
            ...CARD_STYLE,
            position: "absolute",
            inset: 0,
            transform: "translate(3px, 3px)",
            opacity: 0.7,
          }}
        />
      )}

      {/* Main card */}
      <div
        className={`relative min-w-48 max-w-60 rounded-xl border-2 overflow-visible ${
          props.selected ? "ring-2 ring-violet-400/60 ring-offset-2" : ""
        } border-violet-500`}
        style={{
          background: "var(--ec-message-group-node-bg, rgb(var(--ec-card-bg)))",
          boxShadow: "0 2px 12px rgba(139, 92, 246, 0.15)",
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

        {targetConnections.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: -6,
              transform: "translateY(-50%)",
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
              border: "2px solid rgb(var(--ec-page-bg))",
              zIndex: 20,
              animation: "ec-handle-pulse 2s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
        )}
        {sourceConnections.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              right: -6,
              transform: "translateY(-50%)",
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
              border: "2px solid rgb(var(--ec-page-bg))",
              zIndex: 20,
              animation: "ec-handle-pulse 2s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
        )}

        <div className="absolute -top-2.5 left-2.5 z-10">
          <span className="inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm bg-violet-600">
            <Layers className="w-2.5 h-2.5" strokeWidth={2.5} />
            Group
          </span>
        </div>

        <div className="px-3 pt-3.5 pb-2.5">
          <div className="text-[13px] font-semibold leading-snug text-[rgb(var(--ec-page-text))]">
            {groupName}
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{
                background: isDark
                  ? "rgba(139, 92, 246, 0.2)"
                  : "rgba(139, 92, 246, 0.1)",
                color: isDark ? "#c4b5fd" : "#6d28d9",
              }}
            >
              {messageCount} {messageCount === 1 ? "message" : "messages"}
            </span>
            <div className="flex items-center gap-1">
              {Object.entries(typeBreakdown).map(([type, count]) => {
                const Icon = TYPE_ICONS[type] || HelpCircle;
                return (
                  <span
                    key={type}
                    className="flex items-center gap-0.5 text-[9px] text-[rgb(var(--ec-page-text-muted))]"
                  >
                    <Icon className="w-2.5 h-2.5" strokeWidth={2} />
                    {count}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="mt-1.5 flex items-center gap-1 text-[8px] text-[rgb(var(--ec-page-text-muted))]">
            <Maximize2 className="w-2.5 h-2.5" />
            Click to explore
          </div>
        </div>
      </div>
    </div>
  );
});
