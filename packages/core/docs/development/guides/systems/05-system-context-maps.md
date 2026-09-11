---
sidebar_position: 5
keywords:
- EventCatalog systems
- System context map
- Architecture visualizer
sidebar_label: System context maps
title: System context maps
description: Visualize systems from high-level context maps down to detailed resource maps.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="4.0" />

System context maps help teams understand how systems fit together across an architecture.

They give users a high-level view of all systems, the actors that interact with them, and the relationships between systems. From there, users can drill into a specific system to see the resources that make it up, including APIs, services, messages, data stores, and flows.

## Start with the system context map

The global system context map shows your systems and how they relate to each other.

Use this view when you want to answer questions like:

- What systems exist in this architecture?
- Which systems depend on each other?
- Which people or roles interact with these systems?
- Where should I drill in for more detail?

![System context map showing systems, actors, and relationships](./img/system-context-map.png)

You can open the global system context map at:

```txt
/visualiser/system-context-map
```

## Drill into a system

After users understand the high-level context, they can click into a system and view its resource diagram.

The resource diagram shows the detailed architecture inside that system. For example, a payment processing system can show the APIs, workers, commands, events, and data stores that work together to process payments.

![System resource map showing APIs, messages, services, and data stores inside a system](./img/system-resource-map.png)

You can open a system resource diagram at:

```txt
/visualiser/systems/{system-id}/{version}
```

For example:

```txt
/visualiser/systems/search-system/1.0.0
```

## High-level to detailed architecture

The goal of systems is to let users move through your architecture at the right level of detail:

- Start with a high-level context map to understand the systems and relationships.
- Select a system to understand what it owns and depends on.
- Drill into the resources inside that system to inspect APIs, messages, services, data stores, and flows.

This gives teams a path from architecture overview to implementation detail without forcing every user to start at the lowest level.
