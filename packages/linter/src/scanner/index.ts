import fg from 'fast-glob';
import path from 'path';
import { ResourceType } from '../schemas';

export interface CatalogFile {
  path: string;
  relativePath: string;
  resourceType: ResourceType;
  resourceId: string;
  version?: string;
}

const RESOURCE_DIRECTORY_NAMES: Partial<Record<ResourceType, string>> = {
  dataProduct: 'data-products',
  dataStore: 'containers',
  container: 'containers',
  adr: 'adrs',
};

const RESOURCE_PATTERNS: Partial<Record<ResourceType, string[]>> = {
  domain: [
    'domains/*/index.{md,mdx}',
    'domains/*/versioned/*/index.{md,mdx}',
    'domains/*/subdomains/*/index.{md,mdx}',
    'domains/*/subdomains/*/versioned/*/index.{md,mdx}',
  ],
  system: [
    '**/systems/**/index.{md,mdx}',
    '**/systems/**/versioned/*/index.{md,mdx}',
    '!**/systems/**/agents/**',
    '!**/systems/**/services/**',
    '!**/systems/**/events/**',
    '!**/systems/**/commands/**',
    '!**/systems/**/queries/**',
    '!**/systems/**/flows/**',
    '!**/systems/**/channels/**',
    '!**/systems/**/entities/**',
    '!**/systems/**/containers/**',
    '!**/systems/**/diagrams/**',
    '!**/systems/**/data-products/**',
    '!**/systems/**/adrs/**',
    '!**/systems/**/docs/**',
  ],
  service: [
    'domains/*/services/*/index.{md,mdx}',
    'domains/*/services/*/versioned/*/index.{md,mdx}',
    'domains/*/subdomains/*/services/*/index.{md,mdx}',
    'domains/*/subdomains/*/services/*/versioned/*/index.{md,mdx}',
    '**/systems/**/services/*/index.{md,mdx}',
    '**/systems/**/services/*/versioned/*/index.{md,mdx}',
    'services/*/index.{md,mdx}',
    'services/*/versioned/*/index.{md,mdx}',
  ],
  agent: ['**/agents/*/index.{md,mdx}', '**/agents/*/versioned/*/index.{md,mdx}'],
  adr: ['**/adrs/*/index.{md,mdx}', '**/adrs/*/versioned/*/index.{md,mdx}'],
  event: ['**/events/*/index.{md,mdx}', '**/events/*/versioned/*/index.{md,mdx}'],
  command: ['**/commands/*/index.{md,mdx}', '**/commands/*/versioned/*/index.{md,mdx}'],
  query: ['**/queries/*/index.{md,mdx}', '**/queries/*/versioned/*/index.{md,mdx}'],
  channel: ['**/channels/**/index.{md,mdx}', '**/channels/**/versioned/*/index.{md,mdx}'],
  flow: ['**/flows/**/index.{md,mdx}', '**/flows/**/versioned/*/index.{md,mdx}'],
  entity: ['**/entities/*/index.{md,mdx}', '**/entities/*/versioned/*/index.{md,mdx}'],
  container: ['**/containers/**/index.{md,mdx}', '**/containers/**/versioned/*/index.{md,mdx}'],
  dataProduct: ['**/data-products/*/index.{md,mdx}', '**/data-products/*/versioned/*/index.{md,mdx}'],
  diagram: ['**/diagrams/**/index.{md,mdx}', '**/diagrams/**/versioned/*/index.{md,mdx}'],
  user: ['users/*.{md,mdx}'],
  team: ['teams/*.{md,mdx}'],
};

export const extractResourceInfo = (filePath: string, resourceType: ResourceType): { id: string; version?: string } => {
  // Normalize path separators to forward slashes for consistent parsing across platforms
  const normalizedPath = filePath.replace(/\\/g, '/');
  const relativePath = normalizedPath.split('/');

  if (resourceType === 'user' || resourceType === 'team') {
    const filename = path.basename(filePath, path.extname(filePath));
    return { id: filename };
  }

  // Find the resource type directory in the path
  const resourceTypePattern = RESOURCE_DIRECTORY_NAMES[resourceType] || `${resourceType}s`;
  const resourceTypeIndex = relativePath.findIndex((part) => part === resourceTypePattern);

  if (resourceTypeIndex === -1) {
    // Fallback to original logic if pattern not found
    const parts = relativePath.slice(1, -1);
    return { id: parts[parts.length - 1] };
  }

  // Extract parts after the resource type directory, excluding index.mdx
  const parts = relativePath.slice(resourceTypeIndex + 1, -1);

  if (parts.length === 0) {
    return { id: 'unknown' };
  }

  // Check for versioned structure: resourceId/versioned/version/index.mdx
  if (parts.length >= 3 && parts[parts.length - 2] === 'versioned') {
    const version = parts[parts.length - 1];
    const resourceId = parts.slice(0, -2).join('/');
    return { id: resourceId, version };
  }

  // Check for domain versioned structure: domains/domainId/versioned/version/index.mdx
  if (resourceType === 'domain' && parts.length >= 2) {
    const versionedIndex = parts.findIndex((part) => part === 'versioned');
    if (versionedIndex !== -1 && versionedIndex < parts.length - 1) {
      const version = parts[versionedIndex + 1];
      const resourceId = parts.slice(0, versionedIndex).join('/');
      return { id: resourceId, version };
    }
  }

  // Standard structure: resourceId/index.mdx
  if (parts.length === 1) {
    return { id: parts[0] };
  }

  // Handle subdomain structure or nested resources
  return { id: parts.join('/') };
};

export const scanCatalogFiles = async (rootDir: string): Promise<CatalogFile[]> => {
  const files: CatalogFile[] = [];

  for (const [resourceType, patterns] of Object.entries(RESOURCE_PATTERNS)) {
    const foundFiles = await fg(patterns, {
      cwd: rootDir,
      absolute: true,
      onlyFiles: true,
      followSymbolicLinks: false,
    });

    for (const filePath of foundFiles) {
      const relativePath = path.relative(rootDir, filePath);
      const { id, version } = extractResourceInfo(relativePath, resourceType as ResourceType);

      files.push({
        path: filePath,
        relativePath,
        resourceType: resourceType as ResourceType,
        resourceId: id,
        version,
      });
    }
  }

  return files;
};
