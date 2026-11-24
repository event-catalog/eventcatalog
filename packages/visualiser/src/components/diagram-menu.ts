/**
 * How a diagram's menu looks (the button at the top left, with the diagram's title, and the menu it opens). Studio's
 * canvas menu uses the same, so the two feel the same. Neutral, as Vercel's: greys on hover, no accent. (Tints are
 * colour-mixes: the visualiser's colour variables are comma-separated, so `rgb(var(--x) / a)` doesn't work in them.)
 */

/** The button: the title, then the menu icon (DIAGRAM_MENU_BUTTON_ICON) */
export const DIAGRAM_MENU_BUTTON =
  "h-9 px-3 bg-[rgb(var(--ec-card-bg))] hover:bg-[color-mix(in_srgb,rgb(var(--ec-page-text))_5%,transparent)] border border-[rgb(var(--ec-page-border))] rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,rgb(var(--ec-page-text))_25%,transparent)] flex items-center gap-2.5 transition-colors duration-150 group whitespace-nowrap";
/** The button without a title: just the icon */
export const DIAGRAM_MENU_BUTTON_COMPACT =
  "h-9 w-9 p-0 bg-[rgb(var(--ec-card-bg))] hover:bg-[color-mix(in_srgb,rgb(var(--ec-page-text))_5%,transparent)] border border-[rgb(var(--ec-page-border))] rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,rgb(var(--ec-page-text))_25%,transparent)] flex items-center justify-center transition-colors duration-150 group";
export const DIAGRAM_MENU_TITLE =
  "text-sm font-medium tracking-[-0.01em] text-[rgb(var(--ec-page-text))] leading-tight";
export const DIAGRAM_MENU_BUTTON_ICON =
  "h-4 w-4 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0 group-hover:text-[rgb(var(--ec-page-text))] transition-colors duration-150";
export const DIAGRAM_MENU_BUTTON_ICON_COMPACT =
  "h-4 w-4 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0 group-hover:text-[rgb(var(--ec-page-text))] transition-colors duration-150";

/** The menu, its items (an icon, then the label), and the lines between groups of them */
export const DIAGRAM_MENU =
  "min-w-56 bg-[rgb(var(--ec-card-bg))] border border-[rgb(var(--ec-page-border))] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.18)] z-50 p-1";
export const DIAGRAM_MENU_ITEM =
  "flex items-center px-2 py-1.5 rounded-md text-[13px] text-[rgb(var(--ec-page-text))] hover:bg-[color-mix(in_srgb,rgb(var(--ec-page-text))_6%,transparent)] cursor-pointer transition-colors gap-2";
export const DIAGRAM_MENU_ITEM_ICON =
  "w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0";
export const DIAGRAM_MENU_SEPARATOR =
  "my-1 -mx-1 h-px bg-[rgb(var(--ec-page-border))]";
