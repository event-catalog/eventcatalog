---
'@eventcatalog/core': patch
---

feat(core): check for a commercial license first, then fall back to Scale and Starter license keys

A commercial license now warns 30 days before it expires (up from 14): a yellow box in the terminal, a "License · N days left" badge in the dev header, and a callout on Settings > License. An expired license gets its own "EventCatalog License Expired" box in `eventcatalog dev` and `eventcatalog build`, a "License expired" badge in the dev header, and a red callout on the license page. Both link to eventcatalog.cloud to renew (a "Renew license" button on Settings > License), and the dev header badge opens Settings > License.
