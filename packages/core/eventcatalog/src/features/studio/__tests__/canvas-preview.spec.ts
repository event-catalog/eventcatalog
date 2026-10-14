import { describe, it, expect } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { getCanvasPreview } from '../canvas-preview';

const node = (id: string, type: string, x: number, y: number, extra: Partial<Node> = {}): Node => ({
  id,
  type,
  position: { x, y },
  data: {},
  width: 100,
  height: 50,
  ...extra,
});

describe('getCanvasPreview', () => {
  it('has nothing to draw for an empty canvas', () => {
    expect(getCanvasPreview([], [])).toBeNull();
  });

  it('draws nodes where they are on the canvas, from 0,0, with lines between their middles', () => {
    const preview = getCanvasPreview(
      [node('a', 'service', 100, 200), node('b', 'event', 400, 200)],
      [{ id: 'e', source: 'a', target: 'b' } as Edge]
    );
    expect(preview).toMatchObject({ width: 400, height: 50 });
    expect(preview!.shapes.map(({ x, y, type }) => ({ x, y, type }))).toEqual([
      { x: 0, y: 0, type: 'service' },
      { x: 300, y: 0, type: 'event' },
    ]);
    expect(preview!.lines).toEqual([{ x1: 50, y1: 25, x2: 350, y2: 25 }]);
  });

  it('draws what is in a container where it is on the canvas, over the container', () => {
    const preview = getCanvasPreview(
      [
        node('inside', 'service', 20, 60, { parentId: 'box' }),
        node('box', 'system-group', 100, 100, { width: 400, height: 300 }),
      ],
      []
    );
    expect(preview!.shapes.map(({ x, y, container }) => ({ x, y, container }))).toEqual([
      { x: 0, y: 0, container: true },
      { x: 20, y: 60, container: false },
    ]);
  });
});
