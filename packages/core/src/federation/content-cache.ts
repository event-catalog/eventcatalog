/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/src/federation/LICENSE
 */

import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Cache } from '@eventcatalog/sdk';

type FederationContentCacheOptions = {
  read?: boolean;
  onHit?: (key: string) => void;
};

const getContentHash = (content: Buffer) => `sha256:${createHash('sha256').update(content).digest('hex')}`;
const isContentHash = (key: string) => /^sha256:[a-f0-9]{64}$/i.test(key);

export const createFederationContentCache = (projectDirectory: string, options: FederationContentCacheOptions = {}): Cache => {
  const cacheDirectory = path.join(projectDirectory, '.eventcatalog-cache', 'federation', 'content');
  const getCachePath = (key: string) => path.join(cacheDirectory, encodeURIComponent(key));

  return {
    async get(key) {
      if (options.read === false || !isContentHash(key)) return undefined;

      const cachePath = getCachePath(key);
      try {
        const content = await fs.readFile(cachePath);
        if (getContentHash(content) !== key) {
          await fs.rm(cachePath, { force: true });
          return undefined;
        }
        options.onHit?.(key);
        return content;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
        throw error;
      }
    },

    async set(key, content) {
      if (!isContentHash(key) || getContentHash(content) !== key) return;

      await fs.mkdir(cacheDirectory, { recursive: true });
      const cachePath = getCachePath(key);
      const temporaryPath = `${cachePath}.tmp-${process.pid}-${randomUUID()}`;
      try {
        await fs.writeFile(temporaryPath, content);
        await fs.rename(temporaryPath, cachePath);
      } finally {
        await fs.rm(temporaryPath, { force: true });
      }
    },
  };
};
