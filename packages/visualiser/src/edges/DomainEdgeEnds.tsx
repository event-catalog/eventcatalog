import { memo } from "react";
import type { DomainEnds } from "./route";

// The domain's colour, as the handles of other nodes are in theirs
const DOMAIN_COLOR = "#eab308";
const RING_COLOR = "rgba(234, 179, 8, 0.5)";

const Dot = memo(function Dot({ x, y }: { x: number; y: number }) {
  return (
    <g className="ec-domain-edge-end" pointerEvents="none">
      {/* The ring around other nodes' handles (not pulsing: a domain's box isn't one node to hover) */}
      <circle
        cx={x}
        cy={y}
        r={7}
        fill="none"
        stroke={RING_COLOR}
        strokeWidth={2}
      />
      <circle
        cx={x}
        cy={y}
        r={5}
        fill={DOMAIN_COLOR}
        stroke="rgb(var(--ec-page-bg))"
        strokeWidth={2}
      />
    </g>
  );
});

/**
 * Dots where an edge meets a domain's box, like the handles other nodes show
 * where their edges connect. Drawn by the edge, as its ends are spread along
 * the box's side (one dot on the box wouldn't be where they meet it).
 */
export default memo(function DomainEdgeEnds({ ends }: { ends: DomainEnds }) {
  return (
    <>
      {ends.source && <Dot x={ends.source.x} y={ends.source.y} />}
      {ends.target && <Dot x={ends.target.x} y={ends.target.y} />}
    </>
  );
});
