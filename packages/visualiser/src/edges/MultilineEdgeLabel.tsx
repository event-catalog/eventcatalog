import { memo } from "react";
import { type EdgeProps, getSmoothStepPath } from "@xyflow/react";
import EdgeLabel from "./EdgeLabel";
import { useRoute } from "./route";
import { CROSS_DOMAIN_CLASS, isCrossDomain } from "./use-cross-domain";

export default memo(function MultilineEdgeLabel(props: EdgeProps) {
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
    label,
    markerStart, // <-- forward these
    markerEnd,
    style,
    selected,
    data,
  } = props;

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
    getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    }),
  );

  const crossDomain = isCrossDomain(data);

  return (
    <>
      <path
        id={id}
        d={edgePath}
        className={`react-flow__edge-path${selected ? " selected" : ""}${crossDomain ? ` ${CROSS_DOMAIN_CLASS}` : ""}`}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={style as any}
      />

      <EdgeLabel
        zIndex={zIndex}
        crossDomain={crossDomain}
        label={label}
        labelX={labelX}
        labelY={labelY}
      />
    </>
  );
});
