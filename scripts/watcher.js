import watcher from '@parcel/watcher';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * @typedef {Object} Event
 * @property {string} path
 * @property {"create"|"update"|"delete"} type
 */

/**
 *
 * @param {string} projectDirectory
 * @param {string} catalogDirectory
 * @param {(err: Error | null, events: Event[]) => void | undefined} callback
 */
export async function watch(projectDirectory, catalogDirectory, callback) {
  const contentPath = path.join(catalogDirectory, 'src', 'content');

  const watchList = ['domains', 'commands', 'events', 'services', 'teams', 'users', 'pages', 'components', 'flows'];
  // const absoluteWatchList = watchList.map((item) => path.join(projectDirectory, item));

  // confirm folders exist before watching them
  const verifiedWatchList = watchList.filter((item) => fs.existsSync(path.join(projectDirectory, item)));

  const extensionReplacer = (collection, file) => {
    if (collection === 'teams' || collection == 'users') return file;
    return file.replace('.md', '.mdx');
  };

  const subscriptions = await Promise.all(
    verifiedWatchList.map((item) =>
      watcher.subscribe(
        path.join(projectDirectory, item),
        compose((err, events) => {
          if (err) {
            return;
          }

          for (let event of events) {
            const { path: eventPath, type } = event;
            const file = eventPath.split(item)[1];
            let newPath = path.join(contentPath, item, extensionReplacer(item, file));

            // Check if changlogs, they need to go into their own content folder
            if (file.includes('changelog.md')) {
              newPath = newPath.replace('src/content', 'src/content/changelogs');
              if (os.platform() == 'win32') {
                newPath = newPath.replace('src\\content', 'src\\content\\changelogs');
              }
            }

            // Check if its a component, need to move to the correct location
            if (newPath.includes('components')) {
              newPath = newPath.replace('src/content/components', 'src/custom-defined-components');
              if (os.platform() == 'win32') {
                newPath = newPath.replace('src\\content\\components', 'src\\custom-defined-components');
              }
            }

            // If config files have changes
            if (eventPath.includes('eventcatalog.config.js') || eventPath.includes('eventcatalog.styles.css')) {
              fs.cpSync(eventPath, path.join(catalogDirectory, file));
              return;
            }

            // If markdown files or astro files copy file over to the required location
            if ((eventPath.endsWith('.md') || eventPath.endsWith('.astro')) && type === 'update') {
              fs.cpSync(eventPath, newPath);
            }

            // IF directory remove it
            if (type === 'delete') {
              fs.rmSync(newPath);
            }
          }
        }, callback)
      )
    )
  );

  return async () => {
    await Promise.allSettled(subscriptions.map((sub) => sub.unsubscribe()));
  };
}

/**
 *
 * @param  {...Function} fns
 * @returns {Function}
 */
function compose(...fns) {
  return function (_err, events) {
    let error = _err;
    fns.filter(Boolean).forEach((fn) => {
      try {
        fn(error, events);
      } catch (e) {
        error = e;
      }
    });
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
  const catalogDirectory = process.env.CATALOG_DIR;

  watch(projectDirectory, catalogDirectory);
}
