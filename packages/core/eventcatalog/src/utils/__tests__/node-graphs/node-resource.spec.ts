import { describe, expect, it } from 'vitest';
import { getNodeDiagramPath } from '@utils/node-graphs/node-resource';
import { compactVisualiserGraph } from '@utils/node-graphs/compact-visualiser-graph';

describe('getNodeDiagramPath', () => {
  it('is the diagram page of the resource a node shows', () => {
    expect(getNodeDiagramPath({ type: 'services', data: { service: { id: 'OrderService', version: '1.0.0' } } })).toBe(
      '/visualiser/services/OrderService/1.0.0'
    );
    expect(
      getNodeDiagramPath({ type: 'events', data: { message: { id: 'x', data: { id: 'OrderPlaced', version: '0.0.1' } } } })
    ).toBe('/visualiser/events/OrderPlaced/0.0.1');
    expect(getNodeDiagramPath({ type: 'data', data: { data: { id: 'orders-db', version: '1.0.0' } } })).toBe(
      '/visualiser/containers/orders-db/1.0.0'
    );
  });

  it("is a domain's or system's own page for their boxes", () => {
    expect(
      getNodeDiagramPath({ type: 'domain-group', data: { domain: { id: 'Orders', name: 'Orders', version: '2.0.0' } } })
    ).toBe('/visualiser/domains/Orders/2.0.0');
    expect(getNodeDiagramPath({ type: 'system-group', data: { system: { id: 'Ordering', version: '1.0.0' } } })).toBe(
      '/visualiser/systems/Ordering/1.0.0'
    );
  });

  it("is nothing for nodes that aren't a resource with a diagram", () => {
    expect(getNodeDiagramPath({ type: 'actor', data: { name: 'Customer' } })).toBeUndefined();
    expect(getNodeDiagramPath({ type: 'entities', data: { entity: { id: 'Order', version: '1.0.0' } } })).toBeUndefined();
    expect(getNodeDiagramPath({ type: 'user', data: { user: { id: 'dboyne' } } })).toBeUndefined();
  });

  it('is nothing for a resource without a version, or with its visualiser turned off', () => {
    expect(getNodeDiagramPath({ type: 'services', data: { service: { id: 'OrderService' } } })).toBeUndefined();
    expect(
      getNodeDiagramPath({ type: 'services', data: { service: { id: 'OrderService', version: '1.0.0', visualiser: false } } })
    ).toBeUndefined();
  });

  it('is still nothing for a resource with its visualiser turned off once its graph is compacted for the page', () => {
    const { nodes } = compactVisualiserGraph(
      [
        {
          id: 'svc-1.0.0',
          type: 'services',
          position: { x: 0, y: 0 },
          data: { service: { id: 'svc', version: '1.0.0', visualiser: false } },
        },
      ],
      []
    );
    expect(getNodeDiagramPath(nodes[0])).toBeUndefined();
  });
});
