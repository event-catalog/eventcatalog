export function createRuntimeDependencyManifest(specifiers) {
  const manifest = Object.create(null);
  const filenames = new Map();
  for (const specifier of [...new Set(specifiers)].sort()) {
    // These characters have filesystem/URL meaning even without slash encoding.
    if (/[\\%?#:]/.test(specifier)) throw new Error(`Unsupported runtime dependency specifier: ${specifier}`);
    const filename = `${specifier.replaceAll('/', '__')}.mjs`;
    const key = filename.toLowerCase();
    const existing = filenames.get(key);
    if (existing) throw new Error(`Runtime dependency filename collision: ${existing} and ${specifier} both map to ${filename}`);
    filenames.set(key, specifier);
    manifest[specifier] = filename;
  }
  return manifest;
}
