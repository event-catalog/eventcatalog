import { memo } from "react";
import { useInternalNode, ViewportPortal } from "@xyflow/react";

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
      className={`absolute flex items-center justify-center rounded-full font-bold text-white shadow-md bg-[rgb(var(--ec-accent))] ${
        current ? "ring-4 ring-[rgb(var(--ec-accent)/0.3)]" : "opacity-90"
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
    <ViewportPortal>
      {[...numbers].map(([nodeId, number]) => (
        <Badge
          key={nodeId}
          nodeId={nodeId}
          number={number}
          current={nodeId === current}
        />
      ))}
    </ViewportPortal>
  );
});
