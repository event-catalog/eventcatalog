import { glob } from 'glob';
import * as path from 'node:path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'node:os';
import { verifyRequiredFieldsAreInCatalogConfigFile, addPropertyToFrontMatter } from './eventcatalog-config-file-utils.js';
import { mapCatalogToAstro } from './map-catalog-to-astro.js';

const __filename = fileURLToPath(import.meta.url);
const rootPkg = path.resolve(path.dirname(__filename), '../');

const copyFiles = async (source, target) => {
  const files = await glob(path.join(source, '**'), {
    nodir: true,
    windowsPathsNoEscape: os.platform() == 'win32',
  });

  for (const file of files) {
    mapCatalogToAstro({
      filePath: file,
      astroDir: target,
      projectDir: source,
    })
      .map((astroPath) => {
        fs.cpSync(file, astroPath);
        return { oldPath: file, newPath: astroPath };
      })
      .map(({ oldPath, newPath }) => {
        if (!oldPath.endsWith('.md') && !oldPath.endsWith('.mdx')) return;
        try {
          // EventCatalog requires the original path to be in the frontmatter for Schemas and Changelogs
          const content = fs.readFileSync(newPath, 'utf-8');
          const frontmatter = addPropertyToFrontMatter(content, 'pathToFile', oldPath);
          fs.writeFileSync(newPath, frontmatter);
        } catch (error) {
          // silent fail
        }
      });
  }
};

const ensureAstroCollectionNotEmpty = async (astroDir) => {
  // TODO: maybe import collections from `src/content/config.ts`...
  const COLLECTIONS = [
    'events',
    'commands',
    'services',
    'users',
    'teams',
    'domains',
    'flows',
    'pages',
    'changelogs',
    'queries',
    'channels',
    'ubiquitousLanguages',
  ];

  // Check empty collections
  const emptyCollections = [];
  for (const collection of COLLECTIONS) {
    const markdownFiles = await glob(path.join(astroDir, 'src/content/', collection, '**'), {
      nodir: true,
      windowsPathsNoEscape: os.platform() == 'win32',
    });

    if (markdownFiles.length === 0) emptyCollections.push(collection);
  }

  // Hydrate empty collections
  const defaultCollectionFilesDir = path.join(rootPkg, 'default-files-for-collections');
  for (const collection of emptyCollections) {
    const defaultFile = path.join(defaultCollectionFilesDir, `${collection}.md`);
    const targetDir = path.join(astroDir, 'src/content/', collection);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.cpSync(defaultFile, path.join(targetDir, `${collection}.md`));
  }
};

export const catalogToAstro = async (source, astroDir) => {
  const astroContentDir = path.join(astroDir, 'src/content/');

  // Config file
  const astroConfigFile = fs.readFileSync(path.join(astroContentDir, 'config.ts'));

  // Clear the astro directory before we copy files over
  fs.rmSync(astroContentDir, { recursive: true });

  // Create the folder again
  fs.mkdirSync(astroContentDir);

  // Write config file back
  fs.writeFileSync(path.join(astroContentDir, 'config.ts'), astroConfigFile);

  // Verify required fields are in the catalog config file
  await verifyRequiredFieldsAreInCatalogConfigFile(source);

  await copyFiles(source, astroDir);

  // Check if the directory is empty. EC (astro collections) requires at least 1 item in the collection
  // insert empty one that is filtered out
  await ensureAstroCollectionNotEmpty(astroDir);
};
