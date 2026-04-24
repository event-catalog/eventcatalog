---
"@eventcatalog/core": patch
---

Watcher now ignores transient `.lock` sidecar files and tolerates files that vanish between the event firing and the stat call, preventing ENOENT crashes during SDK atomic writes.
