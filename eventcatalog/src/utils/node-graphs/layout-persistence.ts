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
 * Applies saved positions to nodes. Nodes with saved positions get them applied,
 * nodes without saved positions keep their Dagre-calculated positions.
 */
export function applyLayoutToNodes<T extends { id: string; position: { x: number; y: number } }>(
  nodes: T[],
  savedLayout: SavedLayout | null
): T[];
export function applyLayoutToNodes(nodes: any[], savedLayout: SavedLayout | null): any[] {
  if (!savedLayout) {
    return nodes; // No saved layout, use original Dagre positions
  }

  return nodes.map((node) => {
    const savedPosition = savedLayout.positions[node.id];
    if (savedPosition) {
      // Use saved position
      return {
        ...node,
        position: { x: savedPosition.x, y: savedPosition.y },
      };
    }
    // Keep Dagre-calculated position for new/unmatched nodes
    return node;
  });
}
