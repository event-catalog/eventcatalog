import watcher from '@parcel/watcher';
import fs from 'node:fs';
import { mapCatalogToAstro } from './map-catalog-to-astro.js';
import { rimrafSync } from 'rimraf';

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
  const subscription = await watcher.subscribe(
    projectDirectory,
    compose(
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

          // Transient artifacts from atomic writes (e.g. the SDK's `writeService`
          // creates a sibling `.lock` file that's removed before the watcher
          // fires). Skip outright — they're gone by the time we try to stat.
          if (filePath.endsWith('.lock')) {
            continue;
          }

          // Ignore any file ending with .mdx or .md, as Astro supports this with the new content collections
          // snippets still need to be copied to the astro directory
          if ((filePath.endsWith('.mdx') || filePath.endsWith('.md')) && !filePath.includes('snippets')) {
            continue;
          }

          const astroPaths = mapCatalogToAstro({
            filePath,
            astroDir: catalogDirectory,
            projectDir: projectDirectory,
          });

          for (const astroPath of astroPaths) {
            switch (type) {
              case 'create':
              case 'update': {
                // The file may have disappeared between the watcher firing and
                // this handler running (atomic writes, editor swap files,
                // rapid rename/delete). Treat ENOENT as "nothing to copy".
                let stat;
                try {
                  stat = fs.statSync(filePath);
                } catch (err) {
                  if (err.code === 'ENOENT') break;
                  throw err;
                }
                if (stat.isDirectory()) {
                  fs.mkdirSync(astroPath, { recursive: true });
                } else {
                  retryEPERM(fs.cpSync)(filePath, astroPath);
                }
                break;
              }
              case 'delete':
                retryEPERM(rimrafSync)(astroPath);
                break;
            }
          }
        }
      },
      callback
    ),
    {
      ignore: [`**/${catalogDirectory}/!(${projectDirectory})**`],
    }
  );

  return () => subscription.unsubscribe();
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

const MAX_RETRIES = 5;
const DELAY_MS = 100;

// In win32 some tests failed when attempting copy the file at the same time
// that another process is editing it.
function retryEPERM(fn) {
  return (...args) => {
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        return fn(...args);
      } catch (err) {
        if (err.code !== 'EPERM') throw err;
        setTimeout(() => {}, DELAY_MS);
        retries += 1;
      }
    }
  };
}
