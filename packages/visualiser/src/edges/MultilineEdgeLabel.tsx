import { memo, useMemo } from "react";
import { type EdgeProps, getBezierPath } from "@xyflow/react";

const TSPAN_NORMAL_STYLE = { fontStyle: "normal" } as const;
const TSPAN_ITALIC_STYLE = { fontStyle: "italic" } as const;

export default memo(function MultilineEdgeLabel(props: EdgeProps) {
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

  const lines = useMemo(() => String(label ?? "").split("\n"), [label]);

  return (
    <>
      <path
        id={id}
        d={edgePath}
        className={`react-flow__edge-path${selected ? " selected" : ""}`}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={style as any}
      />

      {/* Optional: bigger hitbox for hover/selection */}

      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="10px"
        fill="rgb(var(--ec-page-text))"
        pointerEvents="none"
      >
        {lines.map((line, i) => (
          <tspan
            key={i}
            x={labelX}
            dy={i === 0 ? 0 : "1.2em"}
            style={i === 0 ? TSPAN_NORMAL_STYLE : TSPAN_ITALIC_STYLE}
          >
            {line}
          </tspan>
        ))}
      </text>
    </>
  );
});
