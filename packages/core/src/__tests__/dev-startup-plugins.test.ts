import { describe, expect, it, vi } from 'vitest';
import { resolveConfig } from 'vite';
import stableDependencyOrder from '../../eventcatalog/integrations/stable-dependency-order.mjs';
import skipStartupReload from '../../eventcatalog/integrations/skip-startup-reload.mjs';

describe('stable dependency order', () => {
  const resolveWith = (external: string[], noExternal: string[]) =>
    resolveConfig(
      {
        configFile: false,
        envDir: false,
        logLevel: 'error',
        resolve: { external, noExternal },
        ssr: { external, noExternal },
        plugins: [stableDependencyOrder()],
      },
      'serve'
    );

  it('lists externals in the same order however they were discovered', async () => {
    const first = await resolveWith(['b-package', 'a-package', 'c-package'], ['astro-seo', '@astrojs/mdx']);
    const second = await resolveWith(['c-package', 'b-package', 'a-package'], ['@astrojs/mdx', 'astro-seo']);

    for (const config of [first, second]) {
      expect(config.resolve.external).toEqual(['a-package', 'b-package', 'c-package']);
      expect(config.resolve.noExternal).toEqual(['@astrojs/mdx', 'astro-seo']);
      for (const environment of Object.values(config.environments)) {
        if (Array.isArray(environment.resolve.external))
          expect(environment.resolve.external).toEqual([...environment.resolve.external].sort());
      }
    }
  });
});

describe('skip startup reload', () => {
  const setup = () => {
    const middlewares: ((req: any, res: any, next: () => void) => void)[] = [];
    const wsSend = vi.fn();
    const hotSend = vi.fn();
    const server = {
      middlewares: { use: (fn: (typeof middlewares)[number]) => middlewares.push(fn) },
      ws: { send: wsSend },
      environments: { client: { hot: { send: hotSend } } },
    };
    (skipStartupReload() as any).configureServer(server);
    const request = (accept?: string) => middlewares.forEach((fn) => fn({ headers: { accept } }, {}, () => {}));
    return { server, wsSend, hotSend, request };
  };

  it('drops reloads sent before any page has been requested', () => {
    const { server, wsSend, hotSend } = setup();
    server.ws.send({ type: 'full-reload' });
    server.environments.client.hot.send({ type: 'full-reload', path: '*' });
    expect(wsSend).not.toHaveBeenCalled();
    expect(hotSend).not.toHaveBeenCalled();
  });

  it('keeps dropping them for requests that are not pages, like the CLI prewarm', () => {
    const { server, hotSend, request } = setup();
    request(undefined);
    request('*/*');
    server.environments.client.hot.send({ type: 'full-reload', path: '*' });
    expect(hotSend).not.toHaveBeenCalled();
  });

  it('sends reloads once a page has been requested', () => {
    const { server, hotSend, request } = setup();
    request('text/html,application/xhtml+xml');
    server.environments.client.hot.send({ type: 'full-reload', path: '*' });
    expect(hotSend).toHaveBeenCalledWith({ type: 'full-reload', path: '*' });
  });

  it('never holds back other messages', () => {
    const { server, hotSend } = setup();
    server.environments.client.hot.send({ type: 'update', updates: [] });
    server.environments.client.hot.send('astro:content-changed', {});
    expect(hotSend).toHaveBeenCalledTimes(2);
  });
});
