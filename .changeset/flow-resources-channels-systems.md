---
"@eventcatalog/core": patch
---

fix(core): a flow's Resources page lists the systems and channels its steps point at

Steps that point at a `channel`, or a `system` (or `systems`), were left off the flow's Resources page, and a flow whose steps only pointed at those had no Resources page. They're now listed, under Systems and Channels, with a pointer without a version meaning the latest.
