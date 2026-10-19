import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { countResources, hashCatalogContent } from '../analytics/count-resources.js';

describe('hashCatalogContent', () => {
  let projectDirectory: string;

  beforeEach(async () => {
    projectDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-content-hash-'));
  });

  afterEach(async () => {
    await fs.rm(projectDirectory, { recursive: true, force: true });
  });

  it('returns a short SHA-256 digest of catalog content', async () => {
    const relativePath = 'services/payment-service/index.md';
    const content = '# Payment service';
    const filePath = path.join(projectDirectory, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);

    const expected = createHash('sha256').update(relativePath).update(content).digest('hex').slice(0, 16);

    await expect(hashCatalogContent(projectDirectory)).resolves.toBe(expected);
  });
});

describe('countResources', () => {
  let projectDirectory: string;

  const writeFiles = async (files: string[]) => {
    for (const file of files) {
      const filePath = path.join(projectDirectory, file);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, 'export default {};');
    }
  };

  beforeEach(async () => {
    projectDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-count-resources-'));
  });

  afterEach(async () => {
    await fs.rm(projectDirectory, { recursive: true, force: true });
  });

  it('counts the fitness functions that `eventcatalog fitness check` runs, including those beside resources and versions', async () => {
    await writeFiles([
      'fitness/events-have-owners.fitness.ts',
      'fitness/naming/kebab-case.fitness.ts',
      'domains/Orders/fitness/boundaries.fitness.ts',
      'domains/Orders/services/OrderService/versioned/0.0.1/fitness/old.fitness.ts',
    ]);

    await expect(countResources(projectDirectory)).resolves.toMatchObject({ fitnessFunctions: 4 });
  });

  it('does not count helpers, misplaced fitness files, or fitness functions from federated catalogs and dependencies', async () => {
    await writeFiles([
      'fitness/helpers/catalog.ts',
      'domains/Orders/rule.fitness.ts',
      'federated/payments/domains/Payments/fitness/pci.fitness.ts',
      'node_modules/some-package/fitness/rule.fitness.ts',
      'dist/fitness/rule.fitness.ts',
      'fitness/only.fitness.ts',
    ]);

    await expect(countResources(projectDirectory)).resolves.toMatchObject({ fitnessFunctions: 1 });
  });

  it('reports zero fitness functions for a catalog without any', async () => {
    await expect(countResources(projectDirectory)).resolves.toMatchObject({ fitnessFunctions: 0 });
  });

  it('leaves fitness functions out of the content hash, which tracks documentation changes', async () => {
    await writeFiles(['services/payment-service/index.md']);
    const before = await hashCatalogContent(projectDirectory);

    await writeFiles(['services/payment-service/fitness/rule.fitness.ts', 'fitness/global.fitness.ts']);

    await expect(hashCatalogContent(projectDirectory)).resolves.toBe(before);
  });
});
