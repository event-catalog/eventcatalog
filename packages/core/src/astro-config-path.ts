import path from 'node:path';

/** Astro's CLI resolves --config relative to its project root, including on Windows. */
export const getAstroConfigPath = (projectDirectory: string, configFile: string, paths = path) => {
  const relative = paths.relative(projectDirectory, configFile);
  const projectRoot = paths.parse(paths.resolve(projectDirectory)).root.toLowerCase();
  const configRoot = paths.parse(paths.resolve(configFile)).root.toLowerCase();
  if (projectRoot !== configRoot || paths.isAbsolute(relative)) {
    throw new Error(
      'EventCatalog cannot load its Astro configuration across filesystem drives. Install or link @eventcatalog/core on the same drive as the catalog.'
    );
  }
  return relative.replace(/\\/g, '/');
};
