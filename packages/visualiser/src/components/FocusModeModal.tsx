import React, { useState, useCallback, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { XIcon, FocusIcon } from "lucide-react";
import {
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import FocusModeContent from "./FocusMode/FocusModeContent";
import { getNodeDisplayInfo } from "./FocusMode/utils";
import { useDarkMode } from "../nodes/shared-styles";

interface FocusModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNodeId: string | null;
  nodes: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  edgeTypes: EdgeTypes;
}

const FocusModeModal: React.FC<FocusModeModalProps> = ({
  isOpen,
  onClose,
  initialNodeId,
  nodes,
  edges,
  nodeTypes,
  edgeTypes,
}) => {
  const [centerNodeId, setCenterNodeId] = useState<string | null>(
    initialNodeId,
  );
  const isDark = useDarkMode();

  // Reset center node when modal opens with new initial node
  useEffect(() => {
    if (isOpen && initialNodeId) {
      setCenterNodeId(initialNodeId);
    }
  }, [isOpen, initialNodeId]);

  const handleSwitchCenter = useCallback(
    (newCenterNodeId: string, _direction: "left" | "right") => {
      setCenterNodeId(newCenterNodeId);
    },
    [],
  );

  // Get center node info for title
  const centerNode = centerNodeId
    ? nodes.find((n) => n.id === centerNodeId)
    : null;
  const centerNodeInfo = centerNode ? getNodeDisplayInfo(centerNode) : null;

  if (!centerNodeId) {
    return null;
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal
        container={typeof document !== "undefined" ? document.body : undefined}
      >
        <div
          className="fixed inset-0 z-[99999] eventcatalog-visualizer"
          style={{ isolation: "isolate" }}
        >
          <Dialog.Overlay
            style={{
              position: "fixed",
              inset: 0,
              background: isDark
                ? "rgba(0, 0, 0, 0.75)"
                : "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(2px)",
            }}
          />
          <Dialog.Content
            style={{
              position: "fixed",
              inset: "1rem",
              borderRadius: 12,
              background: isDark ? "#0f172a" : "#ffffff",
              border: `1px solid ${
                isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
              }`,
              boxShadow: isDark
                ? "0 24px 48px rgba(0,0,0,0.5)"
                : "0 24px 48px rgba(0,0,0,0.15)",
              outline: "none",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.5rem",
                borderBottom: `1px solid ${
                  isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
                }`,
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: isDark
                      ? "rgba(59, 130, 246, 0.18)"
                      : "rgba(59, 130, 246, 0.12)",
                  }}
                >
                  <FocusIcon
                    style={{
                      width: 20,
                      height: 20,
                      color: isDark ? "#93c5fd" : "#2563eb",
                    }}
                  />
                </div>
                <div>
                  <Dialog.Title
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: isDark ? "#f8fafc" : "#0f172a",
                    }}
                  >
                    Focus Mode
                  </Dialog.Title>
                  <Dialog.Description
                    style={{
                      marginTop: 2,
                      fontSize: 14,
                      color: isDark ? "#94a3b8" : "#475569",
                    }}
                  >
                    {centerNodeInfo
                      ? `Exploring: ${centerNodeInfo.name} - Click on connected nodes to navigate`
                      : "Explore node connections"}
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close asChild>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    background: "transparent",
                    color: isDark ? "#94a3b8" : "#64748b",
                  }}
                  aria-label="Close"
                >
                  <XIcon style={{ width: 20, height: 20 }} />
                </button>
              </Dialog.Close>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <ReactFlowProvider>
                <FocusModeContent
                  centerNodeId={centerNodeId}
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  onSwitchCenter={handleSwitchCenter}
                />
              </ReactFlowProvider>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default FocusModeModal;
