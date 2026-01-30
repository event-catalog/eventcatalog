import React, { useState, useCallback, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { XIcon, FocusIcon } from 'lucide-react';
import { ReactFlowProvider, type Node, type Edge, type NodeTypes, type EdgeTypes } from '@xyflow/react';
import FocusModeContent from './FocusMode/FocusModeContent';
import { getNodeDisplayInfo } from './FocusMode/utils';

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
  const [centerNodeId, setCenterNodeId] = useState<string | null>(initialNodeId);

  // Reset center node when modal opens with new initial node
  useEffect(() => {
    if (isOpen && initialNodeId) {
      setCenterNodeId(initialNodeId);
    }
  }, [isOpen, initialNodeId]);

  const handleSwitchCenter = useCallback((newCenterNodeId: string, _direction: 'left' | 'right') => {
    setCenterNodeId(newCenterNodeId);
  }, []);

  // Get center node info for title
  const centerNode = centerNodeId ? nodes.find((n) => n.id === centerNodeId) : null;
  const centerNodeInfo = centerNode ? getNodeDisplayInfo(centerNode) : null;

  if (!centerNodeId) {
    return null;
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal container={typeof document !== 'undefined' ? document.body : undefined}>
        <div className="fixed inset-0 z-[99999]" style={{ isolation: 'isolate' }}>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 data-[state=open]:animate-overlayShow" />
          <Dialog.Content className="fixed inset-4 md:inset-8 lg:inset-12 rounded-lg bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] shadow-xl focus:outline-none data-[state=open]:animate-contentShow flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--ec-page-border))] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[rgb(var(--ec-accent-subtle))]">
                  <FocusIcon className="w-5 h-5 text-[rgb(var(--ec-accent))]" />
                </div>
                <div>
                  <Dialog.Title className="text-lg font-semibold text-[rgb(var(--ec-page-text))]">Focus Mode</Dialog.Title>
                  <Dialog.Description className="text-sm text-[rgb(var(--ec-page-text-muted))]">
                    {centerNodeInfo
                      ? `Exploring: ${centerNodeInfo.name} - Click on connected nodes to navigate`
                      : 'Explore node connections'}
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close asChild>
                <button
                  className="flex items-center justify-center w-10 h-10 rounded-lg text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-content-hover,var(--ec-page-border)/0.5))] transition-colors"
                  aria-label="Close"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
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
