import { memo } from "react";
import { type EdgeProps, getSmoothStepPath } from "@xyflow/react";
import EdgeLabel from "./EdgeLabel";

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

      <EdgeLabel label={label} labelX={labelX} labelY={labelY} />
    </>
  );
});
