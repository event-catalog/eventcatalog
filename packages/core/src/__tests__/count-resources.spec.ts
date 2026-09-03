import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hashCatalogContent } from '../analytics/count-resources.js';

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
