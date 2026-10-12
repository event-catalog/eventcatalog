import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { type Model } from '@eventcatalog/visualiser/model';
import { addNodes, buildNode, getCanvasMaps } from '@eventcatalog/visualiser/studio';
import { loadLocalCanvas, saveLocalCanvas } from '../../view/local-canvas';

// Opened again in a live room, this browser's copy merges with the room's: the same notes, not new ones beside them
describe("a live room's copy kept in this browser", () => {
  beforeEach(() => {
    const stored = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => void stored.set(key, value),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const notes = (doc: Y.Doc) => Array.from(getCanvasMaps(doc).nodes.values()).filter((node) => node.type === 'note');

  it('keeps the room document, so what the room sends merges into the same notes', () => {
    // The room: a note someone wrote there, synced to this browser
    const room = new Y.Doc();
    addNodes(room, [buildNode('note', { text: 'Retry payments' }, { x: 0, y: 0 })]);
    const here = new Y.Doc();
    Y.applyUpdate(here, Y.encodeStateAsUpdate(room));
    const model = { title: 'Live', resources: [], relations: [], notes: [{ text: 'Retry payments' }] } as unknown as Model;
    saveLocalCanvas(model, undefined, 'room-1', here);

    // Reloaded: the page starts from what it kept, then catches up with the room
    const kept = loadLocalCanvas('room-1');
    expect(kept?.doc).toBeInstanceOf(Uint8Array);
    const reloaded = new Y.Doc();
    Y.applyUpdate(reloaded, kept!.doc!);
    Y.applyUpdate(reloaded, Y.encodeStateAsUpdate(room, Y.encodeStateVector(reloaded)));
    Y.applyUpdate(room, Y.encodeStateAsUpdate(reloaded, Y.encodeStateVector(room)));

    expect(notes(reloaded).map((node) => node.data.text)).toEqual(['Retry payments']);
    expect(notes(room)).toHaveLength(1);
  });

  it("isn't kept for this browser's own canvas (only a room's copy)", () => {
    const doc = new Y.Doc();
    saveLocalCanvas({ title: 'Mine', resources: [], relations: [] } as unknown as Model, undefined, undefined, doc);
    expect(loadLocalCanvas()?.doc).toBeUndefined();
  });
});
