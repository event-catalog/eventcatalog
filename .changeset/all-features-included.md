---
'@eventcatalog/core': major
'@eventcatalog/cli': minor
'@eventcatalog/create-eventcatalog': patch
---

Every feature is now included in EventCatalog, with no plan or license key needed. Custom documentation, resource docs, custom pages, custom styles, the schema API and `schemas.txt`, Fields Explorer lineage, schema diffs, schema and directory sources, private remote files, analytics integrations, embedding, federation, the assistant, the MCP server, authentication and governance checks all work without `EVENTCATALOG_SCALE_LICENSE_KEY`, a Starter or Scale plan, or a Backstage license key. The assistant, MCP server and authentication still need server output (`output: 'server'`) and their configuration files.

Breaking changes:

- The billing settings page (`/settings/billing`) and the upgrade prompts are removed.
- The EventCatalog branding (the Discord and GitHub links in the header and the footer) is always shown. `EVENTCATALOG_SHOW_BRANDING` is no longer used.
- `EVENTCATALOG_STARTER`, `EVENTCATALOG_SCALE` and `ENABLE_EMBED` are no longer passed to the Astro runtime, and the plan helpers (`isEventCatalogStarterEnabled`, `isEventCatalogScaleEnabled` and the features gated on them) are removed from `@utils/feature`.
- `@eventcatalog/core` and `@eventcatalog/cli` no longer depend on `@eventcatalog/license`.
- Custom pages are served for every catalog, so a `pages/api` directory now requires `output: 'server'`: static builds fail with a message instead of skipping the routes.
- The header shows the `repositoryUrl` link next to the EventCatalog links when it's set, rather than in place of them.
