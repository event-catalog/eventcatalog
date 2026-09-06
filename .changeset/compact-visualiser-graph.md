---
'@eventcatalog/core': patch
---

Stop prerendering Field Usage pages for messages with no field-level lineage. The sidebar already hid those links; static builds still emitted a full HTML page per event/command/query. On a synthetic catalog of 640 events this removes 640 pages and tens of megabytes of HTML. Also compact NodeGraph island props so docs/visualiser pages no longer embed markdown bodies or hydrated producer/consumer trees.
