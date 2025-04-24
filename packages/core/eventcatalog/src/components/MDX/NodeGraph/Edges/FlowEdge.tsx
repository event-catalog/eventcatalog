import { useMemo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps as XYFlowEdgeProps } from '@xyflow/react';

interface EdgeData {
  message?: {
    collection?: string;
  };
  opacity?: number;
  animated?: boolean;
}

interface CustomEdgeProps extends Omit<XYFlowEdgeProps, 'data'> {
  data?: EdgeData;
}

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  labelStyle,
  data,
}: CustomEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const randomDelay = useMemo(() => Math.random() * 1, []);
  const collection = data?.message?.collection;
  const opacity = data?.opacity ?? 1;

  const messageColor = useMemo(
    () => (collection: string) => {
      switch (collection) {
        case 'events':
          return 'orange';
        case 'commands':
          return 'blue';
        case 'queries':
          return 'green';
        default:
          return 'gray';
      }
    },
    []
  );

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeWidth: 2,
          stroke: '#fff',
          ...style,
        }}
      />
      {data?.animated && (
        <g className={`z-30 ${opacity === 1 ? 'opacity-100' : 'opacity-10'}`}>
          <circle cx="0" cy="0" r="7" fill={messageColor(collection || 'default')}>
            <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} rotate="auto" begin={`${randomDelay}s`}>
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>
        </g>
      )}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              zIndex: 1000,
              ...labelStyle,
            }}
            className="nodrag nopan max-w-[150px] text-xs bg-white px-2 py-1 rounded border border-gray-200 text-gray-600 font-medium shadow-sm"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
