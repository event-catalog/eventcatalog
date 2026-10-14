// Canvases' documents on the collaboration server are named `design:<canvasId>` (scripts and peers join by it)
const DOCUMENT_PREFIX = 'design:';
export const canvasDocumentName = (canvasId: string) => `${DOCUMENT_PREFIX}${canvasId}`;
export const canvasIdFromDocumentName = (name: string) =>
  name.startsWith(DOCUMENT_PREFIX) ? name.slice(DOCUMENT_PREFIX.length) : undefined;
/** Why the collaboration server refuses a canvas that was deleted (told to anyone who still has it open) */
export const CANVAS_DELETED_REASON = 'canvas-deleted';
