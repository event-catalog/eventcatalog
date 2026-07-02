import { glob } from 'astro/loaders';
import picomatch from 'picomatch';
import path from 'path';
import { fileURLToPath } from 'url';

export type GlobOptions = Parameters<typeof glob>[0];

export const withIgnoredBuildArtifacts = (patterns: string | string[]) => {
  if (process.env.IGNORE_BUILD_ARTIFACTS === 'true') {
    const ignoredArtifacts = ['!dist/**', '!**/dist/**'];
    return Array.isArray(patterns) ? [...patterns, ...ignoredArtifacts] : [patterns, ...ignoredArtifacts];
  }
  return patterns;
};

const toPatterns = (patterns: string | string[]) => (Array.isArray(patterns) ? patterns : [patterns]);

const matchesGlobPattern = (entry: string, patterns: string | string[]) => {
  const patternList = toPatterns(patterns);
  const positivePatterns = patternList.filter((pattern) => !pattern.startsWith('!'));
  const negativePatterns = patternList.filter((pattern) => pattern.startsWith('!')).map((pattern) => pattern.slice(1));

  return picomatch.isMatch(entry, positivePatterns) && !picomatch.isMatch(entry, negativePatterns);
};

export const globWithSafeWatcher = (options: GlobOptions) => {
  const loader = glob(options);

  return {
    ...loader,
    load: async (context: Parameters<typeof loader.load>[0]) => {
      if (process.env.EVENTCATALOG_DEV_MODE !== 'true' || !context.watcher) {
        return loader.load(context);
      }

      let baseDir = options.base ? new URL(options.base, context.config.root) : context.config.root;
      if (!baseDir.pathname.endsWith('/')) {
        baseDir = new URL(`${baseDir.pathname}/`, baseDir);
      }

      const basePath = fileURLToPath(baseDir);
      const watcher = new Proxy(context.watcher, {
        get(target, property, receiver) {
          if (property !== 'on') {
            const value = Reflect.get(target, property, receiver);
            return typeof value === 'function' ? value.bind(target) : value;
          }

          return (event: string, callback: (changedPath: string) => void) => {
            if (!['add', 'change', 'unlink'].includes(event)) {
              return target.on(event, callback);
            }

            return target.on(event, (changedPath: string) => {
              const entry = path.relative(basePath, changedPath).split(path.sep).join('/');
              if (!entry.startsWith('../') && matchesGlobPattern(entry, options.pattern)) {
                callback(changedPath);
              }
            });
          };
        },
      });

      return loader.load({
        ...context,
        watcher,
      });
    },
  };
};
