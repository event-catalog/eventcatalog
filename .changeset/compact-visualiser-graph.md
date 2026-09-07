---
'@eventcatalog/core': patch
---

Stop prerendering Field Usage pages for messages with no field-level lineage. The sidebar already hid those links; static builds still emitted a full HTML page per event/command/query. On a synthetic catalog of 8 domains / 64 services / 640 events this removed 640 pages and cut total HTML from 199.45 MB to 163.58 MB (−18%, −35.9 MB). Also compact NodeGraph island props so docs/visualiser pages no longer embed markdown bodies or hydrated producer/consumer trees.
