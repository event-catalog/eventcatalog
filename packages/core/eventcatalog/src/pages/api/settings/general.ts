import type { APIRoute } from 'astro';
import { isDevMode } from '@utils/feature';
import { generalSettingsSchema } from '@utils/eventcatalog-config/config-schema';
import {
  applyConfigUpdate,
  readConfigSource,
  writeConfigUpdate,
  type ConfigUpdate,
} from '@utils/eventcatalog-config/config-writer';

export const prerender = false;

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

  const parsed = generalSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, { error: 'Validation failed', issues: parsed.error.issues });
  }

  // Verify the config file exists and is parseable before we attempt the write.
  let source: string;
  try {
    source = readConfigSource();
  } catch (err) {
    return json(500, { error: `Could not read eventcatalog.config.js: ${(err as Error).message}` });
  }

  const data = parsed.data;
  const update: ConfigUpdate = {
    title: data.title,
    tagline: data.tagline ?? null,
    organizationName: data.organizationName ?? null,
    homepageLink: data.homepageLink ?? null,
    editUrl: data.editUrl ?? null,
    repositoryUrl: data.repositoryUrl ?? null,
    theme: data.theme,
  };

  if (data.logo) {
    update.logo = {
      alt: data.logo.alt ?? null,
      text: data.logo.text ?? null,
    };
  }

  try {
    // Dry-run the write first to surface parse errors before touching disk.
    applyConfigUpdate(source, update);
    writeConfigUpdate(update);
  } catch (err) {
    return json(500, { error: `Could not update eventcatalog.config.js: ${(err as Error).message}` });
  }

  return json(200, { ok: true, settings: data });
};
