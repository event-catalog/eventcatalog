import type { APIRoute } from 'astro';
import { isCanvasEnabled } from '@utils/feature';
import { startStorage } from '../storage/database';
import { startStudio } from '../studio/server/runtime';
import { isSignedIn } from '../studio/server/sign-in';

/**
 * What the server starts before anyone asks for it: `eventcatalog start` calls this once the server listens. Each
 * feature that needs starting has its own start function, called here in order: the storage configured is opened and
 * migrated first (features keep their state in it), then Studio (so tabs reconnecting after a restart find it
 * ready). Under /_eventcatalog, which sign-in lets through (the server calls it without a session); it says nothing
 * about what's stored.
 */
export const GET: APIRoute = async () => {
  try {
    await startStorage();
  } catch (error) {
    console.error(`[eventcatalog] Could not open the database: ${(error as Error).message}`);
  }
  // Studio says why if it can't start
  if (isCanvasEnabled()) await startStudio({ isSignedIn }).catch(() => {});
  return new Response(null, { status: 204 });
};

export const prerender = false;
