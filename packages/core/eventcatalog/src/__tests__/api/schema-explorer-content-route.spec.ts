import type { CollectionKey } from 'astro:content';
import { expect, describe, it, vi, beforeEach } from 'vitest';
import { getStaticPaths, GET } from '../../pages/schemas/explorer/content/[collection]/[id]/[version].ts';
import path from 'path';
import fs from 'node:fs';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

let mockSchemas: any[] = [];

const schemaContent = (fileName: string) => fs.readFileSync(path.join(__dirname, 'schemas', fileName), 'utf8');

const schemaEntry = ({
  collection,
  id,
  version,
  file,
}: {
  collection: 'events' | 'commands' | 'queries';
  id: string;
  version: string;
  file: string;
}) => ({
  collection: 'schemas',
  data: {
    id: `schema:${collection}:${id}:${version}:${file}`,
    content: schemaContent(file),
    file,
    message: { collection, id, version },
    source: { provider: 'file', path: file },
  },
});

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: CollectionKey) => (key === 'schemas' ? Promise.resolve(mockSchemas) : Promise.resolve([])),
  };
});

// The internal explorer route is intentionally NOT gated behind Scale — it ships with
// every catalog. isSSR only controls prerendering, not availability.
vi.mock('@utils/feature', () => ({ isSSR: () => false }));

describe('pages/schemas/explorer/content/[collection]/[id]/[version].ts', () => {
  beforeEach(() => {
    mockSchemas = [
      schemaEntry({ collection: 'events', id: 'OrderPlaced', version: '1.0.0', file: 'test-schema.json' }),
      schemaEntry({ collection: 'commands', id: 'CreateOrder', version: '1.0.0', file: 'test-schema.avro' }),
    ];
  });

  describe('getStaticPaths', () => {
    it('emits one path per message schema (no "latest", no plan gating)', async () => {
      const staticPaths = await getStaticPaths();
      expect(staticPaths).toHaveLength(2);
      expect(staticPaths.map((p) => p.params)).toEqual([
        { collection: 'events', id: 'OrderPlaced', version: '1.0.0' },
        { collection: 'commands', id: 'CreateOrder', version: '1.0.0' },
      ]);
    });
  });

  describe('GET', () => {
    it('returns the schema content as text/plain', async () => {
      const response = await GET({
        params: { collection: 'events', id: 'OrderPlaced', version: '1.0.0' },
      } as any);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/plain');
      expect(await response.text()).toEqual(schemaContent('test-schema.json'));
    });

    it('returns 404 when the schema is not found', async () => {
      const response = await GET({
        params: { collection: 'events', id: 'NonExistent', version: '1.0.0' },
      } as any);

      expect(response.status).toBe(404);
    });

    it('returns 404 when a param is missing', async () => {
      const response = await GET({
        params: { collection: 'events', id: '', version: '1.0.0' },
      } as any);

      expect(response.status).toBe(404);
    });
  });
});
