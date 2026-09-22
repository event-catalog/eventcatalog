import { describe, expect, it } from 'vitest';
import { createRuntimeDependencyManifest } from '../../eventcatalog/integrations/runtime-dependency-manifest.mjs';

describe('runtime dependency filenames', () => {
  it('uses readable deterministic filenames for roots, subpaths and scopes', () => {
    expect(createRuntimeDependencyManifest(['react/jsx-runtime', 'react', '@headlessui/react', 'react'])).toEqual({
      '@headlessui/react': '@headlessui__react.mjs',
      react: 'react.mjs',
      'react/jsx-runtime': 'react__jsx-runtime.mjs',
    });
  });

  it('rejects ambiguous slash flattening before emitting facades', () => {
    expect(() => createRuntimeDependencyManifest(['react/jsx-runtime', 'react__jsx-runtime'])).toThrow('filename collision');
  });

  it('also rejects collisions on case-insensitive filesystems', () => {
    expect(() => createRuntimeDependencyManifest(['example/Foo', 'example/foo'])).toThrow('filename collision');
  });

  it.each(['example/file?raw', 'example/file#part', 'example/%2F', 'example\\file'])(
    'rejects unsafe filename characters in %s',
    (specifier) => {
      expect(() => createRuntimeDependencyManifest([specifier])).toThrow('Unsupported runtime dependency specifier');
    }
  );
});
