import { memo } from "react";
import { useInternalNode } from "@xyflow/react";
import { CanvasPortal } from "../utils/flow-portals";

const BADGE_SIZE = 30;

const Badge = memo(function Badge({
  nodeId,
  number,
  current,
}: {
  nodeId: string;
  number: number;
  current: boolean;
}) {
  const node = useInternalNode(nodeId);
  if (!node) return null;
  const { x, y } = node.internals.positionAbsolute;
  return (
    <div
      // Neutral, as the walkthrough's card: the text colour, the step being shown ringed in a grey of it
      className={`absolute flex items-center justify-center rounded-full font-mono font-semibold text-[rgb(var(--ec-page-bg))] bg-[rgb(var(--ec-page-text))] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.18)] ${
        current
          ? "ring-4 ring-[color-mix(in_srgb,rgb(var(--ec-page-text))_20%,transparent)]"
          : "opacity-90"
      }`}
      style={{
        width: BADGE_SIZE,
        height: BADGE_SIZE,
        fontSize: 14,
        // On the node's top left corner
        transform: `translate(${x - BADGE_SIZE / 2}px, ${y - BADGE_SIZE / 2}px)`,
        zIndex: 2000,
        pointerEvents: "none",
      }}
    >
      {number}
    </div>
  );
});

/**
 * Numbers the steps walked so far in a flow walkthrough (on the nodes, in the
 * order they were walked), so the way taken through the flow stays visible.
 * A step walked more than once (a loop) shows when it was last walked.
 */
export default memo(function WalkthroughBadges({ trail }: { trail: string[] }) {
  if (trail.length === 0) return null;
  const numbers = new Map<string, number>();
  trail.forEach((nodeId, index) => numbers.set(nodeId, index + 1));
  const current = trail[trail.length - 1];
  return (
    <CanvasPortal>
      {[...numbers].map(([nodeId, number]) => (
        <Badge
          key={nodeId}
          nodeId={nodeId}
          number={number}
          current={nodeId === current}
        />
      ))}
    </CanvasPortal>
  );
});
