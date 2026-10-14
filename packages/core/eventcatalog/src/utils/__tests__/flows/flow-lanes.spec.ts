import { describe, expect, it } from 'vitest';
import { createLaneIndex } from '@utils/node-graphs/flow-lanes';

// Collection entries with only what the lane index reads (and filePath, which marks old versions)
const entry = (data: { id: string } & Record<string, unknown>, filePath = 'index.mdx') => ({ data, filePath }) as never;

const index = createLaneIndex({
  domains: [
    entry({ id: 'ordering', name: 'Ordering', services: [{ id: 'checkout-api' }], systems: [{ id: 'checkout-system' }] }),
    entry({ id: 'payments', name: 'Payments', agents: [{ id: 'fraud-agent' }] }),
    entry({ id: 'old-domain', name: 'Old Domain', services: [{ id: 'billing' }] }, 'versioned/0.0.1/index.mdx'),
  ],
  systems: [
    entry({
      id: 'checkout-system',
      name: 'Checkout System',
      services: [{ id: 'checkout-api' }, { id: 'checkout-orchestrator' }],
      containers: [{ id: 'orders-db' }],
    }),
  ],
  teams: [
    entry({ id: 'ordering-platform', name: 'Ordering Platform' }),
    entry({ id: 'old-team', name: 'Old Team', hidden: true }),
  ],
  users: [entry({ id: 'dboyne', name: 'David Boyne' })],
});

describe('flow lanes', () => {
  it('puts a service a domain lists in that domain and the system that lists it', () => {
    expect(index.lanesFor(entry({ id: 'checkout-api' }))).toEqual({
      domain: { id: 'ordering', name: 'Ordering' },
      system: { id: 'checkout-system', name: 'Checkout System' },
    });
  });

  it('puts a service or data store in the domain of the system it belongs to', () => {
    expect(index.lanesFor(entry({ id: 'checkout-orchestrator' }))?.domain).toEqual({ id: 'ordering', name: 'Ordering' });
    expect(index.lanesFor(entry({ id: 'orders-db' }))?.domain).toEqual({ id: 'ordering', name: 'Ordering' });
  });

  it('puts an agent in the domain that lists it', () => {
    expect(index.lanesFor(entry({ id: 'fraud-agent' }))?.domain).toEqual({ id: 'payments', name: 'Payments' });
  });

  it('prefers a team owner over a user owner for the team lane', () => {
    const lanes = index.lanesFor(entry({ id: 'x', owners: ['dboyne', { id: 'ordering-platform', collection: 'teams' }] }));
    expect(lanes?.team).toEqual({ id: 'ordering-platform', name: 'Ordering Platform' });
  });

  it('puts a system in its own system lane, the domain that lists it and its owning team', () => {
    const system = entry({ id: 'checkout-system', name: 'Checkout System', owners: ['ordering-platform'] });
    expect(index.lanesForSystem(system)).toEqual({
      domain: { id: 'ordering', name: 'Ordering' },
      system: { id: 'checkout-system', name: 'Checkout System' },
      team: { id: 'ordering-platform', name: 'Ordering Platform' },
    });
  });

  it('leaves hidden teams out, as the rest of the catalog does', () => {
    expect(index.lanesFor(entry({ id: 'x', owners: ['old-team'] }))).toBeUndefined();
  });

  it('ignores older versions of domains', () => {
    expect(index.lanesFor(entry({ id: 'billing' }))).toBeUndefined();
  });

  it('gives a resource that belongs nowhere no lanes', () => {
    expect(index.lanesFor(entry({ id: 'unknown' }))).toBeUndefined();
  });
});
