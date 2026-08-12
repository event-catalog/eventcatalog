import { describe, expect, it, vi } from 'vitest';
import type { Index } from '@eventcatalog/sdk';
import { createGitHubSourceProvider } from '../federation/github-source-provider';

const response = (status: number, body = '') => ({
  status,
  statusText: status === 200 ? 'OK' : 'Not Found',
  ok: status >= 200 && status < 300,
  arrayBuffer: async () => Buffer.from(body),
});

describe('GitHub federation source provider', () => {
  it('loads a published index from the configured catalog path', async () => {
    const index: Index = {
      indexVersion: 1,
      source: 'acme/payments',
      commit: 'abc123',
      resources: [],
    };
    const fetcher = vi.fn(async () => response(200, JSON.stringify(index)));
    const checkout = vi.fn();
    const provider = createGitHubSourceProvider({ fetch: fetcher, checkout });

    await expect(
      provider.resolve({
        id: 'acme/payments',
        source: 'github:acme/catalogs',
        path: 'teams/payments',
        ref: 'production',
      })
    ).resolves.toMatchObject({ index, commit: 'abc123', generated: false });

    expect(fetcher).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/acme/catalogs/production/teams/payments/catalog.index.json'
    );
    expect(checkout).not.toHaveBeenCalled();
  });

  it('fetches hydrated content from the pinned commit and catalog path', async () => {
    const fetcher = vi.fn(async () => response(200, '# Payment service'));
    const provider = createGitHubSourceProvider({ fetch: fetcher });

    await expect(
      provider.fetchContent({
        source: { id: 'acme/payments', source: 'github:acme/catalogs', path: 'teams/payments' },
        commit: 'abc123',
        path: 'services/payment/index.mdx',
      })
    ).resolves.toEqual(Buffer.from('# Payment service'));

    expect(fetcher).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/acme/catalogs/abc123/teams/payments/services/payment/index.mdx'
    );
  });

  it('rejects catalog paths that escape the source repository', async () => {
    const provider = createGitHubSourceProvider({ fetch: vi.fn() });

    await expect(provider.resolve({ id: 'acme/payments', source: 'github:acme/catalogs', path: '../payments' })).rejects.toThrow(
      'escapes source'
    );
  });
});
