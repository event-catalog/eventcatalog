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
    ignore: ['node_modules/**', '**/dist/**', '**/teams', '**/users', '**/*.mdx', '**/*.md', '**/package.json', '**/Dockerfile'],
  });

  // If we have .env file, copy it to the target
  if (fs.existsSync(path.join(source, '.env'))) {
    files.push(path.join(source, '.env'));
  }

  for (const file of files) {
    mapCatalogToAstro({
      filePath: file,
      astroDir: target,
      projectDir: source,
    }).map((astroPath) => {
      fs.cpSync(file, astroPath);
      return { oldPath: file, newPath: astroPath };
    });
  }
};

export const catalogToAstro = async (source, astroDir) => {
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

  await copyFiles(source, astroDir);
};

export const checkAndConvertMdToMdx = async (source, astroDir) => {
  const files = await glob(path.join(source, '**'), {
    nodir: true,
    windowsPathsNoEscape: os.platform() == 'win32',
    ignore: ['node_modules/**', '**/dist/**', '**/README.md'],
  });

  // If we have any md files, log to the user
  if (files.some((file) => file.endsWith('.md'))) {
    console.log(`EventCatalog now requires all markdown files to be .mdx files. Converting all .md files to .mdx...`);
  }

  for (const file of files) {
    if (file.endsWith('.md')) {
      // Rename the file to .mdx
      fs.renameSync(file, file.replace('.md', '.mdx'));
    }
  }
};
