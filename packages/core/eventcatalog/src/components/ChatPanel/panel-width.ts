/** How wide the assistant's panel is: dragged wider (or back) by its left edge, and remembered in this browser */
export const PANEL_WIDTH = 400;
export const MIN_PANEL_WIDTH = 360;
export const MAX_PANEL_WIDTH = 800;
// How much of the page stays beside it, at least
const MIN_PAGE_WIDTH = 480;
const STORAGE_KEY = 'eventcatalog-chat-panel-width';

/** Within the panel's limits, leaving room for the page in a window this wide */
export const clampPanelWidth = (width: number, viewportWidth: number) =>
  Math.round(Math.max(MIN_PANEL_WIDTH, Math.min(width, MAX_PANEL_WIDTH, viewportWidth - MIN_PAGE_WIDTH)));

/** The width they left it at, or the default */
export const readPanelWidth = (viewportWidth: number) => {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    return saved ? clampPanelWidth(saved, viewportWidth) : PANEL_WIDTH;
  } catch {
    return PANEL_WIDTH;
  }
};

export const savePanelWidth = (width: number) => {
  try {
    if (width === PANEL_WIDTH) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(width));
  } catch {}
};
