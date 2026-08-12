import { describe, expect, it } from 'vitest';
import type { Index } from '../index-types';
import { resolve } from '../resolve';

const anIndex = ({
  source = 'acme/test',
  commit = 'test-commit',
  resources = [],
  assets,
}: Partial<Omit<Index, 'indexVersion'>> = {}): Index => ({
  indexVersion: 1,
  source,
  commit,
  resources,
  ...(assets === undefined ? {} : { assets }),
});

const fromResource = (version: string | null, source: string, commit: string) => ({
  fromVersion: version,
  fromResolvedFrom: { source, commit },
});

const createComplexIndexes = (): Index[] => [
  anIndex({
    source: 'acme/payments',
    commit: '4a1b7e2',
    resources: [
      {
        type: 'event',
        id: 'payment-captured',
        version: '2.0.0',
        name: 'Payment Captured',
        contentPath: 'events/payment-captured/index.mdx',
        contentHash: 'sha256:04bd91',
      },
      {
        type: 'container',
        id: 'payments-db',
        version: '1.0.0',
        name: 'Payments Database',
        container_type: 'database',
        contentPath: 'containers/payments-db/index.mdx',
        contentHash: 'sha256:af720c',
      },
    ],
  }),
  anIndex({
    source: 'acme/legacy-billing',
    commit: '71c9e30',
    resources: [
      {
        type: 'event',
        id: 'payment-captured',
        version: '1.0.0',
        name: 'Payment Captured',
        contentPath: 'events/payment-captured/index.mdx',
        contentHash: 'sha256:d930a6',
      },
    ],
  }),
  anIndex({
    source: 'acme/fulfilment',
    commit: '8f2c6d0',
    resources: [
      {
        type: 'service',
        id: 'shipping-service',
        version: '1.0.0',
        name: 'Shipping Service',
        receives: [{ id: 'payment-captured' }],
        writesTo: [{ id: 'payments-db' }],
        readsFrom: [{ id: 'missing-ledger' }],
        contentPath: 'services/shipping-service/index.mdx',
        contentHash: 'sha256:b75e20',
      },
    ],
  }),
];

describe('resolve', () => {
  it('returns an empty resolution for no indexes', () => {
    expect(resolve([])).toEqual({
      entities: [],
      assets: [],
      edges: [],
      conflicts: [],
      warnings: [],
      externals: [],
    });
  });

  describe('entities', () => {
    it('returns one entity for a single resource', () => {
      const index = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            contentPath: 'services/payment-service/index.mdx',
            contentHash: 'sha256:c81a4f',
          },
        ],
      });

      expect(resolve([index])).toEqual({
        entities: [
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            contentPath: 'services/payment-service/index.mdx',
            contentHash: 'sha256:c81a4f',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
          },
        ],
        assets: [],
        edges: [],
        conflicts: [],
        warnings: [],
        externals: [],
      });
    });

    it('preserves generic sidecars without adding entities or edges', () => {
      const index = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            contentPath: 'services/payment-service/index.mdx',
            contentHash: 'sha256:c81a4f',
            sidecars: [
              {
                path: 'services/payment-service/schema.sql',
                hash: 'sha256:31de86',
              },
              {
                path: 'services/payment-service/attachments/context.txt',
                hash: 'sha256:b75e20',
              },
            ],
          },
        ],
      });

      expect(resolve([index])).toEqual({
        entities: [
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            contentPath: 'services/payment-service/index.mdx',
            contentHash: 'sha256:c81a4f',
            sidecars: [
              {
                path: 'services/payment-service/schema.sql',
                hash: 'sha256:31de86',
              },
              {
                path: 'services/payment-service/attachments/context.txt',
                hash: 'sha256:b75e20',
              },
            ],
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
          },
        ],
        assets: [],
        edges: [],
        conflicts: [],
        warnings: [],
        externals: [],
      });
    });

    it('unions entities across two indexes', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            contentPath: 'services/payment-service/index.mdx',
            contentHash: 'sha256:c81a4f',
          },
        ],
      });
      const ordersIndex = anIndex({
        source: 'acme/orders',
        commit: '9d3e6f1',
        resources: [
          {
            type: 'event',
            id: 'order-created',
            version: '2.0.0',
            name: 'Order Created',
            contentPath: 'events/order-created/index.mdx',
            contentHash: 'sha256:7b2d90',
          },
        ],
      });

      expect(resolve([paymentsIndex, ordersIndex])).toEqual({
        entities: [
          {
            type: 'event',
            id: 'order-created',
            version: '2.0.0',
            name: 'Order Created',
            contentPath: 'events/order-created/index.mdx',
            contentHash: 'sha256:7b2d90',
            resolvedFrom: {
              source: 'acme/orders',
              commit: '9d3e6f1',
            },
          },
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            contentPath: 'services/payment-service/index.mdx',
            contentHash: 'sha256:c81a4f',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
          },
        ],
        assets: [],
        edges: [],
        conflicts: [],
        warnings: [],
        externals: [],
      });
    });

    it('produces the same resolution regardless of source order', () => {
      const indexes = createComplexIndexes();
      const resolution = resolve(indexes);

      expect({
        edges: resolution.edges.length,
        conflicts: resolution.conflicts.length,
        externals: resolution.externals.length,
      }).toEqual({
        edges: 3,
        conflicts: 1,
        externals: 1,
      });
      expect(resolution).toEqual(resolve([...indexes].reverse()));
    });

    it('is idempotent', () => {
      const indexes = createComplexIndexes();

      expect(resolve(indexes)).toEqual(resolve(indexes));
    });
  });

  describe('assets', () => {
    it('unions assets across two indexes', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        assets: [
          {
            path: 'public/icons/payments.svg',
            hash: 'sha256:c81a4f',
          },
        ],
      });
      const fulfilmentIndex = anIndex({
        source: 'acme/fulfilment',
        commit: '8f2c6d0',
        assets: [
          {
            path: 'components/TeamBadge.astro',
            hash: 'sha256:31de86',
          },
        ],
      });

      expect(resolve([paymentsIndex, fulfilmentIndex])).toEqual({
        entities: [],
        assets: [
          {
            path: 'components/TeamBadge.astro',
            hash: 'sha256:31de86',
            resolvedFrom: {
              source: 'acme/fulfilment',
              commit: '8f2c6d0',
            },
          },
          {
            path: 'public/icons/payments.svg',
            hash: 'sha256:c81a4f',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
          },
        ],
        edges: [],
        conflicts: [],
        warnings: [],
        externals: [],
      });
    });

    it('merges identical assets and records every contributing source', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        assets: [
          {
            path: 'public/logo.svg',
            hash: 'sha256:c81a4f',
          },
        ],
      });
      const fulfilmentIndex = anIndex({
        source: 'acme/fulfilment',
        commit: '8f2c6d0',
        assets: [
          {
            path: 'public/logo.svg',
            hash: 'sha256:c81a4f',
          },
        ],
      });

      expect(resolve([paymentsIndex, fulfilmentIndex])).toEqual({
        entities: [],
        assets: [
          {
            path: 'public/logo.svg',
            hash: 'sha256:c81a4f',
            resolvedFrom: {
              source: 'acme/fulfilment',
              commit: '8f2c6d0',
            },
            contributors: ['acme/payments'],
          },
        ],
        edges: [],
        conflicts: [],
        warnings: [],
        externals: [],
      });
    });

    it('chooses the last source as the winner and warns when asset hashes differ', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        assets: [
          {
            path: 'public/logo.svg',
            hash: 'sha256:c81a4f',
          },
        ],
      });
      const fulfilmentIndex = anIndex({
        source: 'acme/fulfilment',
        commit: '8f2c6d0',
        assets: [
          {
            path: 'public/logo.svg',
            hash: 'sha256:31de86',
          },
        ],
      });
      const expected = {
        entities: [],
        assets: [
          {
            path: 'public/logo.svg',
            hash: 'sha256:31de86',
            resolvedFrom: {
              source: 'acme/fulfilment',
              commit: '8f2c6d0',
            },
          },
        ],
        edges: [],
        conflicts: [],
        warnings: [
          {
            kind: 'asset-collision',
            path: 'public/logo.svg',
            sources: ['acme/fulfilment', 'acme/payments'],
            winner: 'acme/fulfilment',
          },
        ],
        externals: [],
      };

      expect(resolve([paymentsIndex, fulfilmentIndex])).toEqual(expected);
      expect(resolve([fulfilmentIndex, paymentsIndex])).toEqual({
        ...expected,
        assets: [
          {
            path: 'public/logo.svg',
            hash: 'sha256:c81a4f',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
          },
        ],
        warnings: [
          {
            kind: 'asset-collision',
            path: 'public/logo.svg',
            sources: ['acme/fulfilment', 'acme/payments'],
            winner: 'acme/payments',
          },
        ],
      });
    });
  });

  describe('properties', () => {
    it('does not mutate the input indexes', () => {
      const indexes = createComplexIndexes();
      const original = structuredClone(indexes);

      resolve(indexes);
      resolve(indexes);

      expect(indexes).toEqual(original);
    });

    it('returns JSON-serialisable output', () => {
      const resolution = resolve(createComplexIndexes());

      expect(JSON.parse(JSON.stringify(resolution))).toEqual(resolution);
    });
  });

  describe('edges', () => {
    it('resolves an edge to an entity owned by another source', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/index.mdx',
            contentHash: 'sha256:04bd91',
          },
        ],
      });
      const fulfilmentIndex = anIndex({
        source: 'acme/fulfilment',
        commit: '8f2c6d0',
        resources: [
          {
            type: 'service',
            id: 'shipping-service',
            version: '1.0.0',
            name: 'Shipping Service',
            receives: [{ id: 'payment-captured' }],
            contentPath: 'services/shipping-service/index.mdx',
            contentHash: 'sha256:b75e20',
          },
        ],
      });

      expect(resolve([paymentsIndex, fulfilmentIndex])).toEqual({
        entities: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/index.mdx',
            contentHash: 'sha256:04bd91',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
          },
          {
            type: 'service',
            id: 'shipping-service',
            version: '1.0.0',
            name: 'Shipping Service',
            receives: [{ id: 'payment-captured' }],
            contentPath: 'services/shipping-service/index.mdx',
            contentHash: 'sha256:b75e20',
            resolvedFrom: {
              source: 'acme/fulfilment',
              commit: '8f2c6d0',
            },
          },
        ],
        assets: [],
        edges: [
          {
            from: 'shipping-service',
            ...fromResource('1.0.0', 'acme/fulfilment', '8f2c6d0'),
            to: 'payment-captured',
            direction: 'receives',
            pointer: null,
            resolved: '2.0.0',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
            status: 'resolved',
          },
        ],
        conflicts: [],
        warnings: [],
        externals: [],
      });
    });

    it('does not treat a receives pointer as a claim of ownership', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/index.mdx',
            contentHash: 'sha256:04bd91',
          },
        ],
      });
      const fulfilmentIndex = anIndex({
        source: 'acme/fulfilment',
        commit: '8f2c6d0',
        resources: [
          {
            type: 'service',
            id: 'shipping-service',
            version: '1.0.0',
            name: 'Shipping Service',
            receives: [{ id: 'payment-captured' }],
            contentPath: 'services/shipping-service/index.mdx',
            contentHash: 'sha256:b75e20',
          },
        ],
      });

      expect(resolve([paymentsIndex, fulfilmentIndex]).conflicts).toEqual([]);
    });

    it('renders an unresolved pointer as external rather than failing', () => {
      const fulfilmentIndex = anIndex({
        source: 'acme/fulfilment',
        commit: '8f2c6d0',
        resources: [
          {
            type: 'service',
            id: 'shipping-service',
            version: '1.0.0',
            name: 'Shipping Service',
            receives: [{ id: 'payment-captured' }],
            contentPath: 'services/shipping-service/index.mdx',
            contentHash: 'sha256:b75e20',
          },
        ],
      });

      expect(() => resolve([fulfilmentIndex])).not.toThrow();
      expect(resolve([fulfilmentIndex])).toEqual({
        entities: [
          {
            type: 'service',
            id: 'shipping-service',
            version: '1.0.0',
            name: 'Shipping Service',
            receives: [{ id: 'payment-captured' }],
            contentPath: 'services/shipping-service/index.mdx',
            contentHash: 'sha256:b75e20',
            resolvedFrom: {
              source: 'acme/fulfilment',
              commit: '8f2c6d0',
            },
          },
        ],
        assets: [],
        edges: [
          {
            from: 'shipping-service',
            ...fromResource('1.0.0', 'acme/fulfilment', '8f2c6d0'),
            to: 'payment-captured',
            direction: 'receives',
            pointer: null,
            resolved: null,
            status: 'external',
          },
        ],
        conflicts: [],
        warnings: [],
        externals: [
          {
            id: 'payment-captured',
            referencedBy: ['shipping-service'],
          },
        ],
      });
    });

    it('groups multiple referrers into one external node', () => {
      const fulfilmentIndex = anIndex({
        source: 'acme/fulfilment',
        commit: '8f2c6d0',
        resources: [
          {
            type: 'service',
            id: 'shipping-service',
            version: '1.0.0',
            name: 'Shipping Service',
            receives: [{ id: 'payment-captured' }],
            contentPath: 'services/shipping-service/index.mdx',
            contentHash: 'sha256:b75e20',
          },
          {
            type: 'service',
            id: 'billing-service',
            version: '1.0.0',
            name: 'Billing Service',
            receives: [{ id: 'payment-captured' }],
            contentPath: 'services/billing-service/index.mdx',
            contentHash: 'sha256:31de86',
          },
        ],
      });

      expect(resolve([fulfilmentIndex]).externals).toEqual([
        {
          id: 'payment-captured',
          referencedBy: ['billing-service', 'shipping-service'],
        },
      ]);
    });

    it('distinguishes edges produced by different versions of the same resource', () => {
      const servicesIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            receives: [{ id: 'payment-requested' }],
            contentPath: 'services/payment-service/1.0.0/index.mdx',
            contentHash: 'sha256:31de86',
          },
          {
            type: 'service',
            id: 'payment-service',
            version: '2.0.0',
            name: 'Payment Service',
            receives: [{ id: 'payment-requested' }],
            contentPath: 'services/payment-service/2.0.0/index.mdx',
            contentHash: 'sha256:b75e20',
          },
        ],
      });
      const contractsIndex = anIndex({
        source: 'acme/contracts',
        commit: '7c3e91a',
        resources: [
          {
            type: 'event',
            id: 'payment-requested',
            version: '2.0.0',
            name: 'Payment Requested',
            contentPath: 'events/payment-requested/index.mdx',
            contentHash: 'sha256:04bd91',
          },
        ],
      });

      expect(resolve([servicesIndex, contractsIndex]).edges).toEqual([
        {
          from: 'payment-service',
          fromVersion: '1.0.0',
          fromResolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
          to: 'payment-requested',
          direction: 'receives',
          pointer: null,
          resolved: '2.0.0',
          resolvedFrom: {
            source: 'acme/contracts',
            commit: '7c3e91a',
          },
          status: 'resolved',
        },
        {
          from: 'payment-service',
          fromVersion: '2.0.0',
          fromResolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
          to: 'payment-requested',
          direction: 'receives',
          pointer: null,
          resolved: '2.0.0',
          resolvedFrom: {
            source: 'acme/contracts',
            commit: '7c3e91a',
          },
          status: 'resolved',
        },
      ]);
    });

    it('resolves a pinned pointer to that exact version', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.0.0/index.mdx',
            contentHash: 'sha256:04bd91',
          },
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.1.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.1.0/index.mdx',
            contentHash: 'sha256:62ea15',
          },
        ],
      });
      const fulfilmentIndex = anIndex({
        source: 'acme/fulfilment',
        commit: '8f2c6d0',
        resources: [
          {
            type: 'service',
            id: 'shipping-service',
            version: '1.0.0',
            name: 'Shipping Service',
            receives: [{ id: 'payment-captured', version: '2.0.0' }],
            contentPath: 'services/shipping-service/index.mdx',
            contentHash: 'sha256:b75e20',
          },
        ],
      });

      expect(resolve([paymentsIndex, fulfilmentIndex]).edges).toEqual([
        {
          from: 'shipping-service',
          ...fromResource('1.0.0', 'acme/fulfilment', '8f2c6d0'),
          to: 'payment-captured',
          direction: 'receives',
          pointer: '2.0.0',
          resolved: '2.0.0',
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
          status: 'resolved',
        },
      ]);
    });

    it('resolves a semver range to the highest satisfying version', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '1.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/1.0.0/index.mdx',
            contentHash: 'sha256:04bd91',
          },
          {
            type: 'event',
            id: 'payment-captured',
            version: '1.2.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/1.2.0/index.mdx',
            contentHash: 'sha256:62ea15',
          },
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.0.0/index.mdx',
            contentHash: 'sha256:772af1',
          },
        ],
      });
      const fulfilmentIndex = anIndex({
        source: 'acme/fulfilment',
        commit: '8f2c6d0',
        resources: [
          {
            type: 'service',
            id: 'shipping-service',
            version: '1.0.0',
            name: 'Shipping Service',
            receives: [{ id: 'payment-captured', version: '^1.0.0' }],
            contentPath: 'services/shipping-service/index.mdx',
            contentHash: 'sha256:b75e20',
          },
        ],
      });

      expect(resolve([paymentsIndex, fulfilmentIndex]).edges).toEqual([
        {
          from: 'shipping-service',
          ...fromResource('1.0.0', 'acme/fulfilment', '8f2c6d0'),
          to: 'payment-captured',
          direction: 'receives',
          pointer: '^1.0.0',
          resolved: '1.2.0',
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
          status: 'resolved',
        },
      ]);
    });

    it('marks a semver range as unresolved when no version satisfies it', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.0.0/index.mdx',
            contentHash: 'sha256:04bd91',
          },
        ],
      });
      const fulfilmentIndex = anIndex({
        source: 'acme/fulfilment',
        commit: '8f2c6d0',
        resources: [
          {
            type: 'service',
            id: 'shipping-service',
            version: '1.0.0',
            name: 'Shipping Service',
            receives: [{ id: 'payment-captured', version: '^1.0.0' }],
            contentPath: 'services/shipping-service/index.mdx',
            contentHash: 'sha256:b75e20',
          },
        ],
      });

      const resolution = resolve([paymentsIndex, fulfilmentIndex]);

      expect({ edges: resolution.edges, externals: resolution.externals }).toEqual({
        edges: [
          {
            from: 'shipping-service',
            ...fromResource('1.0.0', 'acme/fulfilment', '8f2c6d0'),
            to: 'payment-captured',
            direction: 'receives',
            pointer: '^1.0.0',
            resolved: null,
            status: 'unresolved',
          },
        ],
        externals: [],
      });
    });

    it('resolves an unversioned pointer to the highest version', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.0.0/index.mdx',
            contentHash: 'sha256:04bd91',
          },
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.1.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.1.0/index.mdx',
            contentHash: 'sha256:62ea15',
          },
        ],
      });
      const fulfilmentIndex = anIndex({
        source: 'acme/fulfilment',
        commit: '8f2c6d0',
        resources: [
          {
            type: 'service',
            id: 'shipping-service',
            version: '1.0.0',
            name: 'Shipping Service',
            receives: [{ id: 'payment-captured', version: '2.0.0' }, { id: 'payment-captured' }],
            contentPath: 'services/shipping-service/index.mdx',
            contentHash: 'sha256:b75e20',
          },
        ],
      });

      expect(resolve([paymentsIndex, fulfilmentIndex]).edges).toEqual([
        {
          from: 'shipping-service',
          ...fromResource('1.0.0', 'acme/fulfilment', '8f2c6d0'),
          to: 'payment-captured',
          direction: 'receives',
          pointer: '2.0.0',
          resolved: '2.0.0',
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
          status: 'resolved',
        },
        {
          from: 'shipping-service',
          ...fromResource('1.0.0', 'acme/fulfilment', '8f2c6d0'),
          to: 'payment-captured',
          direction: 'receives',
          pointer: null,
          resolved: '2.1.0',
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
          status: 'resolved',
        },
      ]);
    });

    it('sorts versions by semver, not string comparison', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '9.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/9.0.0/index.mdx',
            contentHash: 'sha256:04bd91',
          },
          {
            type: 'event',
            id: 'payment-captured',
            version: '10.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/10.0.0/index.mdx',
            contentHash: 'sha256:62ea15',
          },
        ],
      });
      const fulfilmentIndex = anIndex({
        source: 'acme/fulfilment',
        commit: '8f2c6d0',
        resources: [
          {
            type: 'service',
            id: 'shipping-service',
            version: '1.0.0',
            name: 'Shipping Service',
            receives: [{ id: 'payment-captured' }],
            contentPath: 'services/shipping-service/index.mdx',
            contentHash: 'sha256:b75e20',
          },
        ],
      });

      expect(resolve([paymentsIndex, fulfilmentIndex]).edges).toEqual([
        {
          from: 'shipping-service',
          ...fromResource('1.0.0', 'acme/fulfilment', '8f2c6d0'),
          to: 'payment-captured',
          direction: 'receives',
          pointer: null,
          resolved: '10.0.0',
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
          status: 'resolved',
        },
      ]);
    });

    it("treats an explicit 'latest' the same as an absent version", () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.0.0/index.mdx',
            contentHash: 'sha256:04bd91',
          },
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.1.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.1.0/index.mdx',
            contentHash: 'sha256:62ea15',
          },
        ],
      });
      const fulfilmentIndex = anIndex({
        source: 'acme/fulfilment',
        commit: '8f2c6d0',
        resources: [
          {
            type: 'service',
            id: 'shipping-service',
            version: '1.0.0',
            name: 'Shipping Service',
            receives: [{ id: 'payment-captured' }, { id: 'payment-captured', version: 'latest' }],
            contentPath: 'services/shipping-service/index.mdx',
            contentHash: 'sha256:b75e20',
          },
        ],
      });

      const resolution = resolve([paymentsIndex, fulfilmentIndex]);

      expect({ edges: resolution.edges, externals: resolution.externals }).toEqual({
        edges: [
          {
            from: 'shipping-service',
            ...fromResource('1.0.0', 'acme/fulfilment', '8f2c6d0'),
            to: 'payment-captured',
            direction: 'receives',
            pointer: null,
            resolved: '2.1.0',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
            status: 'resolved',
          },
          {
            from: 'shipping-service',
            ...fromResource('1.0.0', 'acme/fulfilment', '8f2c6d0'),
            to: 'payment-captured',
            direction: 'receives',
            pointer: 'latest',
            resolved: '2.1.0',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
            status: 'resolved',
          },
        ],
        externals: [],
      });
    });

    it('marks a pointer as unresolved when the owner lacks that version', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.1.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.1.0/index.mdx',
            contentHash: 'sha256:62ea15',
          },
        ],
      });
      const fulfilmentIndex = anIndex({
        source: 'acme/fulfilment',
        commit: '8f2c6d0',
        resources: [
          {
            type: 'service',
            id: 'shipping-service',
            version: '1.0.0',
            name: 'Shipping Service',
            receives: [{ id: 'payment-captured', version: '2.0.0' }],
            contentPath: 'services/shipping-service/index.mdx',
            contentHash: 'sha256:b75e20',
          },
        ],
      });

      const resolution = resolve([paymentsIndex, fulfilmentIndex]);

      expect({ edges: resolution.edges, externals: resolution.externals }).toEqual({
        edges: [
          {
            from: 'shipping-service',
            ...fromResource('1.0.0', 'acme/fulfilment', '8f2c6d0'),
            to: 'payment-captured',
            direction: 'receives',
            pointer: '2.0.0',
            resolved: null,
            status: 'unresolved',
          },
        ],
        externals: [],
      });
    });

    it('resolves writesTo and readsFrom pointers to containers', () => {
      const dataIndex = anIndex({
        source: 'acme/data',
        commit: '3d7a9c1',
        resources: [
          {
            type: 'container',
            id: 'payments-db',
            version: '1.0.0',
            name: 'Payments Database',
            container_type: 'database',
            contentPath: 'containers/payments-db/index.mdx',
            contentHash: 'sha256:af720c',
          },
        ],
      });
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            writesTo: [{ id: 'payments-db' }],
            readsFrom: [{ id: 'payments-db' }],
            contentPath: 'services/payment-service/index.mdx',
            contentHash: 'sha256:c81a4f',
          },
        ],
      });

      expect(resolve([dataIndex, paymentsIndex]).edges).toEqual([
        {
          from: 'payment-service',
          ...fromResource('1.0.0', 'acme/payments', '4a1b7e2'),
          to: 'payments-db',
          direction: 'writesTo',
          pointer: null,
          resolved: '1.0.0',
          resolvedFrom: {
            source: 'acme/data',
            commit: '3d7a9c1',
          },
          status: 'resolved',
        },
        {
          from: 'payment-service',
          ...fromResource('1.0.0', 'acme/payments', '4a1b7e2'),
          to: 'payments-db',
          direction: 'readsFrom',
          pointer: null,
          resolved: '1.0.0',
          resolvedFrom: {
            source: 'acme/data',
            commit: '3d7a9c1',
          },
          status: 'resolved',
        },
      ]);
    });

    it('resolves membership pointers from a domain to its services', () => {
      const centralIndex = anIndex({
        source: 'acme/central',
        commit: '6b4e8f2',
        resources: [
          {
            type: 'domain',
            id: 'payments',
            version: '1.0.0',
            name: 'Payments',
            services: [{ id: 'payment-service' }],
            contentPath: 'domains/payments/index.mdx',
            contentHash: 'sha256:ea174b',
          },
        ],
      });
      const paymentsIndex = anIndex({
        source: 'acme/team-payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            contentPath: 'services/payment-service/index.mdx',
            contentHash: 'sha256:c81a4f',
          },
        ],
      });

      expect(resolve([centralIndex, paymentsIndex]).edges).toEqual([
        {
          from: 'payments',
          ...fromResource('1.0.0', 'acme/central', '6b4e8f2'),
          to: 'payment-service',
          direction: 'contains',
          via: 'services',
          pointer: null,
          resolved: '1.0.0',
          resolvedFrom: {
            source: 'acme/team-payments',
            commit: '4a1b7e2',
          },
          status: 'resolved',
        },
      ]);
    });

    it('resolves pinned and unversioned flow step references to resources owned by another source', () => {
      const checkoutIndex = anIndex({
        source: 'acme/checkout',
        commit: '91e5c4a',
        resources: [
          {
            type: 'flow',
            id: 'checkout-saga',
            version: '1.0.0',
            name: 'Checkout Saga',
            references: [
              { kind: 'service', id: 'payment-service', version: '1.0.0' },
              { kind: 'service', id: 'payment-service' },
            ],
            contentPath: 'flows/checkout-saga/index.mdx',
            contentHash: 'sha256:7f24b1',
          },
        ],
      });
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            contentPath: 'services/payment-service/index.mdx',
            contentHash: 'sha256:c81a4f',
          },
          {
            type: 'service',
            id: 'payment-service',
            version: '2.0.0',
            name: 'Payment Service',
            contentPath: 'services/payment-service/versioned/2.0.0/index.mdx',
            contentHash: 'sha256:9b2d6e',
          },
        ],
      });

      const resolution = resolve([checkoutIndex, paymentsIndex]);

      expect({ edges: resolution.edges, conflicts: resolution.conflicts, externals: resolution.externals }).toEqual({
        edges: [
          {
            from: 'checkout-saga',
            ...fromResource('1.0.0', 'acme/checkout', '91e5c4a'),
            to: 'payment-service',
            direction: 'references',
            via: 'steps',
            pointer: '1.0.0',
            resolved: '1.0.0',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
            status: 'resolved',
          },
          {
            from: 'checkout-saga',
            ...fromResource('1.0.0', 'acme/checkout', '91e5c4a'),
            to: 'payment-service',
            direction: 'references',
            via: 'steps',
            pointer: null,
            resolved: '2.0.0',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
            status: 'resolved',
          },
        ],
        conflicts: [],
        externals: [],
      });
    });

    it('resolves pinned and unversioned container membership from a system', () => {
      const systemsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'system',
            id: 'payments-system',
            version: '1.0.0',
            name: 'Payments System',
            containers: [{ id: 'ledger-db', version: '1.0.0' }, { id: 'audit-db' }],
            contentPath: 'systems/payments-system/index.mdx',
            contentHash: 'sha256:fd82b7',
          },
        ],
      });
      const dataIndex = anIndex({
        source: 'acme/data',
        commit: '3d7a9c1',
        resources: [
          {
            type: 'container',
            id: 'ledger-db',
            version: '1.0.0',
            name: 'Ledger Database',
            container_type: 'database',
            contentPath: 'containers/ledger-db/index.mdx',
            contentHash: 'sha256:af720c',
          },
          {
            type: 'container',
            id: 'audit-db',
            version: '1.0.0',
            name: 'Audit Database',
            container_type: 'database',
            contentPath: 'containers/audit-db/index.mdx',
            contentHash: 'sha256:820d4e',
          },
          {
            type: 'container',
            id: 'audit-db',
            version: '2.0.0',
            name: 'Audit Database',
            container_type: 'database',
            contentPath: 'containers/audit-db/versioned/2.0.0/index.mdx',
            contentHash: 'sha256:0c9b35',
          },
        ],
      });

      const resolution = resolve([systemsIndex, dataIndex]);

      expect({ edges: resolution.edges, conflicts: resolution.conflicts, externals: resolution.externals }).toEqual({
        edges: [
          {
            from: 'payments-system',
            ...fromResource('1.0.0', 'acme/payments', '4a1b7e2'),
            to: 'ledger-db',
            direction: 'contains',
            via: 'containers',
            pointer: '1.0.0',
            resolved: '1.0.0',
            resolvedFrom: {
              source: 'acme/data',
              commit: '3d7a9c1',
            },
            status: 'resolved',
          },
          {
            from: 'payments-system',
            ...fromResource('1.0.0', 'acme/payments', '4a1b7e2'),
            to: 'audit-db',
            direction: 'contains',
            via: 'containers',
            pointer: null,
            resolved: '2.0.0',
            resolvedFrom: {
              source: 'acme/data',
              commit: '3d7a9c1',
            },
            status: 'resolved',
          },
        ],
        conflicts: [],
        externals: [],
      });
    });

    it('resolves pinned and unversioned flow membership from a system', () => {
      const systemsIndex = anIndex({
        source: 'acme/checkout',
        commit: '91e5c4a',
        resources: [
          {
            type: 'system',
            id: 'checkout-system',
            version: '1.0.0',
            name: 'Checkout System',
            flows: [{ id: 'checkout-saga', version: '1.0.0' }, { id: 'refund-flow' }],
            contentPath: 'systems/checkout-system/index.mdx',
            contentHash: 'sha256:7d26c0',
          },
        ],
      });
      const flowsIndex = anIndex({
        source: 'acme/orchestration',
        commit: 'c6f18a0',
        resources: [
          {
            type: 'flow',
            id: 'checkout-saga',
            version: '1.0.0',
            name: 'Checkout Saga',
            contentPath: 'flows/checkout-saga/index.mdx',
            contentHash: 'sha256:7f24b1',
          },
          {
            type: 'flow',
            id: 'refund-flow',
            version: '1.0.0',
            name: 'Refund Flow',
            contentPath: 'flows/refund-flow/index.mdx',
            contentHash: 'sha256:819bed',
          },
          {
            type: 'flow',
            id: 'refund-flow',
            version: '2.0.0',
            name: 'Refund Flow',
            contentPath: 'flows/refund-flow/versioned/2.0.0/index.mdx',
            contentHash: 'sha256:78b601',
          },
        ],
      });

      const resolution = resolve([systemsIndex, flowsIndex]);

      expect({ edges: resolution.edges, conflicts: resolution.conflicts, externals: resolution.externals }).toEqual({
        edges: [
          {
            from: 'checkout-system',
            ...fromResource('1.0.0', 'acme/checkout', '91e5c4a'),
            to: 'checkout-saga',
            direction: 'contains',
            via: 'flows',
            pointer: '1.0.0',
            resolved: '1.0.0',
            resolvedFrom: {
              source: 'acme/orchestration',
              commit: 'c6f18a0',
            },
            status: 'resolved',
          },
          {
            from: 'checkout-system',
            ...fromResource('1.0.0', 'acme/checkout', '91e5c4a'),
            to: 'refund-flow',
            direction: 'contains',
            via: 'flows',
            pointer: null,
            resolved: '2.0.0',
            resolvedFrom: {
              source: 'acme/orchestration',
              commit: 'c6f18a0',
            },
            status: 'resolved',
          },
        ],
        conflicts: [],
        externals: [],
      });
    });

    it('resolves pinned and unversioned relationships between systems and preserves their labels', () => {
      const checkoutIndex = anIndex({
        source: 'acme/checkout',
        commit: '91e5c4a',
        resources: [
          {
            type: 'system',
            id: 'checkout-system',
            version: '1.0.0',
            name: 'Checkout System',
            relationships: [
              { id: 'payments-system', version: '1.0.0', label: 'charges through' },
              { id: 'fraud-system', label: 'screens with' },
            ],
            contentPath: 'systems/checkout-system/index.mdx',
            contentHash: 'sha256:7d26c0',
          },
        ],
      });
      const relatedSystemsIndex = anIndex({
        source: 'acme/platform',
        commit: 'd812f09',
        resources: [
          {
            type: 'system',
            id: 'payments-system',
            version: '1.0.0',
            name: 'Payments System',
            contentPath: 'systems/payments-system/index.mdx',
            contentHash: 'sha256:fd82b7',
          },
          {
            type: 'system',
            id: 'fraud-system',
            version: '1.0.0',
            name: 'Fraud System',
            contentPath: 'systems/fraud-system/index.mdx',
            contentHash: 'sha256:b403e9',
          },
          {
            type: 'system',
            id: 'fraud-system',
            version: '2.0.0',
            name: 'Fraud System',
            contentPath: 'systems/fraud-system/versioned/2.0.0/index.mdx',
            contentHash: 'sha256:f091c2',
          },
        ],
      });

      const resolution = resolve([checkoutIndex, relatedSystemsIndex]);

      expect({ edges: resolution.edges, conflicts: resolution.conflicts, externals: resolution.externals }).toEqual({
        edges: [
          {
            from: 'checkout-system',
            ...fromResource('1.0.0', 'acme/checkout', '91e5c4a'),
            to: 'payments-system',
            direction: 'relatesTo',
            via: 'relationships',
            label: 'charges through',
            pointer: '1.0.0',
            resolved: '1.0.0',
            resolvedFrom: {
              source: 'acme/platform',
              commit: 'd812f09',
            },
            status: 'resolved',
          },
          {
            from: 'checkout-system',
            ...fromResource('1.0.0', 'acme/checkout', '91e5c4a'),
            to: 'fraud-system',
            direction: 'relatesTo',
            via: 'relationships',
            label: 'screens with',
            pointer: null,
            resolved: '2.0.0',
            resolvedFrom: {
              source: 'acme/platform',
              commit: 'd812f09',
            },
            status: 'resolved',
          },
        ],
        conflicts: [],
        externals: [],
      });
    });

    it('resolves pinned and unversioned system membership from a domain', () => {
      const domainsIndex = anIndex({
        source: 'acme/central',
        commit: '6b4e8f2',
        resources: [
          {
            type: 'domain',
            id: 'payments-domain',
            version: '1.0.0',
            name: 'Payments Domain',
            systems: [{ id: 'payments-system', version: '1.0.0' }, { id: 'fraud-system' }],
            contentPath: 'domains/payments-domain/index.mdx',
            contentHash: 'sha256:ea174b',
          },
        ],
      });
      const systemsIndex = anIndex({
        source: 'acme/platform',
        commit: 'd812f09',
        resources: [
          {
            type: 'system',
            id: 'payments-system',
            version: '1.0.0',
            name: 'Payments System',
            contentPath: 'systems/payments-system/index.mdx',
            contentHash: 'sha256:fd82b7',
          },
          {
            type: 'system',
            id: 'fraud-system',
            version: '1.0.0',
            name: 'Fraud System',
            contentPath: 'systems/fraud-system/index.mdx',
            contentHash: 'sha256:b403e9',
          },
          {
            type: 'system',
            id: 'fraud-system',
            version: '2.0.0',
            name: 'Fraud System',
            contentPath: 'systems/fraud-system/versioned/2.0.0/index.mdx',
            contentHash: 'sha256:f091c2',
          },
        ],
      });

      const resolution = resolve([domainsIndex, systemsIndex]);

      expect({ edges: resolution.edges, conflicts: resolution.conflicts, externals: resolution.externals }).toEqual({
        edges: [
          {
            from: 'payments-domain',
            ...fromResource('1.0.0', 'acme/central', '6b4e8f2'),
            to: 'payments-system',
            direction: 'contains',
            via: 'systems',
            pointer: '1.0.0',
            resolved: '1.0.0',
            resolvedFrom: {
              source: 'acme/platform',
              commit: 'd812f09',
            },
            status: 'resolved',
          },
          {
            from: 'payments-domain',
            ...fromResource('1.0.0', 'acme/central', '6b4e8f2'),
            to: 'fraud-system',
            direction: 'contains',
            via: 'systems',
            pointer: null,
            resolved: '2.0.0',
            resolvedFrom: {
              source: 'acme/platform',
              commit: 'd812f09',
            },
            status: 'resolved',
          },
        ],
        conflicts: [],
        externals: [],
      });
    });

    it('resolves pinned and unversioned entity membership from a domain', () => {
      const domainsIndex = anIndex({
        source: 'acme/central',
        commit: '6b4e8f2',
        resources: [
          {
            type: 'domain',
            id: 'payments-domain',
            version: '1.0.0',
            name: 'Payments Domain',
            entities: [{ id: 'payment', version: '1.0.0' }, { id: 'refund' }],
            contentPath: 'domains/payments-domain/index.mdx',
            contentHash: 'sha256:ea174b',
          },
        ],
      });
      const entitiesIndex = anIndex({
        source: 'acme/data-model',
        commit: '3d7a9c1',
        resources: [
          {
            type: 'entity',
            id: 'payment',
            version: '1.0.0',
            name: 'Payment',
            contentPath: 'entities/payment/index.mdx',
            contentHash: 'sha256:af720c',
          },
          {
            type: 'entity',
            id: 'refund',
            version: '1.0.0',
            name: 'Refund',
            contentPath: 'entities/refund/index.mdx',
            contentHash: 'sha256:820d4e',
          },
          {
            type: 'entity',
            id: 'refund',
            version: '2.0.0',
            name: 'Refund',
            contentPath: 'entities/refund/versioned/2.0.0/index.mdx',
            contentHash: 'sha256:0c9b35',
          },
        ],
      });

      const resolution = resolve([domainsIndex, entitiesIndex]);

      expect({ edges: resolution.edges, conflicts: resolution.conflicts, externals: resolution.externals }).toEqual({
        edges: [
          {
            from: 'payments-domain',
            ...fromResource('1.0.0', 'acme/central', '6b4e8f2'),
            to: 'payment',
            direction: 'contains',
            via: 'entities',
            pointer: '1.0.0',
            resolved: '1.0.0',
            resolvedFrom: {
              source: 'acme/data-model',
              commit: '3d7a9c1',
            },
            status: 'resolved',
          },
          {
            from: 'payments-domain',
            ...fromResource('1.0.0', 'acme/central', '6b4e8f2'),
            to: 'refund',
            direction: 'contains',
            via: 'entities',
            pointer: null,
            resolved: '2.0.0',
            resolvedFrom: {
              source: 'acme/data-model',
              commit: '3d7a9c1',
            },
            status: 'resolved',
          },
        ],
        conflicts: [],
        externals: [],
      });
    });

    it('resolves pinned and unversioned agent, domain, and data-product membership from a domain', () => {
      const domainsIndex = anIndex({
        source: 'acme/central',
        commit: '6b4e8f2',
        resources: [
          {
            type: 'domain',
            id: 'payments-domain',
            version: '1.0.0',
            name: 'Payments Domain',
            agents: [{ id: 'fraud-agent', version: '1.0.0' }, { id: 'fraud-agent' }],
            domains: [{ id: 'finance-domain', version: '1.0.0' }, { id: 'finance-domain' }],
            dataProducts: [{ id: 'payments-report', version: '1.0.0' }, { id: 'payments-report' }],
            contentPath: 'domains/payments-domain/index.mdx',
          },
        ],
      });
      const membersIndex = anIndex({
        source: 'acme/platform',
        commit: 'd812f09',
        resources: [
          ...['1.0.0', '2.0.0'].map((version) => ({
            type: 'agent' as const,
            id: 'fraud-agent',
            version,
            name: 'Fraud Agent',
            contentPath: `agents/fraud-agent/${version}/index.mdx`,
          })),
          ...['1.0.0', '2.0.0'].map((version) => ({
            type: 'domain' as const,
            id: 'finance-domain',
            version,
            name: 'Finance Domain',
            contentPath: `domains/finance-domain/${version}/index.mdx`,
          })),
          ...['1.0.0', '2.0.0'].map((version) => ({
            type: 'data-product' as const,
            id: 'payments-report',
            version,
            name: 'Payments Report',
            contentPath: `data-products/payments-report/${version}/index.mdx`,
          })),
        ],
      });

      const resolution = resolve([domainsIndex, membersIndex]);

      expect(
        resolution.edges.map(({ to, direction, via, pointer, resolved, status }) => ({
          to,
          direction,
          via,
          pointer,
          resolved,
          status,
        }))
      ).toEqual([
        {
          to: 'fraud-agent',
          direction: 'contains',
          via: 'agents',
          pointer: '1.0.0',
          resolved: '1.0.0',
          status: 'resolved',
        },
        {
          to: 'fraud-agent',
          direction: 'contains',
          via: 'agents',
          pointer: null,
          resolved: '2.0.0',
          status: 'resolved',
        },
        {
          to: 'finance-domain',
          direction: 'contains',
          via: 'domains',
          pointer: '1.0.0',
          resolved: '1.0.0',
          status: 'resolved',
        },
        {
          to: 'finance-domain',
          direction: 'contains',
          via: 'domains',
          pointer: null,
          resolved: '2.0.0',
          status: 'resolved',
        },
        {
          to: 'payments-report',
          direction: 'contains',
          via: 'dataProducts',
          pointer: '1.0.0',
          resolved: '1.0.0',
          status: 'resolved',
        },
        {
          to: 'payments-report',
          direction: 'contains',
          via: 'dataProducts',
          pointer: null,
          resolved: '2.0.0',
          status: 'resolved',
        },
      ]);
      expect(resolution.externals).toEqual([]);
    });

    it('resolves pinned and unversioned ADR lifecycle pointers and reports missing ADRs as external', () => {
      const architectureIndex = anIndex({
        source: 'acme/architecture',
        commit: '9f31c6a',
        resources: [
          {
            type: 'adr',
            id: 'current-decision',
            version: '1.0.0',
            name: 'Current Decision',
            supersedes: [{ id: 'legacy-decision', version: '1.0.0' }, { id: 'legacy-decision' }],
            supersededBy: [{ id: 'future-decision', version: '1.0.0' }, { id: 'future-decision' }],
            amends: [{ id: 'logging-decision', version: '1.0.0' }, { id: 'logging-decision' }],
            amendedBy: [{ id: 'security-decision', version: '1.0.0' }, { id: 'security-decision' }, { id: 'missing-decision' }],
            contentPath: 'adrs/current-decision/index.mdx',
          },
          ...['legacy-decision', 'future-decision', 'logging-decision', 'security-decision'].flatMap((id) =>
            ['1.0.0', '2.0.0'].map((version) => ({
              type: 'adr' as const,
              id,
              version,
              name: id,
              contentPath: `adrs/${id}/${version}/index.mdx`,
            }))
          ),
        ],
      });

      const resolution = resolve([architectureIndex]);

      expect(
        resolution.edges
          .filter((edge) => edge.from === 'current-decision')
          .map(({ to, direction, via, pointer, resolved, status }) => ({
            to,
            direction,
            via,
            pointer,
            resolved,
            status,
          }))
      ).toEqual([
        {
          to: 'legacy-decision',
          direction: 'relatesTo',
          via: 'supersedes',
          pointer: '1.0.0',
          resolved: '1.0.0',
          status: 'resolved',
        },
        {
          to: 'legacy-decision',
          direction: 'relatesTo',
          via: 'supersedes',
          pointer: null,
          resolved: '2.0.0',
          status: 'resolved',
        },
        {
          to: 'future-decision',
          direction: 'relatesTo',
          via: 'supersededBy',
          pointer: '1.0.0',
          resolved: '1.0.0',
          status: 'resolved',
        },
        {
          to: 'future-decision',
          direction: 'relatesTo',
          via: 'supersededBy',
          pointer: null,
          resolved: '2.0.0',
          status: 'resolved',
        },
        {
          to: 'logging-decision',
          direction: 'relatesTo',
          via: 'amends',
          pointer: '1.0.0',
          resolved: '1.0.0',
          status: 'resolved',
        },
        {
          to: 'logging-decision',
          direction: 'relatesTo',
          via: 'amends',
          pointer: null,
          resolved: '2.0.0',
          status: 'resolved',
        },
        {
          to: 'security-decision',
          direction: 'relatesTo',
          via: 'amendedBy',
          pointer: '1.0.0',
          resolved: '1.0.0',
          status: 'resolved',
        },
        {
          to: 'security-decision',
          direction: 'relatesTo',
          via: 'amendedBy',
          pointer: null,
          resolved: '2.0.0',
          status: 'resolved',
        },
        {
          to: 'missing-decision',
          direction: 'relatesTo',
          via: 'amendedBy',
          pointer: null,
          resolved: null,
          status: 'external',
        },
      ]);
      expect(resolution.externals).toEqual([{ id: 'missing-decision', referencedBy: ['current-decision'] }]);
    });

    it('resolves pinned and unversioned diagram pointers', () => {
      const centralIndex = anIndex({
        source: 'acme/central',
        commit: '6b4e8f2',
        resources: [
          {
            type: 'domain',
            id: 'payments-domain',
            version: '1.0.0',
            name: 'Payments Domain',
            diagrams: [{ id: 'payments-landscape', version: '1.0.0' }, { id: 'payments-landscape' }],
            contentPath: 'domains/payments-domain/index.mdx',
          },
          ...['1.0.0', '2.0.0'].map((version) => ({
            type: 'diagram' as const,
            id: 'payments-landscape',
            version,
            name: 'Payments Landscape',
            contentPath: `diagrams/payments-landscape/${version}/index.mdx`,
          })),
        ],
      });

      const resolution = resolve([centralIndex]);

      expect(
        resolution.edges.map(({ to, direction, via, pointer, resolved, status }) => ({
          to,
          direction,
          via,
          pointer,
          resolved,
          status,
        }))
      ).toEqual([
        {
          to: 'payments-landscape',
          direction: 'relatesTo',
          via: 'diagrams',
          pointer: '1.0.0',
          resolved: '1.0.0',
          status: 'resolved',
        },
        {
          to: 'payments-landscape',
          direction: 'relatesTo',
          via: 'diagrams',
          pointer: null,
          resolved: '2.0.0',
          status: 'resolved',
        },
      ]);
    });

    it('records which field produced an edge', () => {
      const centralIndex = anIndex({
        source: 'acme/central',
        commit: '6b4e8f2',
        resources: [
          {
            type: 'domain',
            id: 'payments-domain',
            version: '1.0.0',
            name: 'Payments Domain',
            services: [{ id: 'payment-service' }],
            contentPath: 'domains/payments/index.mdx',
            contentHash: 'sha256:ea174b',
          },
          {
            type: 'system',
            id: 'payments-system',
            version: '1.0.0',
            name: 'Payments System',
            services: [{ id: 'payment-service' }],
            contentPath: 'systems/payments/index.mdx',
            contentHash: 'sha256:fd82b7',
          },
        ],
      });
      const paymentsIndex = anIndex({
        source: 'acme/team-payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            contentPath: 'services/payment-service/index.mdx',
            contentHash: 'sha256:c81a4f',
          },
        ],
      });

      expect(resolve([centralIndex, paymentsIndex]).edges).toEqual([
        {
          from: 'payments-domain',
          ...fromResource('1.0.0', 'acme/central', '6b4e8f2'),
          to: 'payment-service',
          direction: 'contains',
          via: 'services',
          pointer: null,
          resolved: '1.0.0',
          resolvedFrom: {
            source: 'acme/team-payments',
            commit: '4a1b7e2',
          },
          status: 'resolved',
        },
        {
          from: 'payments-system',
          ...fromResource('1.0.0', 'acme/central', '6b4e8f2'),
          to: 'payment-service',
          direction: 'contains',
          via: 'services',
          pointer: null,
          resolved: '1.0.0',
          resolvedFrom: {
            source: 'acme/team-payments',
            commit: '4a1b7e2',
          },
          status: 'resolved',
        },
      ]);
    });

    it('resolves inputs and outputs on data products', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-requested',
            version: '1.0.0',
            name: 'Payment Requested',
            contentPath: 'events/payment-requested/index.mdx',
            contentHash: 'sha256:62ea15',
          },
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/index.mdx',
            contentHash: 'sha256:04bd91',
          },
        ],
      });
      const dataIndex = anIndex({
        source: 'acme/data',
        commit: '3d7a9c1',
        resources: [
          {
            type: 'data-product',
            id: 'payments-analytics',
            version: '1.0.0',
            name: 'Payments Analytics',
            inputs: [{ id: 'payment-requested' }],
            outputs: [{ id: 'payment-captured' }],
            contentPath: 'data-products/payments-analytics/index.mdx',
            contentHash: 'sha256:af720c',
          },
        ],
      });

      expect(resolve([paymentsIndex, dataIndex]).edges).toEqual([
        {
          from: 'payments-analytics',
          ...fromResource('1.0.0', 'acme/data', '3d7a9c1'),
          to: 'payment-requested',
          direction: 'receives',
          via: 'inputs',
          pointer: null,
          resolved: '1.0.0',
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
          status: 'resolved',
        },
        {
          from: 'payments-analytics',
          ...fromResource('1.0.0', 'acme/data', '3d7a9c1'),
          to: 'payment-captured',
          direction: 'sends',
          via: 'outputs',
          pointer: null,
          resolved: '2.0.0',
          resolvedFrom: {
            source: 'acme/payments',
            commit: '4a1b7e2',
          },
          status: 'resolved',
        },
      ]);
    });

    it('resolves pinned and unversioned related ADR pointers', () => {
      const architectureIndex = anIndex({
        source: 'acme/architecture',
        commit: '5e2b8d7',
        resources: [
          {
            type: 'adr',
            id: 'adr-118',
            version: '1.0.0',
            name: 'Apply payment event standards',
            status: 'accepted',
            related: [{ id: 'adr-042', version: '1.0.0' }, { id: 'adr-077' }],
            contentPath: 'adrs/118/index.mdx',
            contentHash: 'sha256:bc18f4',
          },
        ],
      });
      const governanceIndex = anIndex({
        source: 'acme/governance',
        commit: '8c3f1a6',
        resources: [
          {
            type: 'adr',
            id: 'adr-042',
            version: '1.0.0',
            name: 'Use CloudEvents',
            status: 'accepted',
            contentPath: 'adrs/042/index.mdx',
            contentHash: 'sha256:746dc1',
          },
          {
            type: 'adr',
            id: 'adr-077',
            version: '1.0.0',
            name: 'Version event contracts',
            status: 'accepted',
            contentPath: 'adrs/077/index.mdx',
            contentHash: 'sha256:7d5a20',
          },
          {
            type: 'adr',
            id: 'adr-077',
            version: '2.0.0',
            name: 'Version event contracts',
            status: 'accepted',
            contentPath: 'adrs/077/versioned/2.0.0/index.mdx',
            contentHash: 'sha256:a19e54',
          },
        ],
      });

      const resolution = resolve([architectureIndex, governanceIndex]);

      expect({ edges: resolution.edges, conflicts: resolution.conflicts, externals: resolution.externals }).toEqual({
        edges: [
          {
            from: 'adr-118',
            ...fromResource('1.0.0', 'acme/architecture', '5e2b8d7'),
            to: 'adr-042',
            direction: 'relatesTo',
            via: 'related',
            pointer: '1.0.0',
            resolved: '1.0.0',
            resolvedFrom: {
              source: 'acme/governance',
              commit: '8c3f1a6',
            },
            status: 'resolved',
          },
          {
            from: 'adr-118',
            ...fromResource('1.0.0', 'acme/architecture', '5e2b8d7'),
            to: 'adr-077',
            direction: 'relatesTo',
            via: 'related',
            pointer: null,
            resolved: '2.0.0',
            resolvedFrom: {
              source: 'acme/governance',
              commit: '8c3f1a6',
            },
            status: 'resolved',
          },
        ],
        conflicts: [],
        externals: [],
      });
    });

    it('resolves typed pointers and flags a type mismatch', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/index.mdx',
            contentHash: 'sha256:04bd91',
          },
        ],
      });
      const architectureIndex = anIndex({
        source: 'acme/architecture',
        commit: '5e2b8d7',
        resources: [
          {
            type: 'adr',
            id: 'adr-118',
            version: '1.0.0',
            name: 'Apply payment event standards',
            status: 'accepted',
            appliesTo: [{ type: 'service', id: 'payment-captured' }],
            contentPath: 'adrs/118/index.mdx',
            contentHash: 'sha256:bc18f4',
          },
        ],
      });

      const resolution = resolve([paymentsIndex, architectureIndex]);

      expect({ edges: resolution.edges, conflicts: resolution.conflicts }).toEqual({
        edges: [
          {
            from: 'adr-118',
            ...fromResource('1.0.0', 'acme/architecture', '5e2b8d7'),
            to: 'payment-captured',
            direction: 'appliesTo',
            pointer: null,
            resolved: '2.0.0',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
            status: 'resolved',
          },
        ],
        conflicts: [
          {
            kind: 'pointer-type-mismatch',
            id: 'payment-captured',
            sources: ['acme/architecture', 'acme/payments'],
            detail: 'Expected service but found event',
          },
        ],
      });
    });

    it('resolves an edge deterministically when the target id is in conflict', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.0.0/index.mdx',
            contentHash: 'sha256:04bd91',
          },
        ],
      });
      const legacyBillingIndex = anIndex({
        source: 'acme/legacy-billing',
        commit: '71c9e30',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '1.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/1.0.0/index.mdx',
            contentHash: 'sha256:d930a6',
          },
        ],
      });
      const fulfilmentIndex = anIndex({
        source: 'acme/fulfilment',
        commit: '8f2c6d0',
        resources: [
          {
            type: 'service',
            id: 'shipping-service',
            version: '1.0.0',
            name: 'Shipping Service',
            receives: [{ id: 'payment-captured' }],
            contentPath: 'services/shipping-service/index.mdx',
            contentHash: 'sha256:b75e20',
          },
        ],
      });

      const resolution = resolve([paymentsIndex, legacyBillingIndex, fulfilmentIndex]);

      expect({ edges: resolution.edges, conflicts: resolution.conflicts }).toEqual({
        edges: [
          {
            from: 'shipping-service',
            ...fromResource('1.0.0', 'acme/fulfilment', '8f2c6d0'),
            to: 'payment-captured',
            direction: 'receives',
            pointer: null,
            resolved: '2.0.0',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
            status: 'resolved',
          },
        ],
        conflicts: [
          {
            kind: 'duplicate-source',
            id: 'payment-captured',
            sources: ['acme/legacy-billing', 'acme/payments'],
          },
        ],
      });
    });

    it('resolves a service that sends and receives a message it owns', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-retry-requested',
            version: '1.0.0',
            name: 'Payment Retry Requested',
            contentPath: 'events/payment-retry-requested/index.mdx',
            contentHash: 'sha256:62ea15',
          },
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            sends: [{ id: 'payment-retry-requested' }],
            receives: [{ id: 'payment-retry-requested' }],
            contentPath: 'services/payment-service/index.mdx',
            contentHash: 'sha256:c81a4f',
          },
        ],
      });

      const resolution = resolve([paymentsIndex]);

      expect({ edges: resolution.edges, conflicts: resolution.conflicts, externals: resolution.externals }).toEqual({
        edges: [
          {
            from: 'payment-service',
            ...fromResource('1.0.0', 'acme/payments', '4a1b7e2'),
            to: 'payment-retry-requested',
            direction: 'sends',
            pointer: null,
            resolved: '1.0.0',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
            status: 'resolved',
          },
          {
            from: 'payment-service',
            ...fromResource('1.0.0', 'acme/payments', '4a1b7e2'),
            to: 'payment-retry-requested',
            direction: 'receives',
            pointer: null,
            resolved: '1.0.0',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
            status: 'resolved',
          },
        ],
        conflicts: [],
        externals: [],
      });
    });

    it('resolves versioned and unversioned channel pointers from messages and channel routes', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '1.0.0',
            name: 'Payment Captured',
            channels: [{ id: 'payments.events' }],
            contentPath: 'events/payment-captured/index.mdx',
          },
          {
            type: 'channel',
            id: 'payments.events',
            version: '1.0.0',
            name: 'Payments Events',
            contentPath: 'channels/payments.events/versioned/1.0.0/index.mdx',
          },
          {
            type: 'channel',
            id: 'payments.events',
            version: '2.0.0',
            name: 'Payments Events',
            routes: [{ id: 'payments.dead-letter', version: '1.0.0' }],
            contentPath: 'channels/payments.events/index.mdx',
          },
          {
            type: 'channel',
            id: 'payments.dead-letter',
            version: '1.0.0',
            name: 'Payments Dead Letter',
            contentPath: 'channels/payments.dead-letter/index.mdx',
          },
        ],
      });

      expect(resolve([paymentsIndex]).edges).toEqual([
        {
          from: 'payment-captured',
          ...fromResource('1.0.0', 'acme/payments', '4a1b7e2'),
          to: 'payments.events',
          direction: 'references',
          via: 'channels',
          pointer: null,
          resolved: '2.0.0',
          resolvedFrom: { source: 'acme/payments', commit: '4a1b7e2' },
          status: 'resolved',
        },
        {
          from: 'payments.events',
          ...fromResource('2.0.0', 'acme/payments', '4a1b7e2'),
          to: 'payments.dead-letter',
          direction: 'references',
          via: 'routes',
          pointer: '1.0.0',
          resolved: '1.0.0',
          resolvedFrom: { source: 'acme/payments', commit: '4a1b7e2' },
          status: 'resolved',
        },
      ]);
    });

    it('resolves channels nested in service sends and receives pointers', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '1.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/index.mdx',
          },
          {
            type: 'command',
            id: 'capture-payment',
            version: '1.0.0',
            name: 'Capture Payment',
            contentPath: 'commands/capture-payment/index.mdx',
          },
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            sends: [{ id: 'payment-captured', to: [{ id: 'payments.events' }] }],
            receives: [{ id: 'capture-payment', from: [{ id: 'payments.events', version: '1.0.0' }] }],
            contentPath: 'services/payment-service/index.mdx',
          },
          {
            type: 'channel',
            id: 'payments.events',
            version: '1.0.0',
            name: 'Payments Events',
            contentPath: 'channels/payments.events/index.mdx',
          },
        ],
      });

      const channelEdges = resolve([paymentsIndex]).edges.filter((edge) => edge.to === 'payments.events');

      expect(channelEdges).toEqual([
        {
          from: 'payment-service',
          ...fromResource('1.0.0', 'acme/payments', '4a1b7e2'),
          to: 'payments.events',
          direction: 'sends',
          via: 'sends.to',
          pointer: null,
          resolved: '1.0.0',
          resolvedFrom: { source: 'acme/payments', commit: '4a1b7e2' },
          status: 'resolved',
        },
        {
          from: 'payment-service',
          ...fromResource('1.0.0', 'acme/payments', '4a1b7e2'),
          to: 'payments.events',
          direction: 'receives',
          via: 'receives.from',
          pointer: '1.0.0',
          resolved: '1.0.0',
          resolvedFrom: { source: 'acme/payments', commit: '4a1b7e2' },
          status: 'resolved',
        },
      ]);
    });

    it('resolves pinned, unversioned, and external triggers nested in receives pointers', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'command',
            id: 'capture-payment',
            version: '1.0.0',
            name: 'Capture Payment',
            contentPath: 'commands/capture-payment/index.mdx',
          },
          {
            type: 'event',
            id: 'payment-captured',
            version: '1.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/index.mdx',
          },
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/versioned/2.0.0/index.mdx',
          },
          {
            type: 'event',
            id: 'payment-failed',
            version: '1.0.0',
            name: 'Payment Failed',
            contentPath: 'events/payment-failed/versioned/1.0.0/index.mdx',
          },
          {
            type: 'event',
            id: 'payment-failed',
            version: '2.0.0',
            name: 'Payment Failed',
            contentPath: 'events/payment-failed/index.mdx',
          },
          {
            type: 'service',
            id: 'payment-service',
            version: '1.0.0',
            name: 'Payment Service',
            receives: [
              {
                id: 'capture-payment',
                version: '1.0.0',
                triggers: [
                  { id: 'payment-captured', version: '1.0.0', condition: 'When capture succeeds' },
                  { id: 'payment-failed', condition: 'When capture fails' },
                  { id: 'payment-reconciliation-requested', condition: 'When the result is uncertain' },
                ],
              },
            ],
            contentPath: 'services/payment-service/index.mdx',
          },
        ],
      });

      const resolution = resolve([paymentsIndex]);
      const triggerEdges = resolution.edges.filter((edge) => edge.via === 'receives.triggers');

      expect({ edges: triggerEdges, externals: resolution.externals }).toEqual({
        edges: [
          {
            from: 'payment-service',
            ...fromResource('1.0.0', 'acme/payments', '4a1b7e2'),
            to: 'payment-captured',
            direction: 'sends',
            via: 'receives.triggers',
            pointer: '1.0.0',
            resolved: '1.0.0',
            resolvedFrom: { source: 'acme/payments', commit: '4a1b7e2' },
            status: 'resolved',
          },
          {
            from: 'payment-service',
            ...fromResource('1.0.0', 'acme/payments', '4a1b7e2'),
            to: 'payment-failed',
            direction: 'sends',
            via: 'receives.triggers',
            pointer: null,
            resolved: '2.0.0',
            resolvedFrom: { source: 'acme/payments', commit: '4a1b7e2' },
            status: 'resolved',
          },
          {
            from: 'payment-service',
            ...fromResource('1.0.0', 'acme/payments', '4a1b7e2'),
            to: 'payment-reconciliation-requested',
            direction: 'sends',
            via: 'receives.triggers',
            pointer: null,
            resolved: null,
            status: 'external',
          },
        ],
        externals: [
          {
            id: 'payment-reconciliation-requested',
            referencedBy: ['payment-service'],
          },
        ],
      });
    });
  });

  describe('conflicts', () => {
    it('reports a conflict when two sources own the same id', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.0.0/index.mdx',
            contentHash: 'sha256:04bd91',
          },
        ],
      });
      const legacyBillingIndex = anIndex({
        source: 'acme/legacy-billing',
        commit: '71c9e30',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '1.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/1.0.0/index.mdx',
            contentHash: 'sha256:d930a6',
          },
        ],
      });

      expect(resolve([paymentsIndex, legacyBillingIndex]).conflicts).toEqual([
        {
          kind: 'duplicate-source',
          id: 'payment-captured',
          sources: ['acme/legacy-billing', 'acme/payments'],
        },
      ]);
    });

    it('reports one conflict when three sources own the same id', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.0.0/index.mdx',
            contentHash: 'sha256:04bd91',
          },
        ],
      });
      const legacyBillingIndex = anIndex({
        source: 'acme/legacy-billing',
        commit: '71c9e30',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '1.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/1.0.0/index.mdx',
            contentHash: 'sha256:d930a6',
          },
        ],
      });
      const mobilePaymentsIndex = anIndex({
        source: 'acme/mobile-payments',
        commit: 'c53d8a4',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '3.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/3.0.0/index.mdx',
            contentHash: 'sha256:85ef42',
          },
        ],
      });

      expect(resolve([paymentsIndex, legacyBillingIndex, mobilePaymentsIndex]).conflicts).toEqual([
        {
          kind: 'duplicate-source',
          id: 'payment-captured',
          sources: ['acme/legacy-billing', 'acme/mobile-payments', 'acme/payments'],
        },
      ]);
    });

    it('does not conflict when one source has multiple versions of an id', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.0.0/index.mdx',
            contentHash: 'sha256:04bd91',
          },
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.1.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.1.0/index.mdx',
            contentHash: 'sha256:62ea15',
          },
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.2.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.2.0/index.mdx',
            contentHash: 'sha256:85ef42',
          },
        ],
      });

      expect(resolve([paymentsIndex]).conflicts).toEqual([]);
    });

    it('reports a type collision when the same id has different types', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.0.0/index.mdx',
            contentHash: 'sha256:04bd91',
          },
        ],
      });
      const legacyBillingIndex = anIndex({
        source: 'acme/legacy-billing',
        commit: '71c9e30',
        resources: [
          {
            type: 'command',
            id: 'payment-captured',
            version: '1.0.0',
            name: 'Payment Captured',
            contentPath: 'commands/payment-captured/1.0.0/index.mdx',
            contentHash: 'sha256:d930a6',
          },
        ],
      });

      expect(resolve([paymentsIndex, legacyBillingIndex]).conflicts).toEqual([
        {
          kind: 'type-collision',
          id: 'payment-captured',
          sources: ['acme/legacy-billing', 'acme/payments'],
        },
      ]);
    });

    it('still returns entities and edges when conflicts are present', () => {
      const paymentsIndex = anIndex({
        source: 'acme/payments',
        commit: '4a1b7e2',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.0.0/index.mdx',
            contentHash: 'sha256:04bd91',
          },
        ],
      });
      const legacyBillingIndex = anIndex({
        source: 'acme/legacy-billing',
        commit: '71c9e30',
        resources: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '1.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/1.0.0/index.mdx',
            contentHash: 'sha256:d930a6',
          },
        ],
      });
      const fulfilmentIndex = anIndex({
        source: 'acme/fulfilment',
        commit: '8f2c6d0',
        resources: [
          {
            type: 'event',
            id: 'shipment-requested',
            version: '1.0.0',
            name: 'Shipment Requested',
            contentPath: 'events/shipment-requested/index.mdx',
            contentHash: 'sha256:31de86',
          },
          {
            type: 'service',
            id: 'shipping-service',
            version: '1.0.0',
            name: 'Shipping Service',
            receives: [{ id: 'shipment-requested' }],
            contentPath: 'services/shipping-service/index.mdx',
            contentHash: 'sha256:b75e20',
          },
        ],
      });

      expect(resolve([paymentsIndex, legacyBillingIndex, fulfilmentIndex])).toEqual({
        entities: [
          {
            type: 'event',
            id: 'payment-captured',
            version: '1.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/1.0.0/index.mdx',
            contentHash: 'sha256:d930a6',
            resolvedFrom: {
              source: 'acme/legacy-billing',
              commit: '71c9e30',
            },
          },
          {
            type: 'event',
            id: 'payment-captured',
            version: '2.0.0',
            name: 'Payment Captured',
            contentPath: 'events/payment-captured/2.0.0/index.mdx',
            contentHash: 'sha256:04bd91',
            resolvedFrom: {
              source: 'acme/payments',
              commit: '4a1b7e2',
            },
          },
          {
            type: 'event',
            id: 'shipment-requested',
            version: '1.0.0',
            name: 'Shipment Requested',
            contentPath: 'events/shipment-requested/index.mdx',
            contentHash: 'sha256:31de86',
            resolvedFrom: {
              source: 'acme/fulfilment',
              commit: '8f2c6d0',
            },
          },
          {
            type: 'service',
            id: 'shipping-service',
            version: '1.0.0',
            name: 'Shipping Service',
            receives: [{ id: 'shipment-requested' }],
            contentPath: 'services/shipping-service/index.mdx',
            contentHash: 'sha256:b75e20',
            resolvedFrom: {
              source: 'acme/fulfilment',
              commit: '8f2c6d0',
            },
          },
        ],
        assets: [],
        edges: [
          {
            from: 'shipping-service',
            ...fromResource('1.0.0', 'acme/fulfilment', '8f2c6d0'),
            to: 'shipment-requested',
            direction: 'receives',
            pointer: null,
            resolved: '1.0.0',
            resolvedFrom: {
              source: 'acme/fulfilment',
              commit: '8f2c6d0',
            },
            status: 'resolved',
          },
        ],
        conflicts: [
          {
            kind: 'duplicate-source',
            id: 'payment-captured',
            sources: ['acme/legacy-billing', 'acme/payments'],
          },
        ],
        warnings: [],
        externals: [],
      });
    });
  });
});
