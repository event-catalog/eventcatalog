---
'@eventcatalog/core': minor
---

feat(core): show when things were last updated, from git. Turn it on with `lastUpdated: { enabled: true }`:

- Resource pages show "Last updated on 10 Nov 2026": the newest commit to the resource's page, schema, specifications or changelog.
- Specification pages (OpenAPI, AsyncAPI, GraphQL and generic) and the Schemas & APIs explorer show when each schema or specification file last changed (for a schema from a registry, when the registry says it changed).
- The homepage lists what changed recently, beside the architecture graph: resources, message schemas and specifications, each on its own.

Nothing is shown when git can't tell (no git, no repository, or a shallow clone, where every file looks just updated), and the build warns once saying why. The homepage's recently updated list now needs this option: it used to show whenever the architecture graph was off.
