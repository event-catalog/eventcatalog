import path from 'node:path';

// Shared by the CLI, Astro integrations, development scripts and runtime readers.
// Callers pass CATALOG_DIR explicitly when consuming the CLI's selected runtime;
// the CLI itself always selects the cache under its user's project.
export function getRuntimePaths(projectDirectory, runtimeDirectory) {
  const project = path.resolve(projectDirectory);
  const cacheDirectory = path.join(project, '.astro');
  const runtime = runtimeDirectory ? path.resolve(runtimeDirectory) : path.join(cacheDirectory, 'eventcatalog');
  return {
    projectDirectory: project,
    cacheDirectory,
    runtimeDirectory: runtime,
    fieldsDatabasePath: path.join(runtime, '.eventcatalog', 'fields.db'),
  };
}
