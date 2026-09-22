import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const dependenciesDirectory = new URL('../../dist/runtime-dependencies/', import.meta.url);

export function getRuntimeDependencyPath(specifier, environment, manifest, directory = dependenciesDirectory) {
  if (!Object.hasOwn(manifest, specifier)) return specifier;
  if ((specifier === 'astro' || specifier.startsWith('astro/')) && specifier !== 'astro/assets/services/sharp') return specifier;
  if (/^@astrojs\/(react|node|internal-helpers)(?:\/|$)/.test(specifier)) return specifier;
  const filename = manifest[specifier];
  // Prerender imports need file URLs so Windows drive paths remain valid ESM.
  // Prerender artifacts are temporary. Deployed SSR uses public package
  // specifiers that survive moving/reinstalling the app.
  return environment === 'prerender'
    ? new URL(filename, directory).href
    : `@eventcatalog/core/dist/runtime-dependencies/${filename}`;
}

export default function runtimeDependencies() {
  const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', dependenciesDirectory), 'utf-8'));
  return {
    name: 'eventcatalog:runtime-dependencies',
    apply: 'build',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (this.environment.name !== 'prerender' || options.kind !== 'require-call') return;
      const dependencyUrl = getRuntimeDependencyPath(source, 'prerender', manifest);
      if (dependencyUrl === source) return;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved?.external) return;
      // Node's require() needs a filesystem path, while ESM imports below need
      // file URLs. Keep this ID distinct so output.paths leaves it untouched.
      return { id: fileURLToPath(dependencyUrl), external: 'absolute' };
    },
    configEnvironment(name) {
      if (name !== 'ssr' && name !== 'prerender') return;
      return {
        build: {
          rolldownOptions: {
            output: {
              paths(specifier) {
                return getRuntimeDependencyPath(specifier, name, manifest);
              },
            },
          },
        },
      };
    },
  };
}
