import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import {
  addNodes,
  buildNode,
  createThread,
  getCanvasStatus,
  moveNode,
  readMeta,
  reopeningIfEdited,
  setCanvasStatus,
} from '../canvas-doc';
import { describeCanvas } from '../canvas-actions';

const ada = { name: 'Ada', color: '#7c3aed' };
const agent = { name: 'Claude', color: '#d97706', agent: true };

const canvasWithNode = () => {
  const doc = new Y.Doc();
  addNodes(doc, [{ ...buildNode('service', {}, { x: 0, y: 0 }), id: 'orders' }]);
  return doc;
};

describe('canvas status', () => {
  it('starts as a draft', () => {
    expect(getCanvasStatus(readMeta(new Y.Doc()))).toBe('draft');
  });

  it('records who changed it, when and why', () => {
    const doc = new Y.Doc();
    expect(setCanvasStatus(doc, 'accepted', ada, ' Agreed in the review ')).toBe(true);
    const meta = readMeta(doc);
    expect(meta.status).toBe('accepted');
    expect(meta.statusHistory).toEqual([{ status: 'accepted', by: ada, at: expect.any(Number), note: 'Agreed in the review' }]);
  });

  it('does nothing when it already has that status', () => {
    const doc = new Y.Doc();
    setCanvasStatus(doc, 'proposed', ada);
    expect(setCanvasStatus(doc, 'proposed', agent)).toBe(false);
    expect(readMeta(doc).statusHistory).toHaveLength(1);
  });

  it.each(['accepted', 'rejected'] as const)('makes a %s canvas a draft again when its nodes change', (status) => {
    const doc = canvasWithNode();
    setCanvasStatus(doc, status, ada);
    reopeningIfEdited(doc, agent, () => moveNode(doc, 'orders', { x: 100, y: 0 }));
    const meta = readMeta(doc);
    expect(meta.status).toBe('draft');
    expect(meta.statusHistory?.at(-1)).toMatchObject({ status: 'draft', by: agent, note: `Changed after it was ${status}` });
  });

  it('also notices changes inside a transaction it is already in (like the server agents)', () => {
    const doc = canvasWithNode();
    setCanvasStatus(doc, 'accepted', ada);
    doc.transact(() => reopeningIfEdited(doc, agent, () => moveNode(doc, 'orders', { x: 100, y: 0 })));
    expect(readMeta(doc).status).toBe('draft');
  });

  it('keeps a proposed canvas proposed when it changes', () => {
    const doc = canvasWithNode();
    setCanvasStatus(doc, 'proposed', ada);
    reopeningIfEdited(doc, agent, () => moveNode(doc, 'orders', { x: 100, y: 0 }));
    expect(readMeta(doc).status).toBe('proposed');
  });

  it('keeps an accepted canvas accepted when it is commented on or only read', () => {
    const doc = canvasWithNode();
    setCanvasStatus(doc, 'accepted', ada);
    reopeningIfEdited(doc, agent, () => createThread(doc, { position: { x: 0, y: 0 } }, 'Looks good', agent));
    reopeningIfEdited(doc, agent, () => readMeta(doc));
    expect(readMeta(doc).status).toBe('accepted');
  });

  it('is part of what agents read', () => {
    const doc = canvasWithNode();
    setCanvasStatus(doc, 'accepted', ada, 'Agreed');
    expect(describeCanvas(doc)).toMatchObject({ status: 'accepted', statusChanged: { by: 'Ada', note: 'Agreed' } });
  });
});
