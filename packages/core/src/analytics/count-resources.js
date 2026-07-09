import { glob } from 'glob';

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
 * Serialize resource counts to a string for telemetry
 * @param {Record<string, number>} counts - Object with resource type counts
 * @returns {string} - Serialized string like "events:26,commands:11,..."
 */
export function serializeCounts(counts) {
  return Object.entries(counts)
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
}
