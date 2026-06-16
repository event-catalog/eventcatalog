import { existsSync } from 'node:fs';
import { resolve, isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';

interface EventCatalogConfig {
  contentDir?: string;
}

async function readConfig(projectDir: string): Promise<EventCatalogConfig> {
  const configPath = join(projectDir, 'eventcatalog.config.js');
  if (!existsSync(configPath)) {
    return {};
  }

  const config = await import(`${pathToFileURL(configPath).href}?t=${Date.now()}`);
  return config.default || {};
}

export async function resolveContentDir(projectDir: string): Promise<string> {
  const absoluteProjectDir = resolve(projectDir);
  const config = await readConfig(absoluteProjectDir);
  const configuredContentDir = process.env.CONTENT_DIR || config.contentDir || absoluteProjectDir;

  return isAbsolute(configuredContentDir) ? resolve(configuredContentDir) : resolve(absoluteProjectDir, configuredContentDir);
}
