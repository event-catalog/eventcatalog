import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFederationContentCache } from '../federation/content-cache';

const hash = (content: Buffer) => `sha256:${createHash('sha256').update(content).digest('hex')}`;

describe('federation content cache', () => {
  let projectDirectory: string;

  beforeEach(async () => {
    projectDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-federation-cache-'));
  });

  afterEach(async () => {
    await fs.rm(projectDirectory, { recursive: true, force: true });
  });

  it('stores and returns content by its verified hash', async () => {
    const onHit = vi.fn();
    const cache = createFederationContentCache(projectDirectory, { onHit });
    const content = Buffer.from('# Payment service');
    const key = hash(content);

    await cache.set(key, content);

    await expect(cache.get(key)).resolves.toEqual(content);
    expect(onHit).toHaveBeenCalledWith(key);
    await expect(
      fs.readFile(path.join(projectDirectory, '.eventcatalog-cache', 'federation', 'content', encodeURIComponent(key)))
    ).resolves.toEqual(content);
  });

  it('rejects and removes corrupt cached content', async () => {
    const cache = createFederationContentCache(projectDirectory);
    const content = Buffer.from('# Payment service');
    const key = hash(content);
    const cachePath = path.join(projectDirectory, '.eventcatalog-cache', 'federation', 'content', encodeURIComponent(key));
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, 'corrupt');

    await expect(cache.get(key)).resolves.toBeUndefined();
    await expect(fs.access(cachePath)).rejects.toThrow();
  });

  it('ignores unsupported cache keys', async () => {
    const cache = createFederationContentCache(projectDirectory);

    await cache.set('../unsafe', Buffer.from('content'));

    await expect(cache.get('../unsafe')).resolves.toBeUndefined();
    await expect(fs.access(path.join(projectDirectory, '.eventcatalog-cache'))).rejects.toThrow();
  });
});
