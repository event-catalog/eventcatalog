---
"@eventcatalog/core": patch
---

fix(core): show "Loading graph..." in the graph's box, not at the top right of the homepage

While a diagram loaded, its "Loading graph..." text showed where the diagram's code sits on the page rather than where the diagram is drawn: on a homepage with a diagram, that was the top right. It now shows in the diagram's box.
