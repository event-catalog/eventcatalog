import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Config } from '../../../../src/eventcatalog.config';

// Astro evaluates its config before Vite aliases exist. During application
// compilation the runtime integration replaces this module with a static
// re-export so production output includes the user's configuration.
const configPath = path.resolve(process.env.PROJECT_DIR || process.cwd(), 'eventcatalog.config.js');
const configUrl = pathToFileURL(configPath);
configUrl.searchParams.set('t', Date.now().toString());
const { default: config }: { default: Config } = await import(/* @vite-ignore */ configUrl.href);

export default config;
