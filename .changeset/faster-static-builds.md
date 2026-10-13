---
'@eventcatalog/core': patch
---

Build static catalogs faster: reuse graph layouts across a message's pages, highlight schemas without working out the theme again for every token, and check links with a streaming HTML parser. A catalog with 640 events builds about 25% faster, with the same pages.
