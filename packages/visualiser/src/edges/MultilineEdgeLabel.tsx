import { memo, useMemo } from "react";
import { type EdgeProps, getSmoothStepPath } from "@xyflow/react";

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

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const lines = useMemo(() => String(label ?? "").split("\n"), [label]);
  const firstLineDy = useMemo(
    () => `${-((lines.length - 1) * 1.2) / 2}em`,
    [lines.length],
  );
  const longestLine = useMemo(
    () => lines.reduce((a, b) => (a.length > b.length ? a : b), ""),
    [lines],
  );
  const labelWidth = Math.max(longestLine.length * 5.5 + 14, 44);
  const labelHeight = lines.length * 12 + 4;

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

      {label && (
        <rect
          x={labelX - labelWidth / 2}
          y={labelY - labelHeight / 2}
          width={labelWidth}
          height={labelHeight}
          fill="rgb(var(--ec-card-bg))"
          fillOpacity={0.95}
          stroke="rgb(var(--ec-page-border))"
          strokeWidth={0.75}
          rx={5}
          ry={5}
          pointerEvents="none"
        />
      )}

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
            dy={i === 0 ? firstLineDy : "1.2em"}
            style={i === 0 ? TSPAN_NORMAL_STYLE : TSPAN_ITALIC_STYLE}
          >
            {line}
          </tspan>
        ))}
      </text>
    </>
  );
});
