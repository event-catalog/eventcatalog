/**
 * A selected node's Edit button, above its top right corner (Details, when the canvas is locked). It's sized with
 * the canvas, as if it were on it: zoomed out it's small beside a small node, zoomed in it grows with it. Its own
 * component, so only it follows the zoom (not the whole canvas).
 */
import { memo } from "react";
import { NodeToolbar, Position, useStore } from "@xyflow/react";
import { Info, Pencil } from "lucide-react";

// Kept usable when far out, and not huge when far in
const MIN_SCALE = 0.4;
const MAX_SCALE = 1.6;
const OFFSET = 8;

export default memo(function EditButton({
  nodeId,
  locked,
  onClick,
}: {
  nodeId: string;
  locked: boolean;
  onClick: () => void;
}) {
  const zoom = useStore((state) => state.transform[2]);
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, zoom));
  return (
    <NodeToolbar
      nodeId={nodeId}
      isVisible
      position={Position.Top}
      align="end"
      offset={OFFSET * scale}
    >
      {/* Scaled from its bottom right corner, so it stays on the node's corner */}
      <button
        type="button"
        className="studio-edit-button"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "bottom right",
        }}
        onClick={onClick}
      >
        {locked ? (
          <>
            <Info aria-hidden /> Details
          </>
        ) : (
          <>
            <Pencil aria-hidden /> Edit
          </>
        )}
      </button>
    </NodeToolbar>
  );
});
