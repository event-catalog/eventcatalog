import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getRuntimePaths } from '../../eventcatalog/integrations/runtime-paths.mjs';

describe('runtime paths', () => {
  it('uses the same project-relative cache and fields database for CLI and runtime readers', () => {
    const project = path.resolve('test-catalog');
    expect(getRuntimePaths(project)).toEqual({
      projectDirectory: project,
      cacheDirectory: path.join(project, '.astro'),
      runtimeDirectory: path.join(project, '.astro/eventcatalog'),
      fieldsDatabasePath: path.join(project, '.astro/eventcatalog/.eventcatalog/fields.db'),
    });
  });

  it('honors an explicit runtime location without changing the generated project cache boundary', () => {
    const project = path.resolve('test-catalog');
    const runtime = path.resolve('selected-runtime');
    expect(getRuntimePaths(project, runtime)).toEqual({
      projectDirectory: project,
      cacheDirectory: path.join(project, '.astro'),
      runtimeDirectory: runtime,
      fieldsDatabasePath: path.join(runtime, '.eventcatalog/fields.db'),
    });
  });
});
