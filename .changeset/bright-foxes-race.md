---
"@eventcatalog/core": patch
---

Build reverse index for producer/consumer resolution in collection getters, replacing O(N*M) linear scan with O(1) map lookups per message. Also optimize channel lookups with a pre-built channel map.
