import { getEventCatalogConfigFile } from '../../../integrations/config-loader.mjs';
import type { Config } from '../../../../src/eventcatalog.config';

// Astro evaluates its config before Vite aliases exist. During application
// compilation the runtime integration replaces this module with a static
// re-export so production output includes the user's configuration.
const config: Config = await getEventCatalogConfigFile(process.env.PROJECT_DIR || process.cwd());

export default config;
