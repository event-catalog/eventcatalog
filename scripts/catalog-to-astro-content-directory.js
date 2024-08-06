import { glob } from 'glob';
import * as path from 'node:path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(__filename);

const getTargetPath = (source, target, type, file) => {
  const relativePath = path.relative(source, file);
  const cleanedRelativePath = relativePath.split(type);
  const targetForEvents = path.join(type, cleanedRelativePath[1]);
  return path.join(target, targetForEvents);
};

const ensureDirSync = async (filePath) => {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const copyFiles = async ({ source, target, catalogFilesDir, pathToMarkdownFiles, pathToAllFiles, type }) => {
  // Find all the event files
  const markdownFiles = await glob(pathToMarkdownFiles, {
    nodir: true,
    windowsPathsNoEscape: os.platform() == 'win32',
  });
  const files = await glob(pathToAllFiles, {
    ignore: {
      ignored: (p) => /\.md$/.test(p.name),
    },
    nodir: true,
    windowsPathsNoEscape: os.platform() == 'win32',
  });

  const publicDir = path.join(target, '../../public/generated');

  // Copy markdown files into the astro content (collection) folder
  for (const file of markdownFiles) {
    let fileTarget = target;

    // If they are change logs they need to go into their own content folder
    if (file.includes('changelog.md')) {
      fileTarget = path.join(target, 'changelogs');
    }

    const targetPath = getTargetPath(source, fileTarget, type, file);

    //ensure the directory exists
    ensureDirSync(path.dirname(targetPath));

    fs.cpSync(file, targetPath.replace('index.md', 'index.mdx').replace('changelog.md', 'changelog.mdx'));
  }

  // Copy all other files (non markdown) files into catalog-files directory (non collection)
  for (const file of files) {
    // Ignore any md files
    if (file.endsWith('.md')) {
      continue;
    }

    const relativePath = path.relative(source, file);
    const cleanedRelativePath = relativePath.split(type);
    if (!cleanedRelativePath[1]) continue;
    const targetForEvents = path.join(type, cleanedRelativePath[1]);

    // Catalog-files-directory
    const targetPath = path.join(catalogFilesDir, targetForEvents);
    if (!fs.existsSync(path.dirname(targetPath))) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    }
    await fs.cpSync(file, targetPath);

    // // // Public Directory
    const publicTargetPath = path.join(publicDir, targetForEvents);

    if (!fs.existsSync(path.dirname(publicTargetPath))) {
      fs.mkdirSync(path.dirname(publicTargetPath), { recursive: true });
    }

    await fs.cpSync(file, publicTargetPath);
  }

  // Check if the directory is empty. EC (astro collections) requires at least 1 item in the collection
  // insert empty one that is filtered out
  if (markdownFiles.length === 0) {
    const defaultCollectionFilesDir = path.join(scriptsDir, 'default-files-for-collections');
    const defaultFile = path.join(defaultCollectionFilesDir, `${type}.md`);
    const targetDir = path.join(target, type);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    await fs.cpSync(defaultFile, path.join(targetDir, `${type}.md`));
  }
};

export const catalogToAstro = async (source, astroContentDir, catalogFilesDir) => {
  // Config file
  const astroConfigFile = fs.readFileSync(path.join(astroContentDir, 'config.ts'));

  // Clear the astro directory before we copy files over
  await fs.rmSync(astroContentDir, { recursive: true });

  // Create the folder again
  fs.mkdirSync(astroContentDir);

  // Write config file back
  // ensureDirSync(astroContentDir);
  fs.writeFileSync(path.join(astroContentDir, 'config.ts'), astroConfigFile);

  // Copy the public directory files into the astro public directory
  const usersPublicDirectory = path.join(source, 'public');
  const astroPublicDir = path.join(astroContentDir, '../../public');

  if (fs.existsSync(usersPublicDirectory)) {
    // fs.mkdirSync(astroPublicDir, { recursive: true });
    fs.cpSync(usersPublicDirectory, astroPublicDir, { recursive: true });
  }

  // Copy all the event files over
  await copyFiles({
    source,
    target: astroContentDir,
    catalogFilesDir,
    pathToMarkdownFiles: [
      path.join(source, 'events/**/**/index.md'),
      path.join(source, 'services/**/events/**/index.md'),
      path.join(source, 'domains/**/events/**/index.md'),
      path.join(source, 'events/**/**/changelog.md'),
    ],
    pathToAllFiles: [
      path.join(source, 'events/**'),
      path.join(source, 'services/**/events/**'),
      path.join(source, 'domains/**/events/**'),
    ],
    type: 'events',
  });

  // // copy commands
  await copyFiles({
    source,
    target: astroContentDir,
    catalogFilesDir,
    pathToMarkdownFiles: [
      path.join(source, 'commands/**/**/index.md'),
      path.join(source, 'services/**/commands/**/index.md'),
      path.join(source, 'domains/**/commands/**/index.md'),
      path.join(source, 'commands/**/**/changelog.md'),
    ],
    pathToAllFiles: [
      path.join(source, 'commands/**'),
      path.join(source, 'services/**/commands/**'),
      path.join(source, 'domains/**/commands/**'),
    ],
    type: 'commands',
  });

  // // Copy all the service files over
  await copyFiles({
    source,
    target: astroContentDir,
    catalogFilesDir,
    pathToMarkdownFiles: [
      path.join(source, 'services/**/**/index.md'),
      path.join(source, 'domains/**/services/**/index.md'),
      path.join(source, 'services/**/**/changelog.md'),
    ],
    pathToAllFiles: [path.join(source, 'services/**'), path.join(source, 'domains/**/services/**')],
    type: 'services',
  });

  // // Copy all the domain files over
  await copyFiles({
    source,
    target: astroContentDir,
    catalogFilesDir,
    pathToMarkdownFiles: [path.join(source, 'domains/**/**/index.md'), path.join(source, 'domains/**/**/changelog.md')],
    pathToAllFiles: [path.join(source, 'domains/**')],
    type: 'domains',
  });

  // // Copy all the users
  await copyFiles({
    source,
    target: astroContentDir,
    catalogFilesDir,
    pathToMarkdownFiles: [path.join(source, 'users/**/*.md')],
    pathToAllFiles: [],
    type: 'users',
  });

  // // Copy all the teams
  await copyFiles({
    source,
    target: astroContentDir,
    catalogFilesDir,
    pathToMarkdownFiles: [path.join(source, 'teams/**/*.md')],
    pathToAllFiles: [],
    type: 'teams',
  });

  // // Copy all the pages (optional)
  await copyFiles({
    source,
    target: astroContentDir,
    catalogFilesDir,
    pathToMarkdownFiles: [path.join(source, 'pages/**/*.md')],
    pathToAllFiles: [],
    type: 'pages',
  });
};

if (process.env.NODE_ENV !== 'test') {
  // // Get the project directory of the source
  const source = process.env.PROJECT_DIR;

  const astroContentDir = path.join(process.env.CATALOG_DIR, 'src/content');
  const catalogFilesDir = path.join(process.env.CATALOG_DIR, 'src/catalog-files');

  catalogToAstro(source, astroContentDir, catalogFilesDir);
}
