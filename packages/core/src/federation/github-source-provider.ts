import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import createSDK, { parseIndex } from '@eventcatalog/sdk';
import type { FederationSourceConfig } from '../eventcatalog.config';
import type { FederationSourceProvider, ResolvedFederationSource } from './types';

const execFileAsync = promisify(execFile);

type FetchResponse = Pick<Response, 'status' | 'statusText' | 'ok' | 'arrayBuffer'>;
type FetchFunction = (url: string) => Promise<FetchResponse>;
type CheckoutFunction = <T>(
  source: FederationSourceConfig,
  ref: string,
  callback: (directory: string) => Promise<T>
) => Promise<T>;

export type GitHubSourceProviderOptions = {
  fetch?: FetchFunction;
  checkout?: CheckoutFunction;
};

const parseGitHubSource = (source: FederationSourceConfig) => {
  const match = /^github:([^/]+)\/(.+)$/.exec(source.source);
  if (!match) throw new Error(`Unsupported federation source "${source.source}". Expected github:owner/repository.`);
  return { owner: match[1], repository: match[2] };
};

const assertSafeCatalogPath = (source: FederationSourceConfig) => {
  const catalogPath = source.path ?? '.';
  const normalized = path.posix.normalize(catalogPath.replaceAll('\\', '/'));
  if (catalogPath.includes('\\') || path.posix.isAbsolute(normalized) || normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`Catalog path "${catalogPath}" escapes source "${source.id}"`);
  }
};

const encodePath = (value: string) => value.split('/').filter(Boolean).map(encodeURIComponent).join('/');

const rawUrl = (source: FederationSourceConfig, ref: string, filePath: string) => {
  const { owner, repository } = parseGitHubSource(source);
  return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/${encodeURIComponent(
    ref
  )}/${encodePath(filePath)}`;
};

const fetchBytes = async (url: string, fetcher: FetchFunction): Promise<Buffer | undefined> => {
  const response = await fetcher(url);
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  return Buffer.from(await response.arrayBuffer());
};

const withCheckout = async <T>(source: FederationSourceConfig, ref: string, callback: (directory: string) => Promise<T>) => {
  const { owner, repository } = parseGitHubSource(source);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-federation-'));

  try {
    const git = (args: string[]) => execFileAsync('git', args, { cwd: directory });
    await git(['init', '--quiet']);
    await git(['remote', 'add', 'origin', `https://github.com/${owner}/${repository}.git`]);
    await git(['sparse-checkout', 'init', '--cone']);
    if ((source.path ?? '.') !== '.') await git(['sparse-checkout', 'set', source.path ?? '.']);
    await git(['fetch', '--quiet', '--depth', '1', 'origin', ref]);
    await git(['checkout', '--quiet', '--detach', 'FETCH_HEAD']);
    return await callback(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
};

const generateIndex = async (
  source: FederationSourceConfig,
  ref: string,
  checkout: CheckoutFunction
): Promise<ResolvedFederationSource> =>
  checkout(source, ref, async (directory) => {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: directory });
    const commit = stdout.trim();
    const catalogDirectory = path.resolve(directory, source.path ?? '.');
    const relativeCatalogDirectory = path.relative(directory, catalogDirectory);
    if (relativeCatalogDirectory.startsWith('..') || path.isAbsolute(relativeCatalogDirectory)) {
      throw new Error(`Catalog path "${source.path}" escapes source "${source.id}"`);
    }

    const index = await createSDK(catalogDirectory).buildIndex({ source: source.id, commit });
    return { bytes: Buffer.from(JSON.stringify(index)), index, commit, generated: true };
  });

const fetchPublishedIndex = async (
  source: FederationSourceConfig,
  ref: string,
  fetcher: FetchFunction
): Promise<ResolvedFederationSource | undefined> => {
  const indexPath = path.posix.join(source.path ?? '.', 'catalog.index.json');
  const bytes = await fetchBytes(rawUrl(source, ref, indexPath), fetcher);
  if (!bytes) return undefined;
  const index = parseIndex(JSON.parse(bytes.toString('utf8')));
  if (index.source !== source.id) {
    throw new Error(`Published index source "${index.source}" does not match configured id "${source.id}"`);
  }
  return { bytes, index, commit: index.commit, generated: false };
};

export const createGitHubSourceProvider = (options: GitHubSourceProviderOptions = {}): FederationSourceProvider => {
  const fetcher: FetchFunction = options.fetch ?? ((url) => fetch(url));
  const checkout = options.checkout ?? withCheckout;

  return {
    async resolve(source) {
      assertSafeCatalogPath(source);
      const ref = source.ref ?? 'main';
      return (await fetchPublishedIndex(source, ref, fetcher)) ?? generateIndex(source, ref, checkout);
    },

    async fetchContent({ source, commit, path: artifactPath }) {
      assertSafeCatalogPath(source);
      const catalogPath = path.posix.join(source.path ?? '.', artifactPath);
      const content = await fetchBytes(rawUrl(source, commit, catalogPath), fetcher);
      if (!content) throw new Error(`Federated artifact not found for "${source.id}": ${artifactPath}`);
      return content;
    },
  };
};
