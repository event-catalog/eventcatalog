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
});
