import { beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';

export function createCatalogHelper(suffix: string) {
  const catalogPath = path.join(__dirname, `catalog-import-test-${suffix}`);

  function setup() {
    beforeEach(() => {
      fs.rmSync(catalogPath, { recursive: true, force: true });
      fs.mkdirSync(catalogPath, { recursive: true });
    });

    afterEach(() => {
      fs.rmSync(catalogPath, { recursive: true, force: true });
    });
  }

  function writeEcFile(name: string, content: string): string {
    const filepath = path.join(catalogPath, name);
    fs.writeFileSync(filepath, content, 'utf-8');
    return filepath;
  }

  return { catalogPath, setup, writeEcFile };
}
