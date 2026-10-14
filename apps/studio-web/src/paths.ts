/**
 * Where the built view is (dist/): beside this folder, whether it's run from source (src/) or bundled (build/).
 */
import path from 'node:path';

export const DIST_DIRECTORY = path.join(import.meta.dirname, '../dist');
