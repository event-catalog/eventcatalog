// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ResourcesTable, type ResourceItem } from '../ResourcesTable';
import { favoritesStore } from '../../../../stores/favorites-store';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const resource = (name: string, collection: ResourceItem['collection'] = 'services'): ResourceItem => ({
  collection,
  id: name,
  name,
  version: '1.0.0',
  href: `/docs/${collection}/${name}/1.0.0`,
  visualiserHref: collection === 'entities' ? undefined : `/visualiser/${collection}/${name}/1.0.0`,
  favorite: { nodeKey: `${collection}:${name}:1.0.0`, badge: 'Service' },
});

// 12 services named Service 01..12, plus one entity, so the default page of 10 overflows.
const resources = [
  ...Array.from({ length: 12 }, (_, i) => resource(`Service ${String(i + 1).padStart(2, '0')}`)),
  resource('Order', 'entities'),
];

const roots: Root[] = [];
function render(element: React.ReactNode) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => root.render(element));
  return container;
}

const rowNames = (container: HTMLElement) =>
  [...container.querySelectorAll('tbody tr a')].map((link) => link.textContent?.trim());

afterEach(() => {
  act(() => roots.splice(0).forEach((root) => root.unmount()));
  document.body.innerHTML = '';
  window.localStorage.clear();
  favoritesStore.set([]);
});

const openActionsFor = (container: HTMLElement, name: string) => {
  const row = [...container.querySelectorAll('tbody tr')].find((tr) => tr.querySelector('a')?.textContent?.trim() === name)!;
  act(() => row.querySelector<HTMLButtonElement>('button[aria-label="Actions"]')!.click());
  return document.querySelector<HTMLElement>('[role="menu"]')!;
};

describe('ResourcesTable', () => {
  it('shows the title and description in the table header', () => {
    const container = render(
      <ResourcesTable
        resources={resources}
        title="Ordering Resources"
        description="13 resources mapped to the Ordering domain."
      />
    );

    expect(container.querySelector('h2')?.textContent).toBe('Ordering Resources');
    expect(container.textContent).toContain('13 resources mapped to the Ordering domain.');
  });

  it('shows ten resources per page and moves to the next page', () => {
    const container = render(<ResourcesTable resources={resources} title="Ordering Resources" />);

    expect(rowNames(container)).toHaveLength(10);
    expect(container.textContent).toContain('10 of 13 results');

    const next = container.querySelector<HTMLButtonElement>('button[title="Next page"]')!;
    act(() => next.click());

    expect(rowNames(container)).toEqual(['Service 10', 'Service 11', 'Service 12']);
  });

  it('filters by type and search text', () => {
    const container = render(<ResourcesTable resources={resources} title="Ordering Resources" />);

    const entitiesPill = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Entities')!;
    act(() => entitiesPill.click());
    expect(rowNames(container)).toEqual(['Order']);

    act(() => entitiesPill.click());
    const input = container.querySelector<HTMLInputElement>('input[placeholder="Filter..."]')!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Service 12');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(rowNames(container)).toEqual(['Service 12']);
  });

  it('opens a row actions menu linking to the resource docs and visualiser', () => {
    const container = render(<ResourcesTable resources={resources} title="Ordering Resources" />);

    const menu = openActionsFor(container, 'Service 01');
    const links = [...menu.querySelectorAll('a')].map((link) => [link.textContent?.trim(), link.getAttribute('href')]);

    expect(links).toEqual([
      ['View documentation', '/docs/services/Service 01/1.0.0'],
      ['View in visualiser', '/visualiser/services/Service 01/1.0.0'],
    ]);
  });

  it('leaves the visualiser out of the actions menu for resources without a visualiser page', () => {
    const container = render(<ResourcesTable resources={resources} title="Ordering Resources" />);

    const menu = openActionsFor(container, 'Order');

    expect(menu.textContent).not.toContain('View in visualiser');
  });

  it('adds the resource to favorites from the actions menu', () => {
    const container = render(<ResourcesTable resources={resources} title="Ordering Resources" />);

    const menu = openActionsFor(container, 'Service 01');
    const addToFavorites = [...menu.querySelectorAll('button')].find((button) => button.textContent === 'Add to favorites')!;
    act(() => addToFavorites.click());

    expect(favoritesStore.get()).toEqual([
      {
        nodeKey: 'services:Service 01:1.0.0',
        path: [],
        title: 'Service 01',
        badge: 'Service',
        href: '/docs/services/Service 01/1.0.0',
      },
    ]);
  });

  describe('relationship to the owner', () => {
    const withRelationship = (
      name: string,
      collection: ResourceItem['collection'],
      relationship?: ResourceItem['relationship']
    ) => ({ ...resource(name, collection), relationship });

    const serviceResources = [
      withRelationship('Checkout Cart', 'commands', 'receives'),
      withRelationship('Order Placed', 'events', 'sends'),
      withRelationship('Stock Reserved', 'events', 'sends-and-receives'),
      withRelationship('Orders DB', 'containers', 'writes'),
      withRelationship('Product Cache', 'containers', 'reads'),
      withRelationship('Order', 'entities', 'owns'),
      withRelationship('Place Order', 'flows', 'appears-in'),
      withRelationship('Payments', 'domains', 'contains'),
      withRelationship('Legacy Export', 'flows'),
      withRelationship('Fraud Agent', 'agents', 'includes'),
      withRelationship('Order Created', 'events', 'transports'),
      withRelationship('Shipping Service', 'services', 'receives-messages'),
      withRelationship('Order Service', 'services', 'produces-messages'),
      withRelationship('Audit Service', 'services', 'produces-and-receives-messages'),
      withRelationship('Billing Service', 'services', 'produces'),
      withRelationship('Email Service', 'services', 'consumes'),
      withRelationship('Ledger Service', 'services', 'produces-and-consumes'),
      withRelationship('Payments Channel', 'channels', 'transports'),
      withRelationship('Reserve Stock', 'commands', 'triggers'),
      withRelationship('Cart Checked Out', 'events', 'triggered-by'),
    ];

    const relationshipByName = (container: HTMLElement) => {
      const headers = [...container.querySelectorAll('thead th')].map((th) => th.textContent?.trim());
      const column = headers.indexOf('Relationship');
      return Object.fromEntries(
        [...container.querySelectorAll('tbody tr')].map((tr) => [
          tr.querySelector('a')?.textContent?.trim(),
          tr.querySelectorAll('td')[column]?.textContent?.trim(),
        ])
      );
    };

    it('shows how each resource relates to the owner', () => {
      // More rows than the default page of 10.
      window.localStorage.setItem('eventcatalog-resources-page-size', '25');
      const container = render(<ResourcesTable resources={serviceResources} title="Checkout API Resources" />);

      expect(relationshipByName(container)).toEqual({
        'Checkout Cart': 'Receives',
        'Order Placed': 'Sends',
        'Stock Reserved': 'Sends & receives',
        'Orders DB': 'Writes to',
        'Product Cache': 'Reads from',
        Order: 'Owns',
        'Place Order': 'Appears in',
        Payments: 'Contains',
        'Legacy Export': '—',
        'Fraud Agent': 'Includes',
        'Order Created': 'Transports',
        'Shipping Service': 'Receives messages',
        'Order Service': 'Produces messages',
        'Audit Service': 'Produces & receives',
        'Billing Service': 'Produces',
        'Email Service': 'Consumes',
        'Ledger Service': 'Produces & consumes',
        'Payments Channel': 'Transports',
        'Reserve Stock': 'Triggers',
        'Cart Checked Out': 'Triggered by',
      });
    });

    it('leaves the relationship column out when no resource has a relationship', () => {
      const container = render(<ResourcesTable resources={resources} title="Ordering Resources" />);

      expect([...container.querySelectorAll('thead th')].map((th) => th.textContent?.trim())).not.toContain('Relationship');
    });

    it('leaves out the direction filters when every resource goes the same way', () => {
      const inboundOnly = [
        withRelationship('Checkout Cart', 'commands', 'receives'),
        withRelationship('Product Cache', 'containers', 'reads'),
      ];
      const container = render(<ResourcesTable resources={inboundOnly} title="Checkout API Resources" />);

      const pills = [...container.querySelectorAll('button[aria-pressed]')].map((button) => button.textContent);
      expect(pills).not.toContain('Inbound');
      expect(pills).not.toContain('Outbound');
    });

    it.each([
      [
        'Inbound',
        [
          'Audit Service',
          'Billing Service',
          'Cart Checked Out',
          'Checkout Cart',
          'Ledger Service',
          'Order Service',
          'Product Cache',
          'Stock Reserved',
        ],
      ],
      [
        'Outbound',
        [
          'Audit Service',
          'Email Service',
          'Ledger Service',
          'Order Placed',
          'Orders DB',
          'Reserve Stock',
          'Shipping Service',
          'Stock Reserved',
        ],
      ],
    ])('filters to %s resources', (direction, expected) => {
      const container = render(<ResourcesTable resources={serviceResources} title="Checkout API Resources" />);

      const pill = [...container.querySelectorAll('button')].find((button) => button.textContent === direction)!;
      act(() => pill.click());

      expect(rowNames(container)).toEqual(expected);
    });
  });

  it('names each row type in the singular while the filters stay plural', () => {
    const container = render(
      <ResourcesTable
        resources={[
          resource('Checkout Cart', 'commands'),
          resource('Orders DB', 'containers'),
          resource('Order Placed', 'events'),
        ]}
        title="Checkout API Resources"
      />
    );

    const headers = [...container.querySelectorAll('thead th')].map((th) => th.textContent?.trim());
    const typeColumn = headers.indexOf('Type');
    const types = [...container.querySelectorAll('tbody tr')].map((tr) =>
      tr.querySelectorAll('td')[typeColumn]?.textContent?.trim()
    );
    const pills = [...container.querySelectorAll('button[aria-pressed]')].map((button) => button.textContent);

    expect(types).toEqual(['Command', 'Event', 'Data Store']);
    expect(pills).toEqual(['Data Stores', 'Events', 'Commands']);
  });

  it('offers View schema in the actions menu for resources with a schema', () => {
    const withSchema = { ...resource('Checkout Cart', 'commands'), schemaHref: '/schemas/commands/Checkout Cart/1.0.0' };
    const container = render(
      <ResourcesTable resources={[withSchema, resource('Order', 'entities')]} title="Checkout API Resources" />
    );

    const schemaLink = [...openActionsFor(container, 'Checkout Cart').querySelectorAll('a')].find(
      (link) => link.textContent?.trim() === 'View schema'
    );
    expect(schemaLink?.getAttribute('href')).toBe('/schemas/commands/Checkout Cart/1.0.0');

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(openActionsFor(container, 'Order').textContent).not.toContain('View schema');
  });
});
