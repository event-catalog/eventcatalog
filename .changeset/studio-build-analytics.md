---
"@eventcatalog/core": patch
---

feat(core): include Studio in build analytics

Build analytics now say where Studio is on (`off`, `dev` or `server`) and how EventCatalog stores state (`memory` or `sqlite`). With SQLite storage, they also count Studio's canvases, how many changed in the last 7 and 30 days, and how many were deleted (counts only, never canvas names or contents). `eventcatalog start` now sends the same event, so a catalog running in production is counted too. Telemetry can still be turned off with `EVENTCATALOG_TELEMETRY_DISABLED=1`, `DO_NOT_TRACK=1` or `telemetry: false`.
