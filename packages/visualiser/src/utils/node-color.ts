import { type CSSProperties, useMemo } from "react";

/**
 * A resource's own node colour (`styles.node.color` in its frontmatter): a Tailwind
 * colour name (`blue`, `emerald`, or with a shade, `blue-600`) or a hex colour (`#0ea5e9`).
 * Nodes draw it with inline styles, as Tailwind can't generate classes for colours chosen at runtime.
 */

type Shade = "200" | "300" | "400" | "500" | "700" | "900" | "950";
type Shades = Record<Shade, string>;

const shades = (values: string): Shades => {
  const [s200, s300, s400, s500, s700, s900, s950] = values.split(" ");
  return {
    "200": s200,
    "300": s300,
    "400": s400,
    "500": s500,
    "700": s700,
    "900": s900,
    "950": s950,
  };
};

// Tailwind's palette, shades 200 300 400 500 700 900 950: the ones the nodes draw with
const TAILWIND_COLORS: Record<string, Shades> = {
  slate: shades("#e2e8f0 #cbd5e1 #94a3b8 #64748b #334155 #0f172a #020617"),
  gray: shades("#e5e7eb #d1d5db #9ca3af #6b7280 #374151 #111827 #030712"),
  zinc: shades("#e4e4e7 #d4d4d8 #a1a1aa #71717a #3f3f46 #18181b #09090b"),
  neutral: shades("#e5e5e5 #d4d4d4 #a3a3a3 #737373 #404040 #171717 #0a0a0a"),
  stone: shades("#e7e5e4 #d6d3d1 #a8a29e #78716c #44403c #1c1917 #0c0a09"),
  red: shades("#fecaca #fca5a5 #f87171 #ef4444 #b91c1c #7f1d1d #450a0a"),
  orange: shades("#fed7aa #fdba74 #fb923c #f97316 #c2410c #7c2d12 #431407"),
  amber: shades("#fde68a #fcd34d #fbbf24 #f59e0b #b45309 #78350f #451a03"),
  yellow: shades("#fef08a #fde047 #facc15 #eab308 #a16207 #713f12 #422006"),
  lime: shades("#d9f99d #bef264 #a3e635 #84cc16 #4d7c0f #365314 #1a2e05"),
  green: shades("#bbf7d0 #86efac #4ade80 #22c55e #15803d #14532d #052e16"),
  emerald: shades("#a7f3d0 #6ee7b7 #34d399 #10b981 #047857 #064e3b #022c22"),
  teal: shades("#99f6e4 #5eead4 #2dd4bf #14b8a6 #0f766e #134e4a #042f2e"),
  cyan: shades("#a5f3fc #67e8f9 #22d3ee #06b6d4 #0e7490 #164e63 #083344"),
  sky: shades("#bae6fd #7dd3fc #38bdf8 #0ea5e9 #0369a1 #0c4a6e #082f49"),
  blue: shades("#bfdbfe #93c5fd #60a5fa #3b82f6 #1d4ed8 #1e3a8a #172554"),
  indigo: shades("#c7d2fe #a5b4fc #818cf8 #6366f1 #4338ca #312e81 #1e1b4b"),
  violet: shades("#ddd6fe #c4b5fd #a78bfa #8b5cf6 #6d28d9 #4c1d95 #2e1065"),
  purple: shades("#e9d5ff #d8b4fe #c084fc #a855f7 #7e22ce #581c87 #3b0764"),
  fuchsia: shades("#f5d0fe #f0abfc #e879f9 #d946ef #a21caf #701a75 #4a044e"),
  pink: shades("#fbcfe8 #f9a8d4 #f472b6 #ec4899 #be185d #831843 #500724"),
  rose: shades("#fecdd3 #fda4af #fb7185 #f43f5e #be123c #881337 #4c0519"),
};

type Rgb = [number, number, number];

const parseHex = (hex: string): Rgb | undefined => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return undefined;
  const digits =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : match[1];
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16)) as Rgb;
};

const toHex = (rgb: Rgb) =>
  `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;

/** Mixes a colour with white (amount > 0) or black (amount < 0) */
const mix = (rgb: Rgb, amount: number): string => {
  const target = amount > 0 ? 255 : 0;
  const weight = Math.abs(amount);
  return toHex(rgb.map((value) => value + (target - value) * weight) as Rgb);
};

/** Shades for a hex colour, used as its 500 */
const shadesFromHex = (rgb: Rgb): Shades => ({
  "200": mix(rgb, 0.7),
  "300": mix(rgb, 0.5),
  "400": mix(rgb, 0.25),
  "500": toHex(rgb),
  "700": mix(rgb, -0.3),
  "900": mix(rgb, -0.6),
  "950": mix(rgb, -0.78),
});

export type NodeColor = Shades & {
  /** The colour's 500 as "r, g, b", for rgba() and the handle glow (`--ec-glow`) */
  rgb: string;
};

const rgbOf = (hex: string) => parseHex(hex)!.join(", ");

/** The colour a resource set for its node, or undefined if it set none (or one we can't draw) */
export function resolveNodeColor(color?: string): NodeColor | undefined {
  if (typeof color !== "string") return undefined;
  const value = color.trim().toLowerCase();
  if (!value) return undefined;

  // `blue`, or `blue-600`: the shade is dropped, a node needs the colour's whole range
  const tailwind = TAILWIND_COLORS[value.replace(/-\d{2,3}$/, "")];
  if (tailwind) return { ...tailwind, rgb: rgbOf(tailwind["500"]) };

  const hex = value.startsWith("#") ? parseHex(value) : undefined;
  if (hex) {
    const fromHex = shadesFromHex(hex);
    return { ...fromHex, rgb: hex.join(", ") };
  }

  return undefined;
}

const rgba = (hex: string, alpha: number) => `rgba(${rgbOf(hex)}, ${alpha})`;

/** Inline styles for each part of a node drawn in a resource's own colour */
export type NodeColorStyles = {
  // Default style
  /** The card: its border, shadow and selection ring */
  card: CSSProperties;
  /** The card of a draft (dashed border) */
  cardDraft: CSSProperties;
  /** The card of a deprecated resource: its border stays red */
  cardDeprecated: CSSProperties;
  /** The stripes on a draft's card */
  draftStripe: string;
  /** The type badge (top left) */
  badge: CSSProperties;
  /** Pills outlined in the node's colour (schema, data store type) */
  outline: CSSProperties;
  /** The handles' dots and their glow */
  glow: CSSProperties;
  /** The border of the tooltip with the full name */
  tooltipBorder: string;
  ownerAccent: CSSProperties;
  ownerBorder: string;
  ownerIcon: CSSProperties;

  // Post-it style
  /** The note's selection ring */
  ring: CSSProperties;
  paper: string;
  paperDraftBorder: string;
  corner: string;
  /** The type label and its icon */
  muted: CSSProperties;
  name: CSSProperties;
  nameDeprecated: CSSProperties;
  version: CSSProperties;
  summary: CSSProperties;
};

export function getNodeColorStyles(color: NodeColor): NodeColorStyles {
  const ring = { "--tw-ring-color": rgba(color["400"], 0.6) } as CSSProperties;
  const boxShadow = `0 2px 12px ${rgba(color["500"], 0.15)}`;

  return {
    card: { ...ring, borderColor: color["500"], boxShadow },
    cardDraft: { ...ring, borderColor: rgba(color["400"], 0.8), boxShadow },
    cardDeprecated: { ...ring, boxShadow },
    draftStripe: rgba(color["500"], 0.2),
    badge: { backgroundColor: color["500"] },
    outline: { borderColor: color["500"] },
    glow: {
      background: `linear-gradient(135deg, ${color["500"]}, ${color["700"]})`,
      "--ec-glow": color.rgb,
    } as CSSProperties,
    tooltipBorder: color["500"],
    ownerAccent: { backgroundColor: color["400"] },
    ownerBorder: rgba(color["500"], 0.08),
    ownerIcon: { color: color["300"] },

    ring,
    paper: `linear-gradient(135deg, ${color["200"]} 0%, ${color["300"]} 40%, ${color["500"]} 100%)`,
    paperDraftBorder: rgba(color["500"], 0.5),
    corner: color["700"],
    muted: { color: rgba(color["900"], 0.5) },
    name: { color: color["950"] },
    nameDeprecated: { color: rgba(color["950"], 0.4) },
    version: { color: rgba(color["900"], 0.4) },
    summary: {
      color: rgba(color["950"], 0.6),
      borderTopColor: rgba(color["900"], 0.1),
    },
  };
}

/** The card's style for its state */
export function getNodeCardStyle(
  styles: NodeColorStyles,
  { deprecated, draft }: { deprecated?: unknown; draft?: unknown },
): CSSProperties {
  if (deprecated) return styles.cardDeprecated;
  return draft ? styles.cardDraft : styles.card;
}

/** Styles for a node in the colour its resource set (`styles.node.color`), or undefined to draw it in its type's colour */
export function useNodeColorStyles(
  color: string | undefined,
): NodeColorStyles | undefined {
  return useMemo(() => {
    const resolved = resolveNodeColor(color);
    return resolved ? getNodeColorStyles(resolved) : undefined;
  }, [color]);
}
