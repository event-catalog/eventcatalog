import { memo, useMemo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps as XYFlowEdgeProps,
} from "@xyflow/react";
import { EDGE_FLOW_BASE_STYLE } from "../nodes/shared-styles";

interface EdgeData {
  message?: {
    collection?: string;
  };
  opacity?: number;
  animated?: boolean;
}

export interface CustomEdgeProps extends Omit<XYFlowEdgeProps, "data"> {
  data?: EdgeData;
}

/** Map collection type → circle fill color (module-level, zero allocation). */
function messageColor(collection: string): string {
  switch (collection) {
    case "events":
      return "orange";
    case "commands":
      return "blue";
    case "queries":
      return "green";
    default:
      return "gray";
  }
}

const EMPTY_STYLE = {} as const;

export default memo(function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = EMPTY_STYLE,
  markerEnd,
  label,
  labelStyle,
  data,
}: CustomEdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
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

  const mergedStyle = useMemo(
    () => ({ ...EDGE_FLOW_BASE_STYLE, ...style }),
    [style],
  );

  const labelPositionStyle = useMemo(
    () => ({
      position: "absolute" as const,
      transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
      zIndex: 1000,
      ...(labelStyle as any),
    }),
    [labelX, labelY, labelStyle],
  );

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={mergedStyle} />
      {data?.animated && (
        <g
          className={`ec-animated-msg z-30 ${opacity === 1 ? "opacity-100" : "opacity-10"}`}
        >
          <circle
            cx="0"
            cy="0"
            r="7"
            fill={messageColor(collection || "default")}
          >
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path={edgePath}
              rotate="auto"
              begin={`${randomDelay}s`}
            >
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>
        </g>
      )}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={labelPositionStyle}
            className="nodrag nopan max-w-[120px] text-xs bg-[rgb(var(--ec-card-bg))] px-2 py-1 rounded border border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text-muted))] font-medium shadow-sm text-center"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
