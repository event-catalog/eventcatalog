import watcher from '@parcel/watcher';
import fs from 'node:fs';
import path from 'node:path';
import { mapCatalogToAstro } from './map-catalog-to-astro.js';

/**
 * @typedef {Object} Event
 * @property {string} path
 * @property {"create"|"update"|"delete"} type
 *
 * @typedef {(err: Error | null, events: Event[]) => unknown} SubscribeCallback
 */

/**
 *
 * @param {string} projectDirectory
 * @param {string} catalogDirectory
 * @param {SubscribeCallback|undefined} callback
 */
export async function watch(projectDirectory, catalogDirectory, callback = undefined) {
  console.log('Subscribing to ' + projectDirectory);

  const subscription = await watcher.subscribe(
    projectDirectory,
    compose(
      console.debug,
      /**
       * @param {Error|null} err
       * @param {Event[]} events
       * @returns {unknown}
       */
      (err, events) => {
        if (err) {
          return;
        }

        for (let event of events) {
          const { path: filePath, type } = event;

          const astroPaths = mapCatalogToAstro({
            filePath,
            astroDir: catalogDirectory,
            projectDir: projectDirectory,
          });

          for (const astroPath of astroPaths) {
            switch (type) {
              case 'create':
              case 'update':
                if (fs.statSync(filePath).isDirectory()) fs.mkdirSync(astroPath, { recursive: true });
                else retryCopy(filePath, astroPath);
                break;
              case 'delete':
                try {
                  fs.rmSync(astroPath, { recursive: true, force: true });
                } catch (e) {
                  if (e.code == 'ENOENT') {
                    // fail silently - The parent directory could have been deleted before.
                  } else throw e;
                }
                break;
            }
          }
        }
      },
      callback
    ),
    {
      ignore: [catalogDirectory],
    }
  );

  console.log('Watching for changes...');

  return () => {
    console.log('Unsubscribing...');
    return subscription.unsubscribe().then(() => console.log('Unsubscribed successfully!'));
  };
}

/**
 *
 * @param  {...Function} fns
 * @returns {SubscribeCallback}
 */
function compose(...fns) {
  return function (err, events) {
    fns.filter(Boolean).forEach((fn, i) => {
      try {
        fn(err, events);
      } catch (error) {
        console.error({ error });
        throw error;
      }
    });
  };
}

/**
 *
 * @param {string} src
 * @param {string} dest
 * @param {number} retries
 * @param {number} delay
 */
function retryCopy(src, dest, retries = 5, delay = 100) {
  let attempts = 0;

  const tryCopy = () => {
    try {
      fs.cpSync(src, dest);
      console.log('File copied successfully!');
    } catch (err) {
      // In win32 some tests failed when attempting copy the file at the same time
      // that another process is editing it.
      if (err.code === 'EPERM' && attempts < retries) {
        attempts++;
        console.log(`Retrying copy... Attempt ${attempts}`);
        setTimeout(tryCopy, delay); // Retry after a delay
      } else {
        console.error('Error during file copy:', err);
        throw err;
      }
    }
  };

  tryCopy();
}

/**
 * TODO: call `watch` from the dev command.
 * Calling `watch` there will avoid these if statement.
 * The same could be done to `catalog-to-astro-content-directory`
 */
if (process.env.NODE_ENV !== 'test') {
  // Where the users project is located
  const projectDirectory = process.env.PROJECT_DIR || process.cwd();
  // Where the catalog code is located.
  const catalogDirectory = process.env.CATALOG_DIR || path.join(projectDirectory, '.eventcatalog-core');

  const unsub = await watch(projectDirectory, catalogDirectory);

  process.on('exit', () => {
    console.log('Unsubscribing...');
    return unsub();
  });
}
