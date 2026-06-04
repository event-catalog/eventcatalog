import { glob } from 'glob';
import * as path from 'node:path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'node:os';
import { verifyRequiredFieldsAreInCatalogConfigFile } from './eventcatalog-config-file-utils.js';
import { mapCatalogToAstro, COLLECTION_KEYS } from './map-catalog-to-astro.js';

const __filename = fileURLToPath(import.meta.url);
const rootPkg = path.resolve(path.dirname(__filename), '../');

const copyFiles = async ({ source, target, baseDir, ignore, includeProjectExtras = false }) => {
  const files = await glob(path.join(source, '**'), {
    nodir: true,
    windowsPathsNoEscape: os.platform() == 'win32',
    ignore,
  });

  if (includeProjectExtras) {
    // Custom snippets
    const snippets = await glob(path.join(source, 'snippets/**/*.mdx'), {
      nodir: true,
      windowsPathsNoEscape: os.platform() == 'win32',
    });

    if (snippets.length > 0) {
      files.push(...snippets);
    }

    // If we have .env file, copy it to the target
    if (fs.existsSync(path.join(source, '.env'))) {
      files.push(path.join(source, '.env'));
    }
  }

  for (const file of files) {
    mapCatalogToAstro({
      filePath: file,
      astroDir: target,
      projectDir: baseDir,
    }).map((astroPath) => {
      fs.cpSync(file, astroPath);
      return { oldPath: file, newPath: astroPath };
    });
  }
};

const projectIgnorePatterns = [
  'node_modules/**',
  '**/dist/**',
  '**/*.mdx',
  '**/*.md',
  '**/package.json',
  '**/Dockerfile',
  ...COLLECTION_KEYS.map((key) => `${key}/**`),
];

const contentIgnorePatterns = [
  'node_modules/**',
  '**/dist/**',
  '**/*.mdx',
  '**/*.md',
  '**/package.json',
  '**/Dockerfile',
  'eventcatalog.config.js',
  'eventcatalog.styles.css',
  'components/**',
  'snippets/**',
  'public/**',
  '.env',
];

export const catalogToAstro = async (source, astroDir, contentSource = source) => {
  const astroContentDir = path.join(astroDir, 'src/content/');

  // Clear the astro directory before we copy files over
  if (fs.existsSync(astroContentDir)) fs.rmSync(astroContentDir, { recursive: true });

  // Create the folder again
  fs.mkdirSync(astroContentDir);

  // Verify required fields are in the catalog config file
  await verifyRequiredFieldsAreInCatalogConfigFile(source);

  // If there is no eventcatalog.styles.css file, create one
  if (!fs.existsSync(path.join(source, 'eventcatalog.styles.css'))) {
    fs.writeFileSync(path.join(source, 'eventcatalog.styles.css'), '');
  }

  await copyFiles({
    source,
    target: astroDir,
    baseDir: source,
    ignore: projectIgnorePatterns,
    includeProjectExtras: true,
  });

  await copyFiles({
    source: contentSource,
    target: astroDir,
    baseDir: contentSource,
    ignore: contentIgnorePatterns,
  });
};
