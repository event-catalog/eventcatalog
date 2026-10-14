import type { APIRoute } from 'astro';
import { buildUrl } from '@utils/url-builder';
import { startStudio } from '../server/runtime';
import { getSignedInUser, isSignedIn } from '../server/sign-in';
import { CANVASES_API_PATH, createCanvasesApi } from './canvases-api';

// The Studio API (see canvases-api.ts)
const api = createCanvasesApi(buildUrl(CANVASES_API_PATH, true));

export const ALL: APIRoute = async ({ request, locals, url }) => {
  let runtime: Awaited<ReturnType<typeof startStudio>>;
  try {
    runtime = await startStudio({ isSignedIn });
  } catch (error) {
    // Its storage can't be used (e.g. the database was updated by a newer EventCatalog)
    return Response.json({ error: `Studio isn't available: ${(error as Error).message}` }, { status: 503 });
  }
  return api.fetch(request, {
    runtime,
    signedInAs: getSignedInUser(locals),
    canvasUrl: (canvasId: string) => `${url.origin}${buildUrl(`/studio/${canvasId}`)}`,
  });
};

export const prerender = false;
