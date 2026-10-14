---
"@eventcatalog/core": patch
---

fix(core): show the trial or a commercial license, not both, and ask legacy key customers for a license.jwt

- A catalog is on the trial or has a commercial license: with an expired license, Settings > License and the terminal show the license and how to renew it, without the trial (as the dev header does).
- A Scale or Starter plan using a legacy license key (from before EventCatalog 5) is asked to contact us for a license.jwt.
