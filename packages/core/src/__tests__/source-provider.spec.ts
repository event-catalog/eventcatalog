import { describe, expect, it, vi } from 'vitest';
import { createFederationSourceProvider } from '../federation/source-provider';
import type { FederationSourceProvider } from '../federation/types';

const provider = (name: string): FederationSourceProvider => ({
  resolve: vi.fn(async (source) => {
    const index = { indexVersion: 1 as const, source: source.id, commit: name, resources: [] };
    return { bytes: Buffer.from(name), index, commit: name, generated: true };
  }),
  fetchContent: vi.fn(async () => Buffer.from(name)),
});

describe('federation source provider', () => {
  it('routes GitHub and filesystem sources by protocol', async () => {
    const github = provider('github');
    const filesystem = provider('filesystem');
    const sourceProvider = createFederationSourceProvider('/catalog', { github, filesystem });
    const githubSource = { id: 'acme/github', source: 'github:acme/catalog' };
    const filesystemSource = { id: 'acme/filesystem', source: 'file:../catalog' };

    await expect(sourceProvider.resolve(githubSource)).resolves.toMatchObject({ commit: 'github' });
    await expect(sourceProvider.resolve(filesystemSource)).resolves.toMatchObject({ commit: 'filesystem' });
    await expect(sourceProvider.fetchContent({ source: githubSource, commit: 'github', path: 'service.mdx' })).resolves.toEqual(
      Buffer.from('github')
    );
    await expect(
      sourceProvider.fetchContent({ source: filesystemSource, commit: 'filesystem', path: 'service.mdx' })
    ).resolves.toEqual(Buffer.from('filesystem'));
  });

  it('rejects unsupported source protocols before resolving or fetching', async () => {
    const github = provider('github');
    const filesystem = provider('filesystem');
    const sourceProvider = createFederationSourceProvider('/catalog', { github, filesystem });
    const source = { id: 'acme/gitlab', source: 'gitlab:acme/catalog' };

    await expect(sourceProvider.resolve(source)).rejects.toThrow('Supported protocols: github:, file:');
    await expect(sourceProvider.fetchContent({ source, commit: 'test', path: 'service.mdx' })).rejects.toThrow(
      'Supported protocols: github:, file:'
    );
  });
});
