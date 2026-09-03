import { glob } from 'glob';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const RESOURCE_PATTERNS = {
  adrs: ['**/adrs/*/index.@(md|mdx)'],
  agents: ['**/agents/*/index.@(md|mdx)'],
  events: ['**/events/*/index.@(md|mdx)'],
  commands: ['**/commands/*/index.@(md|mdx)'],
  queries: ['**/queries/*/index.@(md|mdx)'],
  services: ['**/services/*/index.@(md|mdx)'],
  domains: ['domains/*/index.@(md|mdx)', 'domains/*/subdomains/*/index.@(md|mdx)'],
  flows: ['**/flows/*/index.@(md|mdx)'],
  channels: ['**/channels/**/index.@(md|mdx)'],
  entities: ['**/entities/*/index.@(md|mdx)'],
  containers: ['**/containers/**/index.@(md|mdx)'],
  'data-products': ['**/data-products/*/index.@(md|mdx)'],
  teams: ['teams/*.@(md|mdx)'],
  users: ['users/*.@(md|mdx)'],
  designs: ['**/*.ecstudio'],
  diagrams: ['**/diagrams/**/index.@(md|mdx)'],
  ubiquitousLanguages: ['domains/*/ubiquitous-language.@(md|mdx)', 'domains/*/subdomains/*/ubiquitous-language.@(md|mdx)'],
};

const CUSTOM_ROUTE_PATTERNS = {
  customPages: ['pages/**/*.astro'],
  customApis: ['pages/**/*.@(ts|js|mjs)'],
};

const DEFAULT_IGNORES = ['**/versioned/**', '**/dist/**', '**/node_modules/**'];
const CUSTOM_ROUTE_IGNORES = [...DEFAULT_IGNORES, 'pages/**/_*/**', 'pages/**/_*'];

/**
 * Count resources in the catalog directory using glob patterns
 * @param {string} projectDir - Path to the catalog directory
 * @returns {Promise<Record<string, number>>} - Object with resource type counts
 */
export async function countResources(projectDir) {
  const counts = {};
  for (const [type, patterns] of Object.entries({ ...RESOURCE_PATTERNS, ...CUSTOM_ROUTE_PATTERNS })) {
    let total = 0;
    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: projectDir,
        ignore: type in CUSTOM_ROUTE_PATTERNS ? CUSTOM_ROUTE_IGNORES : DEFAULT_IGNORES,
      });
      total += files.length;
    }
    counts[type] = total;
  }
  return counts;
}

/**
 * Digest of the catalog's documentation content. Resource counts only move when
 * things are added or removed; this also changes when existing docs are edited,
 * so telemetry can tell "docs changed" apart from a plain redeploy.
 * @param {string} projectDir - Path to the catalog directory
 * @returns {Promise<string>} - Short hex digest of the catalog content
 */
export async function hashCatalogContent(projectDir) {
  const hash = createHash('md5');
  const files = new Set();
  for (const pattern of Object.values(RESOURCE_PATTERNS).flat()) {
    for (const file of await glob(pattern, { cwd: projectDir, ignore: DEFAULT_IGNORES })) {
      files.add(file);
    }
  }
  for (const file of [...files].sort()) {
    try {
      hash.update(file);
      hash.update(await readFile(path.join(projectDir, file)));
    } catch {
      // unreadable file — leave it out of the digest
    }
  }
  return hash.digest('hex').slice(0, 16);
}

/**
 * Serialize resource counts to a string for telemetry
 * @param {Record<string, number>} counts - Object with resource type counts
 * @returns {string} - Serialized string like "events:26,commands:11,..."
 */
export function serializeCounts(counts) {
  return Object.entries(counts)
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
}
