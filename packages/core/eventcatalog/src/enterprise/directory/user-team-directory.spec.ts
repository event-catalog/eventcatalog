import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const localLoad = vi.fn();
const isEventCatalogScaleEnabled = vi.fn();
const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);

vi.mock('astro/loaders', () => ({
  glob: vi.fn(() => ({
    name: 'mock-glob-loader',
    load: localLoad,
  })),
}));

vi.mock('../feature', () => ({
  isEventCatalogScaleEnabled: () => isEventCatalogScaleEnabled(),
}));

import { userTeamDirectoryLoader } from './user-team-directory';

const createContentStore = () => {
  const entries = new Map<string, unknown>();

  return {
    has: (id: string) => entries.has(id),
    set: (entry: { id: string; [key: string]: unknown }) => entries.set(entry.id, entry),
    get: (id: string) => entries.get(id),
    clear: () => entries.clear(),
  };
};

const createContext = () => ({
  store: createContentStore(),
  meta: new Map<string, string>(),
  parseData: vi.fn(async ({ data }) => data),
  renderMarkdown: vi.fn(async (markdown) => ({
    html: `<p>${markdown}</p>`,
    metadata: {
      headings: [],
      localImagePaths: [],
      remoteImagePaths: [],
      frontmatter: {},
      imagePaths: [],
    },
  })),
  generateDigest: vi.fn((data) => JSON.stringify(data)),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
});

describe('userTeamDirectoryLoader', () => {
  beforeEach(() => {
    localLoad.mockReset();
    isEventCatalogScaleEnabled.mockReset();
    isEventCatalogScaleEnabled.mockReturnValue(false);
    consoleLog.mockClear();
  });

  it('loads local users without requiring EventCatalog Scale when no directory sources are configured', async () => {
    const context = createContext();
    const loader = userTeamDirectoryLoader({
      collection: 'users',
      local: {
        pattern: 'users/*.(md|mdx)',
        base: '/catalog',
      },
    });

    await loader.load(context as never);

    expect(localLoad).toHaveBeenCalledWith(context);
    expect(isEventCatalogScaleEnabled).not.toHaveBeenCalled();
  });

  it('requires EventCatalog Scale when directory sources are configured', async () => {
    const context = createContext();
    const loader = userTeamDirectoryLoader({
      collection: 'users',
      local: {
        pattern: 'users/*.(md|mdx)',
        base: '/catalog',
      },
      storePath: false,
      sources: [
        {
          type: 'directory',
          name: 'test-source',
          loadUsers: async () => [],
        },
      ],
    });

    await expect(loader.load(context as never)).rejects.toThrow('Directory sources require EventCatalog Scale.');
  });

  it('loads users from configured directory sources', async () => {
    isEventCatalogScaleEnabled.mockReturnValue(true);
    const context = createContext();
    const loader = userTeamDirectoryLoader({
      collection: 'users',
      local: {
        pattern: 'users/*.(md|mdx)',
        base: '/catalog',
      },
      storePath: false,
      sources: [
        {
          type: 'directory',
          name: 'test-source',
          loadUsers: async () => [
            {
              id: 'jane',
              name: 'Jane Doe',
              avatarUrl: 'https://example.com/jane.png',
              markdown: '# Jane',
              source: {
                provider: 'github',
                url: 'https://github.com/jane',
              },
            },
          ],
        },
      ],
    });

    await loader.load(context as never);

    expect(context.parseData).toHaveBeenCalledWith({
      id: 'jane',
      data: {
        id: 'jane',
        name: 'Jane Doe',
        avatarUrl: 'https://example.com/jane.png',
        source: {
          provider: 'github',
          url: 'https://github.com/jane',
        },
        readOnly: true,
      },
    });
    expect(context.store.get('jane')).toEqual({
      id: 'jane',
      data: {
        id: 'jane',
        name: 'Jane Doe',
        avatarUrl: 'https://example.com/jane.png',
        source: {
          provider: 'github',
          url: 'https://github.com/jane',
        },
        readOnly: true,
      },
      body: '# Jane',
      rendered: {
        html: '<p># Jane</p>',
        metadata: {
          headings: [],
          localImagePaths: [],
          remoteImagePaths: [],
          frontmatter: {},
          imagePaths: [],
        },
      },
      digest: JSON.stringify({
        id: 'jane',
        name: 'Jane Doe',
        avatarUrl: 'https://example.com/jane.png',
        source: {
          provider: 'github',
          url: 'https://github.com/jane',
        },
        readOnly: true,
        body: '# Jane',
      }),
    });
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Loading users from directory source "test-source"'));
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Synced 1 users from directory source "test-source"'));
  });

  it('keeps local entries when the conflict strategy is local-wins', async () => {
    isEventCatalogScaleEnabled.mockReturnValue(true);
    const context = createContext();
    context.store.set({
      id: 'jane',
      data: {
        id: 'jane',
        name: 'Local Jane',
      },
    });
    const loader = userTeamDirectoryLoader({
      collection: 'users',
      local: {
        pattern: 'users/*.(md|mdx)',
        base: '/catalog',
      },
      storePath: false,
      sources: [
        {
          type: 'directory',
          name: 'test-source',
          loadUsers: async () => [
            {
              id: 'jane',
              name: 'Source Jane',
              avatarUrl: 'https://example.com/jane.png',
            },
          ],
        },
      ],
    });

    await loader.load(context as never);

    expect(context.store.get('jane')).toEqual({
      id: 'jane',
      data: {
        id: 'jane',
        name: 'Local Jane',
      },
    });
    expect(consoleLog).toHaveBeenCalledWith(
      expect.stringContaining('Synced 0 users from directory source "test-source" (1 skipped due to local conflicts)')
    );
  });

  it('throws when the conflict strategy is error and a source returns a local id', async () => {
    isEventCatalogScaleEnabled.mockReturnValue(true);
    const context = createContext();
    context.store.set({
      id: 'jane',
      data: {
        id: 'jane',
        name: 'Local Jane',
      },
    });
    const loader = userTeamDirectoryLoader({
      collection: 'users',
      local: {
        pattern: 'users/*.(md|mdx)',
        base: '/catalog',
      },
      conflictStrategy: 'error',
      storePath: false,
      sources: [
        {
          type: 'directory',
          name: 'test-source',
          loadUsers: async () => [
            {
              id: 'jane',
              name: 'Source Jane',
              avatarUrl: 'https://example.com/jane.png',
            },
          ],
        },
      ],
    });

    await expect(loader.load(context as never)).rejects.toThrow(
      'Directory source "test-source" returned duplicate users id "jane".'
    );
  });

  it('uses cached source entries on subsequent loads', async () => {
    isEventCatalogScaleEnabled.mockReturnValue(true);
    const context = createContext();
    const loadUsers = vi.fn(async () => [
      {
        id: 'jane',
        name: 'Jane Doe',
        avatarUrl: 'https://example.com/jane.png',
      },
    ]);
    const loader = userTeamDirectoryLoader({
      collection: 'users',
      local: {
        pattern: 'users/*.(md|mdx)',
        base: '/catalog',
      },
      storePath: false,
      sources: [
        {
          type: 'directory',
          name: 'test-source',
          cacheKey: 'test-cache',
          loadUsers,
        },
      ],
    });

    await loader.load(context as never);
    context.store.clear();
    await loader.load(context as never);

    expect(loadUsers).toHaveBeenCalledTimes(1);
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining('Using cached users from directory source "test-source"'));
  });

  it('writes synced source entries to the EventCatalog directory store', async () => {
    isEventCatalogScaleEnabled.mockReturnValue(true);
    const context = createContext();
    const tempDir = await mkdtemp(path.join(tmpdir(), 'eventcatalog-directory-store-'));
    const storePath = path.join(tempDir, '.eventcatalog', 'store', 'directory.json');
    const loader = userTeamDirectoryLoader({
      collection: 'teams',
      local: {
        pattern: 'teams/*.(md|mdx)',
        base: tempDir,
      },
      storePath,
      sources: [
        {
          type: 'directory',
          name: 'github:event-catalog',
          loadTeams: async () => [
            {
              id: 'core-maintainers',
              name: 'Core Maintainers',
              markdown: '# Core Maintainers',
              source: {
                provider: 'github',
                url: 'https://github.com/orgs/event-catalog/teams/core-maintainers',
              },
            },
          ],
        },
      ],
    });

    try {
      await loader.load(context as never);

      const store = JSON.parse(await readFile(storePath, 'utf8'));
      expect(store).toMatchObject({
        version: '1',
        resources: {
          users: [],
          teams: [
            {
              id: 'core-maintainers',
              name: 'Core Maintainers',
              markdown: '# Core Maintainers',
              readOnly: true,
              source: {
                provider: 'github',
                url: 'https://github.com/orgs/event-catalog/teams/core-maintainers',
              },
            },
          ],
        },
      });
      expect(store.generatedAt).toEqual(expect.any(String));
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('clears an existing directory store collection when sources are removed', async () => {
    const context = createContext();
    const tempDir = await mkdtemp(path.join(tmpdir(), 'eventcatalog-directory-store-'));
    const storePath = path.join(tempDir, '.eventcatalog', 'store', 'directory.json');
    const loader = userTeamDirectoryLoader({
      collection: 'users',
      local: {
        pattern: 'users/*.(md|mdx)',
        base: tempDir,
      },
      storePath,
    });

    try {
      await mkdir(path.dirname(storePath), { recursive: true });
      await writeFile(
        storePath,
        JSON.stringify({
          version: '1',
          generatedAt: '2026-05-27T00:00:00.000Z',
          resources: {
            users: [
              {
                id: 'stale-user',
                name: 'Stale User',
                markdown: 'Stale directory user',
                readOnly: true,
                source: {
                  provider: 'github',
                },
              },
            ],
            teams: [
              {
                id: 'existing-team',
                name: 'Existing Team',
                markdown: 'Existing directory team',
                readOnly: true,
                source: {
                  provider: 'github',
                },
              },
            ],
          },
        })
      );

      await loader.load(context as never);

      const store = JSON.parse(await readFile(storePath, 'utf8'));
      expect(store.resources.users).toEqual([]);
      expect(store.resources.teams).toEqual([
        {
          id: 'existing-team',
          name: 'Existing Team',
          markdown: 'Existing directory team',
          readOnly: true,
          source: {
            provider: 'github',
          },
        },
      ]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
