---
'@eventcatalog/core': minor
'@eventcatalog/visualiser': minor
'@eventcatalog/linter': minor
'@eventcatalog/sdk': minor
---

feat(core): channels can have a `type` of `queue`, `topic` or `stream`, for how they deliver messages. Each type has its own label and icon on its card in diagrams and Studio, and its own icon in the sidebar, and is shown in `<ChannelInformation />`. A dead letter channel with a type is labelled as one, e.g. "Dead Letter Queue".
