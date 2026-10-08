import type { APIRoute } from 'astro';
import { startStudio } from '../server/runtime';
import { isSignedIn } from '../server/sign-in';

/**
 * Starts Studio (its storage, and the collaboration connection) without opening a page: `eventcatalog start` calls it
 * once the server listens, so tabs reconnecting after a restart find it ready. It's under /_eventcatalog, which sign-in
 * lets through (the server calls it without a session), and says nothing about the canvases.
 */
export const GET: APIRoute = async () => {
  await startStudio({ isSignedIn });
  return new Response(null, { status: 204 });
};

export const prerender = false;
