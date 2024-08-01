#!/usr/bin/env node
import watcher from '@parcel/watcher';
import path from 'path';
import fs from 'fs';

// Where the users project is located
const projectDirectory = process.env.PROJECT_DIR || process.cwd();
// Where the catalog code is located.
const catalogDirectory = process.env.CATALOG_DIR;

const contentPath = path.join(catalogDirectory, 'src', 'content');

const watchList = ['domains', 'commands', 'events', 'services', 'teams', 'users', 'pages'];
// const absoluteWatchList = watchList.map((item) => path.join(projectDirectory, item));

// confirm folders exist before watching them
const verifiedWatchList = watchList.filter((item) => fs.existsSync(path.join(projectDirectory, item)));

const extensionReplacer = (collection, file) => {
  if (collection === 'teams' || collection == 'users') return file;
  return file.replace('.md', '.mdx');
};

for (let item of [...verifiedWatchList]) {
  // Listen to the users directory for any changes.
  watcher.subscribe(path.join(projectDirectory, item), (err, events) => {
    if (err) {
      return;
    }
    for (let event of events) {
      const { path: eventPath, type } = event;
      const file = eventPath.split(item)[1];
      const newPath = path.join(contentPath, item, extensionReplacer(item, file));

      // If config files have changes
      if (eventPath.includes('eventcatalog.config.js') || eventPath.includes('eventcatalog.styles.css')) {
        fs.cpSync(eventPath, path.join(catalogDirectory, file));
        return;
      }

      // If markdown files copy file over to the required location
      if (eventPath.endsWith('.md') && type === 'update') {
        fs.cpSync(eventPath, newPath);
      }

      // IF directory remove it
      if (type === 'delete') {
        console.log('eventPath', eventPath);
        fs.rmSync(newPath);
      }
    }
  });
}
