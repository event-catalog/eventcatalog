import type { APIRoute } from 'astro';
import { isDevMode } from '@utils/feature';
import { aiSettingsSchema } from '@utils/eventcatalog-config/config-schema';
import {
  applyConfigUpdate,
  readConfigSource,
  writeConfigUpdate,
  type ConfigUpdate,
} from '@utils/eventcatalog-config/config-writer';

export const prerender = !isDevMode();

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  if (!isDevMode()) {
    return json(403, { error: 'Settings can only be edited when running in dev mode (EVENTCATALOG_DEV_MODE=true).' });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  const parsed = aiSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, { error: 'Validation failed', issues: parsed.error.issues });
  }

  let source: string;
  try {
    source = readConfigSource();
  } catch (err) {
    return json(500, { error: `Could not read eventcatalog.config.js: ${(err as Error).message}` });
  }

  const data = parsed.data;
  const update: ConfigUpdate = {
    llmsTxt: { enabled: data.llmsTxtEnabled },
    chat: { enabled: data.chatEnabled },
  };

  try {
    applyConfigUpdate(source, update);
    writeConfigUpdate(update);
  } catch (err) {
    return json(500, { error: `Could not update eventcatalog.config.js: ${(err as Error).message}` });
  }

  return json(200, { ok: true, settings: data });
};
