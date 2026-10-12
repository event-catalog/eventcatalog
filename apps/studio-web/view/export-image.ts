/**
 * "Export image…": the whole diagram (and its sticky notes) as a PNG (the visualiser's `canvasImage`), saved through
 * the chat when in one (views in chats can't download), else downloaded.
 */
import type { App } from '@modelcontextprotocol/ext-apps';
import { canvasImage, fileNameFor } from '@eventcatalog/visualiser/studio';
import { saveFile } from './diagram-file';

/** Exports the diagram in `container` as a PNG; false when it couldn't be saved */
export async function exportDiagramImage(container: HTMLElement, title: string, app?: App | null): Promise<boolean> {
  const dataUrl = await canvasImage(container);
  if (!dataUrl) return false;
  return saveFile({ name: fileNameFor(title, '.png'), mimeType: 'image/png', base64: dataUrl.split(',')[1] }, app);
}
