import type { ResolvedGraph } from '@eventcatalog/sdk';
import { describe, expect, it } from 'vitest';
import {
  federationRuleDefaults,
  getFederationDiagnosticCounts,
  getFederationDiagnostics,
  getVisibleFederationDiagnostics,
  resolveFederationRules,
} from '../federation/diagnostics';

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

  it.each([
    { requestedVersion: '1.0.0', description: 'an unavailable exact version' },
    { requestedVersion: '^1.0.0', description: 'an unsatisfied version range' },
  ])('describes $description and lists the available versions', ({ requestedVersion }) => {
    const resolvedGraph = graph({
      entities: [
        {
          type: 'event',
          id: 'payment-captured',
          version: '2.0.0',
          name: 'Payment Captured',
          contentPath: 'events/payment-captured/2.0.0/index.mdx',
          resolvedFrom: { source: 'event-catalog/payments', commit: 'abc123' },
        },
        {
          type: 'event',
          id: 'payment-captured',
          version: '2.1.0',
          name: 'Payment Captured',
          contentPath: 'events/payment-captured/2.1.0/index.mdx',
          resolvedFrom: { source: 'event-catalog/payments', commit: 'def456' },
        },
        {
          type: 'service',
          id: 'shipping-service',
          version: '1.0.0',
          name: 'Shipping Service',
          contentPath: 'services/shipping-service/index.mdx',
          resolvedFrom: { source: 'event-catalog/fulfillment', commit: 'ghi789' },
        },
      ],
      edges: [
        {
          from: 'shipping-service',
          fromVersion: '1.0.0',
          fromResolvedFrom: { source: 'event-catalog/fulfillment', commit: 'ghi789' },
          to: 'payment-captured',
          direction: 'receives',
          pointer: requestedVersion,
          resolved: null,
          status: 'unresolved',
        },
      ],
    });

    const diagnostics = getFederationDiagnostics(resolvedGraph);

    expect(diagnostics).toEqual([
      {
        severity: 'warning',
        message: 'Referenced EventCatalog resource version does not exist',
        rule: 'federation/unresolved-version',
        attributes: [
          { label: 'source catalog', value: 'event-catalog/fulfillment' },
          { label: 'referenced by', value: 'shipping-service@1.0.0' },
          { label: 'resource', value: 'payment-captured' },
          { label: 'requested version', value: requestedVersion },
          { label: 'available versions', value: '2.0.0, 2.1.0' },
        ],
      },
    ]);
    expect(getFederationDiagnosticCounts(diagnostics)).toEqual({ errors: 0, warnings: 1 });
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

    const diagnostics = getFederationDiagnostics(resolvedGraph);

    expect(diagnostics).toEqual([
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
    expect(getFederationDiagnosticCounts(diagnostics)).toEqual({ errors: 1, warnings: 1 });
  });

  it('keeps the existing rule levels as defaults', () => {
    expect(federationRuleDefaults).toEqual({
      'federation/duplicate-source': 'error',
      'federation/type-collision': 'error',
      'federation/pointer-type-mismatch': 'error',
      'federation/facet-disagreement': 'error',
      'federation/asset-collision': 'warn',
      'federation/missing-resource': 'warn',
      'federation/unresolved-version': 'warn',
    });
  });

  it('applies off, warn, and error rule overrides before reporting and counting diagnostics', () => {
    const resolvedGraph = graph({
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
      conflicts: [
        {
          kind: 'duplicate-source',
          id: 'checkout-api',
          sources: ['event-catalog/checkout', 'event-catalog/storefront'],
        },
      ],
      externals: [{ id: 'payment-authorized', referencedBy: ['checkout-api'] }],
      warnings: [
        {
          kind: 'asset-collision',
          path: 'public/logo.svg',
          sources: ['event-catalog/checkout', 'event-catalog/storefront'],
          winner: 'event-catalog/storefront',
        },
      ],
    });

    const diagnostics = getFederationDiagnostics(resolvedGraph, {
      'federation/duplicate-source': 'warn',
      'federation/missing-resource': 'error',
      'federation/asset-collision': 'off',
    });

    expect(diagnostics.map(({ rule, severity }) => ({ rule, severity }))).toEqual([
      { rule: 'federation/missing-resource', severity: 'error' },
      { rule: 'federation/duplicate-source', severity: 'warning' },
    ]);
    expect(getFederationDiagnosticCounts(diagnostics)).toEqual({ errors: 1, warnings: 1 });
    expect(getVisibleFederationDiagnostics(diagnostics, false)).toEqual([diagnostics[0]]);
    expect(getVisibleFederationDiagnostics(diagnostics, true)).toEqual(diagnostics);
  });

  it('rejects unknown rule ids and invalid rule levels', () => {
    expect(() => resolveFederationRules({ 'federation/not-a-rule': 'warn' } as never)).toThrow(
      'Unknown federation rule "federation/not-a-rule".'
    );
    expect(() => resolveFederationRules({ 'federation/missing-resource': 'fatal' } as never)).toThrow(
      'Invalid level "fatal" for federation rule "federation/missing-resource". Expected off, warn, or error.'
    );
  });
});
