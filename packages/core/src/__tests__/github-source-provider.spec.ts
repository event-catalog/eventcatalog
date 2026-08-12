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
    const provider = createGitHubSourceProvider({ fetch: fetcher, checkout, token: '' });

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
    const provider = createGitHubSourceProvider({ fetch: fetcher, token: '' });

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

  it('uses an authenticated GitHub API request to load a private catalog index', async () => {
    const index: Index = {
      indexVersion: 1,
      source: 'acme/payments',
      commit: 'abc123',
      resources: [],
    };
    const fetcher = vi.fn(async () => response(200, JSON.stringify(index)));
    vi.stubEnv('EVENTCATALOG_GITHUB_TOKEN', 'github-token');

    try {
      const provider = createGitHubSourceProvider({ fetch: fetcher });

      await provider.resolve({
        id: 'acme/payments',
        source: 'github:acme/catalogs',
        path: 'teams/payments',
        ref: 'production',
      });

      expect(fetcher).toHaveBeenCalledWith(
        'https://api.github.com/repos/acme/catalogs/contents/teams/payments/catalog.index.json?ref=production',
        {
          headers: {
            Accept: 'application/vnd.github.raw+json',
            Authorization: 'Bearer github-token',
            'X-GitHub-Api-Version': '2026-03-10',
          },
        }
      );
      expect(fetcher.mock.calls[0][0]).not.toContain('github-token');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('uses an authenticated GitHub API request to fetch private catalog content', async () => {
    const fetcher = vi.fn(async () => response(200, '# Payment service'));
    const provider = createGitHubSourceProvider({ fetch: fetcher, token: 'github-token' });

    await provider.fetchContent({
      source: { id: 'acme/payments', source: 'github:acme/catalogs', path: 'teams/payments' },
      commit: 'abc123',
      path: 'services/payment/index.mdx',
    });

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.github.com/repos/acme/catalogs/contents/teams/payments/services/payment/index.mdx?ref=abc123',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer github-token' }),
      })
    );
  });

  it('authenticates the git checkout fallback without putting the token in the remote URL or arguments', async () => {
    const fetcher = vi.fn(async () => response(404));
    const executeFile = vi.fn(async (_file: string, args: string[]) => ({
      stdout: args[0] === 'rev-parse' ? 'abc123\n' : '',
      stderr: '',
    }));
    const provider = createGitHubSourceProvider({ fetch: fetcher, execFile: executeFile, token: 'github-token' });

    await expect(provider.resolve({ id: 'acme/payments', source: 'github:acme/catalogs' })).resolves.toMatchObject({
      commit: 'abc123',
      generated: true,
    });

    const fetchCall = executeFile.mock.calls.find(([, args]) => args[0] === 'fetch');
    const gitEnvironment = fetchCall?.[2].env;
    const authConfigIndex = Number(gitEnvironment?.GIT_CONFIG_COUNT) - 1;
    expect(gitEnvironment?.[`GIT_CONFIG_KEY_${authConfigIndex}`]).toBe('http.https://github.com/.extraheader');
    expect(gitEnvironment?.[`GIT_CONFIG_VALUE_${authConfigIndex}`]).toBe(
      `AUTHORIZATION: basic ${Buffer.from('x-access-token:github-token').toString('base64')}`
    );
    expect(executeFile.mock.calls.flatMap(([, args]) => args).join(' ')).not.toContain('github-token');
    expect(executeFile).toHaveBeenCalledWith(
      'git',
      ['remote', 'add', 'origin', 'https://github.com/acme/catalogs.git'],
      expect.any(Object)
    );
  });

  it('rejects catalog paths that escape the source repository', async () => {
    const provider = createGitHubSourceProvider({ fetch: vi.fn(), token: '' });

    await expect(provider.resolve({ id: 'acme/payments', source: 'github:acme/catalogs', path: '../payments' })).rejects.toThrow(
      'escapes source'
    );
  });
});
