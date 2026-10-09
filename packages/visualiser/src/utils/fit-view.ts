/**
 * How a diagram is fitted to the screen: all of it, filling the view with the same room around it at any size (clear
 * of the title and menus at the top, and the bar at the bottom), never zoomed in past full size (e.g. a graph with
 * one small node). Studio fits its canvases the same way.
 */
export const DIAGRAM_FIT_VIEW_OPTIONS = {
  padding: { top: "100px", right: "60px", bottom: "80px", left: "60px" },
  maxZoom: 1,
} as const;
