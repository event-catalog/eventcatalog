import type { Plugin } from 'vite';
import { glob } from 'glob';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

interface LikeC4Config {
  name: string;
}

/**
 * Vite plugin that auto-discovers LikeC4 projects and generates a registry
 * Scans for likec4.config.json files and creates static imports for each project
 */
export function likeC4ProjectRegistry(workspaceDir: string): Plugin {
  const virtualModuleId = 'virtual:likec4-projects';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  let discoveredProjects: string[] = [];

  return {
    name: 'likec4-project-registry',

    async buildStart() {
      // Find all likec4.config.json files
      const configFiles = await glob('**/likec4.config.json', {
        cwd: workspaceDir,
        ignore: ['**/node_modules/**'],
        absolute: true,
      });

      discoveredProjects = [];

      for (const configPath of configFiles) {
        try {
          const content = readFileSync(configPath, 'utf-8');
          const config: LikeC4Config = JSON.parse(content);
          if (config.name) {
            discoveredProjects.push(config.name);
          }
        } catch (e) {
          console.warn(`[likec4-registry] Failed to parse ${configPath}:`, e);
        }
      }

      if (discoveredProjects.length > 0) {
        console.log(`[likec4-registry] Discovered projects: ${discoveredProjects.join(', ')}`);
      }
    },

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },

    load(id) {
      if (id === resolvedVirtualModuleId) {
        // Generate the registry module with static imports
        const imports = discoveredProjects.map((name, i) => `import * as project_${i} from 'likec4:react/${name}';`).join('\n');

        const registryEntries = discoveredProjects
          .map((name, i) => `  '${name}': () => Promise.resolve(project_${i}),`)
          .join('\n');

        return `
// Auto-generated LikeC4 project registry
// Discovered ${discoveredProjects.length} project(s)

${imports}
import * as defaultProject from 'likec4:react';

export const projectRegistry = {
  'default': () => Promise.resolve(defaultProject),
${registryEntries}
};

export const discoveredProjects = ${JSON.stringify(discoveredProjects)};

export function getProjectLoader(projectName) {
  return projectRegistry[projectName] || projectRegistry['default'];
}
`;
      }
    },

    // Watch for changes to likec4.config.json files
    configureServer(server) {
      server.watcher.add(join(workspaceDir, '**/likec4.config.json'));
    },
  };
}
