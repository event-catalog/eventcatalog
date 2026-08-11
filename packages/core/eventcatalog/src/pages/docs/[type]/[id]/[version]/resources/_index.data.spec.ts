import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadResourceOwner } from './_index.data';

const collectionMocks = vi.hoisted(() => ({
  getDomains: vi.fn(() => Promise.resolve([])),
  getSystems: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@utils/collections/domains', () => ({ getDomains: collectionMocks.getDomains }));
vi.mock('@utils/collections/systems', () => ({ getSystems: collectionMocks.getSystems }));

describe('Resources page owner loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads domains without flattening child-subdomain services and agents', async () => {
    await loadResourceOwner('domains');

    expect(collectionMocks.getDomains).toHaveBeenCalledWith({ includeServicesInSubdomains: false });
  });

  it('keeps the system loader unchanged', async () => {
    await loadResourceOwner('systems');

    expect(collectionMocks.getSystems).toHaveBeenCalledWith();
  });
});
