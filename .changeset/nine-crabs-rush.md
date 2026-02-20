---
'@eventcatalog/core': minor
---

Fix NodeGraph version-specific channel routing and add semver/x-pattern version matching support

**Bug Fix:**
- Fixed NodeGraph visualisation incorrectly routing all event versions to the same channel instead of their version-specific channels when a service sends multiple versions of the same event to different channels

**New Features:**
- Services can now use semver range patterns (^1.0.0, ~1.2.0) and x-patterns (1.x, 1.2.x) in their `sends` and `receives` configurations, and these will correctly resolve in the graph visualiser