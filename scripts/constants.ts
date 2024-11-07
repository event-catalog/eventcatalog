import { readFileSync } from 'fs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)).toString());
export const VERSION = version;
