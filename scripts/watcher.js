#!/usr/bin/env node
import watcher from '@parcel/watcher';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Where the users project is located
const projectDirectory = process.env.PROJECT_DIR || process.cwd();
// Where the catalog code is located.
const catalogDirectory = process.env.CATALOG_DIR;

const contentPath = path.join(catalogDirectory, 'src', 'content');

const watchList = ['domains', 'commands', 'events', 'services', 'teams', 'users', 'pages', 'components', 'flows'];

// confirm folders exist before watching them
const verifiedWatchList = watchList.filter((item) => fs.existsSync(path.join(projectDirectory, item)));

const ensureDirSync = async (filePath) => {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const extensionReplacer = (collection, file) => {
  if (collection === 'teams' || collection == 'users') return file;
  return file.replace('.md', '.mdx');
};

const hydrateFileWithMetaData = (contents, { file: filePath }) => {
  const newField = `absolutePath: ${filePath}`;
  const updatedContent = contents.replace(/^(---\n)/, `$1${newField}\n`);
  return updatedContent;
}

for (let item of [...verifiedWatchList]) {
  // Listen to the users directory for any changes.
  watcher.subscribe(path.join(projectDirectory, item), (err, events) => {
    if (err) {
      return;
    }

    for (let event of events) {
      const { path: changedFile, type } = event;

      // normalize path for OS (windows/mac)
      const normalizedPath = path.normalize(changedFile);

      // Split parts
      const parts = normalizedPath.split('/').reverse();

      // Get the last collection that we find in the path (e.g /domains/services/My Service/events would be events)
      const collection = parts.find((part) => watchList.includes(part));

      // split by the last event catalog content directory
      const file = path.join(collection, changedFile.split(collection)[1]);

      let newPath = path.join(contentPath, extensionReplacer(item, file));

      // Check if changlogs, they need to go into their own content folder
      if (file.includes('changelog.md')) {
        newPath = newPath.replace('src/content', 'src/content/changelogs');
      }

      // Check if its a component, need to move to the correct location
      if (newPath.includes('components')) {
        newPath = newPath.replace('src/content/components', 'src/custom-defined-components');
      }

      // If markdown files or astro files copy file over to the required location
      if ((changedFile.endsWith('.md') || changedFile.endsWith('.astro')) && type === 'update') {
        const rawFile = fs.readFileSync(changedFile, 'utf-8');
        const file  = hydrateFileWithMetaData(rawFile, { file: changedFile });
        ensureDirSync(path.join(newPath));;
        fs.writeFileSync(path.join(newPath), file);
      }

      // IF directory remove it
      if (type === 'delete') {
        fs.rmSync(path.join(newPath));
      }
    }
  });
}
