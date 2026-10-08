import type { ApiCanvas } from './canvases-api';

/** Using the Studio API from the browser (Studio's pages), at `apiUrl` (its address on this catalog) */

const errorOf = async (response: Response, fallback: string) => {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return new Error(body?.error ?? `${fallback} (${response.status})`);
};

export const createCanvasThroughApi = async (apiUrl: string, canvas: { title?: string; createdBy?: string }) => {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(canvas),
  });
  if (!response.ok) throw await errorOf(response, 'Could not create the canvas');
  return ((await response.json()) as { canvas: ApiCanvas }).canvas;
};

/** Copies a canvas's design to a new draft */
export const copyCanvasThroughApi = async (apiUrl: string, canvasId: string, copy: { createdBy?: string } = {}) => {
  const response = await fetch(`${apiUrl}/${canvasId}/copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(copy),
  });
  if (!response.ok) throw await errorOf(response, 'Could not copy the canvas');
  return ((await response.json()) as { canvas: ApiCanvas }).canvas;
};

/** Deletes a canvas (one that's already gone counts as deleted) */
export const deleteCanvasThroughApi = async (apiUrl: string, canvasId: string) => {
  const response = await fetch(`${apiUrl}/${canvasId}`, { method: 'DELETE', headers: { Accept: 'application/json' } });
  if (!response.ok && response.status !== 404) throw await errorOf(response, 'Could not delete the canvas');
};
