import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import type { AstroIntegration } from 'astro';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import sirv from 'sirv';

export default function ecAssets(): AstroIntegration {
  // TODO: Make `/_assets/` a configurable path.
  const ASSETS_DIR = '/_assets/';

  globalThis.ecAsset = {
    /**
     * asset paths relative to the PROJECT_DIR that should be copied
     * into the `/_assets/` directory.
     */
    assets: new Set<string>(),
  };

  return {
    name: 'ec:assets',
    hooks: {
      'astro:server:setup': ({ server, logger }) => {
        const serve = sirv(process.env.PROJECT_DIR!, {
          dev: true, // sirv not cache assets in dev mode.
          etag: true,
        });

        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith(ASSETS_DIR)) {
            req.url = req.url!.replace(ASSETS_DIR, '/');
            serve(req, res, next);
          } else {
            next();
          }
        });
      },
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = fileURLToPath(new URL(join('.', ASSETS_DIR), dir));
        logger.info(`Copying assets to ${outDir}`);

        for (const asset of globalThis.ecAsset.assets) {
          const assetPath = join(process.env.PROJECT_DIR!, asset);
          const outPath = join(outDir, asset);

          logger.debug(`Copying asset ${assetPath} to ${outPath}`);

          await mkdir(dirname(outPath), { recursive: true });
          await pipeline(createReadStream(assetPath), createWriteStream(outPath));
        }

        logger.info(`Copied ${globalThis.ecAsset.assets.size} assets successfully.`);
      },
    },
  };
}
