import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Astro content collections before imports
// Required because owners.ts has closure-based caches that call getCollection during initialization
vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
}));

import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

const buildUserEntry = (id: string, name: string): CollectionEntry<'users'> => ({
  id,
  collection: 'users',
  data: { id, name, avatarUrl: '', hidden: false },
});

const buildTeamEntry = (id: string, name: string): CollectionEntry<'teams'> => ({
  id,
  collection: 'teams',
  data: { id, name, hidden: false },
});

const mockCollections = ({
  users = [],
  teams = [],
}: {
  users?: CollectionEntry<'users'>[];
  teams?: CollectionEntry<'teams'>[];
}) => {
  vi.mocked(getCollection).mockImplementation((collection) => {
    if (collection === 'users') return Promise.resolve(users);
    if (collection === 'teams') return Promise.resolve(teams);
    return Promise.resolve([]);
  });
};

describe('getOwner', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module to clear closure-based caches between tests
    vi.resetModules();
  });

  it('should_resolve_user_when_type_specified', async () => {
    mockCollections({
      users: [buildUserEntry('john-doe', 'John Doe')],
      teams: [buildTeamEntry('platform-team', 'Platform Team')],
    });

    // Dynamic import triggers cache initialization with mock data
    const { getOwner } = await import('../owners');

    const result = await getOwner({ id: 'user|john-doe' });

    expect(result).toBeDefined();
    expect(result?.data.id).toBe('john-doe');
    expect(result?.collection).toBe('users');
  });

  it('should_resolve_team_when_type_specified', async () => {
    mockCollections({
      users: [buildUserEntry('john-doe', 'John Doe')],
      teams: [buildTeamEntry('platform-team', 'Platform Team')],
    });

    const { getOwner } = await import('../owners');

    const result = await getOwner({ id: 'team|platform-team' });

    expect(result).toBeDefined();
    expect(result?.data.id).toBe('platform-team');
    expect(result?.collection).toBe('teams');
  });

  it('should_resolve_user_first_when_no_type_specified', async () => {
    // Both collections have same ID - tests collision handling with deterministic fallback
    mockCollections({
      users: [buildUserEntry('shared-id', 'User')],
      teams: [buildTeamEntry('shared-id', 'Team')],
    });

    const { getOwner } = await import('../owners');

    const result = await getOwner({ id: 'shared-id' });

    expect(result).toBeDefined();
    expect(result?.data.name).toBe('User');
    expect(result?.collection).toBe('users');
  });

  it('should_handle_collision_by_checking_users_first', async () => {
    // Mock scenario where both user and team have same ID
    mockCollections({
      users: [buildUserEntry('collision', 'User Collision')],
      teams: [buildTeamEntry('collision', 'Team Collision')],
    });

    const { getOwner } = await import('../owners');

    const result = await getOwner({ id: 'collision' });

    expect(result).toBeDefined();
    expect(result?.data.name).toBe('User Collision');
  });

  it('should_return_undefined_when_not_found', async () => {
    mockCollections({
      users: [buildUserEntry('john-doe', 'John Doe')],
      teams: [buildTeamEntry('platform-team', 'Platform Team')],
    });

    const { getOwner } = await import('../owners');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

    const result = await getOwner({ id: 'user|missing' });

    expect(result).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith('User "missing" not found in users collection.');

    warnSpy.mockRestore();
  });

  it('should_handle_backward_compatible_plain_strings', async () => {
    mockCollections({
      users: [buildUserEntry('plain-user', 'Plain User')],
      teams: [],
    });

    const { getOwner } = await import('../owners');

    const result = await getOwner({ id: 'plain-user' });

    expect(result).toBeDefined();
    expect(result?.data.id).toBe('plain-user');
  });

  it('should_handle_pipe_in_id_correctly', async () => {
    // Team ID contains pipe character to test split on first | only
    mockCollections({
      users: [],
      teams: [buildTeamEntry('my-team|special', 'Special Team')],
    });

    const { getOwner } = await import('../owners');

    const result = await getOwner({ id: 'team|my-team|special' });

    expect(result).toBeDefined();
    expect(result?.data.id).toBe('my-team|special');
    expect(result?.collection).toBe('teams');
  });
});
