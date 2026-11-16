---
'@eventcatalog/core': patch
---

fix(core): search ranks exact matches first. A resource whose name or id is the query comes first, then names whose last segment is the query (so `outgoing-sms` finds `persistent://tenant/ns/outgoing-sms` before messages and dead-letter topics that mention it), and shorter names lead within a rank. Resources with `:` in their id get their own search links, so results no longer repeat or go stale while you type.
