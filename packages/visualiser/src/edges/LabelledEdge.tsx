import {
  BaseEdge,
  getBezierPath,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import type { CSSProperties } from "react";
import EdgeLabel from "./EdgeLabel";
import { useRoute } from "./route";
import { CROSS_DOMAIN_CLASS, isCrossDomain } from "./use-cross-domain";

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
    source,
    target,
    sourceHandleId,
    targetHandleId,
    markerStart,
    markerEnd,
    style,
    label,
    labelStyle,
    data,
  } = props;

  const pathProps = {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  };
  const [edgePath, labelX, labelY, zIndex] = useRoute(
    {
      data,
      source,
      target,
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourceHandleId,
      targetHandleId,
    },
    pathType === "bezier"
      ? getBezierPath(pathProps)
      : getSmoothStepPath({
          ...pathProps,
          ...(pathType === "step" ? { borderRadius: 0 } : {}),
        }),
  );

  const crossDomain = isCrossDomain(data);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={style}
        className={crossDomain ? CROSS_DOMAIN_CLASS : undefined}
      />
      <EdgeLabel
        zIndex={zIndex}
        crossDomain={crossDomain}
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
