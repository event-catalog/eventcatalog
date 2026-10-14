import { startStorage } from '../src/features/storage/database.ts';

// The state EventCatalog keeps (`storage` in eventcatalog.config.js): as the dev server starts, its database is opened
// and brought up to date (migrated), whether or not a feature that uses it is opened. `eventcatalog start` does the
// same through /_eventcatalog/start.
export default function storage() {
  return {
    name: 'eventcatalog-storage',
    hooks: {
      'astro:server:setup': async ({ logger }) => {
        try {
          const file = await startStorage();
          if (file) logger.info(`Database ready (${file})`);
        } catch (error) {
          logger.error(`Could not open the database: ${error.message}`);
        }
      },
    },
  };
}
