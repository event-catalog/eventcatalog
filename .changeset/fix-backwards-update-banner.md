---
"@eventcatalog/core": patch
---

Only show the EventCatalog update banner when a newer published version exists. Compare the running `@eventcatalog/core` version, not the catalog dependency range, so a range like `^4.10.0` still reports a real update. A stale check no longer suggests downgrading (for example 4.11.0 → 4.10.10).
