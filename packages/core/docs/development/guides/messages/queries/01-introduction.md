---
sidebar_position: 1
keywords:
- EventCatalog queries
- Queries
sidebar_label: What are queries?
title: Understanding queries
description: What are queries? Why are they useful for event-driven architectures?
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.10.0" />

Queries are a type of message that represent requests for information.

In EventCatalog [Services](/docs/development/guides/services/introduction) may query (send) or accept (receive) queries in your architecture.

### Queries in EventCatalog

- Queries in EventCatalog can be **accepted** by services or **invoked** by services.
- Queries in EventCatalog are green
- Queries live in the `/queries` folder.

![Example](../../img/queries/query-example.png)