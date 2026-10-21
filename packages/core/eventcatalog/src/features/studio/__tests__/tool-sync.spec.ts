// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { startToolSync, toBase64, type ToolSync } from '../tool-sync';

const CANVAS_ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

// What the view sees of itself on the screen, played by the test
let showView: ((shown: boolean) => void) | undefined;
class FakeIntersectionObserver {
  constructor(private callback: (entries: { isIntersecting: boolean }[]) => void) {
    showView = (shown) => this.callback([{ isIntersecting: shown }]);
  }
  observe() {}
  disconnect() {}
}

/** The server, which never changes: its answer is the same every time */
const quietServer = () => {
  const server = new Y.Doc();
  const sync = vi.fn<ToolSync>(async () => ({
    update: toBase64(Y.encodeStateAsUpdate(server)),
    stateVector: toBase64(Y.encodeStateVector(server)),
  }));
  return { server, sync };
};

const start = (sync: ToolSync) => {
  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  const stop = startToolSync(doc, awareness, { canvasId: CANVAS_ID, sync, onStatus: () => {} });
  return { doc, awareness, stop };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  showView = undefined;
});

describe('startToolSync', () => {
  it('syncs less often while nothing changes, and quickly again after a change of ours', async () => {
    const { sync } = quietServer();
    const { doc, stop } = start(sync);
    await vi.advanceTimersByTimeAsync(0);
    expect(sync).toHaveBeenCalledTimes(1);

    // Quiet: about 1s, 1.5s, 2.25s, 3.4s, 5s... (well under one a second over 20 seconds)
    await vi.advanceTimersByTimeAsync(20_000);
    const quietCalls = sync.mock.calls.length;
    expect(quietCalls).toBeLessThan(10);

    // A change here goes out within a second
    doc.getMap('nodes').set('a', { id: 'a' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(sync.mock.calls.length).toBe(quietCalls + 1);
    stop();
  });

  it("syncs rarely while the view is out of sight, and straight away once it's back", async () => {
    const { sync } = quietServer();
    const { stop } = start(sync);
    await vi.advanceTimersByTimeAsync(0);

    showView!(false);
    await vi.advanceTimersByTimeAsync(5000);
    const hiddenCalls = sync.mock.calls.length;
    // About every 15 seconds: still in touch, in case the host was wrong about it being out of sight
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sync.mock.calls.length - hiddenCalls).toBeGreaterThanOrEqual(3);
    expect(sync.mock.calls.length - hiddenCalls).toBeLessThanOrEqual(5);

    const before = sync.mock.calls.length;
    showView!(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(sync.mock.calls.length).toBe(before + 1);
    stop();
  });

  it('stops syncing when stopped', async () => {
    const { sync } = quietServer();
    const { stop } = start(sync);
    await vi.advanceTimersByTimeAsync(0);
    stop();
    const calls = sync.mock.calls.length;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(sync.mock.calls.length).toBe(calls);
  });
});
