import { describe, expect, it } from 'vitest';
import { buildDashboard, type DashboardCollection, type DashboardEntry } from '../homepage-dashboard';

const entry = (id: string, data: Partial<DashboardEntry['data']> = {}): DashboardEntry => ({
  filePath: `catalog/${id}/index.mdx`,
  data: { id, name: id, version: '1.0.0', ...data },
});

const collections = (overrides: Partial<Record<DashboardCollection, DashboardEntry[]>>) => ({
  domains: [],
  services: [],
  events: [],
  commands: [],
  queries: [],
  flows: [],
  ...overrides,
});

describe('buildDashboard', () => {
  it("lists a message's schema and a service's specifications on their own, by their own dates", () => {
    const dates: Record<string, number> = {
      OrderPlaced: 1,
      'OrderPlaced:schemas': 3,
      Orders: 2,
      'Orders:openapi.yml': 4,
    };

    const { recentlyUpdated } = buildDashboard({
      collections: collections({
        events: [entry('OrderPlaced', { schemaPath: 'schema.json' })],
        services: [entry('Orders', { specifications: [{ type: 'openapi', path: 'openapi.yml', name: 'Orders API' }] })],
      }),
      teams: [],
      users: [],
      getUpdatedAt: (resource, part) =>
        dates[!part ? resource.data.id : `${resource.data.id}:${part === 'schemas' ? part : part.specification}`],
    });

    expect(recentlyUpdated.map(({ kind, id, label, href }) => ({ kind, id, label, href }))).toEqual([
      { kind: 'specification', id: 'Orders', label: 'Orders API', href: '/docs/services/Orders/1.0.0/spec/openapi' },
      {
        kind: 'schema',
        id: 'OrderPlaced',
        label: undefined,
        href: '/schemas/explorer?id=OrderPlaced&version=1.0.0&collection=events',
      },
      { kind: 'resource', id: 'Orders', label: undefined, href: '/docs/services/Orders/1.0.0' },
      { kind: 'resource', id: 'OrderPlaced', label: undefined, href: '/docs/events/OrderPlaced/1.0.0' },
    ]);
  });

  it('leaves out what has no date, e.g. a remote specification', () => {
    const { recentlyUpdated } = buildDashboard({
      collections: collections({
        services: [entry('Orders', { specifications: [{ type: 'asyncapi', path: 'https://example.com/asyncapi.yml' }] })],
      }),
      teams: [],
      users: [],
      getUpdatedAt: (_resource, part) => (part ? undefined : 1),
    });

    expect(recentlyUpdated.map(({ kind }) => kind)).toEqual(['resource']);
  });

  it("lists schemas for messages only (a schema row links to the message's schema in the explorer)", () => {
    const { recentlyUpdated } = buildDashboard({
      collections: collections({ services: [entry('Orders', { schemaPath: 'schema.json' })] }),
      teams: [],
      users: [],
      getUpdatedAt: () => 1,
    });

    expect(recentlyUpdated.map(({ kind }) => kind)).toEqual(['resource']);
  });
});
