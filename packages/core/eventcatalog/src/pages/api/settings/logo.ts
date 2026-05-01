import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { isDevMode } from '@utils/feature';
import { writeConfigUpdate } from '@utils/eventcatalog-config/config-writer';

export const prerender = false;

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const projectRoot = () => process.env.PROJECT_DIR ?? process.cwd();
const publicDir = () => path.join(projectRoot(), 'public');
const LOGO_BASENAME = 'eventcatalog-logo';

const removeExistingLogos = () => {
  const dir = publicDir();
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith(`${LOGO_BASENAME}.`)) {
      fs.unlinkSync(path.join(dir, entry));
    }
  }
};

/**
 * Best-effort SVG sanitization: strips <script> blocks and on* event handlers.
 * Not a full sanitizer; we accept this as a v1 limitation for SVG uploads.
 */
const sanitizeSvg = (svg: string): string =>
  svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');

export const POST: APIRoute = async ({ request }) => {
  if (!isDevMode()) {
    return json(403, { error: 'Logo can only be changed when running in dev mode (EVENTCATALOG_DEV_MODE=true).' });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: 'Expected multipart/form-data body' });
  }

  const file = form.get('logo');
  if (!(file instanceof File)) {
    return json(400, { error: 'Missing `logo` file field' });
  }

  const ext = ALLOWED[file.type];
  if (!ext) {
    return json(400, { error: `Unsupported logo type: ${file.type}. Allowed: PNG, JPG, SVG, WebP.` });
  }

  if (file.size > MAX_BYTES) {
    return json(413, { error: `Logo exceeds 2MB size limit (got ${file.size} bytes).` });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = publicDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  removeExistingLogos();

  const targetName = `${LOGO_BASENAME}.${ext}`;
  const targetPath = path.join(dir, targetName);

  if (ext === 'svg') {
    const sanitized = sanitizeSvg(buffer.toString('utf8'));
    fs.writeFileSync(targetPath, sanitized, 'utf8');
  } else {
    fs.writeFileSync(targetPath, buffer);
  }

  const src = `/${targetName}`;
  try {
    writeConfigUpdate({ logo: { src } });
  } catch (err) {
    return json(500, { error: `Logo saved but config update failed: ${(err as Error).message}` });
  }

  return json(200, { ok: true, src });
};

export const DELETE: APIRoute = async () => {
  if (!isDevMode()) {
    return json(403, { error: 'Logo can only be changed when running in dev mode.' });
  }

  removeExistingLogos();
  try {
    writeConfigUpdate({ logo: { src: null } });
  } catch (err) {
    return json(500, { error: `Logo files removed but config update failed: ${(err as Error).message}` });
  }

  return json(200, { ok: true });
};
