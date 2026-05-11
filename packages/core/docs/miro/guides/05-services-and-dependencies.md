---
sidebar_position: 6
sidebar_label: Services and Dependencies
title: "Services and Dependencies"
description: Control whether services are added with their full dependency graph or standalone
slug: /miro/services-and-dependencies
---

When you drag a service onto the board, you can choose whether to add just the service itself or its entire dependency graph — messages, channels, data stores, and related services.

<div style={{textAlign: "center"}}>
  <img src="/img/miro/guides/services-with-deps.gif" alt="Dragging a service with dependencies" style={{width: "75%"}} />
  <span style={{display: "block", fontSize: "0.8rem", color: "#6B7280", marginTop: "0rem", marginBottom: "1rem"}}>Dragging a service with its dependencies onto the board</span>
</div>


### The dependencies toggle

In the services list view, you'll find a checkbox labeled **Include dependencies when adding to board**.

- **Checked** — dragging a service onto the board also adds all of its connected resources and the connections between them
- **Unchecked** — only the service node is added to the board, with no dependencies

This setting is remembered between sessions.

### What gets included with dependencies

When the toggle is enabled and you drag a service onto the board, the app automatically adds:

- **Messages** — all events, commands, and queries that the service sends or receives
- **Channels** — any message brokers or routing channels between the service and its messages
- **Data Stores** — databases the service reads from or writes to, with labeled connections (reads, writes, or reads & writes)
- **Related Services** — other services that produce or consume the same messages, so you can see the full communication flow

All connections are drawn automatically with descriptive labels like "publishes event", "receives", "accepts", "writes to", etc.

### When to use each mode

#### With dependencies

Use this when you want to see the full picture of how a service fits into your architecture. This is useful for:

- Understanding the impact of changing a service
- Onboarding new team members to a service's role in the system
- Planning migrations that affect multiple services

#### Without dependencies

Use this when you want to manually compose your board — for example:

- Designing a new architecture from scratch
- Placing specific services side by side for comparison
- Building a simplified view that only shows certain resources
- Adding services one at a time and drawing connections manually
