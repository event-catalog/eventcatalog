import type { CompiledFile } from '../hooks/useDslParser';

const VERSIONED_INDEX_MD_PATH = /^(.*)\/versioned\/([^/]+)\/index\.md$/;
const ROOT_INDEX_MD_PATH = /^(.*)\/index\.md$/;
const VERSION_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});
const RESOURCE_HELP_TEXT = '*You can add any markdown in this file to help your teams get more context about this resource.*';

function toMdxPath(path: string): string {
  return path.endsWith('.md') ? `${path.slice(0, -3)}.mdx` : path;
}

function compareVersions(a: string, b: string): number {
  return VERSION_COLLATOR.compare(a, b);
}

function withResourceGuidance(path: string, content: string): string {
  if (!path.endsWith('/index.mdx')) return content;

  const hasNodeGraph = content.includes('<NodeGraph/>') || content.includes('<NodeGraph />');
  const hasGuidance = content.includes(RESOURCE_HELP_TEXT);

  let nextContent = content.trimEnd();
  if (!hasNodeGraph) {
    nextContent += '\n\n<NodeGraph/>';
  }
  if (!hasGuidance) {
    nextContent += `\n\n${RESOURCE_HELP_TEXT}`;
  }

  return `${nextContent}\n`;
}

/**
 * Compiler output writes versioned resources as ".../versioned/<version>/index.md".
 * For catalog export zip files we want CLI-like structure:
 * - latest version at ".../index.mdx"
 * - older versions under ".../versioned/<version>/index.mdx"
 * - md files converted to mdx
 */
export function normalizeCompiledCatalogFiles(compiled: CompiledFile[]): CompiledFile[] {
  const rootsByBase = new Set<string>();
  const versionedByBase = new Map<string, string[]>();

  for (const file of compiled) {
    const versionedMatch = file.path.match(VERSIONED_INDEX_MD_PATH);
    if (versionedMatch) {
      const [, basePath, version] = versionedMatch;
      const versions = versionedByBase.get(basePath);
      if (versions) {
        versions.push(version);
      } else {
        versionedByBase.set(basePath, [version]);
      }
      continue;
    }

    const rootMatch = file.path.match(ROOT_INDEX_MD_PATH);
    if (rootMatch) {
      rootsByBase.add(rootMatch[1]);
    }
  }

  const latestVersionByBase = new Map<string, string>();
  for (const [basePath, versions] of versionedByBase) {
    if (rootsByBase.has(basePath) || versions.length === 0) continue;

    let latest = versions[0];
    for (let i = 1; i < versions.length; i++) {
      if (compareVersions(versions[i], latest) > 0) {
        latest = versions[i];
      }
    }
    latestVersionByBase.set(basePath, latest);
  }

  const normalized = new Map<string, CompiledFile>();

  for (const file of compiled) {
    const versionedMatch = file.path.match(VERSIONED_INDEX_MD_PATH);
    if (versionedMatch) {
      const [, basePath, version] = versionedMatch;
      const hasRoot = rootsByBase.has(basePath);
      const latestVersion = latestVersionByBase.get(basePath);
      const path =
        !hasRoot && latestVersion === version
          ? `${basePath}/index.mdx`
          : `${basePath}/versioned/${version}/index.mdx`;
      normalized.set(path, { ...file, path, content: withResourceGuidance(path, file.content) });
      continue;
    }

    const path = toMdxPath(file.path);
    normalized.set(path, { ...file, path, content: withResourceGuidance(path, file.content) });
  }

  return Array.from(normalized.values());
}
