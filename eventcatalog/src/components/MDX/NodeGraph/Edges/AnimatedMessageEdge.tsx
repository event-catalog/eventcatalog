import { useState } from 'react';
import { BaseEdge, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

export default function AnimatedMessageEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  label,
  labelStyle = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const messageType = data?.message?.collection || 'message';
  const messageName = data?.message?.data?.name || label || '';
  const messageAnimation = data?.animated === false ? false : true;
  
  // Determine color based on message type
  let strokeColor = style?.stroke || '#374151'; 
  if (messageType === 'events') strokeColor = '#ed8936'; // orange for events
  if (messageType === 'commands') strokeColor = '#4299e1'; // blue for commands
  if (messageType === 'queries') strokeColor = '#48bb78'; // green for queries
  
  // Enhanced styles
  const edgeStyles = {
    ...style,
    stroke: strokeColor,
    strokeWidth: isHovered ? 3 : style.strokeWidth || 1.5,
    opacity: data?.opacity !== undefined ? data.opacity : style?.opacity !== undefined ? style.opacity : 1,
  };
  
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyles}
        markerEnd={markerEnd}
        className={messageAnimation ? "react-flow__edge-path-animated" : ""}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              fontSize: '10px',
              padding: '4px 6px',
              borderRadius: '4px',
              backgroundColor: isHovered ? '#f8fafc' : 'rgba(248, 250, 252, 0.8)',
              border: isHovered ? '1px solid #e2e8f0' : 'none',
              color: '#475569',
              fontWeight: isHovered ? 'bold' : 'normal',
              boxShadow: isHovered ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)' : 'none',
              opacity: data?.opacity !== undefined ? data.opacity : labelStyle?.opacity !== undefined ? labelStyle.opacity : 1,
              maxWidth: '150px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transition: 'all 0.2s ease',
              ...(labelStyle || {}),
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {label}
            {isHovered && messageType && messageName && (
              <div className="text-xs absolute bg-white border border-gray-200 shadow-sm rounded p-2 z-10 mt-1 w-max max-w-[200px]">
                <div className="text-gray-800 font-semibold">{messageName}</div>
                <div className="text-gray-500 capitalize">{messageType.replace(/s$/, '')}</div>
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
