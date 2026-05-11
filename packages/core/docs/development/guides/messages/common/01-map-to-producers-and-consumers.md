---
keywords:
- EventCatalog commands
sidebar_label: Map to producers and consumers
title: Assigning events to services
description: Understanding how to link events to services
sidebar_position: 1
---

[Services](/docs/development/guides/services/introduction) can either **send** or **receive** events, commands and queries. 

To add messages to services you need to reference them within your service itself by adding the `id`. The `version` is optional and if not provided the latest version will be used.

```md title="/services/Orders/index.mdx (example)"
---
id: OrderService
... # other service frontmatter
receives:
    # id of the message this service receives
    - id: OrderPlaced
    # (optional) The version of the message you want to add
      version: 0.0.1
sends:  
    # id of the message this service sends
    - id: PaymentProcessed
---

<!-- Markdown contents... -->
```

### Versioning

When you reference a message in your service you can specify the version of the message.

This allows you to document which versions of messages your service interacts with.

If you don't specify a version the latest version will be used.
