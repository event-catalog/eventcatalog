import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Studio with canvases kept in memory
vi.mock('../../../utils/eventcatalog-config/source', () => ({ default: {} }));

const RUNTIME_KEY = Symbol.for('eventcatalog.studio.runtime');

beforeEach(() => {
  delete (globalThis as Record<symbol, unknown>)[RUNTIME_KEY];
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as Record<symbol, unknown>)[RUNTIME_KEY];
});

describe('The assistant on a canvas', () => {
  it("can't draw when Studio isn't running here", async () => {
    const { getCanvasAssistant } = await import('../server/assistant-tools');
    expect(getCanvasAssistant('3f1c2a4e-0000-4000-8000-000000000000')).toBeUndefined();
  });

  it("can't draw on a canvas that doesn't exist", async () => {
    const { startStudio } = await import('../server/runtime');
    await startStudio();
    const { getCanvasAssistant } = await import('../server/assistant-tools');
    expect(getCanvasAssistant('3f1c2a4e-0000-4000-8000-000000000000')).toBeUndefined();
  });

  it('reads and changes the canvas it was opened on, with instructions to draw there', async () => {
    const { startStudio } = await import('../server/runtime');
    const runtime = await startStudio();
    const canvasId = await runtime.createCanvas({ title: 'Payments', createdBy: 'Someone' });
    const { getCanvasAssistant } = await import('../server/assistant-tools');

    const assistant = getCanvasAssistant(canvasId)!;
    expect(Object.keys(assistant.tools)).toEqual([
      'getCanvas',
      'addToCanvas',
      'updateCanvasNode',
      'connectCanvasNodes',
      'addHotspot',
      'showOnCanvas',
      'walkThrough',
      'removeFromCanvas',
      'layoutCanvas',
    ]);
    expect(assistant.instructions).toContain('Studio canvas');

    const read = (await assistant.tools.getCanvas.execute!({}, {} as never)) as { title?: string };
    expect(read).toMatchObject({ title: 'Payments', nodes: [], connections: [], hotspots: [] });
  });

  it('tidies the canvas once it has finished, when it drew something, keeping notes beside their node', async () => {
    const { startStudio } = await import('../server/runtime');
    const runtime = await startStudio();
    const canvasId = await runtime.createCanvas({ title: 'Payments', createdBy: 'Someone' });
    const { getCanvasAssistant } = await import('../server/assistant-tools');
    const { readCanvas } = await import('@eventcatalog/visualiser/studio');

    // A review (notes only): left as it is
    const reviewing = getCanvasAssistant(canvasId)!;
    await reviewing.tools.addToCanvas.execute!({ nodes: [{ type: 'note', summary: 'An idea', x: 5000, y: 5000 }] }, {} as never);
    const layoutAt = () => runtime.withCanvas(canvasId, (doc) => readCanvas(doc).meta.layoutAt);
    await reviewing.finished();
    expect(await layoutAt()).toBeUndefined();

    // Drawing: tidied when it's done
    const drawing = getCanvasAssistant(canvasId)!;
    await drawing.tools.addToCanvas.execute!(
      {
        nodes: [
          { ref: 'a', type: 'service', name: 'A' },
          { ref: 'b', type: 'service', name: 'B' },
        ],
        edges: [{ from: 'a', to: 'b' }],
      },
      {} as never
    );
    await drawing.finished();
    expect(await layoutAt()).toEqual(expect.any(Number));
    // ...and only once
    const first = await layoutAt();
    await drawing.finished();
    expect(await layoutAt()).toBe(first);
  }, 20_000);

  it('takes the user to nodes on the canvas, saying which it could not find', async () => {
    const { startStudio } = await import('../server/runtime');
    const runtime = await startStudio();
    const canvasId = await runtime.createCanvas({ title: 'Payments', createdBy: 'Someone' });
    const { addNodes } = await import('@eventcatalog/visualiser/studio');
    await runtime.withCanvas(canvasId, (doc) =>
      addNodes(doc, [{ id: 'svc', type: 'service', position: { x: 0, y: 0 }, data: {} }])
    );
    const { getCanvasAssistant } = await import('../server/assistant-tools');
    const { tools } = getCanvasAssistant(canvasId)!;

    expect(await tools.showOnCanvas.execute!({ nodeIds: ['svc', 'gone'] }, {} as never)).toEqual({
      nodeIds: ['svc'],
      notOnCanvas: ['gone'],
    });
    expect(await tools.showOnCanvas.execute!({ nodeIds: ['gone'] }, {} as never)).toEqual({
      error: 'None of these are on the canvas: gone. Use getCanvas for their ids.',
    });
  });

  it('walks the user through steps on the canvas, leaving out nodes that are not on it', async () => {
    const { startStudio } = await import('../server/runtime');
    const runtime = await startStudio();
    const canvasId = await runtime.createCanvas({ title: 'Payments', createdBy: 'Someone' });
    const { addNodes } = await import('@eventcatalog/visualiser/studio');
    await runtime.withCanvas(canvasId, (doc) =>
      addNodes(doc, [{ id: 'svc', type: 'service', position: { x: 0, y: 0 }, data: {} }])
    );
    const { getCanvasAssistant } = await import('../server/assistant-tools');
    const { tools } = getCanvasAssistant(canvasId)!;

    const steps = [{ title: 'It starts', description: 'Something happens.', nodeIds: ['svc', 'gone'] }];
    expect(await tools.walkThrough.execute!({ title: 'How it works', steps }, {} as never)).toEqual({
      title: 'How it works',
      steps: [{ title: 'It starts', description: 'Something happens.', nodeIds: ['svc'] }],
      notOnCanvas: ['gone'],
    });
  });

  it('shows itself planning on the canvas while it writes what to add', async () => {
    const { startStudio } = await import('../server/runtime');
    const runtime = await startStudio();
    const canvasId = await runtime.createCanvas({ title: 'Payments', createdBy: 'Someone' });
    const present = vi.spyOn(runtime.constructor.prototype, 'setAgentPresence');
    const { getCanvasAssistant } = await import('../server/assistant-tools');

    const assistant = getCanvasAssistant(canvasId)!;
    assistant.startedWriting('getResources');
    expect(present).not.toHaveBeenCalled();
    assistant.startedWriting('addToCanvas');
    expect(present).toHaveBeenCalledWith(
      canvasId,
      expect.objectContaining({ name: 'EventCatalog AI' }),
      expect.objectContaining({ activity: 'Planning the diagram' })
    );
  });

  it('flags hotspots on the canvas, as itself, and reads them back', async () => {
    const { startStudio } = await import('../server/runtime');
    const runtime = await startStudio();
    const canvasId = await runtime.createCanvas({ title: 'Payments', createdBy: 'Someone' });
    const { getCanvasAssistant } = await import('../server/assistant-tools');
    const { tools } = getCanvasAssistant(canvasId)!;

    const flagged = await tools.addHotspot.execute!(
      { severity: 'warning', title: 'Single point of failure', description: 'Everything goes through it', x: 100, y: 50 },
      {} as never
    );
    expect(flagged).toEqual({ hotspotId: expect.any(String) });
    expect(await tools.addHotspot.execute!({ severity: 'info', title: 'Nowhere', nodeId: 'missing' }, {} as never)).toEqual({
      error: 'No node "missing" on the canvas',
    });

    const read = (await tools.getCanvas.execute!({}, {} as never)) as { hotspots: unknown[] };
    expect(read.hotspots).toEqual([
      {
        hotspotId: (flagged as { hotspotId: string }).hotspotId,
        severity: 'warning',
        title: 'Single point of failure',
        description: 'Everything goes through it',
        position: { x: 100, y: 50 },
      },
    ]);
    const { readHotspots } = await import('@eventcatalog/visualiser/studio');
    expect(await runtime.withCanvas(canvasId, (doc) => readHotspots(doc)[0].author)).toMatchObject({
      name: 'EventCatalog AI',
      agent: true,
    });
  }, 20_000);
});
