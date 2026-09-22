import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const dependenciesDirectory = new URL('../../dist/runtime-dependencies/', import.meta.url);

export function getRuntimeDependencyPath(specifier, environment, manifest, directory = dependenciesDirectory) {
  if (!Object.hasOwn(manifest, specifier)) return specifier;
  if ((specifier === 'astro' || specifier.startsWith('astro/')) && specifier !== 'astro/assets/services/sharp') return specifier;
  if (/^@astrojs\/(react|node|internal-helpers)(?:\/|$)/.test(specifier)) return specifier;
  const filename = manifest[specifier];
  // Prerender artifacts are temporary. Deployed SSR uses public package
  // specifiers that survive moving/reinstalling the app.
  return environment === 'prerender'
    ? fileURLToPath(new URL(filename, directory))
    : `@eventcatalog/core/dist/runtime-dependencies/${filename}`;
}

export default function runtimeDependencies() {
  const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', dependenciesDirectory), 'utf-8'));
  return {
    name: 'eventcatalog:runtime-dependencies',
    apply: 'build',
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
