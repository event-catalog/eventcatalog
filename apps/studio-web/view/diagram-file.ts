/**
 * Saving a file: through the chat when the view is in one (views in chats can't download), else downloaded. What a
 * .eventcatalog file is, and reading one, are the visualiser's (shared with EventCatalog's Studio).
 */
import type { App } from '@modelcontextprotocol/ext-apps';
import { downloadFile } from '@eventcatalog/visualiser/studio';

/** Saves a file: through the chat when in one, else downloads it. False if it wasn't */
export async function saveFile({ name, mimeType, text, base64 }: { name: string; mimeType: string; text?: string; base64?: string }, app?: App | null) {
  if (app) {
    try {
      const resource = { uri: `file:///${name}`, mimeType, ...(base64 !== undefined ? { blob: base64 } : { text: text ?? '' }) };
      const result = await app.downloadFile({ contents: [{ type: 'resource', resource }] });
      return !result.isError;
    } catch {
      return false;
    }
  }
  return downloadFile({ name, mimeType, text, base64 });
}
