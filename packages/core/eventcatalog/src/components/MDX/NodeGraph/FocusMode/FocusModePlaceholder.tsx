import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface FocusModePlaceholderProps {
  data: {
    label: string;
    side: 'left' | 'right';
  };
}

const FocusModePlaceholder: React.FC<FocusModePlaceholderProps> = ({ data }) => {
  const { label, side } = data;

  return (
    <div
      className="px-4 py-4 rounded-lg border-2 border-dashed border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg)/0.5)] max-w-[280px] flex items-center justify-center"
      style={{ opacity: 0.6, minHeight: '130px' }}
    >
      {side === 'right' && <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />}
      <div className="text-center text-sm text-[rgb(var(--ec-page-text-muted))] italic">{label}</div>
      {side === 'left' && <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />}
    </div>
  );
};

export default FocusModePlaceholder;
