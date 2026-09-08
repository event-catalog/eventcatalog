import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCollection } from 'astro:content';
import {
  getResourceReferenceUrl,
  isVersionedReference,
  resolveMessageReference,
  resolveOwnerReference,
} from '../resource-reference-links';

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));

describe('resource reference links', () => {
  beforeEach(() => {
    vi.mocked(getCollection).mockReset();
    vi.mocked(getCollection).mockResolvedValue([]);
  });

  it.each(['events', 'commands', 'queries'])('resolves explicit versions in %s to the correct collection', async (collection) => {
    vi.mocked(getCollection).mockImplementation(
      async (name) => (name === collection ? [{ data: { id: 'message', version: '1.0.0' } }] : []) as any
    );
    expect(await resolveMessageReference({ id: 'message', version: '1.0.0' })).toEqual({ collection, version: '1.0.0' });
  });

  it.each([undefined, 'latest', '^1.0.0'])('resolves %s to an actual message version', async (version) => {
    vi.mocked(getCollection).mockImplementation(
      async (name) =>
        (name === 'commands' ? ['1.0.0', '1.2.0'].map((version) => ({ data: { id: 'message', version } })) : []) as any
    );
    expect(await resolveMessageReference({ id: 'message', version })).toEqual({ collection: 'commands', version: '1.2.0' });
  });

  it('does not invent a destination for a missing message or version', async () => {
    vi.mocked(getCollection).mockResolvedValue([{ data: { id: 'message', version: '1.0.0' } }] as any);
    expect(await resolveMessageReference({ id: 'missing' })).toEqual({ collection: null, version: null });
    expect(await resolveMessageReference({ id: 'message', version: '2.0.0' })).toEqual({ collection: null, version: null });
  });

  it.each(['users', 'teams'])('links %s without a version suffix', async (collection) => {
    vi.mocked(getCollection).mockImplementation(async (name) => (name === collection ? [{ data: { id: 'owner' } }] : []) as any);
    expect(isVersionedReference(collection)).toBe(false);
    expect(getResourceReferenceUrl(collection, 'owner')).toBe(`/docs/${collection}/owner`);
    expect(await resolveOwnerReference('owner')).toEqual({ id: 'owner', href: `/docs/${collection}/owner` });
    expect(await resolveOwnerReference({ id: 'owner' })).toEqual({ id: 'owner', href: `/docs/${collection}/owner` });
  });

  it('leaves unknown owners unlinked', async () => {
    expect(await resolveOwnerReference('missing')).toEqual({ id: 'missing', href: null });
  });

  it('preserves diagram and versioned resource routes', () => {
    expect(getResourceReferenceUrl('diagrams', 'architecture', '1.0.0')).toBe('/diagrams/architecture/1.0.0');
    expect(getResourceReferenceUrl('services', 'orders', '2.0.0')).toBe('/docs/services/orders/2.0.0');
  });
});
