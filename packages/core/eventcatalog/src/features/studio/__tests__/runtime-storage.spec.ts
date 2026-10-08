import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { readMeta, setMeta } from '../canvas-doc';
import { getStudioRuntime } from '../server/runtime';

const RUNTIME_KEY = Symbol.for('eventcatalog.studio.runtime');
const CANVAS_ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

/** A server process starting: a new runtime (the old one is forgotten, like the process it was in) */
const restart = () => {
  delete (globalThis as Record<symbol, unknown>)[RUNTIME_KEY];
  return getStudioRuntime();
};
/** Stores what's waiting to be stored (Hocuspocus waits for edits to settle first) */
const storeNow = async (runtime: ReturnType<typeof getStudioRuntime>) => {
  runtime.server.hocuspocus.flushPendingStores();
  await new Promise((resolve) => setTimeout(resolve, 50));
};

const hasNodeSqlite = await import(/* @vite-ignore */ ['node', 'sqlite'].join(':')).then(
  () => true,
  () => false
);

let directory: string;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-runtime-'));
});
afterEach(async () => {
  // Nothing more is stored in the folder as the test process exits
  await getStudioRuntime().useStorage({ type: 'memory' }, directory);
  fs.rmSync(directory, { recursive: true, force: true });
  delete (globalThis as Record<symbol, unknown>)[RUNTIME_KEY];
});

describe('Studio runtime storage', () => {
  it.skipIf(!hasNodeSqlite)('keeps canvases across restarts with SQLite storage', async () => {
    const before = restart();
    await before.useStorage({ type: 'sqlite', path: 'studio.db' }, directory);
    await before.withCanvas(CANVAS_ID, (doc) => setMeta(doc, { title: 'Payments redesign' }));
    await storeNow(before);
    expect(fs.existsSync(path.join(directory, 'studio.db'))).toBe(true);

    const after = restart();
    await after.useStorage({ type: 'sqlite', path: 'studio.db' }, directory);
    expect(after.exists(CANVAS_ID)).toBe(true);
    expect(after.listCanvases().map((canvas) => canvas.title)).toEqual(['Payments redesign']);
    expect((await after.withCanvas(CANVAS_ID, readMeta)).title).toBe('Payments redesign');
  });

  it.skipIf(!hasNodeSqlite)(
    'lists when each canvas last changed, kept across restarts (reading it is not a change)',
    async () => {
      const before = restart();
      await before.useStorage({ type: 'sqlite', path: 'studio.db' }, directory);
      const started = Date.now();
      await before.withCanvas(CANVAS_ID, (doc) => setMeta(doc, { title: 'Payments redesign' }));
      const [{ updatedAt }] = before.listCanvases();
      expect(updatedAt).toBeGreaterThanOrEqual(started);

      await new Promise((resolve) => setTimeout(resolve, 20));
      await before.withCanvas(CANVAS_ID, readMeta);
      expect(before.listCanvases()[0].updatedAt).toBe(updatedAt);
      await storeNow(before);

      const after = restart();
      await after.useStorage({ type: 'sqlite', path: 'studio.db' }, directory);
      expect(after.listCanvases()[0].updatedAt).toBe(updatedAt);
    }
  );

  it('forgets canvases on restart with memory storage', async () => {
    const before = restart();
    await before.useStorage({ type: 'memory' }, directory);
    await before.withCanvas(CANVAS_ID, (doc) => setMeta(doc, { title: 'Scratch' }));
    await storeNow(before);
    expect(before.exists(CANVAS_ID)).toBe(true);

    const after = restart();
    await after.useStorage({ type: 'memory' }, directory);
    expect(after.exists(CANVAS_ID)).toBe(false);
  });
});
