---
'@eventcatalog/visualiser': patch
---

fix(visualiser): resources added to a laid out canvas go inside their domain or system. They were placed relative to the canvas, so a new service in a new domain was drawn far outside it, and a place an agent gave something inside a container (in canvas coordinates) is now ignored when it falls outside it
