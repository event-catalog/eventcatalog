import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { addNodes, buildNode, connectNodes, createThread, readThreads, setCanvasStatus, setMeta } from '../canvas-doc';
import { getStudioRuntime } from '../server/runtime';
import { CANVASES_API_PATH, createCanvasesApi, type ApiCanvas } from '../api/canvases-api';
import type { SignedInUser } from '../server/sign-in';

// The API only uses the catalog tools' paging
vi.mock('astro:content', () => ({ getCollection: vi.fn(), getEntry: vi.fn() }));

const RUNTIME_KEY = Symbol.for('eventcatalog.studio.runtime');
const MISSING_ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const api = createCanvasesApi(CANVASES_API_PATH);

let directory: string;
let runtime: ReturnType<typeof getStudioRuntime>;
beforeEach(async () => {
  delete (globalThis as Record<symbol, unknown>)[RUNTIME_KEY];
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-api-'));
  runtime = getStudioRuntime();
  await runtime.useStorage({ type: 'memory' }, directory);
});
afterEach(() => {
  fs.rmSync(directory, { recursive: true, force: true });
  delete (globalThis as Record<symbol, unknown>)[RUNTIME_KEY];
});

const call = (
  method: string,
  route = '',
  { body, contentType = 'application/json', signedInAs }: { body?: string; contentType?: string; signedInAs?: SignedInUser } = {}
) =>
  api.fetch(
    new Request(`http://catalog.test${CANVASES_API_PATH}${route}`, {
      method,
      ...(body !== undefined && { body, headers: { 'Content-Type': contentType } }),
    }),
    { runtime, signedInAs, canvasUrl: (id: string) => `http://catalog.test/studio/${id}` }
  );
const create = async (canvas: object = {}, options: Parameters<typeof call>[2] = {}) => {
  const response = await call('POST', '', { body: JSON.stringify(canvas), ...options });
  return { response, canvas: ((await response.json()) as { canvas: ApiCanvas }).canvas };
};

describe('Studio API', () => {
  it('creates a canvas, with who started it', async () => {
    const { response, canvas } = await create({ title: '  Payments redesign ', createdBy: 'Sam' });
    expect(response.status).toBe(201);
    expect(response.headers.get('Location')).toBe(`${CANVASES_API_PATH}/${canvas.id}`);
    expect(canvas).toMatchObject({
      title: 'Payments redesign',
      status: 'draft',
      createdBy: 'Sam',
      nodeCount: 0,
      edgeCount: 0,
      openComments: 0,
      url: `http://catalog.test/studio/${canvas.id}`,
    });
    expect(new Date(canvas.createdAt!).getTime()).toBeGreaterThan(0);
    expect(runtime.exists(canvas.id)).toBe(true);
  });

  it('creates an untitled canvas without a body', async () => {
    const response = await call('POST');
    expect(response.status).toBe(201);
    expect(((await response.json()) as { canvas: ApiCanvas }).canvas).toMatchObject({ title: null, createdBy: null });
  });

  it("records whoever's signed in as starting it, whatever the request says", async () => {
    const { canvas } = await create({ title: 'Payments', createdBy: 'Someone else' }, { signedInAs: { name: 'Ada' } });
    expect(canvas.createdBy).toBe('Ada');
  });

  it('only takes JSON, and says what is wrong with it', async () => {
    expect((await call('POST', '', { body: 'title=Payments', contentType: 'application/x-www-form-urlencoded' })).status).toBe(
      415
    );
    expect((await call('POST', '', { body: '{' })).status).toBe(400);
    const tooLong = await call('POST', '', { body: JSON.stringify({ title: 'x'.repeat(201) }) });
    expect(tooLong.status).toBe(400);
    expect(await tooLong.json()).toEqual({ error: expect.stringContaining('title') });
    expect(runtime.listCanvases()).toEqual([]);
  });

  it('lists canvases, most recently changed first, a page at a time', async () => {
    const { canvas: first } = await create({ title: 'First' });
    const { canvas: second } = await create({ title: 'Second' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await runtime.withCanvas(first.id, (doc) => setMeta(doc, { title: 'First, changed' }));

    const all = (await (await call('GET')).json()) as { canvases: ApiCanvas[]; totalCount: number };
    expect(all.canvases.map((canvas) => canvas.title)).toEqual(['First, changed', 'Second']);
    expect(all.totalCount).toBe(2);

    const page = (await (await call('GET', '?pageSize=1')).json()) as { canvases: ApiCanvas[]; nextCursor: string };
    expect(page.canvases.map((canvas) => canvas.id)).toEqual([first.id]);
    const next = (await (await call('GET', `?pageSize=1&cursor=${page.nextCursor}`)).json()) as {
      canvases: ApiCanvas[];
      nextCursor?: string;
    };
    expect(next.canvases.map((canvas) => canvas.id)).toEqual([second.id]);
    expect(next.nextCursor).toBeUndefined();

    expect((await call('GET', '?pageSize=1000')).status).toBe(400);
    expect((await call('GET', '?cursor=nonsense')).status).toBe(400);
  });

  it('gets one canvas', async () => {
    const { canvas } = await create({ title: 'Payments' });
    const response = await call('GET', `/${canvas.id}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ canvas });
    expect((await call('GET', `/${MISSING_ID}`)).status).toBe(404);
    expect((await call('GET', '/not-a-canvas')).status).toBe(404);
  });

  it("copies a canvas's design to a new draft, without its comments", async () => {
    const { canvas: original } = await create({ title: 'Payments' });
    await runtime.withCanvas(original.id, (doc) => {
      addNodes(doc, [
        { ...buildNode('service', {}, { x: 0, y: 0 }), id: 'orders' },
        { ...buildNode('service', {}, { x: 300, y: 0 }), id: 'payments' },
      ]);
      connectNodes(doc, { source: 'orders', target: 'payments' });
      createThread(doc, { position: { x: 10, y: 10 } }, 'Is this right?', { name: 'Sam', color: '#000' });
      setCanvasStatus(doc, 'accepted', { name: 'Sam', color: '#000' });
    });

    const response = await call('POST', `/${original.id}/copy`, { body: '{}', signedInAs: { name: 'Ada' } });
    expect(response.status).toBe(201);
    const { canvas: copy } = (await response.json()) as { canvas: ApiCanvas };
    expect(response.headers.get('Location')).toBe(`${CANVASES_API_PATH}/${copy.id}`);
    expect(copy).toMatchObject({
      title: 'Copy of Payments',
      status: 'draft',
      createdBy: 'Ada',
      nodeCount: 2,
      edgeCount: 1,
      openComments: 0,
    });
    expect(copy.id).not.toBe(original.id);
    expect(await runtime.withCanvas(copy.id, readThreads)).toEqual([]);
    // The original is as it was
    expect(runtime.getCanvas(original.id)).toMatchObject({ title: 'Payments', status: 'accepted', openComments: 1 });
  });

  it('copies with the title given, and untitled canvases as copies of an untitled one', async () => {
    const { canvas: untitled } = await create();
    const plain = await call('POST', `/${untitled.id}/copy`);
    expect(((await plain.json()) as { canvas: ApiCanvas }).canvas.title).toBe('Copy of Untitled canvas');
    const named = await call('POST', `/${untitled.id}/copy`, { body: JSON.stringify({ title: 'Payments v2' }) });
    expect(((await named.json()) as { canvas: ApiCanvas }).canvas.title).toBe('Payments v2');
  });

  it("can't copy a canvas that isn't there", async () => {
    expect((await call('POST', `/${MISSING_ID}/copy`)).status).toBe(404);
    const { canvas } = await create({ title: 'Payments' });
    await call('DELETE', `/${canvas.id}`);
    expect((await call('POST', `/${canvas.id}/copy`)).status).toBe(404);
  });

  it('deletes a canvas for good', async () => {
    const { canvas } = await create({ title: 'Payments' });
    const response = await call('DELETE', `/${canvas.id}`);
    expect(response.status).toBe(204);
    expect(runtime.isDeleted(canvas.id)).toBe(true);
    expect((await call('GET', `/${canvas.id}`)).status).toBe(404);
    expect((await call('DELETE', `/${canvas.id}`)).status).toBe(404);
    expect(await (await call('GET')).json()).toMatchObject({ canvases: [], totalCount: 0 });
  });

  it('says when a canvas could not be deleted, and keeps it', async () => {
    const { canvas } = await create({ title: 'Payments' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(runtime, 'deleteCanvas').mockImplementation(() => {
      throw new Error('disk full');
    });
    const response = await call('DELETE', `/${canvas.id}`);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Could not delete the canvas: disk full' });
    vi.restoreAllMocks();
    expect(runtime.exists(canvas.id)).toBe(true);
  });

  it('answers anything else with a JSON 404', async () => {
    const response = await call('GET', '/a/b/c');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
  });
});
