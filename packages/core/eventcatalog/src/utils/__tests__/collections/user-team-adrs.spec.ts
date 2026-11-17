import type { CollectionKey } from 'astro:content';
import { describe, expect, it, vi } from 'vitest';

const user = {
  id: 'users/dave.mdx',
  collection: 'users',
  data: {
    id: 'dave',
    name: 'Dave',
  },
};

const team = {
  id: 'teams/platform.mdx',
  collection: 'teams',
  data: {
    id: 'platform',
    name: 'Platform',
    members: [{ id: 'dave' }],
  },
};

const userOwnedAdr = {
  id: 'adrs/adr-001/index.mdx',
  collection: 'adrs',
  filePath: 'adrs/adr-001/index.mdx',
  data: {
    id: 'adr-001',
    name: 'ADR-001: Direct owner decision',
    version: '1.0.0',
    status: 'accepted',
    date: new Date('2026-01-01'),
    owners: [{ id: 'dave' }],
  },
};

const teamOwnedAdr = {
  id: 'adrs/adr-002/index.mdx',
  collection: 'adrs',
  filePath: 'adrs/adr-002/index.mdx',
  data: {
    id: 'adr-002',
    name: 'ADR-002: Team owner decision',
    version: '1.0.0',
    status: 'proposed',
    date: new Date('2026-01-02'),
    owners: [{ id: 'platform' }],
  },
};

const userOwnedSystem = {
  id: 'systems/CoreMonolith/index.mdx',
  collection: 'systems',
  filePath: 'systems/CoreMonolith/index.mdx',
  data: {
    id: 'CoreMonolith',
    name: 'Core Monolith',
    version: '1.0.0',
    owners: [{ id: 'dave' }],
  },
};

const teamOwnedSystem = {
  id: 'systems/PaymentsPlatform/index.mdx',
  collection: 'systems',
  filePath: 'systems/PaymentsPlatform/index.mdx',
  data: {
    id: 'PaymentsPlatform',
    name: 'Payments Platform',
    version: '1.0.0',
    owners: [{ id: 'platform' }],
  },
};

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: CollectionKey) => {
      switch (key) {
        case 'users':
          return Promise.resolve([user]);
        case 'teams':
          return Promise.resolve([team]);
        case 'adrs':
          return Promise.resolve([userOwnedAdr, teamOwnedAdr]);
        case 'systems':
          return Promise.resolve([userOwnedSystem, teamOwnedSystem]);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

describe('user and team ADR ownership', () => {
  it('includes directly owned and team-owned ADRs on user profiles', async () => {
    const { getUsers } = await import('../../collections/users');

    const users = await getUsers();

    expect((users[0].data as any).ownedAdrs.map((adr: any) => adr.data.id)).toEqual(['adr-001', 'adr-002']);
  });

  it('includes directly owned ADRs on team profiles', async () => {
    const { getTeams } = await import('../../collections/teams');

    const teams = await getTeams();

    expect((teams[0].data as any).ownedAdrs.map((adr: any) => adr.data.id)).toEqual(['adr-002']);
  });
});

describe('user and team system ownership', () => {
  it('includes directly owned and team-owned systems on user profiles', async () => {
    const { getUsers } = await import('../../collections/users');

    const users = await getUsers();

    expect((users[0].data as any).ownedSystems.map((system: any) => system.data.id)).toEqual([
      'CoreMonolith',
      'PaymentsPlatform',
    ]);
  });

  it('includes directly owned systems on team profiles', async () => {
    const { getTeams } = await import('../../collections/teams');

    const teams = await getTeams();

    expect((teams[0].data as any).ownedSystems.map((system: any) => system.data.id)).toEqual(['PaymentsPlatform']);
  });
});

describe('getOwnedResources', () => {
  it('groups the resources a team owns by collection, leaving out older versions', async () => {
    const { getOwnedResources, ownsResources } = await import('../../collections/owned-resources');
    const currentService = {
      collection: 'services',
      filePath: 'services/Orders/index.mdx',
      data: { id: 'Orders', version: '2.0.0' },
    };
    const oldService = {
      collection: 'services',
      filePath: 'services/Orders/versioned/1.0.0/index.mdx',
      data: { id: 'Orders', version: '1.0.0' },
    };
    const team = {
      id: 'teams/platform.mdx',
      collection: 'teams',
      data: { id: 'platform', name: 'Platform', ownedServices: [currentService, oldService], ownedSystems: [teamOwnedSystem] },
    } as any;

    const groups = getOwnedResources(team);

    expect(groups.map(({ collection }) => collection)).toEqual([
      'domains',
      'systems',
      'agents',
      'services',
      'events',
      'commands',
      'queries',
      'adrs',
    ]);
    expect(groups.find(({ collection }) => collection === 'services')?.items).toEqual([currentService]);
    expect(groups.find(({ collection }) => collection === 'systems')?.items).toEqual([teamOwnedSystem]);
    expect(ownsResources(team)).toBe(true);
  });

  it('reports an owner that owns nothing', async () => {
    const { ownsResources } = await import('../../collections/owned-resources');

    expect(ownsResources({ collection: 'teams', data: { id: 'empty', name: 'Empty' } } as any)).toBe(false);
  });
});

describe('user Owned Resources', () => {
  it('includes resources owned by the user and by their teams', async () => {
    const { getUsers } = await import('../../collections/users');
    const { getOwnedResources, ownsResources } = await import('../../collections/owned-resources');

    const [dave] = await getUsers();
    const systems = getOwnedResources(dave).find(({ collection }) => collection === 'systems')?.items ?? [];

    expect(systems.map((system: any) => system.data.id)).toEqual(['CoreMonolith', 'PaymentsPlatform']);
    expect(ownsResources(dave)).toBe(true);
  });
});
