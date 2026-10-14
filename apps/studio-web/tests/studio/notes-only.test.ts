import { describe, expect, it } from 'vitest';
import { type Model } from '@eventcatalog/visualiser/model';
import { modelToCanvas } from '@eventcatalog/visualiser/studio';

// A canvas with nothing but notes, text and hotspots on it (no resources yet) keeps them when it's opened again
describe('a canvas without resources', () => {
  it('opens with its notes, text and hotspots', async () => {
    const model = {
      title: 'Ideas',
      resources: [],
      relations: [],
      notes: [
        { text: 'Payments retry 3x', x: 10, y: 20 },
        { text: 'Checkout flow', kind: 'text', fontSize: 48, angle: 34, x: 300, y: 40 },
      ],
      hotspots: [{ id: 'h1', severity: 'warning', title: 'Single point of failure', position: { x: 50, y: 60 } }],
    } as unknown as Model;
    const content = await modelToCanvas(model);
    expect(content.nodes.map((node) => [node.type, node.data.text])).toEqual([
      ['note', 'Payments retry 3x'],
      ['text', 'Checkout flow'],
    ]);
    expect(content.nodes[1].data).toMatchObject({ fontSize: 48, angle: 34 });
    expect(content.hotspots?.map((hotspot) => hotspot.title)).toEqual(['Single point of failure']);
  });
});
