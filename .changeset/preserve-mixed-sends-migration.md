---
"@eventcatalog/core": patch
---

fix(core): preserve non-channel sends (e.g. queries) during message-channels-to-service-channels migration. The migration previously rebuilt the `sends`/`receives` arrays from only the subset of entries matching messages with legacy `channels:` frontmatter, silently dropping any other entries (queries, or messages without channels) on disk during dev/build.
