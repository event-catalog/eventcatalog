import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { getRuntimePaths } from '../eventcatalog/integrations/runtime-paths.mjs';

const require = createRequire(import.meta.url);

type RuntimeOptions = {
  projectDirectory: string;
  catalogDirectory: string;
  /** The installed package's eventcatalog/ directory. */
  packageDirectory: string;
};

const writeIfChanged = (file: string, content: string) => {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

const importPath = (file: string) => file.replace(/\\/g, '/');

/** Clear all generated Astro state, not just EventCatalog's bootstrap files. */
export const clearCatalogCache = (projectDirectory: string) => {
  const { cacheDirectory } = getRuntimePaths(projectDirectory);
  fs.rmSync(cacheDirectory, { recursive: true, force: true });
};

/** Generate only collection/type metadata inside Astro's cache. */
export const prepareCatalogRuntime = ({ projectDirectory, catalogDirectory, packageDirectory }: RuntimeOptions) => {
  const runtime = path.resolve(catalogDirectory);
  const source = path.resolve(packageDirectory);
  const project = path.resolve(projectDirectory);
  if (runtime === source || runtime === project) {
    throw new Error('The catalog runtime must be separate from the project and installed application directories.');
  }

  fs.mkdirSync(runtime, { recursive: true });
  writeIfChanged(
    path.join(runtime, 'content.config.ts'),
    `export { collections } from ${JSON.stringify(importPath(path.join(source, 'src/content.config.ts')))};\n`
  );

  const packageTsconfig = JSON.parse(fs.readFileSync(path.join(source, 'tsconfig.json'), 'utf8'));
  const paths: Record<string, string[]> = Object.fromEntries(
    Object.entries(packageTsconfig.compilerOptions.paths as Record<string, string[]>).map(([alias, targets]) => [
      alias,
      targets.map((target) => importPath(path.resolve(source, target))),
    ])
  );
  paths['@config'] = [importPath(path.join(project, 'eventcatalog.config.js'))];
  paths['@catalog/styles'] = [importPath(path.join(project, 'eventcatalog.styles.css'))];
  paths['@catalog/components/*'] = [
    importPath(path.join(project, 'components/*')),
    importPath(path.join(project, 'federated/components/*')),
  ];
  paths['@catalog/snippets/*'] = [importPath(path.join(project, 'snippets/*'))];
  // Astro generates declarations in the user's project, which need not have
  // Astro installed directly (in particular with pnpm's isolated dependencies).
  for (const specifier of ['astro', 'astro/zod', 'astro/loaders', 'astro/runtime/server/index.js']) {
    paths[specifier] = [importPath(require.resolve(specifier).replace(/\.js$/, '.d.ts'))];
  }
  writeIfChanged(
    path.join(runtime, 'tsconfig.json'),
    JSON.stringify(
      {
        extends: importPath(path.join(source, 'tsconfig.json')),
        compilerOptions: {
          baseUrl: '.',
          paths,
          typeRoots: [
            importPath(path.join(project, 'node_modules/@types')),
            importPath(path.join(source, '../node_modules/@types')),
            importPath(path.join(source, '../node_modules')),
            importPath(path.join(project, 'node_modules')),
          ],
        },
        include: [
          importPath(path.join(project, '.astro/types.d.ts')),
          'content.config.ts',
          importPath(path.join(project, 'components/**/*')),
          importPath(path.join(source, 'src/**/*')),
        ],
        // Keep legacy generated files out of checks on an existing checkout.
        exclude: (packageTsconfig.exclude ?? []).map((entry: string) => importPath(path.resolve(source, entry))),
      },
      null,
      2
    ) + '\n'
  );
};
