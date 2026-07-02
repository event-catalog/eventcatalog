---
"@eventcatalog/core": patch
---

Fix dev watcher incorrectly matching generated files when IGNORE_BUILD_ARTIFACTS is set. Build-artifact exclusions are now skipped in dev mode, since Astro's watcher uses picomatch against the pattern array where negated patterns caused unrelated generated files to match.
