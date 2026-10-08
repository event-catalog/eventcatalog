// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useStudioFlow } from '../hooks/use-studio-flow';
import * as Y from 'yjs';
import { toBase64, type ToolSync } from '../tool-sync';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// The collaboration socket, played by the test: it reports what the real provider would
type ProviderConfig = {
  onStatus: (event: { status: string }) => void;
  onAuthenticated: () => void;
  onAuthenticationFailed: (event: { reason: string }) => void;
};
const sockets = vi.hoisted(() => [] as { config: ProviderConfig; disconnect: ReturnType<typeof vi.fn> }[]);
vi.mock('@hocuspocus/provider', () => ({
  HocuspocusProvider: class {
    disconnect: ReturnType<typeof vi.fn>;
    connect = vi.fn();
    destroy = vi.fn();
    constructor(config: ProviderConfig) {
      // Closing the socket reports it, as the real provider does
      this.disconnect = vi.fn(() => config.onStatus({ status: 'disconnected' }));
      sockets.push({ config, disconnect: this.disconnect });
      config.onStatus({ status: 'connecting' });
    }
  },
}));

let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  sockets.length = 0;
  vi.useRealTimers();
});

const CANVAS_ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
// What the server sends back for an empty canvas
const emptyCanvas = () => {
  const doc = new Y.Doc();
  return { update: toBase64(Y.encodeStateAsUpdate(doc)), stateVector: toBase64(Y.encodeStateVector(doc)) };
};

/** The canvas's connection, as a page (no syncViaTools) or a chat's view (syncViaTools) would have it */
const connect = (syncViaTools?: ToolSync) => {
  const seen: { status?: string; transport?: string; statuses: string[] } = { statuses: [] };
  function Probe() {
    const flow = useStudioFlow({
      canvasId: CANVAS_ID,
      socketUrl: 'ws://localhost/_eventcatalog/studio',
      name: 'Sam',
      color: '#000',
      syncViaTools,
    });
    seen.status = flow.status;
    if (seen.statuses.at(-1) !== flow.status) seen.statuses.push(flow.status);
    seen.transport = flow.transport;
    return null;
  }
  root = createRoot(document.createElement('div'));
  act(() => root!.render(<Probe />));
  const socket = sockets[0]!;
  return { seen, socket, report: (fn: (config: ProviderConfig) => void) => act(() => fn(socket.config)) };
};

describe('Studio collaboration socket', () => {
  it("isn't connected when the socket opens, only once the server lets it in", () => {
    const { seen, report } = connect();
    report((socket) => socket.onStatus({ status: 'connected' }));
    expect(seen.status).toBe('connecting');
    report((socket) => socket.onAuthenticated());
    expect(seen.status).toBe('connected');
  });

  it('shows a page as offline when the server refuses it (signed out, or the session ran out)', () => {
    const { seen, socket, report } = connect();
    report((config) => config.onStatus({ status: 'connected' }));
    report((config) => config.onAuthenticationFailed({ reason: 'permission-denied' }));
    expect(socket.disconnect).toHaveBeenCalled();
    expect(seen).toMatchObject({ status: 'disconnected', transport: 'websocket' });
  });

  it("syncs a chat's view through its tools when the socket opens but is refused (no session in the chat's sandbox)", async () => {
    const sync = vi.fn<ToolSync>(async () => emptyCanvas());
    const { seen, socket, report } = connect(sync);
    report((config) => config.onStatus({ status: 'connected' }));
    report((config) => config.onAuthenticationFailed({ reason: 'permission-denied' }));
    await act(async () => {});
    expect(socket.disconnect).toHaveBeenCalled();
    expect(seen.transport).toBe('tools');
    expect(sync).toHaveBeenCalledWith(expect.objectContaining({ canvasId: CANVAS_ID }));
    // Never shown as offline on the way (the socket closes after the tools take over)
    expect(seen.statuses).not.toContain('disconnected');
  });

  it("syncs a chat's view through its tools when the socket isn't let in within a few seconds", async () => {
    vi.useFakeTimers();
    const sync = vi.fn<ToolSync>(async () => emptyCanvas());
    const { seen, report } = connect(sync);
    report((config) => config.onStatus({ status: 'connected' }));
    await act(async () => vi.advanceTimersByTime(5000));
    expect(seen.transport).toBe('tools');
  });

  it("keeps a chat's view on the socket once it has been let in, even if it drops for a moment", () => {
    vi.useFakeTimers();
    const sync = vi.fn<ToolSync>(async () => emptyCanvas());
    const { seen, report } = connect(sync);
    report((config) => config.onStatus({ status: 'connected' }));
    report((config) => config.onAuthenticated());
    report((config) => config.onStatus({ status: 'disconnected' }));
    act(() => vi.advanceTimersByTime(5000));
    expect(seen).toMatchObject({ transport: 'websocket', status: 'disconnected' });
    expect(sync).not.toHaveBeenCalled();
  });
});
