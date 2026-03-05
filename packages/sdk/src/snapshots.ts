import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type { CatalogSnapshot, SnapshotOptions, SnapshotResult, SnapshotMeta, SnapshotDiff } from './snapshot-types';
import utils from './index';
import { computeResourceDiff, computeRelationshipDiff } from './snapshot-diff';

const SNAPSHOT_VERSION = '1.0.0';

const getEventCatalogVersion = (catalogDir: string): string => {
  try {
    const packageJson = fs.readFileSync(path.join(catalogDir, 'package.json'), 'utf8');
    const packageJsonObject = JSON.parse(packageJson);
    return packageJsonObject['dependencies']?.['@eventcatalog/core'] ?? 'unknown';
  } catch {
    return 'unknown';
  }
};

const pickCoreFields = (resource: any): any => {
  const picked: any = { id: resource.id, version: resource.version, name: resource.name };
  if (resource.sends) picked.sends = resource.sends;
  if (resource.receives) picked.receives = resource.receives;
  if (resource.deprecated) picked.deprecated = resource.deprecated;
  if (resource.owners) picked.owners = resource.owners;
  return picked;
};

const compareSemver = (a: string, b: string): number => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
};

const deduplicateByLatestVersion = (resources: any[]): any[] => {
  const seen = new Map<string, any>();
  for (const r of resources) {
    const existing = seen.get(r.id);
    if (!existing || compareSemver(r.version, existing.version) > 0) {
      seen.set(r.id, r);
    }
  }
  return Array.from(seen.values());
};

const stripToCore = (resources: any[] | undefined): any[] => {
  if (!resources || resources.length === 0) return [];
  return deduplicateByLatestVersion(resources).map(pickCoreFields);
};

const detectGitInfo = (catalogDir: string): { branch: string; commit: string; dirty: boolean } | undefined => {
  try {
    const opts = { cwd: catalogDir, encoding: 'utf8' as const, stdio: 'pipe' as const };
    const branch = execSync('git rev-parse --abbrev-ref HEAD', opts).trim();
    const commit = execSync('git rev-parse --short HEAD', opts).trim();
    const status = execSync('git status --porcelain', opts).trim();
    return { branch, commit, dirty: status.length > 0 };
  } catch {
    return undefined;
  }
};

export const createSnapshot = (directory: string) => {
  // Note: sdk is created lazily inside the inner function to avoid circular
  // dependency issues (index.ts imports snapshots.ts and vice versa).
  return async (options?: SnapshotOptions): Promise<SnapshotResult> => {
    const { label, outputDir, git } = options || {};
    const sdk = utils(directory);

    // Fetch all resources in parallel
    const [domains, services, events, commands, queries, channels] = await Promise.all([
      sdk.getDomains(),
      sdk.getServices(),
      sdk.getEvents(),
      sdk.getCommands(),
      sdk.getQueries(),
      sdk.getChannels(),
    ]);

    // Strip to core fields only (id, version, name, sends, receives, deprecated)
    const snapshotDomains = stripToCore(domains);
    const snapshotServices = stripToCore(services);
    const snapshotEvents = stripToCore(events);
    const snapshotCommands = stripToCore(commands);
    const snapshotQueries = stripToCore(queries);
    const snapshotChannels = stripToCore(channels);

    const snapshotLabel = label || new Date().toISOString().replace(/[:.]/g, '-');
    const gitInfo = git || detectGitInfo(directory);

    const snapshot: CatalogSnapshot = {
      snapshotVersion: SNAPSHOT_VERSION,
      catalogVersion: getEventCatalogVersion(directory),
      label: snapshotLabel,
      createdAt: new Date().toISOString(),
      ...(gitInfo ? { git: gitInfo } : {}),
      resources: {
        domains: snapshotDomains,
        services: snapshotServices,
        messages: {
          events: snapshotEvents,
          commands: snapshotCommands,
          queries: snapshotQueries,
        },
        channels: snapshotChannels,
      },
    };

    // Write to disk
    const snapshotsDir = outputDir || path.join(directory, '.snapshots');
    fs.mkdirSync(snapshotsDir, { recursive: true });
    const fileName = `${snapshotLabel}.snapshot.json`;
    const filePath = path.join(snapshotsDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(snapshot));

    return { filePath, snapshot };
  };
};

export const diffSnapshots =
  (directory: string) =>
  async (snapshotAPath: string, snapshotBPath: string): Promise<SnapshotDiff> => {
    const snapshotA: CatalogSnapshot = JSON.parse(fs.readFileSync(snapshotAPath, 'utf-8'));
    const snapshotB: CatalogSnapshot = JSON.parse(fs.readFileSync(snapshotBPath, 'utf-8'));

    const resourceChanges = computeResourceDiff(snapshotA, snapshotB);
    const relationshipChanges = computeRelationshipDiff(snapshotA, snapshotB);

    const resourceCounts = { added: 0, removed: 0, modified: 0, versioned: 0 };
    for (const r of resourceChanges) resourceCounts[r.changeType]++;
    const relCounts = { added: 0, removed: 0 };
    for (const r of relationshipChanges) relCounts[r.changeType]++;

    return {
      snapshotA: { label: snapshotA.label, createdAt: snapshotA.createdAt },
      snapshotB: { label: snapshotB.label, createdAt: snapshotB.createdAt },
      summary: {
        totalChanges: resourceChanges.length + relationshipChanges.length,
        resourcesAdded: resourceCounts.added,
        resourcesRemoved: resourceCounts.removed,
        resourcesModified: resourceCounts.modified,
        resourcesVersioned: resourceCounts.versioned,
        relationshipsAdded: relCounts.added,
        relationshipsRemoved: relCounts.removed,
      },
      resources: resourceChanges,
      relationships: relationshipChanges,
    };
  };

export const listSnapshots = (directory: string) => async (): Promise<SnapshotMeta[]> => {
  const snapshotsDir = path.join(directory, '.snapshots');
  if (!fs.existsSync(snapshotsDir)) return [];

  const files = fs.readdirSync(snapshotsDir).filter((f) => f.endsWith('.snapshot.json'));
  const snapshots: SnapshotMeta[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(snapshotsDir, file);
      const content: CatalogSnapshot = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      snapshots.push({
        label: content.label,
        createdAt: content.createdAt,
        filePath,
        ...(content.git ? { git: content.git } : {}),
      });
    } catch {
      // skip invalid files
    }
  }

  return snapshots.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
};
