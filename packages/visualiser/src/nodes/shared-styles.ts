import { type CSSProperties, useSyncExternalStore } from "react";

// ─── Dark mode detection ────────────────────────────────────────────────────

function subscribeTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getIsDark() {
  return (
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark"
  );
}

export function useDarkMode(): boolean {
  return useSyncExternalStore(subscribeTheme, getIsDark, () => false);
}

/**
 * Shared style constants for node components.
 * Extracting inline style objects to module-level constants ensures React.memo
 * receives stable references and can skip re-renders effectively.
 */

// ─── Common layout ──────────────────────────────────────────────────────────

export const NODE_WIDTH_STYLE = { width: "260px" } as const;

export const ROTATED_LABEL_STYLE = {
  transform: "rotate(-90deg)",
  letterSpacing: "0.15em",
  whiteSpace: "nowrap",
} as const satisfies CSSProperties;

export const TINY_FONT_STYLE = { fontSize: "0.2em" } as const;

// ─── WebKit line clamp (summary truncation) ─────────────────────────────────

export const LINE_CLAMP_STYLE = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
} as const satisfies CSSProperties;

// ─── Watermark icon ─────────────────────────────────────────────────────────

export const WATERMARK_STYLE = {
  opacity: 0.2,
  transform: "rotate(12deg)",
} as const;

// ─── Post-it folded corner (identical across all post-it nodes) ─────────────

export const FOLDED_CORNER_SHADOW_STYLE = {
  position: "absolute",
  top: 0,
  right: 0,
  width: 0,
  height: 0,
  borderStyle: "solid",
  borderWidth: "0 18px 18px 0",
  borderColor: "transparent #1e293b12 transparent transparent",
} as const satisfies CSSProperties;

// ─── Post-it common shadow ─────────────────────────────────────────────────

export const POST_IT_BOX_SHADOW =
  "1px 1px 3px rgba(0,0,0,0.15), 3px 4px 8px rgba(0,0,0,0.08)";

// ─── Handle positioning ─────────────────────────────────────────────────────

export const HANDLE_LEFT_STYLE = { left: "-1px" } as const;
export const HANDLE_RIGHT_STYLE = { right: "-1px" } as const;
export const HANDLE_LEFT_OFFSET_STYLE = { left: "-6px" } as const;
export const HANDLE_RIGHT_OFFSET_STYLE = { right: "-6px" } as const;

// ─── Note/Full size style ───────────────────────────────────────────────────

export const FULL_SIZE_STYLE = { width: "100%", height: "100%" } as const;

// ─── Owner indicator icon size ──────────────────────────────────────────────

export const OWNER_ICON_SIZE_STYLE = { width: 10, height: 10 } as const;

// ─── ExternalSystem2 handle ─────────────────────────────────────────────────

export const EXTERNAL_SYSTEM_HANDLE_STYLE = {
  width: 10,
  height: 10,
  background: "pink",
  zIndex: 10,
} as const;

// ─── Edge styles ────────────────────────────────────────────────────────────

export const EDGE_WARNING_STYLE = {
  stroke: "red",
  strokeWidth: 2.625,
  strokeDasharray: "5 5",
} as const;

export const EDGE_DEFAULT_STYLE = {
  stroke: "var(--ec-edge-stroke, #d1d5db)",
  strokeWidth: 2.625,
  strokeDasharray: "5 5",
} as const;

export const EDGE_FLOW_BASE_STYLE = {
  strokeWidth: 3,
  stroke: "rgb(var(--ec-page-text-muted))",
  strokeDasharray: "5 5",
} as const;

// ─── Default empty values (stable references for default props) ─────────────

export const EMPTY_ARRAY: any[] = [];
export const EMPTY_OBJECT: Readonly<Record<string, never>> = {} as const;

// ─── Channel message queue ──────────────────────────────────────────────────

export const QUEUE_BORDER_STYLE = {
  borderTop: "1px dashed rgb(var(--ec-page-border))",
} as const;
