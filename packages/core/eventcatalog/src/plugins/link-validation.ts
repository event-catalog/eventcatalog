import type { AstroConfig, AstroIntegration } from 'astro';
import { fileURLToPath } from 'node:url';
import { formatBrokenLinks, validateBuiltLinks, type LinkValidationOptions } from '../utils/link-validation';

export const linkValidation = (options: LinkValidationOptions | false = {}): AstroIntegration => {
  let config: AstroConfig;
  let serverOutput = false;
  return {
    name: 'eventcatalog:link-validation',
    hooks: {
      'astro:config:done': ({ config: resolvedConfig, buildOutput }) => {
        config = resolvedConfig;
        serverOutput = buildOutput === 'server';
      },
      'astro:build:done': async ({ dir, logger }) => {
        if (options === false || (options.onBrokenLinks === 'ignore' && options.onBrokenAnchors === 'ignore')) return;
        if (serverOutput) {
          logger.info('Link validation skipped: only static catalog builds are supported.');
          return;
        }
        const start = performance.now();
        const { pages, diagnostics } = await validateBuiltLinks({
          ...options,
          outDir: fileURLToPath(dir),
          base: config.base,
          site: config.site,
          format: config.build.format,
          trailingSlash: config.trailingSlash,
        });
        const errors = diagnostics.filter((diagnostic) =>
          diagnostic.kind === 'link' ? options.onBrokenLinks === 'error' : options.onBrokenAnchors === 'error'
        );
        const warnings = diagnostics.filter((diagnostic) =>
          diagnostic.kind === 'link' ? options.onBrokenLinks !== 'error' : options.onBrokenAnchors !== 'error'
        );
        if (warnings.length > 0) logger.warn(formatBrokenLinks(warnings));
        if (errors.length > 0) throw new Error(`Link validation failed.\n${formatBrokenLinks(errors)}`);
        logger.info(`Checked links in ${pages} HTML page(s) in ${((performance.now() - start) / 1000).toFixed(2)}s.`);
      },
    },
  };
};
