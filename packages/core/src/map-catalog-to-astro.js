import path from 'node:path';

// Code files in the top-level `pages/` directory become routes in the Astro app
// (custom pages). Everything else in `pages/` keeps the collection behaviour.
const CUSTOM_PAGE_EXTENSIONS = ['.astro', '.ts', '.js', '.mjs'];

const COLLECTION_KEYS = [
  'agents',
  'events',
  'commands',
  'services',
  'domains',
  'flows',
  'pages',
  'changelogs',
  'queries',
  'channels',
  'ubiquitousLanguages',
  'dependencies',
];

/**
 * @typedef {Object} MapCatalogToAstroParams
 * @prop {string} filePath The catalog file path
 * @prop {string} astroDir The astro directory
 * @prop {string} projectDir The user's project directory
 */

/**
 *
 * @param {MapCatalogToAstroParams} params
 * @returns {string[]} The astro file paths
 */
export function mapCatalogToAstro({ filePath, astroDir, projectDir }) {
  const relativeFilePath = removeBasePath(filePath, projectDir);

  if (isLikeC4Source(relativeFilePath)) {
    return [];
  }

  if (!isCatalogRelated(relativeFilePath)) {
    return [];
  }

  const customPageTargetPaths = getCustomPageTargetPaths(relativeFilePath, astroDir);
  if (customPageTargetPaths) {
    return customPageTargetPaths;
  }

  const baseTargetPaths = getBaseTargetPaths(relativeFilePath);
  const relativeTargetPath = getRelativeTargetPath(relativeFilePath);

  return baseTargetPaths.map((base) => path.join(astroDir, base, relativeTargetPath));
}

/**
 *
 * @param {string} fullPath
 * @param {string} basePath
 * @returns {string} The fullPath without the basePath
 */
function removeBasePath(fullPath, basePath) {
  const relativePath = path.relative(basePath, fullPath);
  return relativePath.startsWith('..') ? fullPath : relativePath;
}

/**
 * Check if the key is an ASTRO COLLECTION KEY
 * @param {string} key
 * @returns {boolean}
 */
function isCollectionKey(key) {
  return COLLECTION_KEYS.includes(key);
}

function isLikeC4Source(filePath) {
  return filePath.endsWith('.c4') || filePath.endsWith('.likec4');
}

// This is a workaround to differentiate between a file and a directory.
// Of course this is not the best solution. But how differentiate? `fs.stats`
// could be used, but sometimes the filePath references a deleted file/directory
// which causes an error when using `fs.stats`.
const hasExtension = (str) => /\.[a-zA-Z0-9]{2,}$/.test(str);

/**
 * Maps files in the user's top-level `pages/` directory.
 * Code files (.astro/.ts/.js/.mjs) become custom pages (routes) in the Astro app,
 * they must never land in `public/` where their source would be served.
 * @param {string} filePath - The file path without the projectDir prefix.
 * @param {string} astroDir - The astro directory.
 * @returns {string[]|null} Target paths, or null when the path is not a top-level pages path.
 */
function getCustomPageTargetPaths(filePath, astroDir) {
  const filePathArr = filePath.split(path.sep).filter(Boolean);

  if (filePathArr[0] !== 'pages') {
    return null;
  }

  const customPagePath = path.join(astroDir, 'src', 'custom-pages', ...filePathArr.slice(1));

  if (CUSTOM_PAGE_EXTENSIONS.includes(path.extname(filePath).toLowerCase())) {
    return [customPagePath];
  }

  // Directories map to both targets so watcher deletes clean up both copies
  if (!hasExtension(filePath)) {
    return [customPagePath, path.join(astroDir, 'public', 'generated', ...filePathArr)];
  }

  // Other assets keep the existing public/generated behaviour
  return [path.join(astroDir, 'public', 'generated', ...filePathArr)];
}

/**
 * Checks whether the given path is a configuration file, styles file, public asset file or collection file.
 * @param {string} filePath - The file path without the projectDir prefix.
 * @returns {boolean}
 */
function isCatalogRelated(filePath) {
  const filePathArr = filePath.split(path.sep).filter(Boolean);

  if (
    [
      'eventcatalog.config.js', // config file at root
      'eventcatalog.styles.css', // custom styles file at root
      'components', // custom components
      'snippets', // custom snippets
      'public', // public assets
      '.env', // env file
      ...COLLECTION_KEYS,
    ].includes(filePathArr[0])
  ) {
    return true;
  }

  return false;
}

/**
 * Generates the base target path accordingly to the file path.
 * @param {string} filePath The path to the file without PROJECT_DIR prefix.
 * @returns {Array.<'src/content'|'public/generated'|'src/catalog-files'|'/'>} The base target path.
 */
function getBaseTargetPaths(filePath) {
  const filePathArr = filePath.split(path.sep).filter(Boolean);

  // Collection
  if (isCollectionKey(filePathArr[0])) {
    // Assets files
    if (hasExtension(filePath)) {
      return [path.join('public', 'generated')];
    }

    /**
     * @parcel/watcher throttle and coalesce events for performance reasons.
     *
     * Consider the following:
     *    The user deletes a large `services/` dir from eventcatalog.
     *    The @parcel/watcher could emit only one delete event of the
     *    `services/` directory.
     *
     * In this situation we need delete all files from
     * - `public/generated/services/`
     * - `src/catalog-files/services/`
     * - `src/content/services/`
     *
     * TODO: What happens if services contains commands/events inside of it??? How handle this?
     */
    // Directories
    return [path.join('public', 'generated')];
  }

  // Custom components
  if (filePathArr[0] == 'components') {
    return [path.join('src', 'custom-defined-components')];
  }

  // Custom snippets
  if (filePathArr[0] == 'snippets') {
    return [path.join('src')];
  }

  // Public assets (public/*)
  if (filePathArr[0] == 'public') {
    return [path.join('public')];
  }

  /**
   * Config files:
   * - eventcatalog.config.js
   * - eventcatalog.styles.css
   */
  return [path.join('/')];
}

/**
 * Generates the path until the ASTRO_COLLECTION_KEY or the PROJECT_DIR root.
 * @param {string} filePath The path to the file.
 * @returns {string} The path until the COLLECTION_KEY or PROJECT_DIR root.
 */
function getRelativeTargetPath(filePath) {
  const filePathArr = filePath.split(path.sep).filter(Boolean);

  if (filePathArr[0] == 'public' || filePathArr[0] == 'components') {
    filePathArr.shift();
  }

  if (filePathArr[0] == 'snippets') {
    return path.join('snippets', ...filePathArr.slice(1));
  }

  const relativePath = [];
  for (let i = filePathArr.length - 1; i >= 0; i--) {
    relativePath.unshift(filePathArr[i]);
    if (isCollectionKey(filePathArr[i]) && filePathArr[i] != 'snippets') break;
  }

  return path.join(...relativePath);
}
