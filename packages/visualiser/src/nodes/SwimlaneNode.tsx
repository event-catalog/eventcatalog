import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Boxes, Globe, Group, HelpCircle, Users } from "lucide-react";
import {
  LANE_HEADER_WIDTH,
  LANE_LABEL,
  type SwimlaneGroupBy,
  type SwimlaneNodeData,
} from "../utils/swimlanes";

export const LANE_ICONS: Record<SwimlaneGroupBy, typeof Boxes> = {
  domain: Boxes,
  system: Group,
  team: Users,
};

// Lanes are tinted in the colour of what they group (as the domain and system
// boundary boxes are), every other lane a little more so neighbouring lanes
// are easy to tell apart. External and unassigned lanes are grey. Colours are
// comma separated for rgba(), as the visualiser's theme variables are.
export const LANE_TINTS: Record<SwimlaneGroupBy, string> = {
  domain: "234, 179, 8",
  system: "139, 92, 246",
  team: "14, 165, 233",
};
const NEUTRAL_TINT = "var(--ec-page-text)";
const tinted = (tint: string, alpha: number) => `rgba(${tint}, ${alpha})`;

// The name runs down the lane's header
const VERTICAL_LABEL_STYLE = { transform: "rotate(90deg)" } as const;

// A lane has lines above and below; a box is outlined, with rounded corners
const BOX_RADIUS = 12;
const laneStyle = (tint: string, shaded: boolean, box: boolean) =>
  ({
    width: "100%",
    height: "100%",
    display: "flex",
    background: tinted(tint, shaded ? 0.1 : 0.05),
    ...(box
      ? {
          border: `2px solid ${tinted(tint, 0.45)}`,
          borderRadius: BOX_RADIUS,
          overflow: "hidden",
        }
      : {
          borderTop: `2px solid ${tinted(tint, 0.3)}`,
          borderBottom: `2px solid ${tinted(tint, 0.3)}`,
        }),
  }) as const;

// The header is opaque (the lane's tint over the card background), so the
// lane's name stays readable over the canvas dots
const headerStyle = (tint: string) =>
  ({
    width: LANE_HEADER_WIDTH,
    flexShrink: 0,
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRight: `2px solid ${tinted(tint, 0.3)}`,
    background: `linear-gradient(${tinted(tint, 0.14)}, ${tinted(tint, 0.14)}), rgb(var(--ec-card-bg))`,
  }) as const;

// Reads bottom to top, like the lanes of a process diagram
const LABEL_STYLE = {
  writingMode: "vertical-rl",
  transform: "rotate(180deg)",
  display: "flex",
  alignItems: "center",
  gap: LANE_LABEL.gap,
  whiteSpace: "nowrap",
  // Large, as flows are usually zoomed out to fit
  fontSize: LANE_LABEL.fontSize,
  fontWeight: 700,
  letterSpacing: "0.01em",
  color: "rgb(var(--ec-page-text))",
} as const;

/**
 * A group of flow steps that belong to one domain, system or team, with its
 * name down the left-hand side: a full-width swimlane (sized and positioned
 * by `layoutSwimlanes`), or a box around its steps (by `groupIntoBoxes`).
 */
export default memo(function SwimlaneNode({ data }: NodeProps) {
  const { label, level, kind, index, style } =
    data as unknown as SwimlaneNodeData;
  const Icon =
    kind === "external"
      ? Globe
      : kind === "unassigned"
        ? HelpCircle
        : LANE_ICONS[level];

  const tint = kind === "lane" ? LANE_TINTS[level] : NEUTRAL_TINT;
  const box = style === "boxes";

  return (
    <div style={laneStyle(tint, !box && index % 2 === 1, box)}>
      <div style={headerStyle(tint)}>
        <div style={LABEL_STYLE}>
          <Icon
            size={LANE_LABEL.iconSize}
            style={VERTICAL_LABEL_STYLE}
            color="rgb(var(--ec-page-text-muted))"
          />
          <span
            style={
              kind === "lane"
                ? undefined
                : { color: "rgb(var(--ec-page-text-muted))" }
            }
          >
            {label}
          </span>
        </div>
      </div>
    </div>
  );
});
