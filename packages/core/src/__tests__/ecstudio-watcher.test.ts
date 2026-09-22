import { afterEach, describe, expect, it, vi } from 'vitest';
import ecstudioWatcher from '../../eventcatalog/integrations/ecstudio-watcher.mjs';

afterEach(() => vi.unstubAllEnvs());

describe('Studio design watcher', () => {
  it('watches the catalog when Vite resolves dependencies from the installed package', async () => {
    vi.stubEnv('PROJECT_DIR', '/catalog');
    const handlers = new Map<string, (file: string) => Promise<void>>();
    const watcher = {
      on: vi.fn((event: string, callback: (file: string) => Promise<void>) => {
        handlers.set(event, callback);
        return watcher;
      }),
      add: vi.fn(),
    };
    const refreshContent = vi.fn();
    ecstudioWatcher().hooks['astro:server:setup']({
      server: { config: { mode: 'development', root: '/installed/core/eventcatalog' }, watcher },
      refreshContent,
    });

    expect(watcher.add).toHaveBeenCalledWith('/catalog');
    await handlers.get('change')!('/catalog/designs/ordering.ecstudio');
    expect(refreshContent).toHaveBeenCalledOnce();

    await handlers.get('change')!('/catalog/public/generated/designs/ordering.ecstudio');
    expect(refreshContent).toHaveBeenCalledOnce();
  });
});
