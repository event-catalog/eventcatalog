import watcher from '@parcel/watcher';
import fs from 'node:fs';
import { mapCatalogToAstro } from './map-catalog-to-astro.js';
import { rimrafSync } from 'rimraf';
import { addPropertyToFrontMatter } from './eventcatalog-config-file-utils.js';
import path from 'node:path';

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

          // Ignore any file ending with .mdx or .md, as Astro supports this with the new content collections
          if (filePath.endsWith('.mdx') || filePath.endsWith('.md')) {
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
              case 'update':
                // First copy the file
                if (fs.statSync(filePath).isDirectory()) {
                  fs.mkdirSync(astroPath, { recursive: true });
                } else {
                  retryEPERM(fs.cpSync)(filePath, astroPath);
                }
                break;
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
