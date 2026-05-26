---
keywords:
- EventCatalog agents
- agent data stores
- writesTo readsFrom
sidebar_label: Data stores
title: Adding data stores to agents
description: Document the data stores an agent reads from or writes to.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.41.0" />

[Data stores](/docs/development/guides/data/introduction) are containers that hold data in your architecture — databases, caches, object stores, search indexes, and so on. Agents can read from and write to these containers, and documenting those relationships keeps the full data-access picture visible in the visualiser.

## Specify read/write relationships

Add `readsFrom` or `writesTo` arrays to your agent's frontmatter. Provide the `id` of the data store and optionally its `version`.

```md title="/agents/FraudReviewAgent/index.mdx (example)"
---
id: FraudReviewAgent
version: 0.0.1
readsFrom:
  - id: fraud-analytics-db
  - id: ml-model-store
    version: 2.0.0
---
```

```md title="/agents/InventoryRebalancingAgent/index.mdx (example)"
---
id: InventoryRebalancingAgent
version: 0.0.1
readsFrom:
  - id: inventory-readmodel
  - id: inventory-db
writesTo:
  - id: rebalancing-audit-log
---
```

If no version is provided, EventCatalog uses the latest version of the data store.

## Visualize data stores

When data stores are connected to an agent, EventCatalog visualizes the read/write relationships — either via the `<NodeGraph />` component on the agent page or through the full-screen visualiser.

![Agent visualiser showing data store nodes connected with reads and writes](../img/agent-consuming-messages.png)

You can also control the **Containers** section in the agent's sidebar using `detailsPanel`:

```md title="/agents/FraudReviewAgent/index.mdx (example)"
---
id: FraudReviewAgent
version: 0.0.1
detailsPanel:
  containers:
    visible: false
---
```
