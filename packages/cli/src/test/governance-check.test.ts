import { expect, it, describe, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

// Mock @eventcatalog/license
vi.mock('@eventcatalog/license', () => ({
  isEventCatalogScaleEnabled: vi.fn(),
}));

// Mock @eventcatalog/sdk
vi.mock('@eventcatalog/sdk', () => ({
  default: vi.fn(),
}));

import { governanceCheck } from '../cli/governance';
import { isEventCatalogScaleEnabled } from '@eventcatalog/license';
import createSDK from '@eventcatalog/sdk';

const TEMP_DIR = path.join(__dirname, 'governance-check-temp');

beforeEach(() => {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  vi.mocked(isEventCatalogScaleEnabled).mockResolvedValue(true);
});

afterEach(() => {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('governance check', () => {
  it('throws when Scale plan is not enabled', async () => {
    vi.mocked(isEventCatalogScaleEnabled).mockResolvedValue(false);

    await expect(governanceCheck({ dir: TEMP_DIR })).rejects.toThrow('Governance requires an EventCatalog Scale plan');
  });

  it('returns message when no governance.yaml exists', async () => {
    // Need to mock git archive - init a git repo
    try {
      execSync('git init', { cwd: TEMP_DIR, stdio: 'pipe' });
      execSync('git checkout -b main', { cwd: TEMP_DIR, stdio: 'pipe' });
      fs.writeFileSync(path.join(TEMP_DIR, 'dummy.txt'), 'hello');
      execSync('git add . && git commit -m "init"', { cwd: TEMP_DIR, stdio: 'pipe' });
    } catch {
      // Skip if git not available
      return;
    }

    // Mock SDK to return empty resources
    const mockSnapshot = {
      snapshotVersion: '1.0.0',
      catalogVersion: 'unknown',
      label: 'test',
      createdAt: new Date().toISOString(),
      resources: {
        domains: [],
        services: [],
        messages: { events: [], commands: [], queries: [] },
        channels: [],
      },
    };

    const mockCreateSnapshot = vi.fn().mockResolvedValue({
      filePath: '/tmp/test.snapshot.json',
      snapshot: mockSnapshot,
    });

    const mockDiffSnapshots = vi.fn().mockResolvedValue({
      snapshotA: { label: 'base', createdAt: '' },
      snapshotB: { label: 'current', createdAt: '' },
      summary: {
        totalChanges: 0,
        resourcesAdded: 0,
        resourcesRemoved: 0,
        resourcesModified: 0,
        resourcesVersioned: 0,
        relationshipsAdded: 0,
        relationshipsRemoved: 0,
      },
      resources: [],
      relationships: [],
    });

    vi.mocked(createSDK).mockReturnValue({
      createSnapshot: mockCreateSnapshot,
      diffSnapshots: mockDiffSnapshots,
    } as any);

    const result = await governanceCheck({ dir: TEMP_DIR });

    expect(result).toContain('No governance.yaml (or governance.yml) found or no rules defined');
  });

  it('when governanceCheck finds a schema change, the json output includes schema content plus compact schema metadata for the affected message', async () => {
    try {
      execSync('git init', { cwd: TEMP_DIR, stdio: 'pipe' });
      execSync('git checkout -b main', { cwd: TEMP_DIR, stdio: 'pipe' });
      fs.writeFileSync(
        path.join(TEMP_DIR, 'governance.yaml'),
        `rules:
  - name: notify-schema-change
    when:
      - schema_changed
    resources:
      - "*"
    actions:
      - type: console
`
      );
      fs.writeFileSync(path.join(TEMP_DIR, 'dummy.txt'), 'hello');
      execSync('git add .', { cwd: TEMP_DIR, stdio: 'pipe' });
      execSync('git commit -m "init"', { cwd: TEMP_DIR, stdio: 'pipe' });
    } catch {
      return;
    }

    const writeSchemaFiles = (dir: string, schemaContent: string) => {
      const resourceDir = path.join(dir, 'events', 'OrderCreated');
      fs.mkdirSync(resourceDir, { recursive: true });
      fs.writeFileSync(
        path.join(resourceDir, 'index.mdx'),
        '---\nid: OrderCreated\nversion: 1.0.0\nname: OrderCreated\nschemaPath: schema.json\n---\n'
      );
      fs.writeFileSync(path.join(resourceDir, 'schema.json'), schemaContent);
    };

    const baseSnapshot = {
      snapshotVersion: '1.0.0',
      catalogVersion: 'unknown',
      label: 'base-main',
      createdAt: new Date().toISOString(),
      resources: {
        domains: [],
        services: [],
        messages: {
          events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated' }],
          commands: [],
          queries: [],
        },
        channels: [],
      },
    };

    const targetSnapshot = {
      snapshotVersion: '1.0.0',
      catalogVersion: 'unknown',
      label: 'current',
      createdAt: new Date().toISOString(),
      resources: {
        domains: [],
        services: [{ id: 'BillingService', version: '1.0.0', name: 'BillingService', receives: [{ id: 'OrderCreated' }] }],
        messages: {
          events: [{ id: 'OrderCreated', version: '1.0.0', name: 'OrderCreated' }],
          commands: [],
          queries: [],
        },
        channels: [],
      },
    };

    const mockDiffSnapshots = vi.fn().mockResolvedValue({
      snapshotA: { label: 'base-main', createdAt: '' },
      snapshotB: { label: 'current', createdAt: '' },
      summary: {
        totalChanges: 1,
        resourcesAdded: 0,
        resourcesRemoved: 0,
        resourcesModified: 1,
        resourcesVersioned: 0,
        relationshipsAdded: 0,
        relationshipsRemoved: 0,
      },
      resources: [
        {
          resourceId: 'OrderCreated',
          version: '1.0.0',
          type: 'event',
          changeType: 'modified',
          changedFields: ['schemaHash'],
        },
      ],
      relationships: [],
    });

    vi.mocked(createSDK).mockImplementation((dir: string) => {
      const isTargetDir = dir === TEMP_DIR;
      writeSchemaFiles(dir, isTargetDir ? '{"after":"schema"}' : '{"before":"schema"}');

      return {
        createSnapshot: vi.fn().mockResolvedValue({
          filePath: path.join(dir, '.snapshots', `${isTargetDir ? 'target' : 'base'}.snapshot.json`),
          snapshot: isTargetDir ? targetSnapshot : baseSnapshot,
        }),
        diffSnapshots: mockDiffSnapshots,
        getSchemaForMessage: vi.fn().mockResolvedValue({
          schema: isTargetDir ? '{"after":"schema"}' : '{"before":"schema"}',
          fileName: 'schema.json',
        }),
      } as any;
    });

    const result = await governanceCheck({ dir: TEMP_DIR, format: 'json' });
    const parsed = JSON.parse(result);

    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].trigger).toBe('schema_changed');
    expect(parsed.results[0].schemaChanges).toHaveLength(1);
    expect(parsed.results[0].schemaChanges[0].before).toBe('{"before":"schema"}');
    expect(parsed.results[0].schemaChanges[0].after).toBe('{"after":"schema"}');
    expect(parsed.results[0].schemaChanges[0].beforeSchemaPath).toBe('schema.json');
    expect(parsed.results[0].schemaChanges[0].afterSchemaPath).toBe('schema.json');
    expect(parsed.results[0].schemaChanges[0].beforeSchemaHash).toHaveLength(64);
    expect(parsed.results[0].schemaChanges[0].afterSchemaHash).toHaveLength(64);
    expect(parsed.results[0].schemaChanges[0].consumerServices).toEqual([{ id: 'BillingService', version: '1.0.0' }]);
  });
});
