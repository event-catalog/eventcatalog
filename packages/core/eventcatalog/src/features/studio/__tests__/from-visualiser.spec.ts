import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import type { VisualiserSnapshot } from '@eventcatalog/visualiser';
import {
  addCanvasContent,
  getCanvasMaps,
  getDiagramLevel,
  getDiagramLevelUnavailable,
  getStructureKey,
  moveNode,
  readMeta,
  updateNodeData,
} from '../canvas-doc';
import { planCanvas } from '../canvas-actions';
import { getAbsolutePosition } from '../grouping';
import { canvasFromVisualiser } from '../from-visualiser';
import { catalog } from './catalog-fixture';

type ShownNode = VisualiserSnapshot['nodes'][number];
const shown = (id: string, type: string, data: Record<string, unknown>, center: { x: number; y: number }, extra = {}) =>
  ({ id, type, data, center, width: 240, height: 80, ...extra }) satisfies ShownNode;
const route = {
  points: [
    { x: 420, y: 300 },
    { x: 480, y: 300 },
  ],
  label: { x: 450, y: 300 },
};

// The Orders domain's diagram: its Checkout system (with OrderService in it), the event it publishes, a flow step
// that isn't a catalog resource, and Billing outside the domain
const snapshot: VisualiserSnapshot = {
  title: 'Orders (v1.0.0)',
  level: 3,
  levels: {},
  unavailableLevels: {},
  nodes: [
    shown(
      'OrderService-1.0.0',
      'services',
      { service: { id: 'OrderService' } },
      { x: 300, y: 300 },
      { parentId: 'system-group-Checkout-1.0.0' }
    ),
    shown(
      'domain-group-Orders-1.0.0',
      'domain-group',
      { domain: { id: 'Orders' } },
      { x: 400, y: 300 },
      { width: 800, height: 600 }
    ),
    shown(
      'system-group-Checkout-1.0.0',
      'system-group',
      { system: { id: 'Checkout' } },
      { x: 300, y: 300 },
      {
        parentId: 'domain-group-Orders-1.0.0',
        width: 400,
        height: 300,
      }
    ),
    shown(
      'OrderPlaced-1.0.0',
      'events',
      { message: { id: 'OrderPlaced' } },
      { x: 600, y: 300 },
      { parentId: 'domain-group-Orders-1.0.0' }
    ),
    shown('step-1', 'step', { step: { title: 'Pay' } }, { x: 900, y: 600 }),
    shown('Billing-1.0.0', 'services', { service: { id: 'Billing' } }, { x: 1000, y: 300 }),
  ],
  edges: [
    { source: 'OrderService-1.0.0', target: 'OrderPlaced-1.0.0', label: 'publishes', route },
    { source: 'OrderPlaced-1.0.0', target: 'Billing-1.0.0' },
    { source: 'step-1', target: 'Billing-1.0.0' },
    { source: 'domain-group-Orders-1.0.0', target: 'OrderPlaced-1.0.0' },
  ],
};

describe('canvasFromVisualiser', () => {
  // Cards are put by their centre at the size they're created at, so their top-left corners are where the diagram's are
  it('turns the catalog resources a diagram shows into nodes where they are, containers first', () => {
    const { nodes } = canvasFromVisualiser(snapshot);

    expect(nodes).toEqual([
      {
        ref: 'domain-group-Orders-1.0.0',
        resource: { collection: 'domains', id: 'Orders' },
        x: 400,
        y: 300,
        container: true,
        width: 800,
        height: 600,
      },
      { ref: 'Billing-1.0.0', resource: { collection: 'services', id: 'Billing' }, x: 1000, y: 316 },
      {
        ref: 'system-group-Checkout-1.0.0',
        resource: { collection: 'systems', id: 'Checkout' },
        x: 300,
        y: 300,
        container: true,
        width: 400,
        height: 300,
        inside: 'domain-group-Orders-1.0.0',
      },
      {
        ref: 'OrderPlaced-1.0.0',
        resource: { collection: 'events', id: 'OrderPlaced' },
        x: 600,
        y: 316,
        inside: 'domain-group-Orders-1.0.0',
      },
      {
        ref: 'OrderService-1.0.0',
        resource: { collection: 'services', id: 'OrderService' },
        x: 300,
        y: 316,
        inside: 'system-group-Checkout-1.0.0',
      },
    ]);
  });

  it("keeps the connections between them and their routes, not ones to what's left out or between a container and what's in it", () => {
    expect(canvasFromVisualiser(snapshot).edges).toEqual([
      { from: 'OrderService-1.0.0', to: 'OrderPlaced-1.0.0', label: 'publishes', route },
      { from: 'OrderPlaced-1.0.0', to: 'Billing-1.0.0' },
    ]);
  });

  it("brings actors over as Studio's actors, with their connections", () => {
    const { nodes, edges } = canvasFromVisualiser({
      level: 1,
      levels: {},
      unavailableLevels: {},
      nodes: [
        shown('actor-customer', 'context-actor', { name: 'Customer' }, { x: 100, y: 100 }),
        shown('Billing-1.0.0', 'services', { service: { id: 'Billing' } }, { x: 500, y: 100 }),
      ],
      edges: [{ source: 'actor-customer', target: 'Billing-1.0.0', label: 'pays with' }],
    });
    expect(nodes[0]).toEqual({ ref: 'actor-customer', type: 'actor', name: 'Customer', x: 100, y: 116 });
    expect(edges).toEqual([{ from: 'actor-customer', to: 'Billing-1.0.0', label: 'pays with' }]);

    const { content, errors } = planCanvas(nodes, edges, catalog);
    expect(errors).toEqual([]);
    expect(content.nodes[0]).toMatchObject({ type: 'actor', data: { name: 'Customer', summary: '' } });
  });

  it('puts nodes in the nearest container that is on the canvas', () => {
    const { nodes } = canvasFromVisualiser({
      level: 3,
      levels: {},
      unavailableLevels: {},
      nodes: [
        shown('group', 'group', {}, { x: 0, y: 0 }),
        shown('svc', 'service', { service: { id: 'Billing' } }, { x: 0, y: 0 }, { parentId: 'group' }),
      ],
      edges: [],
    });
    expect(nodes).toEqual([{ ref: 'svc', resource: { collection: 'services', id: 'Billing' }, x: 0, y: 16 }]);
  });

  it('starts a canvas that looks like the diagram', () => {
    const { nodes, edges } = canvasFromVisualiser(snapshot);
    const { content, errors } = planCanvas(nodes, edges, catalog);
    expect(errors).toEqual([]);

    const doc = new Y.Doc();
    addCanvasContent(doc, content);
    const onCanvas = new Map(getCanvasMaps(doc).nodes.entries());
    const all = [...onCanvas.values()];
    const named = (key: string) => all.find((node) => (node.data.catalog as { key: string }).key === key)!;

    // Where the diagram had them, in the same containers
    const service = named('services:OrderService');
    expect(getAbsolutePosition(service, onCanvas)).toEqual({ x: 180, y: 260 });
    expect(onCanvas.get(service.parentId!)?.type).toBe('system-group');
    const domain = named('domains:Orders');
    expect(domain).toMatchObject({ type: 'domain-group', position: { x: 0, y: 0 }, width: 800, height: 600 });
    expect(named('events:OrderPlaced').parentId).toBe(domain.id);

    // Just the connections the diagram has
    const connections = [...getCanvasMaps(doc).edges.values()].map((edge) => [
      onCanvas.get(edge.source)?.data.catalog,
      onCanvas.get(edge.target)?.data.catalog,
      edge.label,
    ]);
    expect(connections).toEqual([
      [
        expect.objectContaining({ key: 'services:OrderService' }),
        expect.objectContaining({ key: 'events:OrderPlaced' }),
        'publishes',
      ],
      [
        expect.objectContaining({ key: 'events:OrderPlaced' }),
        expect.objectContaining({ key: 'services:Billing' }),
        expect.any(String),
      ],
    ]);

    // Drawn along the diagram's routes, from where their nodes are
    const routed = [...getCanvasMaps(doc).edges.values()].find((edge) => edge.label === 'publishes')!;
    expect(routed.data?.route).toEqual({
      ...route,
      source: { x: 180, y: 260 },
      target: getAbsolutePosition(named('events:OrderPlaced'), onCanvas),
    });
  });

  describe("the diagram's levels", () => {
    // Level 1 of the Orders domain: its Checkout system as a card (a container on level 3), and Billing
    const level1 = {
      nodes: [
        {
          id: 'domain-group-Orders-1.0.0',
          type: 'domain-group',
          position: { x: 0, y: 0 },
          style: { width: 600, height: 300 },
          data: { domain: { id: 'Orders' }, isFocused: true },
        },
        {
          id: 'Checkout-1.0.0',
          type: 'systems',
          parentId: 'domain-group-Orders-1.0.0',
          position: { x: 40, y: 80 },
          data: { system: { id: 'Checkout' } },
        },
        { id: 'Billing-1.0.0', type: 'services', position: { x: 800, y: 100 }, data: { service: { id: 'Billing' } } },
        { id: 'actor-shopper', type: 'context-actor', position: { x: -300, y: 100 }, data: { name: 'Shopper' } },
      ],
      edges: [
        {
          id: 'e1',
          source: 'Checkout-1.0.0',
          target: 'Billing-1.0.0',
          label: 'publishes\nOrderPlaced',
          style: { strokeWidth: 1 },
          data: { route },
        },
        { id: 'e2', source: 'actor-shopper', target: 'Checkout-1.0.0', label: 'uses' },
      ],
    };
    const opened = () => {
      const { nodes, edges, levels } = canvasFromVisualiser({ ...snapshot, levels: { 1: level1 } });
      const { content, errors } = planCanvas(nodes, edges, catalog, levels);
      expect(errors).toEqual([]);
      const doc = new Y.Doc();
      addCanvasContent(doc, content);
      return doc;
    };
    const canvas = (doc: Y.Doc) => {
      const { nodes, edges } = getCanvasMaps(doc);
      return { nodes: [...nodes.values()], edges: [...edges.values()] };
    };

    it("are kept with the canvas, by the canvas's node ids (a system's card standing for its container)", () => {
      const doc = opened();
      const { nodes } = canvas(doc);
      const idOf = (key: string) => nodes.find((node) => (node.data.catalog as { key: string } | undefined)?.key === key)?.id;
      const level = readMeta(doc).diagramLevels?.[1];

      expect(level?.nodes.map((node) => [node.id, node.type, node.parentId])).toEqual([
        [idOf('domains:Orders'), 'domain-group', undefined],
        [idOf('systems:Checkout'), 'systems', idOf('domains:Orders')],
        [idOf('services:Billing'), 'services', undefined],
        // Only on this level: its own id
        ['actor-shopper', 'context-actor', undefined],
      ]);
      // Laid out as the diagram had it, without the diagram's "Viewing" mark
      expect(level?.nodes[0]).toMatchObject({ position: { x: 0, y: 0 }, style: { width: 600, height: 300 } });
      expect(level?.nodes[0].data).not.toHaveProperty('isFocused');
      expect(level?.edges).toEqual([
        expect.objectContaining({
          source: idOf('systems:Checkout'),
          target: idOf('services:Billing'),
          label: 'publishes\nOrderPlaced',
          data: { route },
        }),
        expect.objectContaining({ source: 'actor-shopper', target: idOf('systems:Checkout'), label: 'uses' }),
      ]);
    });

    it("are shown while what's on the canvas is what was opened, however it's moved", () => {
      const doc = opened();
      const { nodes } = canvas(doc);
      moveNode(doc, nodes[0].id, { x: 999, y: 999 });
      const moved = canvas(doc);
      expect(getDiagramLevel(readMeta(doc).diagramLevels, 1, getStructureKey(moved.nodes, moved.edges))).toBe(
        readMeta(doc).diagramLevels?.[1]
      );
      expect(getDiagramLevel(readMeta(doc).diagramLevels, 2, getStructureKey(moved.nodes, moved.edges))).toBeUndefined();
    });

    it("say which levels the diagram doesn't have, and why, until what's on the canvas changes", () => {
      const reason = 'Not available here: this diagram has no overview of domains or systems';
      const { nodes, edges, levels } = canvasFromVisualiser({ ...snapshot, levels: {}, unavailableLevels: { 1: reason } });
      const doc = new Y.Doc();
      addCanvasContent(doc, planCanvas(nodes, edges, catalog, levels).content);
      const { diagramLevels } = readMeta(doc);
      expect(getDiagramLevelUnavailable(diagramLevels, 1, getStructureKey(canvas(doc).nodes, canvas(doc).edges))).toBe(reason);
      expect(getDiagramLevelUnavailable(diagramLevels, 2, getStructureKey(canvas(doc).nodes, canvas(doc).edges))).toBeUndefined();

      const service = canvas(doc).nodes.find((node) => node.type === 'service')!;
      updateNodeData(doc, service.id, (data) => ({ ...data, service: { ...(data.service as object), name: 'Renamed' } }));
      expect(
        getDiagramLevelUnavailable(readMeta(doc).diagramLevels, 1, getStructureKey(canvas(doc).nodes, canvas(doc).edges))
      ).toBeUndefined();
    });

    it("aren't once what's on the canvas changes (they're worked out from the canvas then)", () => {
      const doc = opened();
      const service = canvas(doc).nodes.find((node) => node.type === 'service')!;
      updateNodeData(doc, service.id, (data) => ({ ...data, service: { ...(data.service as object), name: 'Renamed' } }));
      const changed = canvas(doc);
      expect(getDiagramLevel(readMeta(doc).diagramLevels, 1, getStructureKey(changed.nodes, changed.edges))).toBeUndefined();
    });
  });
});
