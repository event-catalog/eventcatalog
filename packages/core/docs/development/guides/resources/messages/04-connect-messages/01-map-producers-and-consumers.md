---
keywords:
- EventCatalog commands
sidebar_label: Map producers and consumers
title: Map producers and consumers
description: Understand how to link messages to services.
sidebar_position: 1
---

[Services](/docs/development/guides/resources/services/introduction) or Domains can either **send** or **receive** events, commands and queries. 

To add messages to resource you need to reference them within your resource itself by adding the `id`. The `version` is optional and if not provided the latest version will be used.

```md title="/services/Orders/index.mdx (example)"
---
id: OrderService
... # other service frontmatter
receives:
    # id of the message this service receives
    - id: OrderPlaced
    # (optional) The version of the message you want to add
    # If no version is given latest version is used.
      version: 0.0.1
sends:  
    # id of the message this service sends
    - id: PaymentProcessed
---

<!-- Markdown contents... -->
```

If you don't specify a version the latest version will be used.
