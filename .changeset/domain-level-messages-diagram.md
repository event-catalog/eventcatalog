---
"@eventcatalog/core": minor
"@eventcatalog/visualiser": minor
---

Domain diagrams show the messages a domain sends and receives itself (`sends` and `receives` in its frontmatter), which were accepted but never drawn. A message the domain receives is drawn into the domain's box from whoever sends it, and one it sends out of the box to whoever receives it. A message one of the domain's own services already sends or receives keeps its edge to that service. Other domains that list a message at domain level show up on the diagrams of the domains on the other side, and on level 1 a domain's own messages fold into its box. Edges meeting a domain's box, and domain cards, show a dot where they connect, like other nodes, and in Studio a domain connected to a message is labelled ("publishes event", "invokes", "requests").
