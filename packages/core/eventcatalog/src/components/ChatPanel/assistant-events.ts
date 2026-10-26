/** Window events between the assistant (Ask AI) and the page it's on, e.g. a Studio canvas */

/** Opens the assistant's panel */
export const OPEN_CHAT_EVENT = 'eventcatalog:open-chat';

/** The assistant was asked something on a Studio canvas (detail: { canvasId }), which it may draw on */
export const ASSISTANT_DRAWING_EVENT = 'eventcatalog:assistant-drawing';

/** Takes the person to nodes on the Studio canvas they have open (detail: { canvasId, nodeIds }): zoomed to, and selected */
export const CANVAS_FOCUS_EVENT = 'eventcatalog:canvas-focus';

/** Links the assistant writes that take the person to nodes on the canvas: `#canvas-focus=<node id>,<node id>` */
const FOCUS_LINK = '#canvas-focus=';
export const nodesInFocusLink = (href: string | undefined) =>
  href?.startsWith(FOCUS_LINK)
    ? href
        .slice(FOCUS_LINK.length)
        .split(',')
        .map((id) => decodeURIComponent(id.trim()))
        .filter(Boolean)
    : undefined;

/** Takes the person to a hotspot on the Studio canvas they have open, and opens it (detail: { canvasId, hotspotId }) */
export const CANVAS_HOTSPOT_EVENT = 'eventcatalog:canvas-hotspot';

/**
 * References the assistant writes to something on the canvas, drawn like the docs' resource references and taking
 * the person to it: `#canvas-ref=<type>:<node id>` (the type, e.g. service or event, gives its icon and colour)
 */
const REF_LINK = '#canvas-ref=';
export const canvasRefIn = (href: string | undefined) => {
  if (!href?.startsWith(REF_LINK)) return undefined;
  const value = decodeURIComponent(href.slice(REF_LINK.length)).trim();
  const split = value.indexOf(':');
  const [type, nodeId] = split === -1 ? ['', value] : [value.slice(0, split).trim(), value.slice(split + 1).trim()];
  return nodeId ? { type: type.toLowerCase(), nodeId } : undefined;
};
