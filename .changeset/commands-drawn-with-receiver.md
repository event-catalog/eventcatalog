---
'@eventcatalog/core': patch
---

fix(core): domain diagrams draw a command or query, and the channel it's delivered on, in the domain that receives it, not the one that sends it (events still go with their publisher). A domain listing a message in its own `receives` no longer gets a second edge from the message when one of its services already receives it, and the edge from a channel to whatever receives a command or query through it reads "accepts", not "consumes" (#3002)
