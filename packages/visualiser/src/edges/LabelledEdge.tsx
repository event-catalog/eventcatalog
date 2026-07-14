import {
  BaseEdge,
  getBezierPath,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import type { CSSProperties } from "react";
import EdgeLabel from "./EdgeLabel";

type PathType = "bezier" | "smoothstep" | "step";

function LabelledEdge({
  pathType,
  ...props
}: EdgeProps & { pathType: PathType }) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerStart,
    markerEnd,
    style,
    label,
    labelStyle,
  } = props;

  const pathProps = {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  };
  const [edgePath, labelX, labelY] =
    pathType === "bezier"
      ? getBezierPath(pathProps)
      : getSmoothStepPath({
          ...pathProps,
          ...(pathType === "step" ? { borderRadius: 0 } : {}),
        });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={style}
      />
      <EdgeLabel
        label={label}
        labelX={labelX}
        labelY={labelY}
        style={labelStyle as CSSProperties}
      />
    </>
  );
}

export function LabelledDefaultEdge(props: EdgeProps) {
  return <LabelledEdge {...props} pathType="bezier" />;
}

export function LabelledSmoothStepEdge(props: EdgeProps) {
  return <LabelledEdge {...props} pathType="smoothstep" />;
}

export function LabelledStepEdge(props: EdgeProps) {
  return <LabelledEdge {...props} pathType="step" />;
}
