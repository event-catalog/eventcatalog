import type { FederationSourceConfig } from '../eventcatalog.config';
import { createFileSystemSourceProvider } from './filesystem-source-provider';
import { createGitHubSourceProvider } from './github-source-provider';
import type { FederationSourceProvider } from './types';

type FederationSourceProviders = {
  github?: FederationSourceProvider;
  filesystem?: FederationSourceProvider;
};

export const createFederationSourceProvider = (
  projectDirectory: string,
  providers: FederationSourceProviders = {}
): FederationSourceProvider => {
  const github = providers.github ?? createGitHubSourceProvider();
  const filesystem = providers.filesystem ?? createFileSystemSourceProvider(projectDirectory);

  const getProvider = (source: FederationSourceConfig) => {
    if (source.source.startsWith('github:')) return github;
    if (source.source.startsWith('file:')) return filesystem;
    throw new Error(`Unsupported federation source "${source.source}" for "${source.id}". Supported protocols: github:, file:.`);
  };

  return {
    async resolve(source) {
      return getProvider(source).resolve(source);
    },
    async fetchContent(request) {
      return getProvider(request.source).fetchContent(request);
    },
  };
};
