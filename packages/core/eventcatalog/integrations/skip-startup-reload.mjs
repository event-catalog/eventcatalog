// Astro writes its content data store as the dev server starts, which sends the browser a
// full reload. With no browser connected yet, Vite holds that reload and hands it to the
// first page that connects, so the first page opened after every start loaded twice.
// A reload sent before any page has been served has nothing to refresh (a tab left open
// from the previous run reloads itself when it reconnects), so drop those. Once a page has
// been requested, reloads pass through as usual.

const isFullReload = (payload) => typeof payload === 'object' && payload?.type === 'full-reload';

export default function skipStartupReload() {
  return {
    name: 'eventcatalog:skip-startup-reload',
    apply: 'serve',
    configureServer(server) {
      let pageRequested = false;
      server.middlewares.use((req, _res, next) => {
        // Browser navigations ask for HTML; the CLI's prewarm request doesn't
        if (!pageRequested && req.headers.accept?.includes('text/html')) pageRequested = true;
        next();
      });

      for (const channel of new Set([server.ws, server.environments?.client?.hot].filter(Boolean))) {
        const send = channel.send.bind(channel);
        channel.send = (...args) => {
          if (!pageRequested && isFullReload(args[0])) return;
          return send(...args);
        };
      }
    },
  };
}
