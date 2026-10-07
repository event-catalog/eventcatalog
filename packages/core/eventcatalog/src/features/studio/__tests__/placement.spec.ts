import { describe, it, expect } from 'vitest';
import type { Node } from '@xyflow/react';
import { placeNodes } from '../placement';

const node = (id: string, x = 0, y = 0, extra: Partial<Node> = {}): Node => ({
  id,
  type: 'service',
  position: { x, y },
  data: {},
  width: 200,
  height: 100,
  ...extra,
});

const container = (id: string, x: number, y: number, width: number, height: number): Node =>
  node(id, x, y, { type: 'domain-group', width, height });

describe('placeNodes', () => {
  it('puts what a node sends to on its right, lined up with it and stacked around it', () => {
    const positions = placeNodes(
      [node('service'), node('a'), node('b'), node('c')],
      ['a', 'b', 'c'],
      [
        { source: 'service', target: 'a' },
        { source: 'service', target: 'b' },
        { source: 'service', target: 'c' },
      ]
    );

    // 200 between connected nodes for their labels, 80 between stacked ones
    expect(positions.get('a')).toEqual({ x: 400, y: 0 });
    expect(positions.get('b')).toEqual({ x: 400, y: 180 });
    expect(positions.get('c')).toEqual({ x: 400, y: -180 });
  });

  it('puts what sends to a node on its left', () => {
    const positions = placeNodes(
      [node('event', 400, 0), node('producer')],
      ['producer'],
      [{ source: 'producer', target: 'event' }]
    );
    expect(positions.get('producer')).toEqual({ x: 0, y: 0 });
  });

  it('starts the flow from what sends, whatever order they come in', () => {
    const positions = placeNodes(
      [node('consumer'), node('event'), node('producer')],
      ['consumer', 'event', 'producer'],
      [
        { source: 'producer', target: 'event' },
        { source: 'event', target: 'consumer' },
      ]
    );

    expect(positions.get('producer')).toEqual({ x: 0, y: 0 });
    expect(positions.get('event')).toEqual({ x: 400, y: 0 });
    expect(positions.get('consumer')).toEqual({ x: 800, y: 0 });
  });

  it('only places the nodes asked for, around what is already there', () => {
    const positions = placeNodes(
      [node('service'), node('other', 400, 0), node('event')],
      ['event'],
      [{ source: 'service', target: 'event' }]
    );

    expect([...positions.keys()]).toEqual(['event']);
    // Its spot next to the service is taken: the next one down
    expect(positions.get('event')).toEqual({ x: 400, y: 180 });
  });

  it('puts nodes connected to nothing in a row below what is there', () => {
    const positions = placeNodes([node('existing'), node('a'), node('b')], ['a', 'b'], []);
    expect(positions.get('a')).toEqual({ x: 0, y: 220 });
    expect(positions.get('b')).toEqual({ x: 400, y: 220 });
  });

  it('lines a node up with what it connects to inside a container, beside the container', () => {
    const positions = placeNodes(
      [container('domain', 0, 0, 600, 300), node('service', 40, 80, { parentId: 'domain' }), node('event')],
      ['event'],
      [{ source: 'service', target: 'event' }]
    );

    expect(positions.get('event')).toEqual({ x: 800, y: 80 });
  });

  it('fills containers first, clear of their header, so what goes around them leaves room for them to grow', () => {
    const positions = placeNodes(
      [
        container('domain', 0, 0, 400, 300),
        node('service', 0, 0, { parentId: 'domain' }),
        node('event', 0, 0, { parentId: 'domain' }),
        node('consumer'),
      ],
      ['domain', 'service', 'event', 'consumer'],
      [
        { source: 'service', target: 'event' },
        { source: 'event', target: 'consumer' },
      ]
    );

    expect(positions.get('service')).toEqual({ x: 40, y: 80 });
    expect(positions.get('event')).toEqual({ x: 440, y: 80 });
    expect(positions.get('domain')).toEqual({ x: 0, y: 0 });
    // The domain grows to 680 wide to fit the event
    expect(positions.get('consumer')).toEqual({ x: 880, y: 80 });
  });

  it('grows a container to the left for what sends to the first thing in it, without moving anything on the canvas', () => {
    const positions = placeNodes(
      [
        container('domain', 1000, 0, 600, 300),
        node('service', 40, 80, { parentId: 'domain' }),
        node('event', 0, 0, { parentId: 'domain' }),
      ],
      ['event'],
      [{ source: 'event', target: 'service' }]
    );

    // On the service's left (at 1040 on the canvas), lined up with it
    expect(positions.get('event')).toEqual({ x: 1040 - 200 - 200, y: 80 });
  });

  it('keeps nodes inside a container below its header', () => {
    const positions = placeNodes(
      [
        container('domain', 0, 0, 600, 300),
        node('service', 40, 80, { parentId: 'domain' }),
        node('a', 0, 0, { parentId: 'domain' }),
        node('b', 0, 0, { parentId: 'domain' }),
      ],
      ['a', 'b'],
      [
        { source: 'service', target: 'a' },
        { source: 'service', target: 'b' },
      ]
    );

    expect(positions.get('a')).toEqual({ x: 440, y: 80 });
    // Below rather than above, so the container grows down
    expect(positions.get('b')).toEqual({ x: 440, y: 260 });
  });
});
