---
sidebar_position: 6
keywords:
- EventCatalog Studio
- production
- deployment
sidebar_label: Run Studio in production
title: Run Studio in production
description: Turn on Studio for a deployed catalog.
---

Studio is on when you run `eventcatalog dev`. To use it in a deployed catalog, run your catalog in [server mode](/docs/development/deployment/build-ssr-mode) and turn Studio on. Studio isn't available in a static build.

1. In `eventcatalog.config.js`, set `output` to `'server'` and `studio.enabled` to `true`:

   ```js title="eventcatalog.config.js"
   export default {
     output: 'server',
     studio: {
       enabled: true,
     },
   };
   ```

2. [Set up persistent storage](/docs/development/studio/set-up-persistent-storage). Without it, canvases are lost when the server restarts.

3. Build your catalog and serve it with `eventcatalog start`:

   ```bash
   npx eventcatalog build
   npx eventcatalog start
   ```

## Behind a proxy or load balancer

- **Forward WebSocket connections.** Live collaboration uses a WebSocket on the same port as your catalog.
- **Trust your HTTPS host.** If your proxy serves the catalog over HTTPS, add your host to `security.allowedDomains`. Otherwise forms such as **New canvas** fail the origin check.

  ```js title="eventcatalog.config.js"
  export default {
    output: 'server',
    security: {
      allowedDomains: [{ hostname: 'catalog.example.com', protocol: 'https' }],
    },
  };
  ```

## Only let signed-in people in

Turn on [authentication](/docs/development/authentication/introduction). Only signed-in people can then open canvases.

## Turn Studio off

Set `studio.enabled` to `false`. This turns Studio off everywhere, including in `eventcatalog dev`.
