---
'@eventcatalog/core': minor
'@eventcatalog/visualiser': minor
'@eventcatalog/linter': minor
'@eventcatalog/sdk': minor
---

feat(core): document dead letter channels. A channel can point to the channel it sends undeliverable messages to with `deadLetterChannel`, which is then drawn with a red border and a dark "Dead Letter Channel" badge with a stop sign icon (in diagrams and Studio), given a stop sign icon and "Dead Letter Channel" and "Dead Letters From" sections in the sidebar, and joined to its source channels by a dashed red "dead-letters to" edge that leaves the bottom of the channel and turns right into the dead letter channel, laid out below the channel's consumers, and linked from `<ChannelInformation />`. Federation carries `deadLetterChannel` through the catalog index and resolves it like `routes`, so a missing dead letter channel is reported.
