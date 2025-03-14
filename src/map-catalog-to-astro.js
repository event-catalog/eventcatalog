import path from 'node:path';

const COLLECTION_KEYS = [
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

  if (!isCatalogRelated(relativeFilePath)) {
    return [];
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
      'public', // public assets
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
    // This is a workaround to differentiate between a file and a directory.
    // Of course this is not the best solution. But how differentiate? `fs.stats`
    // could be used, but sometimes the filePath references a deleted file/directory
    // which causes an error when using `fs.stats`.
    const hasExtension = (str) => /\.[a-zA-Z0-9]{2,}$/.test(str);

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

  const relativePath = [];
  for (let i = filePathArr.length - 1; i >= 0; i--) {
    relativePath.unshift(filePathArr[i]);
    if (isCollectionKey(filePathArr[i])) break;
  }

  return path.join(...relativePath);
}
