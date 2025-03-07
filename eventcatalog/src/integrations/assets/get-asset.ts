import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

export function getAsset(assetPath: string) {
  if (!existsSync(assetPath)) {
    console.warn(`Asset ${assetPath} does not exist.`);
    return;
  }

  return {
    getURL() {
      // We assume that the asset path starts with the project directory path.
      const assetPathWithoutBase = assetPath.slice(process.env.PROJECT_DIR!.length);

      // Mark the asset to be copied to the output directory.
      globalThis?.ecAsset?.assets?.add(assetPathWithoutBase);

      return '/_assets/' + assetPathWithoutBase.replace(/^\\/, '').replace(/\\/g, '/');
    },

    getContents() {
      // Sometimes we need the contents of the asset instead of copying it
      // to the public directory.
      return readFile(assetPath, 'utf-8');
    },
  };
}
