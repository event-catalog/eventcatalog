---
'@eventcatalog/core': minor
---

feat(core): set the default colour mode with `colorMode` in `eventcatalog.config.js`. `default` ('dark', 'light' or 'system') is the mode a visitor sees until they use the header toggle, and `allowToggle: false` always uses it and hides the toggle. A catalog that doesn't set it opens in dark mode as before, and no longer switches to light when the visitor's system does.
