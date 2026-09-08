# `@eventcatalog/auth-astro`

Vendored [auth-astro@4.2.0](https://github.com/nowaythatworked/auth-astro) (MIT) for EventCatalog.

Upstream still declares `@auth/core@^0.37.3`. npm treats that range as unsatisfied by `@auth/core@0.41.x`, so catalogs that depend on `@eventcatalog/core` install a second, vulnerable `@auth/core@0.37.4` for the `auth-astro` path ([GHSA-7rqj-j65f-68wh](https://github.com/advisories/GHSA-7rqj-j65f-68wh)).

`overrides` in a published package are ignored by npm (root `package.json` only). There is no maintained upstream release that accepts `@auth/core@>=0.41.3`.

**Only functional change:** `peerDependencies["@auth/core"]` is `>=0.41.3`. EventCatalog already runs this combination.

Do not switch core back to registry `auth-astro` until upstream or official `@auth/astro` ships a compatible peer range.
