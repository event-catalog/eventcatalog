import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe('Astro config source', () => {
  it.each(['commonjs', 'module', undefined])('loads ESM configuration from a catalog with package type %s', (type) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-config-source-'));
    directories.push(directory);
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ type }));
    const dependencyDirectory = path.join(directory, 'node_modules/config-dependency');
    fs.mkdirSync(dependencyDirectory, { recursive: true });
    fs.writeFileSync(path.join(dependencyDirectory, 'package.json'), JSON.stringify({ type: 'module', exports: './index.js' }));
    fs.writeFileSync(path.join(dependencyDirectory, 'index.js'), "export default 'Config dependency';");
    fs.writeFileSync(
      path.join(directory, 'eventcatalog.config.js'),
      "import title from 'config-dependency'; export default { title };"
    );

    // Use Node directly so Vite's config alias and module transforms cannot mask
    // CommonJS package boundaries during Astro's initial config evaluation.
    const sourceUrl = pathToFileURL(path.resolve(__dirname, '../../eventcatalog/src/utils/eventcatalog-config/source.ts'));
    const result = execFileSync(
      process.execPath,
      [
        '--experimental-strip-types',
        '--input-type=module',
        '-e',
        `import config from ${JSON.stringify(sourceUrl.href)}; console.log(JSON.stringify(config));`,
      ],
      { env: { ...process.env, PROJECT_DIR: directory }, encoding: 'utf8' }
    );

    expect(JSON.parse(result)).toEqual({ title: 'Config dependency' });
    expect(fs.existsSync(path.join(directory, 'eventcatalog.config.mjs'))).toBe(false);
    expect(fs.readdirSync(path.join(directory, 'node_modules'))).toEqual(['config-dependency']);
  });
});
