/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import type { APIRoute } from 'astro';
import { Hono } from 'hono';
import { getFieldsDatabase } from '@enterprise/fields/fields-db';
import path from 'node:path';

const catalogDirectory = process.env.CATALOG_DIR || process.cwd();
const dbPath = path.join(catalogDirectory, '.eventcatalog', 'fields.db');

const app = new Hono().basePath('/api/schemas/fields');

app.get('/', async (c) => {
  try {
    const url = new URL(c.req.raw.url);
    const sp = url.searchParams;

    const db = await getFieldsDatabase(dbPath);
    const params = {
      q: sp.get('q') || undefined,
      format: sp.get('format') || undefined,
      messageType: sp.get('messageType') || undefined,
      message: sp.get('message') || undefined,
      producer: sp.get('producer') || undefined,
      consumer: sp.get('consumer') || undefined,
      required: sp.get('required') === 'true',
      shared: sp.get('shared') === 'true',
      conflicting: sp.get('conflicting') === 'true',
      cursor: sp.get('cursor') || undefined,
      pageSize: sp.get('pageSize') ? parseInt(sp.get('pageSize')!, 10) : undefined,
      path: sp.get('path') || undefined,
    };

    const result = db.queryFields(params);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: `Failed to query fields: ${err.message}` }, 500);
  }
});

export const ALL: APIRoute = async ({ request }) => {
  return app.fetch(request);
};

export const prerender = false;
