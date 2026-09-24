---
'@eventcatalog/core': minor
---

`eventcatalog dev` and `eventcatalog build` show the catalog's license in the terminal. With a valid `license.jwt` in the root of the catalog (or at `EC_LICENSE`), verified offline, they show who it's licensed to and when it expires, and the dev header drops the trial badge, only showing "License · N days left" once fewer than 14 days remain. Without one, they show how many days are left of the 90-day trial. An expired or invalid `license.jwt` is reported with the trial status.

A new Settings > License page shows the catalog's license (who it's licensed to and when it expires, or that it has expired or can't be verified) or its trial, with a link to the license FAQ.

Build telemetry now includes whether the catalog uses a commercial license or the trial (`license`, `licenseState`) and when each expires (`licenseExpiry`, `trialExpiry`).
