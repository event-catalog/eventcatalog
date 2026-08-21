/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/src/federation/LICENSE
 */

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
type FetchFunction = (url: string, init?: RequestInit) => Promise<FetchResponse>;
type ExecFileFunction = (
  file: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; encoding: 'utf8' }
) => Promise<{ stdout: string; stderr: string }>;
type CheckoutFunction = <T>(
  source: FederationSourceConfig,
  ref: string,
  callback: (directory: string) => Promise<T>
) => Promise<T>;

export type GitHubSourceProviderOptions = {
  fetch?: FetchFunction;
  checkout?: CheckoutFunction;
  execFile?: ExecFileFunction;
  token?: string;
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

const contentsApiUrl = (source: FederationSourceConfig, ref: string, filePath: string) => {
  const { owner, repository } = parseGitHubSource(source);
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/contents/${encodePath(
    filePath
  )}?ref=${encodeURIComponent(ref)}`;
};

const fetchBytes = async (
  source: FederationSourceConfig,
  ref: string,
  filePath: string,
  fetcher: FetchFunction,
  token?: string
): Promise<Buffer | undefined> => {
  const url = token ? contentsApiUrl(source, ref, filePath) : rawUrl(source, ref, filePath);
  const response = token
    ? await fetcher(url, {
        headers: {
          Accept: 'application/vnd.github.raw+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2026-03-10',
        },
      })
    : await fetcher(url);
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  return Buffer.from(await response.arrayBuffer());
};

const getGitEnvironment = (token?: string) => {
  if (!token) return process.env;

  const inheritedCount = Number.parseInt(process.env.GIT_CONFIG_COUNT ?? '0', 10);
  const configIndex = Number.isInteger(inheritedCount) && inheritedCount >= 0 ? inheritedCount : 0;
  return {
    ...process.env,
    GIT_CONFIG_COUNT: String(configIndex + 1),
    [`GIT_CONFIG_KEY_${configIndex}`]: 'http.https://github.com/.extraheader',
    [`GIT_CONFIG_VALUE_${configIndex}`]: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`,
  };
};

const createCheckout =
  (executeFile: ExecFileFunction, token?: string): CheckoutFunction =>
  async (source, ref, callback) => {
    const { owner, repository } = parseGitHubSource(source);
    const catalogPath = path.posix.normalize(source.path ?? '.');
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-federation-'));
    const env = getGitEnvironment(token);

    try {
      const git = (args: string[]) => executeFile('git', args, { cwd: directory, env, encoding: 'utf8' });
      await git(['init', '--quiet']);
      await git(['remote', 'add', 'origin', `https://github.com/${owner}/${repository}.git`]);
      if (catalogPath !== '.') {
        await git(['sparse-checkout', 'init', '--cone']);
        await git(['sparse-checkout', 'set', catalogPath]);
      }
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
  checkout: CheckoutFunction,
  executeFile: ExecFileFunction
): Promise<ResolvedFederationSource> =>
  checkout(source, ref, async (directory) => {
    const { stdout } = await executeFile('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' });
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
  fetcher: FetchFunction,
  token?: string
): Promise<ResolvedFederationSource | undefined> => {
  const indexPath = path.posix.join(source.path ?? '.', 'catalog.index.json');
  const bytes = await fetchBytes(source, ref, indexPath, fetcher, token);
  if (!bytes) return undefined;
  const index = parseIndex(JSON.parse(bytes.toString('utf8')));
  if (index.source !== source.id) {
    throw new Error(`Published index source "${index.source}" does not match configured id "${source.id}"`);
  }
  return { bytes, index, commit: index.commit, generated: false };
};

export const createGitHubSourceProvider = (options: GitHubSourceProviderOptions = {}): FederationSourceProvider => {
  const fetcher: FetchFunction = options.fetch ?? ((url, init) => fetch(url, init));
  const executeFile: ExecFileFunction = options.execFile ?? ((file, args, execOptions) => execFileAsync(file, args, execOptions));
  const configuredToken = options.token ?? process.env.EVENTCATALOG_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;
  const token = configuredToken?.trim() || undefined;
  const checkout = options.checkout ?? createCheckout(executeFile, token);

  return {
    async resolve(source) {
      assertSafeCatalogPath(source);
      const ref = source.ref ?? 'main';
      return (await fetchPublishedIndex(source, ref, fetcher, token)) ?? generateIndex(source, ref, checkout, executeFile);
    },

    async fetchContent({ source, commit, path: artifactPath }) {
      assertSafeCatalogPath(source);
      const catalogPath = path.posix.join(source.path ?? '.', artifactPath);
      const content = await fetchBytes(source, commit, catalogPath, fetcher, token);
      if (!content) throw new Error(`Federated artifact not found for "${source.id}": ${artifactPath}`);
      return content;
    },
  };
};
