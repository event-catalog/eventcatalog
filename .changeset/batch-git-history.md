---
'@eventcatalog/core': patch
---

Speed up RSS feed builds by reading the latest commit for every file from one `git log` walk instead of starting a process per file.
