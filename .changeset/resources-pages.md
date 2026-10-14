---
'@eventcatalog/core': patch
---

feat(core): services, flows, channels, events, commands and queries now have a Resources page, like domains and systems, linked from Quick Reference in the sidebar:

- Services list the messages they send and receive, their entities, the data stores they read from or write to, and the flows they appear in (including flows that use the service in a step).
- Flows list the services, messages, agents, data stores, data products and sub-flows their steps use.
- Channels list the services and agents that produce messages onto them or receive messages from them, and the messages they transport.
- Messages list what produces and consumes them, the channels they travel on, the flows they appear in, and the messages they trigger or are triggered by.

Every Resources page also lists the decision records (ADRs) that apply to it, and has a Relationship column showing how each resource connects (for example Contains, Owns, Sends, Receives, Reads from, Writes to, Produces, Consumes, Transports, Triggers or Governed by), with Inbound and Outbound filters when a page has connections going both ways. The Type column names each row in the singular (Command, Event, Data Store).
