import { readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { register } from 'node:module';

export async function cleanup(projectDirectory) {
  const filePath = path.join(projectDirectory, 'eventcatalog.config.mjs');
  if (existsSync(filePath)) {
    await rm(filePath);
  }
}

let hidesConfigModuleTypeWarning = false;
let loads = 0;

/**
 * Node loads an eventcatalog.config.js that uses import/export as an ES module even when the catalog's
 * package.json has no "type": "module" (a new catalog's doesn't), and warns that it had to detect it.
 * That warning, for the config file only, is hidden: the catalog doesn't need to change anything.
 */
const hideConfigModuleTypeWarning = () => {
  if (hidesConfigModuleTypeWarning) return;
  hidesConfigModuleTypeWarning = true;

  const emitWarning = process.emitWarning;
  process.emitWarning = function (warning, ...args) {
    const code = typeof args[0] === 'object' ? args[0]?.code : args[1];
    const message = typeof warning === 'string' ? warning : warning?.message;
    if (code === 'MODULE_TYPELESS_PACKAGE_JSON' && message?.includes('eventcatalog.config.js')) return;
    return emitWarning.call(this, warning, ...args);
  };
};

// Marks a config URL Node should load as an ES module, whatever the catalog's package.json says
const AS_MODULE_QUERY = 'eventcatalog-config-as-module';
let loadsMarkedConfigsAsModules = false;

/**
 * Node won't load a config written with import/export in a catalog whose package.json has
 * "type": "commonjs". A loader hook loads that config file (and only it) as an ES module.
 */
const loadMarkedConfigsAsModules = () => {
  if (loadsMarkedConfigsAsModules) return;
  loadsMarkedConfigsAsModules = true;
  const hook = `export async function load(url, context, nextLoad) {
    return nextLoad(url, url.includes('${AS_MODULE_QUERY}=') ? { ...context, format: 'module' } : context);
  }`;
  register(`data:text/javascript,${encodeURIComponent(hook)}`);
};

/**
 * Loads the catalog's eventcatalog.config.js from where it is, so paths it builds from its own location
 * (`import.meta.url`, `import.meta.dirname`) and its relative imports point into the catalog. It was
 * loaded from a copy in a temporary folder before, which broke them (e.g. the paths to a generator's specs).
 */
const isCommonJSPackage = async (projectDirectory) => {
  try {
    const packageJson = JSON.parse(await readFile(path.join(projectDirectory, 'package.json'), 'utf-8'));
    return packageJson?.type === 'commonjs';
  } catch {
    return false;
  }
};

export const getEventCatalogConfigFile = async (projectDirectory) => {
  try {
    hideConfigModuleTypeWarning();
    // A catalog's config is an ES module, as it always was (with "type": "commonjs" it was loaded from an .mjs copy)
    const asModule = await isCommonJSPackage(projectDirectory);
    if (asModule) loadMarkedConfigsAsModules();

    const configFileURL = pathToFileURL(path.join(projectDirectory, 'eventcatalog.config.js')).href;
    // A new URL each time, so a changed config is loaded again (not `?t=`: Vite drops it as its own timestamp)
    const query = `${asModule ? AS_MODULE_QUERY : 'loaded'}=${Date.now()}-${loads++}`;
    const config = await import(/* @vite-ignore */ `${configFileURL}?${query}`);

    return config.default;
  } finally {
    // Earlier versions loaded a copy from eventcatalog.config.mjs in the catalog: remove one left behind
    await cleanup(projectDirectory);
  }
};
