---
"@eventcatalog/core": patch
---

Federation diagnostics are now configurable per rule. Set `federation.rules` in `eventcatalog.config.js` to `off`, `warn`, or `error` for any `federation/*` rule, and add a new `federation/unresolved-version` warning when a resource references a version that does not exist. Remote references are resolved against resources owned by the central catalog before diagnostics are applied, and warning counts remain visible when errors coexist.
