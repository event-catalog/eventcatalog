---
'@eventcatalog/core': minor
---

feat(core): `eventcatalog build` now writes an architecture reference, `architecture.html`, to the build output: the whole catalog as one self-contained HTML file to share, attach or host. Every domain, system, service, message, channel, data store, flow, entity and team gets its own section, linked to what it relates to, with message attributes from your schemas, example payloads, TypeScript types and your specifications. It's on by default; turn it off with `exports: { html: { enabled: false } }` in `eventcatalog.config.js`. Server catalogs with auth enabled skip it unless they set `enabled: true`, because build output is served without auth.
