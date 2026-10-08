import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { paginate } from '@features/tools/catalog-tools';
import { MAX_TITLE_LENGTH, type CanvasStatus } from '../canvas-doc';
import { MAX_NAME_LENGTH } from '../identity';
import type { CanvasSummary, StudioRuntime } from '../server/runtime';
import type { SignedInUser } from '../server/sign-in';

/**
 * The Studio API: canvases as a whole (listing, creating, reading and deleting them). What's on a canvas is changed
 * over the collaboration connection, or by agents through the MCP tools, never here: they're live documents that
 * people and agents edit together.
 *
 *   GET    /api/studio/canvases        Canvases, most recently changed first (?pageSize=, ?cursor= for the next page)
 *                                       (not ones left empty and untitled: GET /:id still finds them)
 *   POST   /api/studio/canvases        Creates one: { "title"?: string, "createdBy"?: string }
 *   GET    /api/studio/canvases/:id    One canvas
 *   POST   /api/studio/canvases/:id/copy   Copies its design (nodes and connections, not comments or status) to a new
 *                                         draft: { "title"?: string, "createdBy"?: string }
 *   DELETE /api/studio/canvases/:id    Deletes it for everyone (anyone who has it open is told), for good
 *
 * Errors are `{ "error": "..." }` with the HTTP status. With sign-in on, only signed-in people can use it (401
 * otherwise), and canvases are created by whoever is signed in. Requests that change something (POST, DELETE) from
 * outside a browser send `Content-Type: application/json`: Astro refuses ones with no content type that don't come
 * from the catalog's own pages.
 */
export const CANVASES_API_PATH = '/api/studio/canvases';

const CANVAS_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PAGE_SIZE = 100;

/** A canvas, as the API gives it */
export type ApiCanvas = {
  id: string;
  title: string | null;
  status: CanvasStatus;
  /** ISO 8601 */
  createdAt: string | null;
  /** Who started it (a person, or an agent) */
  createdBy: string | null;
  /** When anyone (a person, or an agent) last changed it (ISO 8601) */
  updatedAt: string | null;
  nodeCount: number;
  edgeCount: number;
  openComments: number;
  /** Where people open it */
  url: string;
};

export type CanvasesApiEnv = {
  Bindings: {
    runtime: StudioRuntime;
    /** Who's signed in (sign-in on) */
    signedInAs?: SignedInUser;
    /** A canvas's page */
    canvasUrl: (canvasId: string) => string;
  };
};

const NewCanvas = z.object({
  title: z.string().trim().max(MAX_TITLE_LENGTH).optional(),
  // Ignored when someone's signed in: it's them
  createdBy: z.string().trim().max(MAX_NAME_LENGTH).optional(),
});
const ListQuery = z.object({
  cursor: z.string().optional(),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
});

const iso = (time?: number) => (time ? new Date(time).toISOString() : null);
const toApiCanvas = (canvas: CanvasSummary, canvasUrl: (canvasId: string) => string): ApiCanvas => ({
  id: canvas.canvasId,
  title: canvas.title ?? null,
  status: canvas.status,
  createdAt: iso(canvas.createdAt),
  createdBy: canvas.createdBy ?? null,
  updatedAt: iso(canvas.updatedAt),
  nodeCount: canvas.nodeCount,
  edgeCount: canvas.edgeCount,
  openComments: canvas.openComments,
  url: canvasUrl(canvas.canvasId),
});
const describeIssues = (error: z.ZodError) =>
  error.issues.map((issue) => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message)).join('; ');

type ApiContext = Context<CanvasesApiEnv>;
const noCanvas = (c: ApiContext, id: string) => c.json({ error: `No canvas "${id}"` }, 404);

/** A new canvas's details from the request (optional), or the response saying what's wrong with them */
const readNewCanvas = async (c: ApiContext): Promise<{ title?: string; createdBy?: string } | Response> => {
  // JSON only: a page on another site can send a form or plain text here without asking first, but not JSON
  const body = await c.req.text();
  if (body && !c.req.header('content-type')?.toLowerCase().startsWith('application/json')) {
    return c.json({ error: 'Send the canvas as JSON (Content-Type: application/json)' }, 415);
  }
  let json: unknown = {};
  try {
    if (body) json = JSON.parse(body);
  } catch {
    return c.json({ error: 'The body is not valid JSON' }, 400);
  }
  const parsed = NewCanvas.safeParse(json);
  if (!parsed.success) return c.json({ error: describeIssues(parsed.error) }, 400);
  return {
    title: parsed.data.title || undefined,
    // Whoever's signed in, if anyone
    createdBy: c.env.signedInAs?.name ?? (parsed.data.createdBy || undefined),
  };
};

/** The API, served under `basePath` (the catalog's base URL, then CANVASES_API_PATH) */
export const createCanvasesApi = (basePath: string) => {
  const app = new Hono<CanvasesApiEnv>({ strict: false }).basePath(basePath);

  app.get('/', (c) => {
    const query = ListQuery.safeParse(c.req.query());
    if (!query.success) return c.json({ error: describeIssues(query.error) }, 400);
    const { runtime, canvasUrl } = c.env;
    const page = paginate(runtime.listCanvases(), query.data.cursor, query.data.pageSize);
    if ('error' in page) return c.json({ error: page.error }, 400);
    return c.json({
      canvases: page.items.map((canvas) => toApiCanvas(canvas, canvasUrl)),
      totalCount: page.totalCount,
      ...(page.nextCursor && { nextCursor: page.nextCursor }),
    });
  });

  /** A canvas just made, as created */
  const created = (c: ApiContext, canvasId: string) => {
    c.header('Location', `${basePath}/${canvasId}`);
    return c.json({ canvas: toApiCanvas(c.env.runtime.getCanvas(canvasId)!, c.env.canvasUrl) }, 201);
  };

  app.post('/', async (c) => {
    const details = await readNewCanvas(c);
    if (details instanceof Response) return details;
    return created(c, await c.env.runtime.createCanvas(details));
  });

  app.post('/:id/copy', async (c) => {
    const id = c.req.param('id');
    if (!CANVAS_ID.test(id)) return noCanvas(c, id);
    const details = await readNewCanvas(c);
    if (details instanceof Response) return details;
    const copyId = await c.env.runtime.copyCanvas(id, details);
    return copyId ? created(c, copyId) : noCanvas(c, id);
  });

  app.get('/:id', (c) => {
    const id = c.req.param('id');
    const canvas = CANVAS_ID.test(id) ? c.env.runtime.getCanvas(id) : undefined;
    if (!canvas) return noCanvas(c, id);
    return c.json({ canvas: toApiCanvas(canvas, c.env.canvasUrl) });
  });

  app.delete('/:id', (c) => {
    const id = c.req.param('id');
    if (!CANVAS_ID.test(id)) return noCanvas(c, id);
    try {
      if (!c.env.runtime.deleteCanvas(id)) return noCanvas(c, id);
    } catch (error) {
      console.error(`[studio] Could not delete canvas ${id}`, error);
      return c.json({ error: `Could not delete the canvas: ${(error as Error).message}` }, 500);
    }
    return c.body(null, 204);
  });

  app.notFound((c) => c.json({ error: 'Not found' }, 404));
  return app;
};
