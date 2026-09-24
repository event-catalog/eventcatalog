import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { getLayoutFilePath, type SavedLayout } from '@utils/node-graphs/layout-persistence';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { resourceKey, positions } = body;

    // Validate input
    if (!resourceKey || !positions) {
      return new Response(JSON.stringify({ error: 'Missing required fields: resourceKey and positions' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate resourceKey doesn't contain path traversal
    if (resourceKey.includes('..') || resourceKey.includes('~')) {
      return new Response(JSON.stringify({ error: 'Invalid resourceKey' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build file path from resource key using shared utility
    const filePath = getLayoutFilePath(resourceKey);

    // Create directory structure if needed
    const fileDir = path.dirname(filePath);
    await fs.promises.mkdir(fileDir, { recursive: true });

    // Build layout data
    const layoutData: SavedLayout = {
      version: 1,
      savedAt: new Date().toISOString(),
      resourceKey,
      positions,
    };

    // Write file with pretty formatting
    await fs.promises.writeFile(filePath, JSON.stringify(layoutData, null, 2));

    return new Response(JSON.stringify({ success: true, filePath }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: `Failed to save layout: ${message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const prerender = false;
