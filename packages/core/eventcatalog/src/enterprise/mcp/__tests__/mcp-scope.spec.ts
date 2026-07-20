/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import { describe, expect, it, vi } from 'vitest';
import { MCP_SCOPE_COLLECTIONS, McpScopeNotFoundError, resolveMcpScope } from '../mcp-scope';

const entry = (collection: string, id: string, version = '1.0.0', data: Record<string, any> = {}) => ({
  id: `${id}-${version}`,
  collection,
  data: { id, version, name: id, ...data },
});

const collections: Record<string, any[]> = Object.fromEntries(MCP_SCOPE_COLLECTIONS.map((collection) => [collection, []]));

collections.domains = [
  entry('domains', 'payments', '1.0.0'),
  entry('domains', 'payments', '2.0.0', {
    domains: [{ id: 'fraud' }],
    systems: [{ id: 'payment-system' }],
    entities: [{ id: 'payment' }],
  }),
  entry('domains', 'fraud', '1.0.0', { agents: [{ id: 'fraud-agent' }] }),
  entry('domains', 'ordering'),
];
collections.systems = [entry('systems', 'payment-system', '1.0.0', { services: [{ id: 'payment-service' }] })];
collections.services = [
  entry('services', 'payment-service', '1.0.0', {
    sends: [{ id: 'payment-created' }],
    writesTo: [{ id: 'payment-db' }],
  }),
  entry('services', 'ordering-service', '1.0.0', { receives: [{ id: 'payment-created' }] }),
];
collections.agents = [entry('agents', 'fraud-agent', '1.0.0', { receives: [{ id: 'payment-created' }] })];
collections.events = [entry('events', 'payment-created', '1.0.0', { channels: [{ id: 'payments-topic' }] })];
collections.channels = [entry('channels', 'payments-topic')];
collections.entities = [entry('entities', 'payment')];
collections.containers = [entry('containers', 'payment-db')];
collections.adrs = [
  entry('adrs', 'payments-adr', '1.0.0', { appliesTo: [{ type: 'service', id: 'payment-service' }] }),
  entry('adrs', 'ordering-adr', '1.0.0', { appliesTo: [{ type: 'service', id: 'ordering-service' }] }),
];

const loadCollection = async (collection: (typeof MCP_SCOPE_COLLECTIONS)[number]) => collections[collection];

const domainGraph = {
  root: { type: 'domain' as const, id: 'payments', version: '2.0.0' },
  resources: [
    { type: 'domain' as const, id: 'payments', version: '2.0.0' },
    { type: 'domain' as const, id: 'fraud', version: '1.0.0' },
    { type: 'system' as const, id: 'payment-system', version: '1.0.0' },
    { type: 'service' as const, id: 'payment-service', version: '1.0.0' },
    { type: 'agent' as const, id: 'fraud-agent', version: '1.0.0' },
    { type: 'event' as const, id: 'payment-created', version: '1.0.0' },
    { type: 'channel' as const, id: 'payments-topic', version: '1.0.0' },
    { type: 'entity' as const, id: 'payment', version: '1.0.0' },
    { type: 'container' as const, id: 'payment-db', version: '1.0.0' },
    { type: 'adr' as const, id: 'payments-adr', version: '1.0.0' },
  ],
};

const systemGraph = {
  root: { type: 'system' as const, id: 'payment-system', version: '1.0.0' },
  resources: [
    { type: 'system' as const, id: 'payment-system', version: '1.0.0' },
    { type: 'service' as const, id: 'payment-service', version: '1.0.0' },
    { type: 'event' as const, id: 'payment-created', version: '1.0.0' },
  ],
};

const loadGraph = vi.fn(async (root: { type: string; id: string }) => {
  if (root.id === 'missing') return undefined;
  return root.type === 'system' ? systemGraph : domainGraph;
});

describe('resolveMcpScope', () => {
  it('resolves the latest domain and recursively includes its contained resource graph', async () => {
    const scope = await resolveMcpScope({ kind: 'domain', id: 'payments' }, loadCollection, loadGraph);

    expect(scope.ref).toEqual({ kind: 'domain', id: 'payments', version: '2.0.0' });
    expect(loadGraph).toHaveBeenCalledWith({ type: 'domain', id: 'payments' }, { flat: true });
    expect(scope.has('domains', 'fraud', '1.0.0')).toBe(true);
    expect(scope.has('systems', 'payment-system', '1.0.0')).toBe(true);
    expect(scope.has('services', 'payment-service', '1.0.0')).toBe(true);
    expect(scope.has('agents', 'fraud-agent', '1.0.0')).toBe(true);
    expect(scope.has('events', 'payment-created', '1.0.0')).toBe(true);
    expect(scope.has('channels', 'payments-topic', '1.0.0')).toBe(true);
    expect(scope.has('containers', 'payment-db', '1.0.0')).toBe(true);
    expect(scope.has('adrs', 'payments-adr', '1.0.0')).toBe(true);
  });

  it('does not pull in resources that are only related from outside the scope', async () => {
    const scope = await resolveMcpScope({ kind: 'domain', id: 'payments' }, loadCollection, loadGraph);

    expect(scope.has('domains', 'ordering')).toBe(false);
    expect(scope.has('services', 'ordering-service')).toBe(false);
    expect(scope.has('adrs', 'ordering-adr')).toBe(false);
  });

  it('supports a system as the root scope', async () => {
    const scope = await resolveMcpScope({ kind: 'system', id: 'payment-system', version: '1.0.0' }, loadCollection, loadGraph);

    expect(scope.has('systems', 'payment-system')).toBe(true);
    expect(scope.has('services', 'payment-service')).toBe(true);
    expect(scope.has('events', 'payment-created')).toBe(true);
    expect(scope.has('domains', 'payments')).toBe(false);
    expect(scope.has('agents', 'fraud-agent')).toBe(false);
  });

  it('fails cleanly when the requested scope does not exist', async () => {
    await expect(resolveMcpScope({ kind: 'domain', id: 'missing' }, loadCollection, loadGraph)).rejects.toBeInstanceOf(
      McpScopeNotFoundError
    );
  });
});
