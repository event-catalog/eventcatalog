---
keywords:
- EventCatalog commands
sidebar_label: Patterns for shared messages
title: Patterns for shared messages
description: Understand the patterns for shared messages in EventCatalog.
---

You can store your events, commands and queries in any folder in your EventCatalog.

Here are some common usecases:

- [Messages defined by the service](/docs/development/guides/messages/common/shared-messages-across-boundaries#messages-defined-by-the-service)
- [Messages defined at a domain level](/docs/development/guides/messages/common/shared-messages-across-boundaries#define-messages-at-a-domain-level)
- [Messages defined at a system level](/docs/development/guides/messages/common/shared-messages-across-boundaries#define-messages-at-a-system-level)

### Messages defined by the service

If you want to keep your message definition close to the service that producers or consumes it you can store them in the `/services` folder.

In the example below the `OrderPlaced` event, `AddOrder` command and `GetOrder` query are defined in the `/services/Orders` folder.

```md
services/
  Orders/
    events/
      OrderPlaced/
        index.mdx
    commands/
      AddOrder/
        index.mdx
    queries/
      GetOrder/
        index.mdx
```

### Define messages at a domain level

If you want to share messages across multiple services you can define them in the `/domains` folder.

In the example below the `OrderPlaced` event, `AddOrder` command and `GetOrder` query are defined in the `/domains/Orders` folder.

```md
domains/
  Orders/
     <!-- The domain documentation -->
    index.mdx
    <!-- Here we store our /events, /commands and /queries -->
    events/
      OrderPlaced/
        index.mdx
```

### Define messages at a system level

If you want to share messages across all your domains you can define them in the root of your catalog.

In the example below the `OrderPlaced` event, `AddOrder` command and `GetOrder` query are defined in the root of your catalog.

```md
events/
  OrderPlaced/
    index.mdx
commands/
  AddOrder/
    index.mdx
queries/
  GetOrder/
    index.mdx
```