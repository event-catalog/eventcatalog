---
"@eventcatalog/core": patch
---

Federation now restores the previous output when a run fails part way through. The federated resources directory, managed public assets, and `eventcatalog.lock` are snapshotted before the update and rolled back if hydration, public asset composition, or lock writing throws, so a failed federate no longer leaves the catalog in a half-written state.
