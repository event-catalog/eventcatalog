import { getEventCatalogConfigFile } from './eventcatalog-config-file-utils';
import { join } from 'node:path';
import fs from 'node:fs';

export const getProjectOutDir = async () => {
  const config = await getEventCatalogConfigFile(process.env.PROJECT_DIR || '');
  return config?.outDir || 'dist';
};

export const isOutputServer = async () => {
  const config = await getEventCatalogConfigFile(process.env.PROJECT_DIR || '');
  return config?.output === 'server';
};

export const isAuthEnabled = async () => {
  const directory = process.env.PROJECT_DIR || process.cwd();
  const hasAuthConfig = fs.existsSync(join(directory, 'eventcatalog.auth.js'));
  return hasAuthConfig;
};
