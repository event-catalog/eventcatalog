import { EdgeLabelPortal } from "../utils/flow-portals";
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

/**
 * An edge's label, as a small neutral pill (as Vercel's): the first line (what the edge does, e.g. "publishes") in the
 * text colour, any lines after it (the message, or the rest of a route) muted, with no italics
 */
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
    <EdgeLabelPortal>
      <div
        className={`ec-edge-label ${crossDomain ? CROSS_DOMAIN_CLASS : ""} nodrag nopan rounded-[5px] border border-[rgb(var(--ec-page-border))] px-1.5 py-0.5 text-center text-[10px] leading-[14px] tracking-[-0.01em] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.08)]`}
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
            className={`whitespace-nowrap ${
              index > 0
                ? "text-[rgb(var(--ec-page-text-muted))]"
                : "font-medium text-[rgb(var(--ec-page-text))]"
            }`}
          >
            {line}
          </div>
        ))}
      </div>
    </EdgeLabelPortal>
  );
}
