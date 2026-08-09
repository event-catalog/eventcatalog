---
'@eventcatalog/core': minor
---

feat(core): render node graphs for channels

Channel nodes offer a "Focus node" link to `/visualiser/channels/{id}/{version}`, but that
route was never generated, so the link 404'd. For the same reason `<NodeGraph />` on a channel
documentation page rendered empty.

Channels are now registered as a graph root in both places, and have their own graph showing the
producers and messages that publish into the channel, the services and agents that consume from
it, and any channels it routes to or is routed from.
