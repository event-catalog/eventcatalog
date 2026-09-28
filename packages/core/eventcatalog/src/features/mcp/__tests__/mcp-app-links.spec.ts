import { describe, expect, it } from 'vitest';
import { askLink, parseAskLink, parseDiagramLink, withAskMenuItem } from '../apps/architecture-diagram/links';

const catalogUrl = 'https://catalog.example.com';

describe('links in the architecture diagram view', () => {
  it('opens the diagram for a "Focus node" link in the view', () => {
    expect(parseDiagramLink('/visualiser/services/order-service/1.0.0', catalogUrl)).toEqual({
      collection: 'services',
      id: 'order-service',
      version: '1.0.0',
    });
  });

  it('opens diagrams for links the visualiser already made absolute, and under a base path', () => {
    expect(parseDiagramLink('https://catalog.example.com/visualiser/domains/payments/1.0.0?level=1', catalogUrl)).toEqual({
      collection: 'domains',
      id: 'payments',
      version: '1.0.0',
    });
    expect(parseDiagramLink('/catalog/visualiser/systems/checkout-system/1.0.0/', catalogUrl)).toEqual({
      collection: 'systems',
      id: 'checkout-system',
      version: '1.0.0',
    });
  });

  it('opens other links in EventCatalog, such as documentation and diagrams the tool cannot draw', () => {
    expect(parseDiagramLink('/docs/services/order-service/1.0.0', catalogUrl)).toBeUndefined();
    expect(parseDiagramLink('/visualiser/channels/order-events/1.0.0', catalogUrl)).toBeUndefined();
    expect(parseDiagramLink('/visualiser/domains/ordering/1.0.0/entity-map', catalogUrl)).toBeUndefined();
  });

  it('opens links to other sites in the browser', () => {
    expect(parseDiagramLink('https://github.com/acme/visualiser/services/x/1.0.0', catalogUrl)).toBeUndefined();
  });
});

describe('"Ask a question" in a node\'s right-click menu', () => {
  it('adds "Ask a question" first, above the menu the node already has', () => {
    const [node] = withAskMenuItem([
      {
        id: 'order-service-1.0.0',
        data: { contextMenu: [{ label: 'Read documentation', href: '/docs/services/order-service/1.0.0' }] },
      },
    ]);

    expect(node.data.contextMenu).toEqual([
      { label: 'Ask a question', href: askLink('order-service-1.0.0') },
      { label: 'Read documentation', href: '/docs/services/order-service/1.0.0', separator: true },
    ]);
  });

  it('adds "Ask a question" to nodes without a menu', () => {
    const [node] = withAskMenuItem([{ id: 'actor-shopper', data: { name: 'Shopper' } }]);

    expect(node.data.contextMenu).toEqual([{ label: 'Ask a question', href: askLink('actor-shopper') }]);
  });

  it('knows which node an "Ask a question" link is for, including ids with special characters', () => {
    expect(parseAskLink(askLink('ordering.order-events-1.0.0'))).toBe('ordering.order-events-1.0.0');
    expect(parseAskLink('/docs/services/order-service/1.0.0')).toBeUndefined();
  });
});
