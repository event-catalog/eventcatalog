import type { ResolvedGraph } from '@eventcatalog/sdk';
import { describe, expect, it } from 'vitest';
import { getFederationDiagnosticCounts, getFederationDiagnostics } from '../federation/diagnostics';

const graph = (overrides: Partial<ResolvedGraph>): ResolvedGraph => ({
  entities: [],
  assets: [],
  edges: [],
  conflicts: [],
  warnings: [],
  externals: [],
  ...overrides,
});

describe('federation diagnostics', () => {
  it('describes missing resources with the catalog and resource that references them', () => {
    const result = getFederationDiagnostics(
      graph({
        entities: [
          {
            type: 'service',
            id: 'checkout-api',
            version: '1.0.0',
            name: 'Checkout API',
            contentPath: 'services/checkout-api/index.mdx',
            resolvedFrom: { source: 'event-catalog/checkout', commit: 'abc123' },
          },
        ],
        externals: [
          { id: 'payment-authorized', version: '1.0.0', referencedBy: ['checkout-api'] },
          { id: 'missing-service', referencedBy: ['checkout-api'] },
        ],
      })
    );

    expect(result).toEqual([
      {
        severity: 'warning',
        message: 'Referenced EventCatalog resource does not exist',
        rule: 'federation/missing-resource',
        attributes: [
          { label: 'source catalog', value: 'event-catalog/checkout' },
          { label: 'referenced by', value: 'checkout-api' },
          { label: 'missing resource', value: 'payment-authorized@1.0.0' },
        ],
      },
      {
        severity: 'warning',
        message: 'Referenced EventCatalog resource does not exist',
        rule: 'federation/missing-resource',
        attributes: [
          { label: 'source catalog', value: 'event-catalog/checkout' },
          { label: 'referenced by', value: 'checkout-api' },
          { label: 'missing resource', value: 'missing-service' },
        ],
      },
    ]);
  });

  it('formats asset collisions with their sources and winner', () => {
    expect(
      getFederationDiagnostics(
        graph({
          warnings: [
            {
              kind: 'asset-collision',
              path: 'public/federation-warning.svg',
              sources: ['event-catalog/orders', 'event-catalog/payments'],
              winner: 'event-catalog/payments',
            },
          ],
        })
      )
    ).toEqual([
      {
        severity: 'warning',
        message: 'Asset collision',
        rule: 'federation/asset-collision',
        attributes: [
          { label: 'asset', value: 'public/federation-warning.svg' },
          { label: 'sources', value: 'event-catalog/orders, event-catalog/payments' },
          { label: 'winner', value: 'event-catalog/payments' },
          { label: 'resolution', value: 'last configured source wins' },
        ],
      },
    ]);
  });

  it('formats conflicts and reports consolidated counts', () => {
    const resolvedGraph = graph({
      entities: [
        {
          type: 'event',
          id: 'payment-captured',
          name: 'Payment Captured',
          contentPath: 'events/payment-captured/index.mdx',
          resolvedFrom: { source: 'event-catalog/payments', commit: 'abc123' },
        },
        {
          type: 'command',
          id: 'payment-captured',
          name: 'Payment Captured',
          contentPath: 'commands/payment-captured/index.mdx',
          resolvedFrom: { source: 'event-catalog/legacy-billing', commit: 'def456' },
        },
      ],
      conflicts: [
        {
          kind: 'type-collision',
          id: 'payment-captured',
          sources: ['event-catalog/legacy-billing', 'event-catalog/payments'],
        },
      ],
      externals: [{ id: 'missing-ledger', referencedBy: ['payment-captured'] }],
    });

    expect(getFederationDiagnostics(resolvedGraph)).toEqual([
      {
        severity: 'error',
        message: 'Resource ID has conflicting types',
        rule: 'federation/type-collision',
        attributes: [
          { label: 'resource', value: 'payment-captured' },
          { label: 'event-catalog/payments', value: 'documented as an event' },
          { label: 'event-catalog/legacy-billing', value: 'documented as a command' },
        ],
      },
      {
        severity: 'warning',
        message: 'Referenced EventCatalog resource does not exist',
        rule: 'federation/missing-resource',
        attributes: [
          { label: 'source catalog', value: 'event-catalog/payments' },
          { label: 'referenced by', value: 'payment-captured' },
          { label: 'missing resource', value: 'missing-ledger' },
        ],
      },
    ]);
    expect(getFederationDiagnosticCounts(resolvedGraph)).toEqual({ errors: 1, warnings: 1 });
  });
});
