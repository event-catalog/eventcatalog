---
'@eventcatalog/core': patch
---

Fix DomainGrid command and query links in domain/system architecture views. SSR (and system pages) now hydrate service sends/receives so links use `/docs/commands|queries|events/...` and the resource name, instead of defaulting missing collections to events.
