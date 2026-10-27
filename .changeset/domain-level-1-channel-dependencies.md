---
'@eventcatalog/core': patch
---

fix(core): a domain's level 1 diagram connects each message's publisher to the consumers that receive it, rather than one consumer to the rest, when the channel it goes through was drawn with that consumer, and labels edges out of a channel with only the messages their consumer receives. The detailed diagram draws a channel with the messages sent through it, rather than in the first consumer's box (#3029)
