import { memo } from "react";
import { MiniMap, type MiniMapNodeProps } from "@xyflow/react";
import { getMiniMapNodeClassName } from "../utils/minimap";

const MINIMAP_STYLE = {
  backgroundColor: "rgb(var(--ec-card-bg))",
  border: "1px solid rgb(var(--ec-page-border))",
  borderRadius: "8px",
} as const;

/**
 * A node on the minimap: a rect coloured by its class names alone (`.ec-minimap-*` in styles-core.css and
 * styles.css), so a node's own style (e.g. a transparent background) doesn't hide it
 */
const DiagramMiniMapNode = memo(function DiagramMiniMapNode({
  x,
  y,
  width,
  height,
  className,
  shapeRendering,
}: MiniMapNodeProps) {
  return (
    <rect
      className={className}
      x={x}
      y={y}
      rx={6}
      ry={6}
      width={width}
      height={height}
      shapeRendering={shapeRendering}
    />
  );
});

/**
 * A diagram's minimap: each node in its resource's colour, and domains and systems as outlined containers with
 * what's in them inside, as the diagram draws them. The same wherever a diagram is drawn (the visualiser and Studio).
 */
const DiagramMiniMap = memo(function DiagramMiniMap() {
  return (
    <MiniMap
      zoomable
      pannable
      style={MINIMAP_STYLE}
      nodeClassName={getMiniMapNodeClassName}
      nodeComponent={DiagramMiniMapNode}
    />
  );
});

export default DiagramMiniMap;
