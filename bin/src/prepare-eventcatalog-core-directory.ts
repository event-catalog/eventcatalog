import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// The project itself
const eventCatalogDir = path.join(currentDir, '../../astro');

const copyFile = (from: string, to: string) => {
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, to);
  }
};

const copyFolder = (from: string, to: string) => {
  if (fs.existsSync(from)) {
    fs.cpSync(from, to, { recursive: true });
  }
};

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};

const copyCore = (core: string) => {
  // make sure the core folder exists
  ensureDir(core);

  // Copy required eventcatlog files into users directory
  fs.cpSync(eventCatalogDir, core, { recursive: true });
};

export function prepareCore(projectDir: string, coreDir: string) {
  copyCore(coreDir);

  copyFolder(path.join(projectDir, 'public'), path.join(coreDir, 'public'));
  copyFile(path.join(projectDir, 'eventcatalog.config.js'), path.join(coreDir, 'eventcatalog.config.js'));
  copyFile(path.join(projectDir, 'eventcatalog.styles.css'), path.join(coreDir, 'eventcatalog.styles.css'));
}
