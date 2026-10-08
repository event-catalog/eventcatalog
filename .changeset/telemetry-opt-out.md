---
'@eventcatalog/core': minor
'@eventcatalog/create-eventcatalog': minor
---

Anonymous telemetry stays on by default and can be turned off. Set `EVENTCATALOG_TELEMETRY_DISABLED` or `DO_NOT_TRACK` to `1` or `true`, or set `telemetry: false` in `eventcatalog.config.js`. When telemetry is off, EventCatalog skips collecting and hashing catalog content and does not send the build or create event. Telemetry requests time out after 2 seconds so a slow analytics host cannot stall `eventcatalog dev`, `eventcatalog build`, or `create-eventcatalog`.
