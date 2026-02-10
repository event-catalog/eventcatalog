import type { APIRoute } from 'astro';
import fs from 'node:fs';
import { getLayoutFilePath } from '@utils/node-graphs/layout-persistence';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { resourceKey } = body;

    // Validate input
    if (!resourceKey) {
      return new Response(JSON.stringify({ error: 'Missing required field: resourceKey' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const filePath = getLayoutFilePath(resourceKey);

    // Check if file exists
    try {
      await fs.promises.access(filePath);
    } catch {
      // File doesn't exist, nothing to delete
      return new Response(JSON.stringify({ success: true, message: 'No saved layout to reset' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete the layout file
    await fs.promises.unlink(filePath);

    return new Response(JSON.stringify({ success: true, message: 'Layout reset successfully' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: `Failed to reset layout: ${message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const prerender = false;
