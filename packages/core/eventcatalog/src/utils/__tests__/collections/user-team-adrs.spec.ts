import type { CollectionKey } from 'astro:content';
import { describe, expect, it, vi } from 'vitest';

const user = {
  id: 'users/dave.mdx',
  collection: 'users',
  data: {
    id: 'dave',
    name: 'Dave',
    hidden: false,
  },
};

const team = {
  id: 'teams/platform.mdx',
  collection: 'teams',
  data: {
    id: 'platform',
    name: 'Platform',
    hidden: false,
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
    hidden: false,
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
    hidden: false,
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
