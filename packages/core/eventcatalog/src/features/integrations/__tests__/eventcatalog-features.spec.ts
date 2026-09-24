import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

vi.mock('../../../utils/eventcatalog-config/source', () => ({ default: {} }));
vi.mock('../../../utils/feature', () => ({
  isEventCatalogChatEnabled: () => true,
  isAuthEnabled: () => true,
  isEventCatalogMCPEnabled: () => true,
  isEventCatalogMCPAuthEnabled: () => true,
  isFullCatalogAPIEnabled: () => true,
  isDevMode: () => true,
  isSSR: () => true,
}));

describe('feature routes with a separate runtime directory', () => {
  let runtimeDirectory: string;
  let projectDirectory: string;

  beforeEach(() => {
    runtimeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-runtime-routes-'));
    projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'eventcatalog-project-routes-'));
    vi.stubEnv('CATALOG_DIR', runtimeDirectory);
    vi.stubEnv('PROJECT_DIR', projectDirectory);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(runtimeDirectory, { recursive: true, force: true });
    fs.rmSync(projectDirectory, { recursive: true, force: true });
  });

  it('loads built-in routes and middleware from the installed package', async () => {
    const { default: integration } = await import('../eventcatalog-features');
    const injectRoute = vi.fn();
    const addMiddleware = vi.fn();
    const addWatchFile = vi.fn();

    await (integration().hooks['astro:config:setup'] as Function)({
      command: 'build',
      injectRoute,
      addMiddleware,
      addWatchFile,
    });

    const packageDirectory = fileURLToPath(new URL('../../../../', import.meta.url));
    expect(injectRoute.mock.calls.length).toBeGreaterThan(10);
    for (const [route] of injectRoute.mock.calls) {
      expect(route.entrypoint.startsWith(path.join(packageDirectory, 'src', 'features') + path.sep)).toBe(true);
      expect(fs.existsSync(route.entrypoint)).toBe(true);
    }
    expect(addMiddleware).toHaveBeenCalledWith({
      entrypoint: path.join(packageDirectory, 'src/features/auth/middleware/middleware.ts'),
      order: 'pre',
    });
    expect(addWatchFile.mock.calls[0][0].startsWith(runtimeDirectory + path.sep)).toBe(true);
  });

  it('loads pages directly from the project and writes only the route manifest into the cache', async () => {
    const pagesDirectory = path.join(projectDirectory, 'pages');
    fs.mkdirSync(pagesDirectory, { recursive: true });
    const customPage = path.join(pagesDirectory, 'team.astro');
    fs.writeFileSync(customPage, '<h1>Team</h1>');

    const { default: integration } = await import('../eventcatalog-features');
    const injectRoute = vi.fn();
    const addWatchFile = vi.fn();
    await (integration().hooks['astro:config:setup'] as Function)({
      command: 'build',
      injectRoute,
      addMiddleware: vi.fn(),
      addWatchFile,
    });

    expect(injectRoute).toHaveBeenCalledWith({ pattern: '/custom/team', entrypoint: customPage });
    const manifest = addWatchFile.mock.calls[0][0];
    expect(manifest).toBe(path.join(runtimeDirectory, 'custom-pages.json'));
    expect(JSON.parse(fs.readFileSync(manifest, 'utf-8'))).toEqual(['team.astro']);
    expect(fs.readdirSync(pagesDirectory)).toEqual(['team.astro']);
  });

  it('watches original pages and refreshes the manifest when routes are added or deleted', async () => {
    const { default: integration } = await import('../eventcatalog-features');
    const handlers = new Map<string, (file: string) => void>();
    const watcher = {
      on: vi.fn((event: string, callback: (file: string) => void) => handlers.set(event, callback)),
      add: vi.fn(),
    };
    await (integration().hooks['astro:server:setup'] as Function)({ server: { watcher } });

    const pagesDirectory = path.join(projectDirectory, 'pages');
    expect(watcher.add).toHaveBeenCalledWith(pagesDirectory);

    fs.mkdirSync(pagesDirectory);
    const customPage = path.join(pagesDirectory, 'team.astro');
    const manifest = path.join(runtimeDirectory, 'custom-pages.json');
    fs.writeFileSync(customPage, '<h1>Team</h1>');
    handlers.get('add')!(customPage);
    expect(JSON.parse(fs.readFileSync(manifest, 'utf-8'))).toEqual(['team.astro']);

    fs.unlinkSync(customPage);
    handlers.get('unlink')!(customPage);
    expect(JSON.parse(fs.readFileSync(manifest, 'utf-8'))).toEqual([]);
  });
});
