/**
 * How a diagram's menu looks (the button at the top left, with the diagram's title, and the menu it opens). Studio's
 * canvas menu uses the same, so the two feel the same.
 */

/** The button: the title, then the menu icon (DIAGRAM_MENU_BUTTON_ICON) */
export const DIAGRAM_MENU_BUTTON =
  "py-2.5 px-4 bg-[rgb(var(--ec-card-bg))] hover:bg-[rgb(var(--ec-accent-subtle))] border border-[rgb(var(--ec-page-border))] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--ec-accent))] flex items-center gap-3 transition-colors duration-150 hover:border-[rgb(var(--ec-accent)/0.3)] group whitespace-nowrap";
/** The button without a title: just the icon */
export const DIAGRAM_MENU_BUTTON_COMPACT =
  "h-9 w-9 p-0 bg-[rgb(var(--ec-card-bg))] hover:bg-[rgb(var(--ec-accent-subtle))] border border-[rgb(var(--ec-page-border))] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--ec-accent))] flex items-center justify-center transition-colors duration-150 hover:border-[rgb(var(--ec-accent)/0.3)] group";
export const DIAGRAM_MENU_TITLE =
  "text-base font-medium text-[rgb(var(--ec-page-text))] leading-tight";
export const DIAGRAM_MENU_BUTTON_ICON =
  "h-5 w-5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0 group-hover:text-[rgb(var(--ec-accent))] transition-colors duration-150";
export const DIAGRAM_MENU_BUTTON_ICON_COMPACT =
  "h-4 w-4 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0 group-hover:text-[rgb(var(--ec-accent))] transition-colors duration-150";

/** The menu, its items (an icon, then the label), and the lines between groups of them */
export const DIAGRAM_MENU =
  "min-w-56 bg-[rgb(var(--ec-page-bg))] border border-[rgb(var(--ec-page-border))] rounded-lg shadow-xl z-50 py-1.5";
export const DIAGRAM_MENU_ITEM =
  "flex items-center px-3 py-2 text-xs text-[rgb(var(--ec-page-text))] hover:bg-[rgb(var(--ec-accent-subtle)/0.3)] cursor-pointer transition-colors gap-2";
export const DIAGRAM_MENU_ITEM_ICON =
  "w-3.5 h-3.5 text-[rgb(var(--ec-page-text-muted))] flex-shrink-0";
export const DIAGRAM_MENU_SEPARATOR =
  "my-1 h-px bg-[rgb(var(--ec-page-border))]";
