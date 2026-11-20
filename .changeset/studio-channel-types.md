---
'@eventcatalog/core': minor
'@eventcatalog/visualiser': minor
---

feat(core): Studio can set a channel's type (queue, topic or stream) and make it a dead letter channel, from the channel's card, and agents can too (`add_to_canvas` and `update_node`, and Studio on the web's model with `channelType` and `deadLetter`). Dragging a connection from a channel's bottom handle to another channel makes it the channel's dead letter channel.
