---
'@eventcatalog/core': minor
---

feat(core): show an announcement across the top of every page with `banner` in `eventcatalog.config.js`: a message, an optional link, a colour (`info`, `warning` or `danger`) and whether visitors can dismiss it. A dismissed banner stays closed until the message changes (or its `id` does), and it's hidden in embedded pages.
