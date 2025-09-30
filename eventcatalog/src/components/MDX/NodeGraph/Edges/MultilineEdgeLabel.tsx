import { type EdgeProps, getBezierPath } from '@xyflow/react';

export default function MultilineEdgeLabel(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    label,
    markerStart, // <-- forward these
    markerEnd,
    style,
    selected,
  } = props;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const lines = String(label ?? '').split('\n');

  return (
    <>
      <path
        id={id}
        d={edgePath}
        className={`react-flow__edge-path${selected ? ' selected' : ''}`}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={style}
      />

      {/* Optional: bigger hitbox for hover/selection */}

      <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fontSize="10px" pointerEvents="none">
        {lines.map((line, i) => (
          <tspan key={i} x={labelX} dy={i === 0 ? 0 : '1.2em'} style={{ fontStyle: i === 0 ? 'normal' : 'italic' }}>
            {line}
          </tspan>
        ))}
      </text>
    </>
  );
}
