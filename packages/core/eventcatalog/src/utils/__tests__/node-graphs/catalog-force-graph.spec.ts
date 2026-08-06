import type { CollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { getCatalogForceGraph } from '@utils/node-graphs/catalog-force-graph';

const mockDomains = [
  {
    id: 'domains/Shipping/index.mdx',
    slug: 'domains/Shipping',
    collection: 'domains',
    filePath: 'domains/Shipping/index.mdx',
    data: {
      id: 'Shipping',
      name: 'Shipping',
      version: '0.0.1',
      services: [{ id: 'LocationService', version: '0.0.1' }],
      entities: [{ id: 'Shipment', version: '0.0.1' }],
      owners: [{ id: 'logistics-team' }],
    },
  },
];

const mockServices = [
  {
    id: 'services/LocationService/index.mdx',
    slug: 'services/LocationService',
    collection: 'services',
    filePath: 'services/LocationService/index.mdx',
    data: {
      id: 'LocationService',
      name: 'Location Service',
      version: '0.0.1',
      sends: [{ id: 'LocationUpdated', version: '0.0.1' }],
      receives: [{ id: 'OrderPlaced', version: '0.0.1' }],
      writesTo: [{ id: 'LocationStore', version: '0.0.1' }],
      readsFrom: [{ id: 'LocationStore', version: '0.0.1' }],
      owners: [{ id: 'dboyne' }],
    },
  },
];

const mockEvents = [
  {
    id: 'events/OrderPlaced/index.mdx',
    slug: 'events/OrderPlaced',
    collection: 'events',
    filePath: 'events/OrderPlaced/index.mdx',
    data: {
      id: 'OrderPlaced',
      name: 'Order Placed',
      version: '0.0.1',
    },
  },
  {
    id: 'events/LocationUpdated/index.mdx',
    slug: 'events/LocationUpdated',
    collection: 'events',
    filePath: 'events/LocationUpdated/index.mdx',
    data: {
      id: 'LocationUpdated',
      name: 'Location Updated',
      version: '0.0.1',
    },
  },
];

const mockContainers = [
  {
    id: 'containers/LocationStore/index.mdx',
    slug: 'containers/LocationStore',
    collection: 'containers',
    filePath: 'containers/LocationStore/index.mdx',
    data: {
      id: 'LocationStore',
      name: 'Location Store',
      version: '0.0.1',
    },
  },
];

const mockEntities = [
  {
    id: 'entities/Shipment/index.mdx',
    slug: 'entities/Shipment',
    collection: 'entities',
    filePath: 'entities/Shipment/index.mdx',
    data: {
      id: 'Shipment',
      name: 'Shipment',
      version: '0.0.1',
      properties: [
        { name: 'orderId', type: 'string', references: 'Order', relationType: 'belongsTo' },
        // A second relationship to the same entity must not overwrite the first
        { name: 'relatedOrder', type: 'string', references: 'Order', relationType: 'relatesTo' },
        // Implicit array relationship: items.type names an entity, no explicit references
        { name: 'lines', type: 'array', items: { type: 'OrderLine' } },
      ],
    },
  },
  {
    id: 'entities/Order/index.mdx',
    slug: 'entities/Order',
    collection: 'entities',
    filePath: 'entities/Order/index.mdx',
    data: {
      id: 'Order',
      name: 'Order',
      version: '0.0.1',
    },
  },
  {
    id: 'entities/OrderLine/index.mdx',
    slug: 'entities/OrderLine',
    collection: 'entities',
    filePath: 'entities/OrderLine/index.mdx',
    data: {
      id: 'OrderLine',
      name: 'Order Line',
      version: '0.0.1',
    },
  },
  {
    id: 'entities/HiddenEntity/index.mdx',
    slug: 'entities/HiddenEntity',
    collection: 'entities',
    filePath: 'entities/HiddenEntity/index.mdx',
    data: {
      id: 'HiddenEntity',
      name: 'Hidden Entity',
      version: '0.0.1',
      visualiser: false,
    },
  },
];

const mockTeams = [
  {
    id: 'logistics-team',
    slug: 'logistics-team',
    collection: 'teams',
    data: {
      id: 'logistics-team',
      name: 'Logistics Team',
      members: [{ id: 'dboyne', collection: 'users' }],
    },
  },
];

const mockUsers = [
  {
    id: 'dboyne',
    slug: 'dboyne',
    collection: 'users',
    data: {
      id: 'dboyne',
      name: 'David Boyne',
    },
  },
];

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: CollectionKey) => {
      switch (key) {
        case 'domains':
          return Promise.resolve(mockDomains);
        case 'services':
          return Promise.resolve(mockServices);
        case 'events':
          return Promise.resolve(mockEvents);
        case 'containers':
          return Promise.resolve(mockContainers);
        case 'entities':
          return Promise.resolve(mockEntities);
        case 'teams':
          return Promise.resolve(mockTeams);
        case 'users':
          return Promise.resolve(mockUsers);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('getCatalogForceGraph', () => {
  it('returns a node for the latest version of every resource', async () => {
    const { nodes } = await getCatalogForceGraph();

    const nodeIds = nodes.map((node) => node.id);
    expect(nodeIds).toEqual(
      expect.arrayContaining([
        'domains/Shipping',
        'services/LocationService',
        'events/OrderPlaced',
        'events/LocationUpdated',
        'containers/LocationStore',
        'entities/Shipment',
        'entities/Order',
        'teams/logistics-team',
      ])
    );
  });

  it('does not render user nodes — only teams represent people', async () => {
    const { nodes, links } = await getCatalogForceGraph();

    expect(nodes.some((node) => node.collection === 'users')).toBe(false);
    expect(links.some((link) => link.source.startsWith('users/') || link.target.startsWith('users/'))).toBe(false);
  });

  it('honours the resource-level visualiser opt-out', async () => {
    const { nodes } = await getCatalogForceGraph();

    expect(nodes.some((node) => node.id === 'entities/HiddenEntity')).toBe(false);
  });

  it('links resources by their relationships', async () => {
    const { links } = await getCatalogForceGraph();

    expect(links).toEqual(
      expect.arrayContaining([
        // Domain containment and ownership of entities
        { source: 'domains/Shipping', target: 'services/LocationService', label: 'contains' },
        { source: 'domains/Shipping', target: 'entities/Shipment', label: 'owns' },
        // Service messaging
        { source: 'services/LocationService', target: 'events/LocationUpdated', label: 'publishes' },
        { source: 'events/OrderPlaced', target: 'services/LocationService', label: 'subscribed by' },
        // Containers
        { source: 'services/LocationService', target: 'containers/LocationStore', label: 'writes to' },
        { source: 'containers/LocationStore', target: 'services/LocationService', label: 'read by' },
        // Entity references — two distinct relationships to the same entity keep both labels
        { source: 'entities/Shipment', target: 'entities/Order', label: 'belongsTo / relatesTo' },
        // Implicit array relationship (items.type names an entity)
        { source: 'entities/Shipment', target: 'entities/OrderLine', label: 'hasMany' },
        // Team ownership (user owners are not rendered)
        { source: 'domains/Shipping', target: 'teams/logistics-team', label: 'owned by' },
      ])
    );
  });

  it('does not create links to resources that do not exist in the catalog', async () => {
    const { nodes, links } = await getCatalogForceGraph();

    const nodeIds = new Set(nodes.map((node) => node.id));
    for (const link of links) {
      expect(nodeIds.has(link.source)).toBe(true);
      expect(nodeIds.has(link.target)).toBe(true);
    }
  });
});
