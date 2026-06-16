import type { Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { glob, globSync } from 'glob';

interface LikeC4Config {
  name?: string;
}

const virtualModuleId = 'virtual:likec4-projects';
const resolvedVirtualModuleId = `\0${virtualModuleId}`;

const likeC4InstallMessage = `LikeC4 diagrams were found, but LikeC4 is not installed.

Install LikeC4 in your EventCatalog project:

  npm install --save-dev likec4@latest @likec4/icons@latest
  pnpm add -D likec4@latest @likec4/icons@latest
  yarn add -D likec4@latest @likec4/icons@latest`;

export const eventCatalogLikeC4 = async (workspaceDir: string): Promise<Plugin[]> => {
  const enabled = hasLikeC4Sources(workspaceDir);
  const registry = likeC4ProjectRegistry(workspaceDir, enabled);

  if (!enabled) {
    return [registry];
  }

  const LikeC4VitePlugin = await loadLikeC4VitePlugin(workspaceDir);

  return [
    LikeC4VitePlugin({
      workspace: workspaceDir,
    }),
    registry,
  ];
};

const hasLikeC4Sources = (workspaceDir: string) => {
  return (
    globSync('**/*.{c4,likec4}', {
      cwd: workspaceDir,
      ignore: ['**/node_modules/**'],
    }).length > 0
  );
};

const loadLikeC4VitePlugin = async (workspaceDir: string) => {
  try {
    const requireFromCatalog = createRequire(join(workspaceDir, 'package.json'));
    const likeC4VitePluginPath = requireFromCatalog.resolve('likec4/vite-plugin');
    const likeC4 = await import(/* @vite-ignore */ pathToFileURL(likeC4VitePluginPath).href);

    if (!likeC4.LikeC4VitePlugin) {
      throw new Error('The installed likec4 package does not export LikeC4VitePlugin from likec4/vite-plugin.');
    }

    return likeC4.LikeC4VitePlugin;
  } catch (error) {
    throw new Error(`${likeC4InstallMessage}\n\n${error instanceof Error ? error.message : String(error)}`);
  }
};

const likeC4ProjectRegistry = (workspaceDir: string, enabled: boolean): Plugin => {
  let discoveredProjects: string[] = [];

  const discoverProjects = async () => {
    const configFiles = await glob('**/{likec4.config.json,.likec4rc}', {
      cwd: workspaceDir,
      ignore: ['**/node_modules/**'],
      absolute: true,
    });

    const projectNames = new Set<string>();

    for (const configPath of configFiles) {
      try {
        const config = JSON.parse(readFileSync(configPath, 'utf-8')) as LikeC4Config;
        if (config.name) {
          projectNames.add(config.name);
        }
      } catch (error) {
        console.warn(`[likec4-registry] Failed to parse ${configPath}:`, error);
      }
    }

    discoveredProjects = Array.from(projectNames).sort();

    if (discoveredProjects.length > 0) {
      console.log(`[likec4-registry] Discovered projects: ${discoveredProjects.join(', ')}`);
    }
  };

  return {
    name: 'eventcatalog-likec4',

    async buildStart() {
      if (enabled) {
        await discoverProjects();
      }
    },

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },

    load(id) {
      if (id !== resolvedVirtualModuleId) {
        return;
      }

      if (!enabled) {
        return `
export const projectRegistry = {
  default: () => Promise.resolve({
    LikeC4View: () => null,
  }),
};

export const discoveredProjects = [];

export function getProjectLoader() {
  return projectRegistry.default;
}
`;
      }

      const imports = discoveredProjects
        .map((name, index) => `import * as project_${index} from ${JSON.stringify(`likec4:react/${name}`)};`)
        .join('\n');
      const registryEntries = discoveredProjects
        .map((name, index) => `  ${JSON.stringify(name)}: () => Promise.resolve(project_${index}),`)
        .join('\n');

      return `
import * as defaultProject from 'likec4:react';
${imports}

export const projectRegistry = {
  default: () => Promise.resolve(defaultProject),
${registryEntries}
};

export const discoveredProjects = ${JSON.stringify(discoveredProjects)};

export function getProjectLoader(projectName) {
  return projectRegistry[projectName] || projectRegistry.default;
}
`;
    },

    configureServer(server) {
      server.watcher.add(join(workspaceDir, '**/likec4.config.json'));
      server.watcher.on('change', async (path) => {
        if (path.endsWith('likec4.config.json')) {
          await discoverProjects();
          const module = server.moduleGraph.getModuleById(resolvedVirtualModuleId);
          if (module) {
            server.moduleGraph.invalidateModule(module);
          }
        }
      });
    },
  };
};
