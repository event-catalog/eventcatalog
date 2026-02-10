import React from 'react';
import { NodeToolbar, Position, useViewport, type Node } from '@xyflow/react';
import { ArrowRightLeft, FileText } from 'lucide-react';
import { getNodeDocUrl } from './utils';
import { buildUrl } from '@utils/url-builder';

interface FocusModeNodeActionsProps {
  node: Node;
  isCenter: boolean;
  onSwitch: (nodeId: string, direction: 'left' | 'right') => void;
}

const FocusModeNodeActions: React.FC<FocusModeNodeActionsProps> = ({ node, isCenter, onSwitch }) => {
  const { zoom } = useViewport();

  // Don't show actions for placeholder nodes
  if (node.type === 'placeholder') return null;

  const docUrl = getNodeDocUrl(node);
  const direction = (node.position?.x ?? 0) < 0 ? 'left' : 'right';

  // Scale sizes based on zoom (inverse relationship - smaller when zoomed out)
  const baseButtonSize = 32;
  const baseIconSize = 16;
  const scaleFactor = Math.max(0.6, Math.min(1, zoom));
  const buttonSize = Math.round(baseButtonSize * scaleFactor);
  const iconSize = Math.round(baseIconSize * scaleFactor);

  const handleSwitch = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSwitch(node.id, direction);
  };

  const handleDocClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (docUrl) {
      window.location.href = buildUrl(docUrl);
    }
  };

  // Center node only shows docs icon (if available)
  if (isCenter) {
    if (!docUrl) return null;
    return (
      <NodeToolbar nodeId={node.id} position={Position.Bottom} isVisible={true} offset={-16}>
        <div
          className="flex items-center gap-1 bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-lg shadow-md"
          style={{ padding: Math.round(4 * scaleFactor) }}
        >
          <button
            onClick={handleDocClick}
            className="flex items-center justify-center rounded-md text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-accent))] hover:bg-[rgb(var(--ec-accent-subtle))] transition-colors"
            style={{ width: buttonSize, height: buttonSize }}
            title="View documentation"
          >
            <FileText style={{ width: iconSize, height: iconSize }} />
          </button>
        </div>
      </NodeToolbar>
    );
  }

  return (
    <NodeToolbar nodeId={node.id} position={Position.Bottom} isVisible={true} offset={-16}>
      <div
        className="flex items-center gap-1 bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-lg shadow-md"
        style={{ padding: Math.round(4 * scaleFactor) }}
      >
        {docUrl && (
          <button
            onClick={handleDocClick}
            className="flex items-center justify-center rounded-md text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-accent))] hover:bg-[rgb(var(--ec-accent-subtle))] transition-colors"
            style={{ width: buttonSize, height: buttonSize }}
            title="View documentation"
          >
            <FileText style={{ width: iconSize, height: iconSize }} />
          </button>
        )}
        <button
          onClick={handleSwitch}
          className="flex items-center justify-center rounded-md text-[rgb(var(--ec-icon-color))] hover:text-[rgb(var(--ec-accent))] hover:bg-[rgb(var(--ec-accent-subtle))] transition-colors"
          style={{ width: buttonSize, height: buttonSize }}
          title="Focus on this node"
        >
          <ArrowRightLeft style={{ width: iconSize, height: iconSize }} />
        </button>
      </div>
    </NodeToolbar>
  );
};

export default FocusModeNodeActions;
