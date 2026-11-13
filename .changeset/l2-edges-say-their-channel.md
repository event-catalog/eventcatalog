---
'@eventcatalog/visualiser': minor
'@eventcatalog/core': patch
---

feat(visualiser): L2 edges that skip hidden channels now say how the messages travel: the channel and its protocol ("publishes OrderPlaced via orders (kafka)"), or for a route through several channels where it starts and ends ("via Product Events (kafka) → +1 → Search Indexer Queue (sqs)"), in diagrams and in Studio
