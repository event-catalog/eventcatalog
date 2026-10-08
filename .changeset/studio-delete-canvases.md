---
'@eventcatalog/core': patch
---

feat(core): delete Studio canvases (from the canvas menu or each canvas's menu on the Studio page, after asking; anyone who has the canvas open is told and it can't come back), make a copy of a canvas (its design, as a new draft), the Studio API (`/api/studio/canvases`: list, create, get, copy and delete canvases, in JSON, behind sign-in when it's on), and a catalog-wide `storage` setting replacing `studio.storage`: one SQLite database for every feature that keeps state (`.eventcatalog/eventcatalog.db` by default), brought up to date by versioned SQL migrations as `eventcatalog dev` and `eventcatalog start` start. Canvases kept with `studio.storage` aren't moved to it
