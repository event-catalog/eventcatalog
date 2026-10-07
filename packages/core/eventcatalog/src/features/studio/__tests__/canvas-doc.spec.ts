import { afterEach, describe, it, expect, vi } from 'vitest';
import * as Y from 'yjs';
import type { Edge, Node } from '@xyflow/react';
import {
  addNodes,
  buildNode,
  canvasDocumentName,
  canvasIdFromDocumentName,
  connectNodes,
  createThread,
  deleteNodes,
  deleteThread,
  fitGroupToChildren,
  getCanvasMaps,
  moveNode,
  moveThread,
  readCanvas,
  readThreads,
  replyToThread,
  resizeNode,
  setNodeParent,
  setThreadResolved,
  type Author,
} from '../canvas-doc';

const ada: Author = { name: 'Ada', color: '#f00' };
const claude: Author = { name: 'Claude', color: '#00f', agent: true };

const node = (id: string, type: string, x: number, y: number, extra: Partial<Node> = {}): Node => ({
  id,
  type,
  position: { x, y },
  data: {},
  ...extra,
});

const nodeOf = (doc: Y.Doc, id: string) => getCanvasMaps(doc).nodes.get(id);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('document names', () => {
  it('round trips a canvas id through its document name', () => {
    expect(canvasDocumentName('abc')).toBe('design:abc');
    expect(canvasIdFromDocumentName('design:abc')).toBe('abc');
    expect(canvasIdFromDocumentName('other:abc')).toBeUndefined();
  });
});

describe('buildNode', () => {
  it('centres a card on the point, without a size or zIndex', () => {
    const built = buildNode('service', { name: 'x' }, { x: 100, y: 100 });
    expect(built.id).toMatch(/^service-[0-9a-f]{8}$/);
    expect(built.position).toEqual({ x: -20, y: 44 });
    expect(built).not.toHaveProperty('width');
    expect(built).not.toHaveProperty('zIndex');
    expect(built.data).toEqual({ name: 'x' });
  });

  it('gives containers their default size and puts them behind other nodes', () => {
    const built = buildNode('domain-group', {}, { x: 100, y: 100 });
    expect(built).toMatchObject({ type: 'domain-group', width: 720, height: 460, zIndex: -1 });
    expect(built.position).toEqual({ x: -260, y: -130 });
  });

  it('gives notes their default size, in front', () => {
    const built = buildNode('note', { text: 'hi' }, { x: 0, y: 0 });
    expect(built).toMatchObject({ width: 200, height: 160, position: { x: -100, y: -80 } });
    expect(built).not.toHaveProperty('zIndex');
  });
});

describe('nodes', () => {
  it('adds nodes and edges, keeping only the shared fields', () => {
    const doc = new Y.Doc();
    const edge: Edge = { id: 'e1', source: 'a', target: 'b' };
    addNodes(
      doc,
      [node('a', 'service', 0, 0, { selected: true, measured: { width: 1, height: 1 } }), node('b', 'service', 1, 1)],
      [edge]
    );

    const { nodes, edges } = readCanvas(doc);
    expect(nodes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(nodes[0]).not.toHaveProperty('selected');
    expect(nodes[0]).not.toHaveProperty('measured');
    expect(edges).toEqual([edge]);
  });

  it('moves and resizes nodes, and says when a node is missing', () => {
    const doc = new Y.Doc();
    addNodes(doc, [node('a', 'note', 0, 0)]);

    expect(moveNode(doc, 'a', { x: 10, y: 20 })).toBe(true);
    expect(resizeNode(doc, 'a', { width: 300, height: 200 })).toBe(true);
    expect(nodeOf(doc, 'a')).toMatchObject({ position: { x: 10, y: 20 }, width: 300, height: 200 });

    expect(moveNode(doc, 'missing', { x: 0, y: 0 })).toBe(false);
    expect(resizeNode(doc, 'missing', { width: 1, height: 1 })).toBe(false);
    expect(getCanvasMaps(doc).nodes.has('missing')).toBe(false);
  });
});

describe('setNodeParent', () => {
  it('puts a node in a container, keeping its canvas position, and grows the container to fit', () => {
    const doc = new Y.Doc();
    addNodes(doc, [node('g', 'domain-group', 100, 100, { width: 720, height: 460 }), node('n', 'service', 900, 700)]);

    expect(setNodeParent(doc, 'n', 'g')).toBe(true);

    const child = nodeOf(doc, 'n')!;
    const group = nodeOf(doc, 'g')!;
    expect(child.parentId).toBe('g');
    expect(child.position).toEqual({ x: 800, y: 600 });
    expect(group.position.x + child.position.x).toBe(900);
    expect(group.position.y + child.position.y).toBe(700);
    // Right edge 1040 + 40 padding, bottom 712 + 40 padding
    expect(group).toMatchObject({ width: 1080, height: 752 });
  });

  it('takes a node out of a container, keeping its canvas position', () => {
    const doc = new Y.Doc();
    addNodes(doc, [
      node('g', 'domain-group', 100, 100, { width: 720, height: 460 }),
      node('n', 'service', 40, 80, { parentId: 'g' }),
    ]);

    expect(setNodeParent(doc, 'n', undefined)).toBe(true);

    const child = nodeOf(doc, 'n')!;
    expect(child).not.toHaveProperty('parentId');
    expect(child.position).toEqual({ x: 140, y: 180 });
  });

  it('does nothing when the node is already there, or missing', () => {
    const doc = new Y.Doc();
    addNodes(doc, [
      node('g', 'domain-group', 0, 0, { width: 720, height: 460 }),
      node('n', 'service', 40, 80, { parentId: 'g' }),
    ]);

    expect(setNodeParent(doc, 'n', 'g')).toBe(false);
    expect(setNodeParent(doc, 'missing', 'g')).toBe(false);
  });
});

describe('fitGroupToChildren', () => {
  it('moves children clear of the header without moving anything on the canvas', () => {
    const doc = new Y.Doc();
    addNodes(doc, [
      node('g', 'system-group', 100, 100, { width: 300, height: 200 }),
      node('c', 'service', 0, 0, { parentId: 'g' }),
    ]);

    fitGroupToChildren(doc, 'g');

    const group = nodeOf(doc, 'g')!;
    const child = nodeOf(doc, 'c')!;
    expect(child.position).toEqual({ x: 40, y: 80 });
    expect(group.position).toEqual({ x: 60, y: 20 });
    expect(group.position.x + child.position.x).toBe(100);
    expect(group.position.y + child.position.y).toBe(100);
    expect(group).toMatchObject({ width: 320, height: 232 });
  });

  it('never shrinks a container', () => {
    const doc = new Y.Doc();
    addNodes(doc, [
      node('g', 'system-group', 0, 0, { width: 1000, height: 800 }),
      node('c', 'service', 100, 100, { parentId: 'g' }),
    ]);

    fitGroupToChildren(doc, 'g');

    expect(nodeOf(doc, 'g')).toMatchObject({ position: { x: 0, y: 0 }, width: 1000, height: 800 });
  });

  it('leaves an empty container alone', () => {
    const doc = new Y.Doc();
    const group = node('g', 'system-group', 0, 0, { width: 100, height: 100 });
    addNodes(doc, [group]);
    fitGroupToChildren(doc, 'g');
    expect(nodeOf(doc, 'g')).toMatchObject({ width: 100, height: 100 });
  });
});

describe('connectNodes', () => {
  const setup = () => {
    const doc = new Y.Doc();
    addNodes(doc, [node('svc', 'service', 0, 0), node('evt', 'event', 400, 0), node('db', 'data', 0, 400)]);
    return doc;
  };

  it('says when the source or target is missing', () => {
    const doc = setup();
    expect(connectNodes(doc, { source: 'nope', target: 'evt' })).toEqual({ error: 'Node "nope" is not on the canvas' });
    expect(connectNodes(doc, { source: 'svc', target: 'nope' })).toEqual({ error: 'Node "nope" is not on the canvas' });
  });

  it('will not connect a node to itself', () => {
    expect(connectNodes(setup(), { source: 'svc', target: 'svc' })).toEqual({
      error: 'A node cannot be connected to itself',
    });
  });

  it('connects with an EventCatalog label', () => {
    const doc = setup();
    const edge = connectNodes(doc, { source: 'svc', target: 'evt' });
    expect(edge).toMatchObject({
      source: 'svc',
      target: 'evt',
      type: 'animated',
      label: 'publishes \nevent',
      data: { message: { collection: 'events' } },
    });
    expect(getCanvasMaps(doc).edges.size).toBe(1);
  });

  it('uses a label it is given', () => {
    expect(connectNodes(setup(), { source: 'svc', target: 'db' }, 'stores orders in')).toMatchObject({
      label: 'stores orders in',
      type: 'smoothstep',
    });
  });

  it('returns the existing edge rather than adding the same connection twice', () => {
    const doc = setup();
    const first = connectNodes(doc, { source: 'svc', target: 'evt' });
    const second = connectNodes(doc, { source: 'svc', target: 'evt' });
    expect(second).toEqual(first);
    expect(getCanvasMaps(doc).edges.size).toBe(1);
  });

  it('treats the other direction as a different connection', () => {
    const doc = setup();
    connectNodes(doc, { source: 'svc', target: 'evt' });
    expect(connectNodes(doc, { source: 'evt', target: 'svc' })).toMatchObject({ label: 'subscribed by' });
    expect(getCanvasMaps(doc).edges.size).toBe(2);
  });
});

describe('deleteNodes', () => {
  const setup = () => {
    const doc = new Y.Doc();
    addNodes(
      doc,
      [
        node('domain', 'domain-group', 100, 100, { width: 720, height: 460 }),
        node('system', 'system-group', 40, 80, { width: 400, height: 300, parentId: 'domain' }),
        node('inner', 'service', 40, 80, { parentId: 'system' }),
        node('outside', 'service', 1000, 0),
        node('other', 'event', 1400, 0),
      ],
      [
        { id: 'inner-outside', source: 'inner', target: 'outside' },
        { id: 'outside-system', source: 'outside', target: 'system' },
        { id: 'outside-other', source: 'outside', target: 'other' },
      ]
    );
    return doc;
  };

  it('removes a container with everything inside it, and the edges to them', () => {
    const doc = setup();
    deleteNodes(doc, ['domain']);

    const { nodes, edges } = readCanvas(doc);
    expect(nodes.map((n) => n.id).sort()).toEqual(['other', 'outside']);
    expect(edges.map((e) => e.id)).toEqual(['outside-other']);
  });

  it('leaves comments pinned to removed nodes where they were on the canvas', () => {
    const doc = setup();
    // inner is at 180,260 on the canvas (100 + 40 + 40, 100 + 80 + 80)
    const pinned = createThread(doc, { position: { x: 0, y: 0 }, nodeId: 'inner', offset: { x: 5, y: 7 } }, 'Hi', ada);
    const kept = createThread(doc, { position: { x: 1, y: 1 }, nodeId: 'outside', offset: { x: 1, y: 1 } }, 'Hey', ada);

    deleteNodes(doc, ['domain']);

    const threads = new Map(readThreads(doc).map((thread) => [thread.id, thread]));
    expect(threads.get(pinned)).toMatchObject({ position: { x: 185, y: 267 } });
    expect(threads.get(pinned)).not.toHaveProperty('nodeId');
    expect(threads.get(pinned)).not.toHaveProperty('offset');
    expect(threads.get(kept)).toMatchObject({ nodeId: 'outside', offset: { x: 1, y: 1 } });
  });

  it('removes just a node without anything inside it', () => {
    const doc = setup();
    deleteNodes(doc, ['outside']);
    const { nodes, edges } = readCanvas(doc);
    expect(nodes.map((n) => n.id).sort()).toEqual(['domain', 'inner', 'other', 'system']);
    expect(edges).toEqual([]);
  });
});

describe('threads', () => {
  it('creates a thread with its first message', () => {
    const doc = new Y.Doc();
    const id = createThread(doc, { position: { x: 10, y: 20 } }, 'Should this be async?', ada);

    const [thread] = readThreads(doc);
    expect(thread).toMatchObject({ id, author: ada, resolved: false, position: { x: 10, y: 20 } });
    expect(thread).not.toHaveProperty('nodeId');
    expect(thread.messages).toEqual([expect.objectContaining({ text: 'Should this be async?', author: ada })]);
  });

  it('only pins to a node when given both the node and the offset', () => {
    const doc = new Y.Doc();
    createThread(doc, { position: { x: 0, y: 0 }, nodeId: 'a' }, 'no offset', ada);
    expect(readThreads(doc)[0]).not.toHaveProperty('nodeId');
  });

  it('replies to a thread', () => {
    const doc = new Y.Doc();
    const id = createThread(doc, { position: { x: 0, y: 0 } }, 'Question', ada);

    expect(replyToThread(doc, id, 'Answer', claude)).toBe(true);
    expect(replyToThread(doc, 'missing', 'Answer', claude)).toBe(false);

    expect(readThreads(doc)[0].messages.map((m) => [m.author.name, m.text])).toEqual([
      ['Ada', 'Question'],
      ['Claude', 'Answer'],
    ]);
  });

  it('resolves and reopens a thread', () => {
    const doc = new Y.Doc();
    const id = createThread(doc, { position: { x: 0, y: 0 } }, 'Q', ada);

    expect(setThreadResolved(doc, id, true)).toBe(true);
    expect(readThreads(doc)[0].resolved).toBe(true);
    expect(setThreadResolved(doc, id, false)).toBe(true);
    expect(readThreads(doc)[0].resolved).toBe(false);
    expect(setThreadResolved(doc, 'missing', true)).toBe(false);
  });

  it('moves a thread onto a node and back onto the canvas', () => {
    const doc = new Y.Doc();
    const id = createThread(doc, { position: { x: 0, y: 0 } }, 'Q', ada);

    expect(moveThread(doc, id, { position: { x: 50, y: 60 }, nodeId: 'a', offset: { x: 5, y: 6 } })).toBe(true);
    expect(readThreads(doc)[0]).toMatchObject({ position: { x: 50, y: 60 }, nodeId: 'a', offset: { x: 5, y: 6 } });

    expect(moveThread(doc, id, { position: { x: 70, y: 80 } })).toBe(true);
    const [thread] = readThreads(doc);
    expect(thread.position).toEqual({ x: 70, y: 80 });
    expect(thread).not.toHaveProperty('nodeId');
    expect(thread).not.toHaveProperty('offset');

    expect(moveThread(doc, 'missing', { position: { x: 0, y: 0 } })).toBe(false);
  });

  it('deletes a thread', () => {
    const doc = new Y.Doc();
    const id = createThread(doc, { position: { x: 0, y: 0 } }, 'Q', ada);

    expect(deleteThread(doc, id)).toBe(true);
    expect(readThreads(doc)).toEqual([]);
    expect(deleteThread(doc, id)).toBe(false);
  });

  it('reads threads oldest first', () => {
    const doc = new Y.Doc();
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(2000);
    const later = createThread(doc, { position: { x: 0, y: 0 } }, 'later', ada);
    now.mockReturnValue(1000);
    const earlier = createThread(doc, { position: { x: 0, y: 0 } }, 'earlier', ada);

    expect(readThreads(doc).map((thread) => thread.id)).toEqual([earlier, later]);
  });
});
