import { createHash } from 'node:crypto';
import type { Index, IndexResource, IndexSchema, ReceivesPointer, SendsPointer } from '@eventcatalog/sdk';

/**
 * Small builders so tests can describe an SDK `Index` in a few lines instead of
 * hand-writing full documents. Shapes mirror what `buildIndex()` emits.
 */

type ResourceExtra = Partial<Omit<IndexResource, 'type' | 'id' | 'version' | 'name' | 'contentPath'>>;

export const resource = (type: IndexResource['type'], id: string, version: string, extra: ResourceExtra = {}): IndexResource => ({
  type,
  id,
  version,
  name: id,
  contentPath: `${type}s/${id}/index.mdx`,
  ...extra,
});

export const service = (id: string, version = '1.0.0', extra: ResourceExtra = {}) => resource('service', id, version, extra);
export const domain = (id: string, version = '1.0.0', extra: ResourceExtra = {}) => resource('domain', id, version, extra);
export const event = (id: string, version = '1.0.0', extra: ResourceExtra = {}) => resource('event', id, version, extra);
export const command = (id: string, version = '1.0.0', extra: ResourceExtra = {}) => resource('command', id, version, extra);
export const query = (id: string, version = '1.0.0', extra: ResourceExtra = {}) => resource('query', id, version, extra);

/**
 * A schema entry with content embedded, as `buildIndex({ includeSchemaContent: true })`
 * would produce. The hash is the real sha256 of the content, so two builders with
 * the same content get the same hash and different content gets a different one.
 */
export const schema = (content: unknown, extra: Partial<IndexSchema> = {}): IndexSchema => {
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  return {
    path: 'schema.json',
    format: 'json-schema',
    default: true,
    hash: `sha256:${createHash('sha256').update(text).digest('hex')}`,
    content: text,
    ...extra,
  };
};

export const sends = (id: string, version = '1.0.0'): SendsPointer => ({ id, version });
export const receives = (id: string, version = '1.0.0'): ReceivesPointer => ({ id, version });

export const index = (options: { source?: string; commit?: string; resources?: IndexResource[] } = {}): Index => ({
  indexVersion: 1,
  source: options.source ?? 'acme/catalog',
  commit: options.commit ?? 'abc1234',
  resources: options.resources ?? [],
});
