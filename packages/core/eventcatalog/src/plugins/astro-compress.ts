import type { AstroIntegration } from 'astro';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const astroCompressInstallMessage = `Compression is enabled, but astro-compress is not installed.

Install it in your EventCatalog project:

  npm install --save-dev astro-compress`;

type AstroCompressModule = {
  default?: (options: { Logger: number; CSS: boolean }) => AstroIntegration;
};

export const loadAstroCompressIntegration = async (projectDirectory: string): Promise<AstroIntegration> => {
  let astroCompressPath: string;

  try {
    const requireFromCatalog = createRequire(join(projectDirectory, 'package.json'));
    astroCompressPath = requireFromCatalog.resolve('astro-compress');
  } catch (error) {
    throw new Error(`${astroCompressInstallMessage}\n\n${error instanceof Error ? error.message : String(error)}`);
  }

  const astroCompress = (await import(/* @vite-ignore */ pathToFileURL(astroCompressPath).href)) as AstroCompressModule;

  if (typeof astroCompress.default !== 'function') {
    throw new Error('The installed astro-compress package does not have a default integration export.');
  }

  return astroCompress.default({
    Logger: 0,
    CSS: false,
  });
};
