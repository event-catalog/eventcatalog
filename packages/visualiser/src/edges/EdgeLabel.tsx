import { EdgeLabelRenderer } from "@xyflow/react";
import type { CSSProperties, ReactNode } from "react";
import { CROSS_DOMAIN_CLASS } from "./use-cross-domain";

interface EdgeLabelProps {
  /** The edge's layer, so the label is drawn with it rather than on top of nodes */
  zIndex: number;
  /** Part of cross-domain communication, to highlight */
  crossDomain?: boolean;
  label: ReactNode;
  labelX: number;
  labelY: number;
  style?: CSSProperties;
}

export default function EdgeLabel({
  zIndex,
  crossDomain = false,
  label,
  labelX,
  labelY,
  style,
}: EdgeLabelProps) {
  if (label === undefined || label === null || label === "") return null;

  const lines = String(label).split("\n");

  return (
    <EdgeLabelRenderer>
      <div
        className={`ec-edge-label ${crossDomain ? CROSS_DOMAIN_CLASS : ""} nodrag nopan rounded-md border border-[rgb(var(--ec-page-border))] px-2 py-1 text-center text-[10px] font-medium leading-tight text-[rgb(var(--ec-page-text))] shadow-sm`}
        style={{
          position: "absolute",
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          zIndex,
          pointerEvents: "none",
          backgroundColor: "rgb(var(--ec-card-bg))",
          ...style,
        }}
      >
        {lines.map((line, index) => (
          <div
            key={`${line}-${index}`}
            className={`whitespace-nowrap ${index > 0 ? "italic" : ""}`}
          >
            {line}
          </div>
        ))}
      </div>
    </EdgeLabelRenderer>
  );
}
