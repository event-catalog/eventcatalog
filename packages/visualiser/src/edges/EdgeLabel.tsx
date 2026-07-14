import { EdgeLabelRenderer } from "@xyflow/react";
import type { CSSProperties, ReactNode } from "react";

interface EdgeLabelProps {
  label: ReactNode;
  labelX: number;
  labelY: number;
  style?: CSSProperties;
}

export default function EdgeLabel({
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
        className="nodrag nopan rounded-md border border-[rgb(var(--ec-page-border))] px-2 py-1 text-center text-[10px] font-medium leading-tight text-[rgb(var(--ec-page-text))] shadow-sm"
        style={{
          position: "absolute",
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          zIndex: 1000,
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
