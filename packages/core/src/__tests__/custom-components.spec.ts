import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { catalogToAstro } from '../catalog-to-astro-content-directory';
import { isCustomComponentPath } from '../custom-components';

describe('custom component synchronization', () => {
  let projectDirectory: string;
  let catalogDirectory: string;
  let destinationDirectory: string;

  const writeProjectFile = async (relativePath: string, content: string) => {
    const filePath = path.join(projectDirectory, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    return filePath;
  };

  beforeEach(async () => {
    projectDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-components-project-'));
    catalogDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'eventcatalog-components-core-'));
    destinationDirectory = path.join(catalogDirectory, 'src', 'custom-defined-components');

    await fs.mkdir(path.join(catalogDirectory, 'src'), { recursive: true });
    await writeProjectFile('package.json', JSON.stringify({ type: 'module' }));
    await writeProjectFile('eventcatalog.config.js', "export default { cId: 'component-test' };\n");
  });

  afterEach(async () => {
    await fs.rm(projectDirectory, { recursive: true, force: true });
    await fs.rm(catalogDirectory, { recursive: true, force: true });
  });

  it('combines federated components, applies local precedence, and removes stale output during catalog preparation', async () => {
    await writeProjectFile('federated/components/remote-only.astro', 'remote only');
    await writeProjectFile('federated/components/shared/card.astro', 'remote card');
    await writeProjectFile('federated/components/shared/remote-helper.ts', 'export const remoteHelper = true;');
    await writeProjectFile('federated/components/replaced-by-directory', 'remote file');
    await writeProjectFile('federated/components/nested/helper.ts', 'export const helper = true;');
    await writeProjectFile('components/local-only.mdx', '# Local only');
    await writeProjectFile('components/shared/card.astro', 'local card');
    await writeProjectFile('components/replaced-by-directory/index.astro', 'local directory');
    await fs.mkdir(destinationDirectory, { recursive: true });
    await fs.writeFile(path.join(destinationDirectory, 'stale.astro'), 'stale');

    await catalogToAstro(projectDirectory, catalogDirectory);

    await expect(fs.readFile(path.join(destinationDirectory, 'remote-only.astro'), 'utf8')).resolves.toBe('remote only');
    await expect(fs.readFile(path.join(destinationDirectory, 'local-only.mdx'), 'utf8')).resolves.toBe('# Local only');
    await expect(fs.readFile(path.join(destinationDirectory, 'shared', 'card.astro'), 'utf8')).resolves.toBe('local card');
    await expect(fs.readFile(path.join(destinationDirectory, 'shared', 'remote-helper.ts'), 'utf8')).resolves.toBe(
      'export const remoteHelper = true;'
    );
    await expect(fs.readFile(path.join(destinationDirectory, 'replaced-by-directory', 'index.astro'), 'utf8')).resolves.toBe(
      'local directory'
    );
    await expect(fs.readFile(path.join(destinationDirectory, 'nested', 'helper.ts'), 'utf8')).resolves.toBe(
      'export const helper = true;'
    );
    await expect(fs.access(path.join(destinationDirectory, 'stale.astro'))).rejects.toThrow();
  });

  it('removes components that disappear before the next catalog preparation', async () => {
    const componentPath = await writeProjectFile('federated/components/temporary.astro', 'temporary');
    await catalogToAstro(projectDirectory, catalogDirectory);
    await fs.rm(componentPath);

    await catalogToAstro(projectDirectory, catalogDirectory);

    await expect(fs.access(path.join(destinationDirectory, 'temporary.astro'))).rejects.toThrow();
  });

  it('recognizes only the local and hydrated shared component directories', () => {
    expect(isCustomComponentPath(projectDirectory, path.join(projectDirectory, 'components', 'card.astro'))).toBe(true);
    expect(isCustomComponentPath(projectDirectory, path.join(projectDirectory, 'federated', 'components', 'card.astro'))).toBe(
      true
    );
    expect(
      isCustomComponentPath(projectDirectory, path.join(projectDirectory, 'federated', 'source', 'components', 'card.astro'))
    ).toBe(false);
    expect(isCustomComponentPath(projectDirectory, path.join(projectDirectory, 'services', 'components', 'card.astro'))).toBe(
      false
    );
  });
});
