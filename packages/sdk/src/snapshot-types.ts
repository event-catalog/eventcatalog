export type SnapshotGitInfo = {
  branch: string;
  commit: string;
  dirty: boolean;
};

export type SnapshotResources = {
  domains: Record<string, any>[];
  services: Record<string, any>[];
  messages: {
    events: Record<string, any>[];
    commands: Record<string, any>[];
    queries: Record<string, any>[];
  };
  channels: Record<string, any>[];
};

export type CatalogSnapshot = {
  snapshotVersion: string;
  catalogVersion: string;
  label: string;
  createdAt: string;
  git?: SnapshotGitInfo;
  resources: SnapshotResources;
};

export type SnapshotOptions = {
  label?: string;
  outputDir?: string;
  git?: SnapshotGitInfo;
};

export type SnapshotResult = {
  filePath: string;
  snapshot: CatalogSnapshot;
};

export type SnapshotMeta = {
  label: string;
  createdAt: string;
  filePath: string;
  git?: SnapshotGitInfo;
};

export type SnapshotResourceType = 'event' | 'command' | 'query' | 'service' | 'domain' | 'channel';
export type ResourceChangeType = 'added' | 'removed' | 'modified' | 'versioned';

export type ResourceChange = {
  resourceId: string;
  version: string;
  type: SnapshotResourceType;
  changeType: ResourceChangeType;
  changedFields?: string[];
  previousVersion?: string;
  newVersion?: string;
};

export type RelationshipChange = {
  serviceId: string;
  serviceVersion: string;
  resourceId: string;
  resourceVersion?: string;
  direction: 'sends' | 'receives';
  changeType: 'added' | 'removed';
};

export type DiffSummary = {
  totalChanges: number;
  resourcesAdded: number;
  resourcesRemoved: number;
  resourcesModified: number;
  resourcesVersioned: number;
  relationshipsAdded: number;
  relationshipsRemoved: number;
};

export type SnapshotDiff = {
  snapshotA: { label: string; createdAt: string };
  snapshotB: { label: string; createdAt: string };
  summary: DiffSummary;
  resources: ResourceChange[];
  relationships: RelationshipChange[];
};
