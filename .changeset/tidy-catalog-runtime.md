---
'@eventcatalog/core': minor
---

Read catalog content and customizations directly from the project without creating a `.eventcatalog-core` directory. After stopping older EventCatalog processes, the unused `.eventcatalog-core/` directory is safe to delete.

Keep `.astro/` in `.gitignore` and `.dockerignore`. `dev --force-recreate` now resets the entire `.astro/` directory, including content caches, types and runtime metadata.

Custom components share Core's React and React DOM instances, including when the project has its own React installation.
