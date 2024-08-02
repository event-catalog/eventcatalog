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
  console.log('c', collection, file);
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
      let newPath = path.join(contentPath, item, extensionReplacer(item, file));

      // Check if changlogs, they need to go into their own content folder
      if (file.includes('changelog.md')) {
        newPath = newPath.replace('src/content', 'src/content/changelogs');
      }

      console.log('NEW PATH', newPath);
      //Users/davidboyne/new-dev/eventcatalog/eventcatalog/src/content/events/Inventory/InventoryAdjusted/versioned/0.0.1/changelog.mdx

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
