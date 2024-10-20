import watcher from '@parcel/watcher';
import fs from 'node:fs';
import path from 'node:path';
import { mapCatalogToAstro } from './map-catalog-to-astro.js';
import { rimrafSync } from 'rimraf';
import { addPropertyToFrontMatter } from './eventcatalog-config-file-utils.js';

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

          const astroPaths = mapCatalogToAstro({
            filePath,
            astroDir: catalogDirectory,
            projectDir: projectDirectory,
          });

          for (const astroPath of astroPaths) {
            switch (type) {
              case 'create':
              case 'update':
                try {
                  // EventCatalog requires the original path to be in the frontmatter for Schemas and Changelogs
                  if (astroPath.endsWith('.mdx')) {
                    const content = fs.readFileSync(astroPath, 'utf-8');
                    const frontmatter = addPropertyToFrontMatter(content, 'pathToFile', filePath);
                    fs.writeFileSync(astroPath, frontmatter);
                  }
                } catch (error) {
                  // silent fail
                }

                if (fs.statSync(filePath).isDirectory()) fs.mkdirSync(astroPath, { recursive: true });
                else retryEPERM(fs.cpSync)(filePath, astroPath);

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

  process.on('exit', () => unsub());
}
