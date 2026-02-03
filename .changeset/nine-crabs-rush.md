---
'@eventcatalog/core': minor
---

Fix NodeGraph version-specific channel routing and add semver/x-pattern version matching support

**Bug Fix:**
- Fixed NodeGraph visualisation incorrectly routing all event versions to the same channel instead of their version-specific channels when a service sends multiple versions of the same event to different channels

**New Features:**
- When Services use semver range patterns (^1.0.0, ~1.2.0) and x-patterns (1.x, 1.2.x) in their `sends` and `receives` configurations, these now correctly display in the graph viewer
- NodeGraphs now show all matching versions when using pattern-based version references. For example, a service configured with `^1.0.0` will display connections to all compatible event versions (1.0.0, 1.2.3, 1.9.9, etc.) in the visualisation
