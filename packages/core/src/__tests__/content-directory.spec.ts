import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveContentDirectory } from '../content-directory';

describe('resolveContentDirectory', () => {
  it('defaults CONTENT_DIR to PROJECT_DIR', () => {
    const projectDir = path.join(__dirname, 'example-catalog');

    expect(resolveContentDirectory({ projectDir, env: {} })).toBe(projectDir);
  });

  it('resolves CONTENT_DIR from config.contentDir', () => {
    const projectDir = path.join(__dirname, 'example-catalog');
    const contentDir = path.join(__dirname, 'content-catalog');

    expect(resolveContentDirectory({ projectDir, config: { contentDir }, env: {} })).toBe(contentDir);
  });

  it('lets process.env.CONTENT_DIR override config.contentDir', () => {
    const projectDir = path.join(__dirname, 'example-catalog');
    const configContentDir = path.join(__dirname, 'content-catalog');
    const envContentDir = path.join(__dirname, 'env-content-catalog');

    expect(
      resolveContentDirectory({
        projectDir,
        config: { contentDir: configContentDir },
        env: { CONTENT_DIR: envContentDir },
      })
    ).toBe(envContentDir);
  });

  it('resolves relative config.contentDir from PROJECT_DIR', () => {
    const projectDir = path.join(__dirname, 'example-catalog');

    expect(resolveContentDirectory({ projectDir, config: { contentDir: './catalog' }, env: {} })).toBe(
      path.join(projectDir, 'catalog')
    );
  });

  it('resolves relative process.env.CONTENT_DIR from PROJECT_DIR', () => {
    const projectDir = path.join(__dirname, 'example-catalog');

    expect(resolveContentDirectory({ projectDir, env: { CONTENT_DIR: './catalog' } })).toBe(path.join(projectDir, 'catalog'));
  });
});
