---
'@eventcatalog/core': patch
'@eventcatalog/sdk': patch
'@eventcatalog/visualiser': patch
---

Add support for `container` and `dataProduct` steps in flows. Flows can now reference data stores (containers) and data products directly as steps, rendered in the flow node graph and sidebar. SDK adds `addDataStoreStep`, `addContainerStep`, and `addDataProductStep` builders.
