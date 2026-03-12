import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOwnerDetails, getOwnerNames } from '@utils/collections/owners';

vi.mock('astro:content', () => {
  const users = [
    { data: { id: 'jdoe', name: 'Jane Doe', role: 'Staff Engineer', hidden: false }, collection: 'users' },
    { data: { id: 'asmith', name: 'Alice Smith', role: 'Product Manager', hidden: false }, collection: 'users' },
  ];
  const teams = [
    { data: { id: 'platform', name: 'Platform Team', summary: 'Owns platform infra', hidden: false }, collection: 'teams' },
  ];

  return {
    getCollection: vi.fn((name: string) => {
      if (name === 'users') return Promise.resolve(users);
      if (name === 'teams') return Promise.resolve(teams);
      return Promise.resolve([]);
    }),
  };
});

describe('owners', () => {
  describe('getOwnerNames', () => {
    it('resolves string owner IDs to their display names', async () => {
      const names = await getOwnerNames(['jdoe', 'platform']);
      expect(names).toEqual(['Jane Doe', 'Platform Team']);
    });

    it('resolves {id} object references to their display names', async () => {
      const names = await getOwnerNames([{ id: 'jdoe' }, { id: 'platform' }]);
      expect(names).toEqual(['Jane Doe', 'Platform Team']);
    });

    it('falls back to the raw ID when the owner is not found', async () => {
      const names = await getOwnerNames(['unknown-user']);
      expect(names).toEqual(['unknown-user']);
    });

    it('returns an empty array when given no owners', async () => {
      const names = await getOwnerNames([]);
      expect(names).toEqual([]);
    });
  });

  describe('getOwnerDetails', () => {
    it('resolves a user owner with their name, type, and role', async () => {
      const details = await getOwnerDetails([{ id: 'jdoe' }]);
      expect(details).toEqual([{ id: 'jdoe', name: 'Jane Doe', type: 'users', role: 'Staff Engineer' }]);
    });

    it('resolves a team owner with their name, type, and summary as role', async () => {
      const details = await getOwnerDetails([{ id: 'platform' }]);
      expect(details).toEqual([{ id: 'platform', name: 'Platform Team', type: 'teams', role: 'Owns platform infra' }]);
    });

    it('resolves string IDs the same as {id} objects', async () => {
      const details = await getOwnerDetails(['asmith']);
      expect(details).toEqual([{ id: 'asmith', name: 'Alice Smith', type: 'users', role: 'Product Manager' }]);
    });

    it('returns a fallback entry with type "unknown" when the owner is not found', async () => {
      const details = await getOwnerDetails(['ghost']);
      expect(details).toEqual([{ id: 'ghost', name: 'ghost', type: 'unknown', role: undefined }]);
    });

    it('resolves a mix of users, teams, and unknown owners', async () => {
      const details = await getOwnerDetails(['jdoe', { id: 'platform' }, 'nobody']);
      expect(details).toEqual([
        { id: 'jdoe', name: 'Jane Doe', type: 'users', role: 'Staff Engineer' },
        { id: 'platform', name: 'Platform Team', type: 'teams', role: 'Owns platform infra' },
        { id: 'nobody', name: 'nobody', type: 'unknown', role: undefined },
      ]);
    });

    it('returns an empty array when given no owners', async () => {
      const details = await getOwnerDetails([]);
      expect(details).toEqual([]);
    });
  });
});
