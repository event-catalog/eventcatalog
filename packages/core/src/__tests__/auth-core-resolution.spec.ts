import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import semver from 'semver';

const coreRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const corePackage = JSON.parse(readFileSync(path.join(coreRoot, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>;
};
const authAstroPackage = JSON.parse(readFileSync(path.join(coreRoot, '../auth-astro/package.json'), 'utf8')) as {
  name: string;
  peerDependencies: Record<string, string>;
};

describe('auth-astro @auth/core resolution', () => {
  it('depends on the patched EventCatalog auth-astro package instead of registry auth-astro', () => {
    expect(corePackage.dependencies['auth-astro']).toBeUndefined();
    expect(corePackage.dependencies['@eventcatalog/auth-astro']).toBe('workspace:*');
    expect(authAstroPackage.name).toBe('@eventcatalog/auth-astro');
    expect(authAstroPackage.peerDependencies['@auth/core']).toBe('>=0.41.3');
  });

  it('accepts patched @auth/core and rejects the vulnerable 0.37.x hoist target', () => {
    const peer = authAstroPackage.peerDependencies['@auth/core'];
    const coreRange = corePackage.dependencies['@auth/core'];

    expect(semver.satisfies('0.41.3', peer)).toBe(true);
    expect(semver.satisfies('0.41.3', coreRange)).toBe(true);
    expect(semver.satisfies('0.37.4', peer)).toBe(false);
    expect(semver.satisfies('0.37.4', coreRange)).toBe(false);
  });
});
