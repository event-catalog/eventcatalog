import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFileSystemSourceProvider } from '../federation/filesystem-source-provider';

const writeFile = async (directory: string, relativePath: string, content: string) => {
  const filePath = path.join(directory, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
  return filePath;
};

const service = (id: string, markdown = id) => `---
id: ${id}
name: ${id}
version: 1.0.0
---
${markdown}
`;

describe('filesystem federation source provider', () => {
  let workspaceDirectory: string;
  let projectDirectory: string;
  let sourceDirectory: string;

  beforeEach(async () => {
    workspaceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-filesystem-provider-'));
    projectDirectory = path.join(workspaceDirectory, 'central-catalog');
    sourceDirectory = path.join(workspaceDirectory, 'catalogs', 'payments');
    await fs.mkdir(projectDirectory, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(workspaceDirectory, { recursive: true, force: true });
  });

  it('indexes and fetches a catalog relative to the central catalog directory', async () => {
    await writeFile(sourceDirectory, 'services/payment-service/index.mdx', service('payment-service', '# Payments'));
    await writeFile(sourceDirectory, 'components/payment-card.astro', '<aside>Payments</aside>');
    await writeFile(sourceDirectory, 'public/payment.svg', '<svg></svg>');
    await writeFile(sourceDirectory, 'federated/old/services/stale-service/index.mdx', service('stale-service'));
    await writeFile(sourceDirectory, 'dist/generated/services/stale-dist-service/index.mdx', service('stale-dist-service'));
    await writeFile(
      sourceDirectory,
      '.eventcatalog-core/src/content/services/stale-core-service/index.mdx',
      service('stale-core-service')
    );
    const provider = createFileSystemSourceProvider(projectDirectory);
    const source = {
      id: 'acme/payments',
      source: 'file:..',
      path: 'catalogs/payments',
    };

    const resolved = await provider.resolve(source);

    expect(resolved).toMatchObject({
      generated: true,
      commit: expect.stringMatching(/^local:[a-f0-9]{12}$/),
      index: {
        source: 'acme/payments',
        commit: expect.stringMatching(/^local:[a-f0-9]{12}$/),
        resources: [expect.objectContaining({ id: 'payment-service' })],
        assets: expect.arrayContaining([
          expect.objectContaining({ path: 'components/payment-card.astro' }),
          expect.objectContaining({ path: 'public/payment.svg' }),
        ]),
      },
    });
    expect(resolved.index.resources.some((resource) => resource.id === 'stale-service')).toBe(false);
    expect(resolved.index.resources.some((resource) => resource.id === 'stale-dist-service')).toBe(false);
    expect(resolved.index.resources.some((resource) => resource.id === 'stale-core-service')).toBe(false);
    await expect(
      provider.fetchContent({
        source,
        commit: resolved.commit,
        path: 'services/payment-service/index.mdx',
      })
    ).resolves.toEqual(Buffer.from(service('payment-service', '# Payments')));
  });

  it('changes the synthetic revision when indexed content changes', async () => {
    const resourcePath = await writeFile(sourceDirectory, 'services/payment-service/index.mdx', service('payment-service'));
    const provider = createFileSystemSourceProvider(projectDirectory);
    const source = { id: 'acme/payments', source: 'file:../catalogs/payments' };

    const first = await provider.resolve(source);
    await fs.writeFile(resourcePath, service('payment-service', '# Updated'));
    const second = await provider.resolve(source);

    expect(second.commit).not.toBe(first.commit);
    expect(second.index.resources[0].contentHash).not.toBe(first.index.resources[0].contentHash);
  });

  it('rejects catalog and artifact paths that escape their source', async () => {
    await writeFile(sourceDirectory, 'services/payment-service/index.mdx', service('payment-service'));
    const provider = createFileSystemSourceProvider(projectDirectory);

    await expect(
      provider.resolve({ id: 'acme/payments', source: 'file:../catalogs/payments', path: '../orders' })
    ).rejects.toThrow('escapes its filesystem source');
    await expect(
      provider.fetchContent({
        source: { id: 'acme/payments', source: 'file:../catalogs/payments' },
        commit: 'local:test',
        path: '../secret.txt',
      })
    ).rejects.toThrow('escapes its filesystem source');
  });

  it('reports missing sources and artifacts with the source id', async () => {
    const provider = createFileSystemSourceProvider(projectDirectory);

    await expect(provider.resolve({ id: 'acme/missing', source: 'file:../missing' })).rejects.toThrow(
      'Filesystem federation source "acme/missing" does not exist'
    );
    await fs.mkdir(sourceDirectory, { recursive: true });
    await expect(
      provider.fetchContent({
        source: { id: 'acme/payments', source: 'file:../catalogs/payments' },
        commit: 'local:test',
        path: 'missing.mdx',
      })
    ).rejects.toThrow('Federated artifact not found for "acme/payments": missing.mdx');
  });

  it('rejects Git refs because filesystem snapshots are content-derived', async () => {
    await fs.mkdir(sourceDirectory, { recursive: true });
    const provider = createFileSystemSourceProvider(projectDirectory);

    await expect(provider.resolve({ id: 'acme/payments', source: 'file:../catalogs/payments', ref: 'main' })).rejects.toThrow(
      'does not support "ref"'
    );
  });
});
