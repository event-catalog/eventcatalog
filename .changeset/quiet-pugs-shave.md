---
'@eventcatalog/core': minor
'@eventcatalog/visualiser': patch
---

feat(core): render node graphs for channels

Channel nodes offer a "Focus node" link to `/visualiser/channels/{id}/{version}`, but that
route was never generated, so the link 404'd. For the same reason `<NodeGraph />` on a channel
documentation page rendered empty.

Channels are now registered as a graph root in both places, and have their own graph showing the
producers and messages that publish into the channel, the services and agents that consume from
it, and any channels it routes to or is routed from. Channel documentation sidebars now also
include an **Architecture → Map** link to the channel graph when the visualiser is enabled, and
every channel in a routed chain exposes the standard resource context menu. Navigating between a
channel's map and documentation now also keeps the channel sidebar selected.
The focused channel is highlighted with the same persistent viewing border as other resource nodes.
Channel maps resolve complete routing chains, so messages enter through their producer channel,
pass through intermediate channels, and reach consumers through their configured channel without
incorrect direct edges to the focused channel.
