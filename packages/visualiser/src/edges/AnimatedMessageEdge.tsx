import { memo, useMemo } from "react";
import { BaseEdge, getSmoothStepPath } from "@xyflow/react";
import { EDGE_WARNING_STYLE, EDGE_DEFAULT_STYLE } from "../nodes/shared-styles";
import EdgeLabel from "./EdgeLabel";

/** Map collection type → envelope fill color (module-level, zero allocation). */
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

const AnimatedMessageEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    label = "",
    markerEnd,
    markerStart,
  }: any) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    const collection = data?.message?.collection;
    const opacity = data?.opacity ?? 1;
    const customColor =
      data?.customColor || messageColor(collection ?? "default");
    const warning = data?.warning;

    const customColors = Array.isArray(customColor)
      ? customColor
      : [customColor];

    const randomDelay = useMemo(() => Math.random() * 1, []);

    const opacityClass = opacity === 1 ? "z-30 opacity-100" : "z-30 opacity-10";

    const animatedNodes = useMemo(
      () =>
        customColors.map((color: string, index: number) => {
          const delay = randomDelay + index * 0.3;
          return (
            <g
              className={`ec-animated-msg ${opacityClass}`}
              key={`${id}-${color}-${index}`}
            >
              <g>
                <rect
                  x="-7"
                  y="-5"
                  width="14"
                  height="10"
                  rx="1.5"
                  ry="1.5"
                  fill={color}
                />
                <path
                  d="M-7,-5 L0,1 L7,-5"
                  fill="none"
                  stroke="rgb(var(--ec-card-bg))"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <animateMotion
                  dur="2s"
                  repeatCount="indefinite"
                  path={edgePath}
                  rotate="auto"
                  begin={`${delay}s`}
                >
                  <mpath href={`#${id}`} />
                </animateMotion>
              </g>
            </g>
          );
        }),
      // edgePath changes when endpoints move — that's the only time we need to rebuild SVG
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [edgePath, id, customColors.join(","), opacity, randomDelay],
    );

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          markerStart={markerStart}
          style={warning ? EDGE_WARNING_STYLE : EDGE_DEFAULT_STYLE}
        />
        {animatedNodes}
        <EdgeLabel label={label} labelX={labelX} labelY={labelY} />
      </>
    );
  },
);

export default AnimatedMessageEdge;
