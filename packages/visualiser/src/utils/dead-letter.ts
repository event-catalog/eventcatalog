import type { CSSProperties } from "react";

/**
 * How a dead letter channel is drawn, in the visualiser and in Studio: the dashed crimson edge into it from each
 * channel that sends it its dead letters, leaving from a red handle at the bottom of that channel. The card itself
 * has a red border and a dark "Dead Letter" badge with a red stop sign (see the channel node).
 */

/**
 * The red of dead letters (Tailwind's red-500, not a pink, so it isn't mistaken for a service): a dead letter
 * channel's border and the stop sign on its badge, the edge into it and the handle that edge leaves from
 */
export const DEAD_LETTER_COLOR = "#ef4444";

/**
 * The handle at the bottom of a channel's card that its edge to its dead letter channel leaves from: the edge goes
 * down from the channel and turns right into the dead letter channel, which the layout puts below and to the right
 * of it (as in Enterprise Integration Patterns' Dead Letter Channel)
 */
export const DEAD_LETTER_HANDLE = "dead-letter";

/** What the edge from a channel to its dead letter channel says */
export const DEAD_LETTER_EDGE_LABEL = "dead-letters to";

/**
 * The class that draws the edge in red (styles.css): edges are coloured by a rule that wins over an edge's own
 * style, so the colour has to come from a rule too
 */
export const DEAD_LETTER_EDGE_CLASS = "ec-dead-letter-edge";

export const DEAD_LETTER_EDGE_STYLE: CSSProperties = {
  stroke: DEAD_LETTER_COLOR,
  strokeWidth: 1.5,
  strokeDasharray: "6 4",
};

export const DEAD_LETTER_EDGE_MARKER = {
  type: "arrowclosed",
  color: DEAD_LETTER_COLOR,
  width: 20,
  height: 20,
} as const;
