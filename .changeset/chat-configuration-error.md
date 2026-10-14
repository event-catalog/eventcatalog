---
'@eventcatalog/core': patch
---

fix(core): when `eventcatalog.chat.js` fails to load, the assistant explains how to fix it instead of showing a raw JSON error. In `eventcatalog dev` it shows why the file didn't load (e.g. a missing package) and the steps to fix it; elsewhere it points readers to the catalog owner.
