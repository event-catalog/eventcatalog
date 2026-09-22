import watcher from '@parcel/watcher';

// Globs always use forward slashes, even on Windows. Interpolating raw
// backslash paths into the ignore glob crashes `dev` on startup:
// @parcel/watcher compiles the glob with std::regex, which rejects escape
// sequences like `\x...` with regex_error(error_escape).
const toPosixPath = (p) => p.replace(/\\/g, '/');

/**
 * @typedef {Object} Event
 * @property {string} path
 * @property {"create"|"update"|"delete"} type
 *
 * @typedef {(err: Error | null, events: Event[]) => unknown} SubscribeCallback
 */

/**
 *
 * @param {string} projectDirectory
 * @param {string} catalogDirectory
 * @param {SubscribeCallback|undefined} callback
 */
export async function watch(projectDirectory, catalogDirectory, callback = () => {}) {
  const subscription = await watcher.subscribe(projectDirectory, callback, {
    ignore: [`**/${toPosixPath(catalogDirectory)}/!(${toPosixPath(projectDirectory)})**`],
  });

  return () => subscription.unsubscribe();
}
