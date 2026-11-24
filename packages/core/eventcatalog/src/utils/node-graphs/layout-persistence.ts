import fs from 'node:fs';
import path from 'node:path';

export interface SavedPosition {
  x: number;
  y: number;
}

export interface SavedLayout {
  version: number;
  savedAt: string;
  resourceKey: string;
  positions: Record<string, SavedPosition>;
}

/**
 * Builds a resource key for layout persistence from collection, id, and version.
 * e.g., buildResourceKey('services', 'OrderService', '1.0.0') -> 'services/OrderService/1.0.0'
 */
export function buildResourceKey(collection: string, id: string, version?: string): string {
  if (version) {
    return `${collection}/${id}/${version}`;
  }
  return `${collection}/${id}`;
}

/**
 * Converts a resource key to a file path for the saved layout
 * e.g., services/OrderService/1.0.0 -> _data/visualizer-layouts/services/OrderService/1.0.0.json
 * Uses path.join with spread segments for cross-platform compatibility (Windows/Mac/Linux)
 */
export function getLayoutFilePath(resourceKey: string): string {
  const PROJECT_DIR = process.env.PROJECT_DIR || process.cwd();
  const cleanKey = resourceKey.replace(/^\//, '').replace(/\/$/, '');
  // Split path segments and rejoin with platform-specific separator
  const segments = cleanKey.split('/').filter(Boolean);
  const fileName = `${segments.pop()}.json`;
  return path.join(PROJECT_DIR, '_data', 'visualizer-layouts', ...segments, fileName);
}

/**
 * Loads saved layout from disk if it exists
 */
export async function loadSavedLayout(resourceKey: string): Promise<SavedLayout | null> {
  const filePath = getLayoutFilePath(resourceKey);

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content) as SavedLayout;
  } catch {
    // File doesn't exist or parse error - return null
    return null;
  }
}

/**
 * Applies saved positions to nodes.
 *
 * A diagram that's laid out automatically uses its saved layout only when that layout has a position for every node
 * on it. Once the diagram gains a node the layout doesn't know (a system or actor added since it was saved), the
 * saved positions and the automatic ones don't fit together: nodes land on top of each other and edges, routed for the
 * automatic layout, run through them. So it's laid out automatically again until the layout is saved anew.
 *
 * `allowPartial` keeps the saved positions it has and leaves other nodes where they are: for diagrams whose nodes are
 * placed by hand (a design's), where a new node has a position of its own.
 */
export function applyLayoutToNodes<T extends { id: string; position: { x: number; y: number } }>(
  nodes: T[],
  savedLayout: SavedLayout | null,
  options?: { allowPartial?: boolean }
): T[];
export function applyLayoutToNodes(
  nodes: any[],
  savedLayout: SavedLayout | null,
  { allowPartial = false }: { allowPartial?: boolean } = {}
): any[] {
  if (!savedLayout) {
    return nodes; // No saved layout, use the laid out positions
  }

  if (!allowPartial) {
    const missing = nodes.filter((node) => !savedLayout.positions[node.id]).map((node) => node.id);
    if (missing.length > 0) {
      // Out of date: nodes it doesn't know, so the automatic layout. Say so in dev, so the author knows to save again
      if (import.meta.env?.DEV && !import.meta.env?.VITEST) {
        console.warn(
          `[EventCatalog] Saved layout skipped: it doesn't place ${missing.length} node(s) now in the diagram (${missing.join(', ')}). Save the layout again to use it.`
        );
      }
      return nodes;
    }
  }

  return nodes.map((node) => {
    const savedPosition = savedLayout.positions[node.id];
    if (savedPosition) {
      return {
        ...node,
        position: { x: savedPosition.x, y: savedPosition.y },
      };
    }
    // Keep its own position (only with allowPartial)
    return node;
  });
}
