/**
 * Embeds the icons shown on diagram nodes (e.g. a service's language, a database's engine) as data
 * URIs, for MCP App views. Views run in a sandbox in the MCP host, where icon paths served by
 * EventCatalog (e.g. /icons/languages/nodejs.svg) don't load.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const MIME_TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

const MAX_DEPTH = 6;

async function toDataUri(iconPath: string, publicDirectory: string) {
  // Icons from other sites are left as they are
  if (!iconPath.startsWith('/')) return undefined;

  const filePath = path.resolve(publicDirectory, `.${iconPath.split(/[?#]/)[0]}`);
  if (!filePath.startsWith(path.resolve(publicDirectory) + path.sep)) return undefined;

  const mimeType = MIME_TYPES[path.extname(filePath).toLowerCase()];
  if (!mimeType) return undefined;

  try {
    return `data:${mimeType};base64,${(await fs.readFile(filePath)).toString('base64')}`;
  } catch {
    return undefined;
  }
}

/** Every `styles.icon` in the node's data, which is where nodes keep their icon */
function collectIconStyles(value: unknown, found: Array<{ icon: string }>, depth = 0) {
  if (!value || typeof value !== 'object' || depth > MAX_DEPTH) return;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'styles' && child && typeof (child as any).icon === 'string') found.push(child as { icon: string });
    else collectIconStyles(child, found, depth + 1);
  }
}

/** A copy of the nodes with their icons embedded (the nodes given are not changed) */
export async function inlineNodeIcons<T extends { data?: unknown }>(nodes: T[], publicDirectory: string): Promise<T[]> {
  const copy = structuredClone(nodes);
  const styles: Array<{ icon: string }> = [];
  copy.forEach((node) => collectIconStyles(node.data, styles));

  const dataUris = new Map<string, string | undefined>();
  await Promise.all(
    [...new Set(styles.map((style) => style.icon))].map(async (icon) =>
      dataUris.set(icon, await toDataUri(icon, publicDirectory))
    )
  );

  styles.forEach((style) => {
    style.icon = dataUris.get(style.icon) ?? style.icon;
  });
  return copy;
}
