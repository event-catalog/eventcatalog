import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import type { Node } from '@xyflow/react';
import { addNodes, buildNode, getCanvasMaps, getNodeDefinition } from '@eventcatalog/visualiser/studio';
import { catalogNodeData } from '../catalog';
import {
  describeNode,
  nodeCenter,
  nodeSpecsSchema,
  planNodes,
  withNotesPlaced,
  resolveEdgeRefs,
  topLeftFor,
  updateCanvasNode,
  type NodeSpecs,
} from '../canvas-actions';
import { catalog, resourceByKey } from './catalog-fixture';

const lookupOf = (nodes: Node[]) => new Map(nodes.map((node) => [node.id, node]));

describe('planNodes', () => {
  it('adds a catalog resource as a card, centred where asked, tagged with its catalog resource', () => {
    const { planned, errors } = planNodes(
      [],
      [{ ref: 'svc', resource: { collection: 'services', id: 'OrderService' }, x: 500, y: 300 }],
      catalog
    );

    expect(errors).toEqual([]);
    expect(planned).toHaveLength(1);
    const [{ ref, node, name, resource }] = planned;
    expect(ref).toBe('svc');
    expect(name).toBe('Order Service');
    expect(resource?.key).toBe('services:OrderService');
    expect(node.type).toBe('service');
    expect(node.position).toEqual({ x: 380, y: 244 });
    expect(node.data).toMatchObject({
      service: { name: 'Order Service' },
      catalog: { key: 'services:OrderService', url: '/docs/services/OrderService/1.0.0', version: '1.0.0' },
    });
  });

  it('adds a domain as a card by default', () => {
    const { planned } = planNodes([], [{ resource: { collection: 'domains', id: 'Orders' }, x: 0, y: 0 }], catalog);
    expect(planned[0].node.type).toBe('context-domain');
  });

  it('adds a domain or system as a container with container: true', () => {
    const { planned, errors } = planNodes(
      [],
      [
        { ref: 'd', resource: { collection: 'domains', id: 'Orders' }, container: true, x: 0, y: 0 },
        { ref: 's', resource: { collection: 'systems', id: 'Checkout' }, container: true, x: 2000, y: 0 },
      ],
      catalog
    );

    expect(errors).toEqual([]);
    expect(planned[0].node).toMatchObject({ type: 'domain-group', width: 720, height: 460, zIndex: -1 });
    expect(planned[0].node.data).toMatchObject({ domain: { name: 'Orders' }, catalog: { key: 'domains:Orders' } });
    expect(planned[1].node).toMatchObject({ type: 'system-group', width: 560, height: 360 });
    expect(describeNode(planned[0].node).container).toBe(true);
  });

  it('ignores container: true for resources that cannot be containers', () => {
    const { planned } = planNodes(
      [],
      [{ resource: { collection: 'services', id: 'OrderService' }, container: true, x: 0, y: 0 }],
      catalog
    );
    expect(planned[0].node.type).toBe('service');
  });

  it('puts a node inside a container by its ref, clear of its header', () => {
    const { planned, errors } = planNodes(
      [],
      [
        { ref: 'd', resource: { collection: 'domains', id: 'Orders' }, container: true, x: 0, y: 0 },
        { ref: 'a', resource: { collection: 'services', id: 'OrderService' }, inside: 'd' },
        { ref: 'b', resource: { collection: 'services', id: 'Billing' }, inside: 'd' },
        { ref: 'c', type: 'event', name: 'OrderShipped', inside: 'd' },
      ],
      catalog
    );

    expect(errors).toEqual([]);
    const [domain, a, b, c] = planned.map((entry) => entry.node);
    expect(a).toMatchObject({ parentId: domain.id, position: { x: 40, y: 80 } });
    // Not connected to each other: side by side, with room for connection labels between them
    expect(b).toMatchObject({ parentId: domain.id, position: { x: 480, y: 80 } });
    expect(c).toMatchObject({ parentId: domain.id, position: { x: 920, y: 80 } });
  });

  it('puts a node inside a container at the canvas point asked for', () => {
    const { planned } = planNodes(
      [],
      [
        { ref: 'd', resource: { collection: 'domains', id: 'Orders' }, container: true, x: 0, y: 0 },
        { ref: 'a', resource: { collection: 'services', id: 'OrderService' }, inside: 'd', x: 10, y: 20 },
      ],
      catalog
    );
    const [domain, service] = planned.map((entry) => entry.node);

    expect(service.parentId).toBe(domain.id);
    expect(nodeCenter(service, lookupOf([domain, service]))).toEqual({ x: 10, y: 20 });
  });

  it('puts a node inside a container already on the canvas by its id', () => {
    const existing = { ...buildNode('system-group', {}, { x: 0, y: 0 }), id: 'sys' };
    const { planned, errors } = planNodes([existing], [{ type: 'service', name: 'Fraud', inside: 'sys' }], catalog);
    expect(errors).toEqual([]);
    expect(planned[0].node.parentId).toBe('sys');
  });

  it('says when a catalog resource does not exist', () => {
    const { planned, errors } = planNodes([], [{ resource: { collection: 'services', id: 'Missing' } }], catalog);
    expect(planned).toEqual([]);
    expect(errors).toEqual(['No services resource "Missing" in the catalog']);
  });

  it('says when a node has neither a resource nor a type', () => {
    const { planned, errors } = planNodes([], [{ name: 'Nothing' }] as NodeSpecs, catalog);
    expect(planned).toEqual([]);
    expect(errors[0]).toMatch(/^Give each node a resource, or a type/);
  });

  it('says when inside is not a container, and still adds the node', () => {
    const { planned, errors } = planNodes(
      [],
      [
        { ref: 'a', type: 'service', name: 'A' },
        { ref: 'b', type: 'event', name: 'B', inside: 'a' },
        { ref: 'c', type: 'event', name: 'C', inside: 'nowhere' },
      ],
      catalog
    );
    expect(errors).toEqual([
      '"a" is not a container on the canvas (a domain or system added as a container)',
      '"nowhere" is not a container on the canvas (a domain or system added as a container)',
    ]);
    expect(planned).toHaveLength(3);
    expect(planned[1].node).not.toHaveProperty('parentId');
  });

  it('gives new components the version asked for, except things without versions', () => {
    const { planned } = planNodes(
      [],
      [
        { type: 'event', name: 'Paid', version: '1.2.0', x: 0, y: 0 },
        { type: 'actor', name: 'Customer', version: '1.2.0', x: 0, y: 0 },
      ],
      catalog
    );
    expect(planned[0].node.data).toMatchObject({ message: { version: '1.2.0' } });
    expect(planned[1].node.data).not.toHaveProperty('version');
    expect(describeNode(planned[0].node).version).toBe('1.2.0');
  });

  it('puts a note on the canvas, not in the container an agent asks for', () => {
    const { planned, errors } = planNodes(
      [],
      [
        { ref: 'd', resource: { collection: 'domains', id: 'Orders' }, container: true, x: 0, y: 0 },
        { ref: 'n', type: 'note', summary: 'Question', inside: 'd' },
      ],
      catalog
    );
    expect(planned[1].node).not.toHaveProperty('parentId');
    expect(errors).toEqual([`Notes aren't put in containers: "n" was put on the canvas instead`]);
  });

  it('writes text on the canvas from what an agent gives it', () => {
    const { planned } = planNodes([], [{ type: 'text', summary: 'Checkout flow', x: 0, y: 0 }], catalog);
    expect(planned[0].node.data).toEqual({ text: 'Checkout flow' });
    expect(describeNode(planned[0].node)).toMatchObject({ type: 'Text', text: 'Checkout flow' });
    expect(describeNode(planned[0].node)).not.toHaveProperty('name');
  });

  it('builds new components with the name and summary given', () => {
    const { planned } = planNodes(
      [],
      [
        { type: 'service', name: 'Fraud Service', summary: 'Checks orders', x: 0, y: 0 },
        { type: 'note', summary: 'Remember this', x: 0, y: 0 },
      ],
      catalog
    );
    expect(planned[0]).toMatchObject({
      name: 'Fraud Service',
      node: { type: 'service', data: { service: { name: 'Fraud Service', summary: 'Checks orders' } } },
    });
    expect(planned[1].node.data).toMatchObject({ text: 'Remember this' });
  });

  it('places nodes without a position below what is already on the canvas', () => {
    const existing = { ...buildNode('service', {}, { x: 120, y: 56 }), id: 'old' };
    const { planned } = planNodes(
      [existing],
      [
        { type: 'service', name: 'A' },
        { type: 'service', name: 'B' },
      ],
      catalog
    );
    const [a, b] = planned.map((entry) => entry.node);
    // Below the existing node (bottom 112) with a 120 gap, side by side with a 200 gap
    expect(a.position).toEqual({ x: 0, y: 232 });
    expect(b.position).toEqual({ x: 440, y: 232 });
  });

  it('places nodes around what is on the canvas people edit, not notes added on L1 or L2', () => {
    const existing = { ...buildNode('service', {}, { x: 120, y: 56 }), id: 'old' };
    const l1Note = { ...buildNode('note', { text: 'Far below', level: 1 }, { x: 100, y: 2000 }), id: 'l1-note' };
    const { planned } = planNodes([existing, l1Note], [{ type: 'service', name: 'A' }], catalog);
    expect(planned[0].node.position).toEqual({ x: 0, y: 232 });
  });

  it('tells agents which level a note added on L1 or L2 is on', () => {
    expect(describeNode(buildNode('note', { text: 'Why?', level: 2 }, { x: 0, y: 0 }))).toMatchObject({ onLevel: 'L2' });
    expect(describeNode(buildNode('note', { text: 'Why?' }, { x: 0, y: 0 }))).not.toHaveProperty('onLevel');
  });

  it('places catalog resources without a position next to the related resources, following the flow', () => {
    const service = buildNode('service', catalogNodeData(resourceByKey('services:OrderService')), { x: 120, y: 56 });
    const { planned } = planNodes(
      [service],
      [{ resource: { collection: 'services', id: 'Billing' } }, { resource: { collection: 'events', id: 'OrderPlaced' } }],
      catalog
    );
    const [billing, event] = planned.map((entry) => entry.node);
    const lookup = lookupOf([service, billing, event]);

    // The event to the right of the service that publishes it, and Billing (which receives it) to the right of that
    expect(event.position.x).toBe(240 + 200);
    expect(billing.position.x).toBe(event.position.x + (event.width ?? 240) + 200);
    expect(nodeCenter(event, lookup).y).toBe(nodeCenter(service, lookup).y);
    expect(nodeCenter(billing, lookup).y).toBe(nodeCenter(service, lookup).y);
    expect(service.position).toEqual({ x: 0, y: 0 });
  });

  it('places new components next to what they are connected to in edges', () => {
    const { planned } = planNodes(
      [],
      [
        { ref: 'event', type: 'event', name: 'Paid' },
        { ref: 'service', type: 'service', name: 'Payments' },
      ],
      catalog,
      [{ from: 'service', to: 'event' }]
    );
    const [event, service] = planned.map((entry) => entry.node);

    // The flow starts from the service, even though the event was listed first
    expect(service.position).toEqual({ x: 0, y: 0 });
    expect(event.position.x).toBe(240 + 200);
  });
});

describe('describeNode', () => {
  const domain: Node = {
    id: 'domain',
    type: 'domain-group',
    position: { x: 100, y: 100 },
    width: 720,
    height: 460,
    data: { domain: { name: 'Orders' } },
  };
  const service: Node = {
    id: 'svc',
    type: 'service',
    position: { x: 40, y: 80 },
    parentId: 'domain',
    data: catalogNodeData(resourceByKey('services:OrderService')),
  };

  it('describes a catalog node inside a container, with its centre on the canvas', () => {
    expect(describeNode(service, lookupOf([domain, service]))).toEqual({
      id: 'svc',
      type: 'Service',
      name: 'Order Service',
      summary: 'Order Service summary',
      catalogResource: 'services/OrderService',
      version: '1.0.0',
      position: { x: 260, y: 236 },
      size: { width: 240, height: 112 },
      inside: 'domain',
    });
  });

  it('describes a container', () => {
    expect(describeNode(domain)).toEqual({
      id: 'domain',
      type: 'Domain',
      name: 'Orders',
      position: { x: 460, y: 330 },
      size: { width: 720, height: 460 },
      container: true,
    });
  });

  it('describes a note by its text', () => {
    const note: Node = { id: 'n', type: 'note', position: { x: 0, y: 0 }, width: 200, height: 160, data: { text: 'Hi' } };
    const described = describeNode(note);
    expect(described.text).toBe('Hi');
    expect(described).not.toHaveProperty('name');
  });
});

describe('nodeCenter and topLeftFor', () => {
  const domain: Node = { id: 'd', type: 'domain-group', position: { x: 300, y: -200 }, width: 720, height: 460, data: {} };
  const outer: Node = {
    id: 's',
    type: 'system-group',
    position: { x: 40, y: 80 },
    width: 560,
    height: 360,
    parentId: 'd',
    data: {},
  };
  const service: Node = { id: 'svc', type: 'service', position: { x: 0, y: 0 }, parentId: 's', data: {} };
  const lookup = lookupOf([domain, outer, service]);

  it('places a node in nested containers so its centre is on the canvas point', () => {
    const position = topLeftFor(service, { x: 500, y: 400 }, lookup);
    expect(position).toEqual({ x: 500 - 120 - 340, y: 400 - 56 + 120 });
    expect(nodeCenter({ ...service, position }, lookup)).toEqual({ x: 500, y: 400 });
  });

  it('round trips a node not in a container', () => {
    const loose: Node = { id: 'l', type: 'note', position: { x: 0, y: 0 }, width: 200, height: 160, data: {} };
    const position = topLeftFor(loose, { x: 0, y: 0 });
    expect(position).toEqual({ x: -100, y: -80 });
    expect(nodeCenter({ ...loose, position })).toEqual({ x: 0, y: 0 });
  });
});

describe('resolveEdgeRefs', () => {
  it('swaps refs for the planned node ids, leaving ids of nodes already on the canvas', () => {
    const { planned } = planNodes(
      [],
      [
        { ref: 'a', type: 'service', name: 'A', x: 0, y: 0 },
        { ref: 'b', type: 'event', name: 'B', x: 500, y: 0 },
      ],
      catalog
    );
    const [a, b] = planned.map((entry) => entry.node.id);

    expect(
      resolveEdgeRefs(
        [
          { from: 'a', to: 'b', label: 'emits' },
          { from: 'b', to: 'existing-node' },
        ],
        planned
      )
    ).toEqual([
      { from: a, to: b, label: 'emits' },
      { from: b, to: 'existing-node' },
    ]);
  });
});

describe('updateCanvasNode', () => {
  const setup = () => {
    const doc = new Y.Doc();
    const definition = getNodeDefinition('service')!;
    addNodes(doc, [
      { ...buildNode('service', definition.createData(), { x: 0, y: 0 }), id: 'new' },
      { ...buildNode('service', catalogNodeData(resourceByKey('services:OrderService')), { x: 0, y: 0 }), id: 'linked' },
      { ...buildNode('note', { text: 'old', color: 'yellow' }, { x: 0, y: 0 }), id: 'note' },
    ]);
    return doc;
  };
  const dataOf = (doc: Y.Doc, id: string) => getCanvasMaps(doc).nodes.get(id)!.data as Record<string, any>;

  it('renames and re-describes a new component', () => {
    const doc = setup();
    expect(updateCanvasNode(doc, { nodeId: 'new', name: 'Fraud', summary: 'Checks orders' })).toEqual({ updated: 'new' });
    expect(dataOf(doc, 'new').service).toMatchObject({ name: 'Fraud', summary: 'Checks orders' });
  });

  it('changes the version of a new component, and not of a catalog resource', () => {
    const doc = setup();
    updateCanvasNode(doc, { nodeId: 'new', version: '2.1.0' });
    updateCanvasNode(doc, { nodeId: 'linked', version: '9.9.9' });
    expect(dataOf(doc, 'new').service.version).toBe('2.1.0');
    expect(dataOf(doc, 'linked').service.version).toBe('1.0.0');
  });

  it('only changes what it is given', () => {
    const doc = setup();
    updateCanvasNode(doc, { nodeId: 'new', name: 'Fraud' });
    expect(dataOf(doc, 'new').service).toMatchObject({ name: 'Fraud', summary: 'Describe what this service does.' });
  });

  it('leaves catalog resources with their catalog name and summary', () => {
    const doc = setup();
    expect(updateCanvasNode(doc, { nodeId: 'linked', name: 'Renamed', summary: 'Nope' })).toEqual({ updated: 'linked' });
    expect(dataOf(doc, 'linked').service).toMatchObject({ name: 'Order Service', summary: 'Order Service summary' });
  });

  it("sets a note's text", () => {
    const doc = setup();
    updateCanvasNode(doc, { nodeId: 'note', summary: 'new text' });
    expect(dataOf(doc, 'note')).toEqual({ text: 'new text', color: 'yellow' });
  });

  it('says when the node is not on the canvas', () => {
    expect(updateCanvasNode(setup(), { nodeId: 'missing', name: 'X' })).toEqual({ error: 'No node "missing" on the canvas' });
  });
});

describe('nodeSpecsSchema', () => {
  it('lets agents add sticky notes and text, as well as what the palette has', () => {
    for (const type of ['note', 'text', 'service']) {
      expect(nodeSpecsSchema.safeParse([{ type, summary: 'Something to say' }]).success, type).toBe(true);
    }
    expect(nodeSpecsSchema.safeParse([{ type: 'not-a-type' }]).success).toBe(false);
  });
});

describe('withNotesPlaced', () => {
  const service = (id: string, x: number, y: number): Node => ({ id, type: 'service', position: { x, y }, data: {} });
  const note = (id: string, x: number, y: number, level?: number): Node => ({
    id,
    type: 'note',
    position: { x, y },
    data: { text: id, ...(level && { level }) },
  });

  it('moves each note with the node beside it, and the rest with the whole diagram', () => {
    const nodes = [service('a', 0, 0), service('b', 2000, 0), note('about-a', 300, 0), note('alone', 0, 5000)];
    const layout = {
      nodes: new Map([
        ['a', { position: { x: 100, y: 400 } }],
        ['b', { position: { x: 600, y: 0 } }],
        // where the layout would put them otherwise
        ['about-a', { position: { x: 9999, y: 9999 } }],
        ['alone', { position: { x: 9999, y: 9999 } }],
      ]),
      routes: new Map(),
    };

    const placed = withNotesPlaced(nodes, layout).nodes;
    expect(placed.get('about-a')).toEqual({ position: { x: 400, y: 400 } });
    // Beside nothing: where it was around the diagram (which starts 100 further right now)
    expect(placed.get('alone')).toEqual({ position: { x: 100, y: 5000 } });
    expect(placed.get('a')).toEqual({ position: { x: 100, y: 400 } });
  });

  it('follows what is in a container, where the container goes', () => {
    const nodes: Node[] = [
      { id: 'domain', type: 'domain-group', position: { x: 0, y: 0 }, width: 600, height: 400, data: {} },
      { ...service('inside', 40, 80), parentId: 'domain' },
      note('about-inside', 700, 80),
    ];
    const layout = {
      nodes: new Map([
        ['domain', { position: { x: 1000, y: 0 }, size: { width: 600, height: 400 } }],
        ['inside', { position: { x: 40, y: 80 } }],
      ]),
      routes: new Map(),
    };

    expect(withNotesPlaced(nodes, layout).nodes.get('about-inside')).toEqual({ position: { x: 1700, y: 80 } });
  });

  it('keeps a title above the diagram, clear of what is laid out under it', () => {
    const title: Node = {
      id: 'title',
      type: 'text',
      position: { x: 0, y: -150 },
      data: { text: 'Food delivery platform', fontSize: 48 },
    };
    const nodes = [service('a', 0, 0), title];
    // The layout puts a node where the title would land
    const layout = { nodes: new Map([['a', { position: { x: 0, y: -150 } }]]), routes: new Map() };

    const { position } = withNotesPlaced(nodes, layout).nodes.get('title')!;
    // Moved up, clear of the node (its text is about 67px tall at that size)
    expect(position.x).toBe(0);
    expect(position.y + 48 * 1.4).toBeLessThanOrEqual(-150);
  });

  it('keeps notes off each other', () => {
    const nodes = [service('a', 0, 0), note('first', 300, 0), note('second', 300, 0)];
    const layout = { nodes: new Map([['a', { position: { x: 0, y: 0 } }]]), routes: new Map() };

    const placed = withNotesPlaced(nodes, layout).nodes;
    expect(placed.get('first')).toEqual({ position: { x: 300, y: 0 } });
    expect(placed.get('second')!.position).not.toEqual({ x: 300, y: 0 });
  });

  it('leaves notes on L1 and L2 to those levels', () => {
    const nodes = [service('a', 0, 0), note('on-l1', 300, 0, 1)];
    const layout = { nodes: new Map([['a', { position: { x: 500, y: 0 } }]]), routes: new Map() };
    expect(withNotesPlaced(nodes, layout).nodes.has('on-l1')).toBe(false);
  });
});

describe('text written by agents', () => {
  it('is as big as asked, and can be made bigger', () => {
    const { planned } = planNodes([], [{ ref: 't', type: 'text', summary: 'Ordering', fontSize: 48 }], catalog);
    expect(planned[0].node.data).toMatchObject({ text: 'Ordering', fontSize: 48 });

    const doc = new Y.Doc();
    addNodes(doc, [planned[0].node]);
    updateCanvasNode(doc, { nodeId: planned[0].node.id, fontSize: 64 });
    expect(getCanvasMaps(doc).nodes.get(planned[0].node.id)!.data).toMatchObject({ text: 'Ordering', fontSize: 64 });
  });

  it('leaves font sizes to text (notes are as big as what is on them)', () => {
    const { planned } = planNodes([], [{ type: 'note', summary: 'An idea', fontSize: 48 }], catalog);
    expect(planned[0].node.data).not.toHaveProperty('fontSize');
  });
});

describe('notes and text added by agents', () => {
  const service = (id: string, x: number, y: number): Node => ({ id, type: 'service', position: { x, y }, data: {} });
  const rectOf = (node: Node, width: number, height: number) => ({ ...node.position, width, height });
  const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

  it('never lands a note on a node: it goes to the nearest clear spot beside it', () => {
    const existing = [service('a', 0, 0)];
    const { planned } = planNodes(existing, [{ type: 'note', summary: 'Kafka: ordered events', x: 120, y: 55 }], catalog);

    const note = planned[0].node;
    expect(overlap(rectOf(note, 200, 176), rectOf(existing[0], 240, 110))).toBe(false);
    // Next to it, not far away
    expect(Math.hypot(note.position.x - 20, note.position.y + 33)).toBeLessThan(400);
  });

  it('keeps notes off each other, sized by what is written on them', () => {
    const long = 'A long note that goes on and on about what could be better here and there';
    const { planned } = planNodes(
      [],
      [
        { type: 'note', summary: long, x: 100, y: 100 },
        { type: 'note', summary: 'Short', x: 100, y: 100 },
      ],
      catalog
    );
    const [first, second] = planned.map((entry) => entry.node);
    // The long note is taller than a note's usual size
    expect(overlap(rectOf(first, 200, Math.max(176, Math.ceil(long.length / 20) * 22 + 60)), rectOf(second, 200, 176))).toBe(
      false
    );
  });

  it('leaves a note where it is asked when that is clear', () => {
    const { planned } = planNodes([service('a', 0, 0)], [{ type: 'note', summary: 'Idea', x: 600, y: 55 }], catalog);
    expect(planned[0].canvasPosition).toEqual({ x: 500, y: -33 });
  });
});
